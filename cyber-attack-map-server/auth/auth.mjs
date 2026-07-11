import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { isUserEmailVerified, markEmailVerified, upsertUserByEmail, createPasswordUser, findUserAuthByEmail, updateUserPasswordHash } from '../db/usersMongo.mjs';
import { mongoDisabled } from '../db/mongo.mjs';
import { getSmtpConfig, sendSmtpEmail, smtpConfigured } from './smtp.mjs';

export { smtpConfigured } from './smtp.mjs';

const scryptAsync = promisify(scrypt);
const PASSWORD_MIN_LEN = 8;

const OTP_TTL_MS = 10 * 60 * 1000;
const CHALLENGE_TTL_MS = 15 * 60 * 1000;
/** Sesi login (cookie + server): default 1 hari. */
const SESSION_TTL_MS =
  Number(process.env.AUTH_SESSION_HOURS) > 0
    ? Number(process.env.AUTH_SESSION_HOURS) * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

/** Akun yang sudah verifikasi email sekali (fallback jika MongoDB mati). */
const verifiedEmailsMemory = new Set();

/** @type {Map<string, { email: string, name: string, code: string, expiresAt: number }>} */
const challenges = new Map();

/** @type {Map<string, { email: string, name: string, picture?: string, expiresAt: number }>} */
const sessions = new Map();

/** @type {Map<string, number>} */
const oauthStates = new Map();

function pruneMap(map) {
  const now = Date.now();
  for (const [k, v] of map) {
    if (v.expiresAt <= now) map.delete(k);
  }
}

export function getAuthConfig() {
  return {
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || '',
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || '',
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL?.trim() || 'http://localhost:3000/auth/google/callback',
    frontendUrl: (() => {
      let url = process.env.FRONTEND_URL?.trim().replace(/^["']|["']$/g, '').replace(/\/$/, '') || '';
      if (url && !/^https?:\/\//i.test(url)) url = `https://${url}`;
      return url || 'http://localhost:5173';
    })(),
    sessionSecret: process.env.AUTH_SESSION_SECRET?.trim() || 'slark-dev-session-secret',
    ...getSmtpConfig(),
  };
}

export function authConfigured() {
  const c = getAuthConfig();
  return Boolean(c.googleClientId && c.googleClientSecret && smtpConfigured());
}

function randomId(bytes = 24) {
  return randomBytes(bytes).toString('base64url');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code) {
  return createHash('sha256').update(code).digest('hex');
}

function safeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, 64);
  return `scrypt:${salt}:${derived.toString('hex')}`;
}

async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string' || !stored.startsWith('scrypt:')) return false;
  const parts = stored.split(':');
  if (parts.length !== 3) return false;
  const salt = parts[1];
  const expected = parts[2];
  const derived = await scryptAsync(String(password), salt, 64);
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), derived);
  } catch {
    return false;
  }
}

async function startEmailVerificationChallenge({ email, name, picture }) {
  const codeOtp = generateOtp();
  const challengeId = randomId(18);
  pruneMap(challenges);
  challenges.set(challengeId, {
    email: String(email).toLowerCase().trim(),
    name: name || email,
    picture,
    codeHash: hashOtp(codeOtp),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  const mailed = await sendVerificationEmail({
    toEmail: email,
    toName: name || email,
    code: codeOtp,
  });
  if (!mailed.ok) {
    challenges.delete(challengeId);
    return { ok: false, error: mailed.error };
  }

  return {
    ok: true,
    challengeId,
    email: String(email).toLowerCase().trim(),
  };
}

export function startGoogleOAuth() {
  const cfg = getAuthConfig();
  if (!cfg.googleClientId || !cfg.googleClientSecret) {
    return { ok: false, error: 'google_not_configured' };
  }
  pruneMap(oauthStates);
  const state = randomId(16);
  oauthStates.set(state, Date.now() + 10 * 60 * 1000);
  const params = new URLSearchParams({
    client_id: cfg.googleClientId,
    redirect_uri: cfg.callbackUrl,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    access_type: 'online',
    prompt: 'select_account',
  });
  return {
    ok: true,
    url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  };
}

function consumeOAuthState(state) {
  if (!state || typeof state !== 'string') return false;
  const exp = oauthStates.get(state);
  oauthStates.delete(state);
  return typeof exp === 'number' && exp > Date.now();
}

async function exchangeGoogleCode(code) {
  const cfg = getAuthConfig();
  const body = new URLSearchParams({
    code,
    client_id: cfg.googleClientId,
    client_secret: cfg.googleClientSecret,
    redirect_uri: cfg.callbackUrl,
    grant_type: 'authorization_code',
  });
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`google_token_failed:${tokenRes.status}:${err.slice(0, 200)}`);
  }
  const tokens = await tokenRes.json();
  const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userRes.ok) throw new Error('google_userinfo_failed');
  const user = await userRes.json();
  if (!user?.email) throw new Error('google_email_missing');
  return {
    email: String(user.email).toLowerCase(),
    name: String(user.name || user.email).trim(),
    picture: typeof user.picture === 'string' ? user.picture : undefined,
  };
}

export async function sendVerificationEmail({ toEmail, toName, code }) {
  const html = `
    <div style="font-family:system-ui,sans-serif;background:#0F172A;color:#F8FAFC;padding:24px">
      <h1 style="color:#C62828;font-size:18px;margin:0 0 12px">Slark</h1>
      <p>Hi ${toName || 'there'},</p>
      <p>Your verification code to complete sign-in:</p>
      <p style="font-size:28px;letter-spacing:0.35em;font-weight:700;color:#C62828;margin:20px 0">${code}</p>
      <p style="color:#94a3b8;font-size:13px">This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
    </div>
  `.trim();

  return sendSmtpEmail({
    toEmail,
    toName,
    subject: 'Slark — your verification code',
    html,
  });
}

async function accountAlreadyVerified(email) {
  const normalized = String(email).toLowerCase().trim();
  if (verifiedEmailsMemory.has(normalized)) return true;
  if (mongoDisabled()) return false;
  const verified = await isUserEmailVerified(normalized);
  if (verified) verifiedEmailsMemory.add(normalized);
  return verified;
}

/**
 * @param {{ email: string, name: string, picture?: string }} profile
 */
async function createLoginSession(profile) {
  const sessionToken = randomId(32);
  const persisted = await upsertUserByEmail({
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  });
  sessions.set(sessionToken, {
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
    userId: persisted?.id,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
  const user = persisted || profile;
  return {
    sessionToken,
    user: {
      email: user.email,
      name: user.name,
      picture: user.picture,
      subscription: user.subscription || null,
    },
  };
}

export async function handleGoogleCallback({ code, state }) {
  if (!consumeOAuthState(state)) {
    return { ok: false, error: 'invalid_state' };
  }
  if (!code) return { ok: false, error: 'missing_code' };

  let profile;
  try {
    profile = await exchangeGoogleCode(code);
  } catch (e) {
    console.error('[auth] google callback', e?.message || e);
    return { ok: false, error: 'google_exchange_failed' };
  }

  // Google already verified the email — skip OTP challenge.
  verifiedEmailsMemory.add(profile.email);
  await markEmailVerified(profile.email);

  const login = await createLoginSession(profile);
  return {
    ok: true,
    directLogin: true,
    sessionToken: login.sessionToken,
    user: login.user,
  };
}

export async function verifyChallenge({ challengeId, code }) {
  pruneMap(challenges);
  const row = challenges.get(challengeId);
  if (!row || row.expiresAt <= Date.now()) {
    return { ok: false, error: 'challenge_expired' };
  }
  const submitted = hashOtp(String(code || '').trim());
  if (!safeEqualHex(submitted, row.codeHash)) {
    return { ok: false, error: 'invalid_code' };
  }
  challenges.delete(challengeId);

  const email = row.email.toLowerCase().trim();
  verifiedEmailsMemory.add(email);

  const login = await createLoginSession({
    email: row.email,
    name: row.name,
    picture: row.picture,
  });
  await markEmailVerified(email);

  return {
    ok: true,
    sessionToken: login.sessionToken,
    user: login.user,
  };
}

/**
 * @param {{ email: string, password: string }} input
 */
export async function registerWithPassword({ email, password }) {
  if (mongoDisabled()) return { ok: false, error: 'mongo_disabled' };
  if (!smtpConfigured()) return { ok: false, error: 'smtp_not_configured' };

  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, error: 'invalid_email' };
  }
  if (String(password || '').length < PASSWORD_MIN_LEN) {
    return { ok: false, error: 'password_too_short' };
  }

  const existing = await findUserAuthByEmail(normalized);
  if (existing) return { ok: false, error: 'email_taken' };

  const passwordHash = await hashPassword(password);
  const created = await createPasswordUser({
    email: normalized,
    passwordHash,
    name: normalized.split('@')[0],
  });
  if (!created.ok) return created;

  const challenge = await startEmailVerificationChallenge({
    email: normalized,
    name: created.name,
  });
  if (!challenge.ok) return challenge;

  return {
    ok: true,
    needsVerification: true,
    challengeId: challenge.challengeId,
    email: challenge.email,
  };
}

/**
 * @param {{ email: string, password: string }} input
 */
export async function loginWithPassword({ email, password }) {
  if (mongoDisabled()) return { ok: false, error: 'mongo_disabled' };

  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized || !normalized.includes('@')) {
    return { ok: false, error: 'invalid_credentials' };
  }

  const record = await findUserAuthByEmail(normalized);
  if (!record?.passwordHash) {
    return { ok: false, error: 'invalid_credentials' };
  }

  const valid = await verifyPassword(password, record.passwordHash);
  if (!valid) return { ok: false, error: 'invalid_credentials' };

  const verified = await accountAlreadyVerified(normalized);
  if (!verified) {
    if (!smtpConfigured()) return { ok: false, error: 'smtp_not_configured' };
    const challenge = await startEmailVerificationChallenge({
      email: normalized,
      name: record.name,
      picture: record.picture,
    });
    if (!challenge.ok) return challenge;
    return {
      ok: false,
      error: 'verification_required',
      challengeId: challenge.challengeId,
      email: challenge.email,
    };
  }

  const login = await createLoginSession({
    email: normalized,
    name: record.name,
    picture: record.picture,
  });

  return {
    ok: true,
    sessionToken: login.sessionToken,
    user: login.user,
  };
}

export function getSession(token) {
  if (!token) return null;
  pruneMap(sessions);
  const row = sessions.get(token);
  if (!row || row.expiresAt <= Date.now()) {
    sessions.delete(token);
    return null;
  }
  return { email: row.email, name: row.name, picture: row.picture };
}

export function signOut(token) {
  if (token) sessions.delete(token);
}

export const PASSWORD_MIN_LENGTH = PASSWORD_MIN_LEN;

/**
 * @param {{ email: string, password: string }} input
 */
export async function updatePasswordForUser({ email, password }) {
  if (mongoDisabled()) return { ok: false, error: 'mongo_disabled' };
  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized) return { ok: false, error: 'user_not_found' };
  if (String(password || '').length < PASSWORD_MIN_LEN) {
    return { ok: false, error: 'password_too_short' };
  }
  const passwordHash = await hashPassword(password);
  const updated = await updateUserPasswordHash(normalized, passwordHash);
  if (!updated) return { ok: false, error: 'user_not_found' };
  return { ok: true };
}

export function parseSessionCookie(cookieHeader) {
  if (!cookieHeader || typeof cookieHeader !== 'string') return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === 'pd_session') return decodeURIComponent(rest.join('='));
  }
  return null;
}

export function sessionCookieHeader(token, { secure = false } = {}) {
  const maxAge = Math.floor(SESSION_TTL_MS / 1000);
  const flags = [
    `pd_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  if (secure) flags.push('Secure');
  return flags.join('; ');
}
