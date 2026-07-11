import { createHash, randomBytes } from 'node:crypto';
import { smtpConfigured, updatePasswordForUser } from './auth.mjs';
import { sendSmtpEmail } from './smtp.mjs';
import { getUserByEmail } from '../db/usersMongo.mjs';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;

/** @type {Map<string, { email: string, codeHash: string, codeVerified: boolean, expiresAt: number }>} */
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

async function sendPasswordChangeCodeEmail({ toEmail, toName, code }) {
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const html = `
    <div style="font-family:system-ui,sans-serif;background:#0F172A;color:#F8FAFC;padding:24px">
      <h1 style="color:#C62828;font-size:18px;margin:0 0 12px">Slark</h1>
      <p>Hi ${toName || 'there'},</p>
      <p>Your verification code to change your account password:</p>
      <p style="font-size:28px;letter-spacing:0.35em;font-weight:700;color:#C62828;margin:20px 0">${code}</p>
      <p style="color:#94a3b8;font-size:13px">Kode verifikasi untuk mengubah kata sandi akun Anda. Berlaku 10 menit. Abaikan email ini jika Anda tidak meminta.</p>
    </div>
  `.trim();

  return sendSmtpEmail({
    toEmail,
    toName,
    subject: 'Slark — password change verification',
    html,
  });
}

function maskEmail(email) {
  const [local, domain] = String(email).split('@');
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${'•'.repeat(Math.max(1, local.length - visible.length))}@${domain}`;
}

/**
 * @param {{ email: string, name?: string }} input
 */
export async function startPasswordChangeChallenge({ email, name }) {
  const normalized = String(email).toLowerCase().trim();
  const user = await getUserByEmail(normalized);
  if (!user) return { ok: false, error: 'user_not_found' };

  const codeOtp = generateOtp();
  const challengeId = randomId();
  pruneChallenges();
  challenges.set(challengeId, {
    email: normalized,
    codeHash: hashOtp(codeOtp),
    codeVerified: false,
    expiresAt: Date.now() + CHALLENGE_TTL_MS,
  });

  const mailed = await sendPasswordChangeCodeEmail({
    toEmail: normalized,
    toName: name || user.name || normalized,
    code: codeOtp,
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
  };
}

/**
 * @param {{ email: string, challengeId: string, code: string }} input
 */
export async function verifyPasswordChangeCode({ email, challengeId, code }) {
  const normalized = String(email).toLowerCase().trim();
  pruneChallenges();
  const challenge = challenges.get(challengeId);
  if (!challenge) return { ok: false, error: 'challenge_expired' };
  if (challenge.email !== normalized) return { ok: false, error: 'challenge_mismatch' };
  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(challengeId);
    return { ok: false, error: 'challenge_expired' };
  }
  if (hashOtp(code) !== challenge.codeHash) {
    return { ok: false, error: 'invalid_code' };
  }

  challenges.set(challengeId, { ...challenge, codeVerified: true });
  return { ok: true };
}

/**
 * @param {{ email: string, challengeId: string, password: string, confirmPassword: string }} input
 */
export async function completePasswordChange({ email, challengeId, password, confirmPassword }) {
  const normalized = String(email).toLowerCase().trim();
  pruneChallenges();
  const challenge = challenges.get(challengeId);
  if (!challenge) return { ok: false, error: 'challenge_expired' };
  if (challenge.email !== normalized) return { ok: false, error: 'challenge_mismatch' };
  if (challenge.expiresAt <= Date.now()) {
    challenges.delete(challengeId);
    return { ok: false, error: 'challenge_expired' };
  }
  if (!challenge.codeVerified) return { ok: false, error: 'code_not_verified' };
  if (String(password || '') !== String(confirmPassword || '')) {
    return { ok: false, error: 'password_mismatch' };
  }

  const updated = await updatePasswordForUser({ email: normalized, password });
  if (!updated.ok) return updated;

  challenges.delete(challengeId);
  return { ok: true };
}
