import { createHash, randomBytes } from 'node:crypto';
import { smtpConfigured } from './auth.mjs';
import { sendSmtpEmail } from './smtp.mjs';
import { getUserByEmail } from '../db/usersMongo.mjs';
import { getUserApiKeyPlain, regenerateUserApiKey, ensureUserApiKey } from './userApiKeys.mjs';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, { email: string, purpose: 'view' | 'reset', codeHash: string, expiresAt: number }>} */
const challenges = new Map();

function randomId(bytes = 18) {
  return randomBytes(bytes).toString('base64url');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashOtp(code) {
  return createHash('sha256').update(String(code)).digest('hex');
}

function pruneChallenges() {
  const now = Date.now();
  for (const [k, v] of challenges) {
    if (v.expiresAt <= now) challenges.delete(k);
  }
}

async function sendApiKeyCodeEmail({ toEmail, toName, code, purpose }) {
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const isReset = purpose === 'reset';
  const actionEn = isReset ? 'reset your API key' : 'view your API key';
  const actionId = isReset ? 'mereset API key Anda' : 'melihat API key Anda';

  const html = `
    <div style="font-family:system-ui,sans-serif;background:#0F172A;color:#F8FAFC;padding:24px">
      <h1 style="color:#C62828;font-size:18px;margin:0 0 12px">Slark</h1>
      <p>Hi ${toName || 'there'},</p>
      <p>Your verification code to ${actionEn}:</p>
      <p style="font-size:28px;letter-spacing:0.35em;font-weight:700;color:#C62828;margin:20px 0">${code}</p>
      <p style="color:#94a3b8;font-size:13px">Kode verifikasi untuk ${actionId}. Berlaku 10 menit. Abaikan email ini jika Anda tidak meminta.</p>
    </div>
  `.trim();

  return sendSmtpEmail({
    toEmail,
    toName,
    subject: isReset ? 'Slark — reset API key verification' : 'Slark — view API key verification',
    html,
  });
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

async function assertUserCanAccessApiKey(email) {
  const user = await getUserByEmail(email);
  if (!user?.subscription?.active) {
    return { ok: false, error: 'subscription_inactive' };
  }
  if (!user.apiKey?.hasKey) {
    await ensureUserApiKey(email);
    const refreshed = await getUserByEmail(email);
    if (!refreshed?.apiKey?.hasKey) {
      return { ok: false, error: 'api_key_missing' };
    }
    return { ok: true, user: refreshed };
  }
  return { ok: true, user };
}

/**
 * @param {{ email: string, name?: string, purpose?: 'view' | 'reset' }} input
 */
export async function startApiKeyAccessChallenge({ email, name, purpose = 'view' }) {
  const normalized = String(email).toLowerCase().trim();
  const access = await assertUserCanAccessApiKey(normalized);
  if (!access.ok) return access;

  if (purpose !== 'view' && purpose !== 'reset') {
    return { ok: false, error: 'invalid_purpose' };
  }

  const codeOtp = generateOtp();
  const challengeId = randomId();
  pruneChallenges();
  challenges.set(challengeId, {
    email: normalized,
    purpose,
    codeHash: hashOtp(codeOtp),
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  const mailed = await sendApiKeyCodeEmail({
    toEmail: normalized,
    toName: name || normalized,
    code: codeOtp,
    purpose,
  });
  if (!mailed.ok) {
    challenges.delete(challengeId);
    return mailed;
  }

  return {
    ok: true,
    challengeId,
    email: normalized,
    emailMasked: maskEmail(normalized),
    purpose,
  };
}

/**
 * @param {{ email: string, challengeId: string, code: string }} input
 */
export async function verifyApiKeyAccessChallenge({ email, challengeId, code }) {
  const normalized = String(email).toLowerCase().trim();
  pruneChallenges();
  const challenge = challenges.get(challengeId);
  if (!challenge) {
    return { ok: false, error: 'challenge_expired' };
  }
  if (challenge.email !== normalized) {
    return { ok: false, error: 'challenge_mismatch' };
  }
  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(challengeId);
    return { ok: false, error: 'challenge_expired' };
  }
  if (hashOtp(code) !== challenge.codeHash) {
    return { ok: false, error: 'invalid_code' };
  }
  challenges.delete(challengeId);

  const access = await assertUserCanAccessApiKey(normalized);
  if (!access.ok) return access;

  let apiKey;
  if (challenge.purpose === 'reset') {
    const regen = await regenerateUserApiKey(normalized);
    if (!regen?.apiKey) return { ok: false, error: 'reset_failed' };
    apiKey = regen.apiKey;
  } else {
    apiKey = await getUserApiKeyPlain(normalized);
    if (!apiKey) return { ok: false, error: 'api_key_missing' };
  }

  return { ok: true, apiKey, purpose: challenge.purpose, reset: challenge.purpose === 'reset' };
}
