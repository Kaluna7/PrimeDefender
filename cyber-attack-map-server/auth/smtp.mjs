import nodemailer from 'nodemailer';

function stripEnv(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/^["']|["']$/g, '');
}

function envBool(name, defaultValue = false) {
  const raw = stripEnv(process.env[name] || '');
  if (!raw) return defaultValue;
  return raw === 'true' || raw === '1' || raw === 'yes';
}

export function getSmtpConfig() {
  const port = Number(stripEnv(process.env.SMTP_PORT)) || 465;
  const secure = envBool('SMTP_SECURE', port === 465);
  return {
    smtpHost: stripEnv(process.env.SMTP_HOST) || 'smtp.hostinger.com',
    smtpPort: port,
    smtpSecure: secure,
    smtpUser: stripEnv(process.env.SMTP_USER),
    smtpPass: stripEnv(process.env.SMTP_PASS),
    smtpSenderEmail: stripEnv(process.env.SMTP_SENDER_EMAIL) || stripEnv(process.env.SMTP_USER),
    smtpSenderName: stripEnv(process.env.SMTP_SENDER_NAME) || 'Slark',
  };
}

export function smtpConfigured() {
  const c = getSmtpConfig();
  return Boolean(c.smtpHost && c.smtpUser && c.smtpPass && c.smtpSenderEmail);
}

/** @type {import('nodemailer').Transporter | null} */
let transporter = null;
let transporterKey = '';

function transporterOptions(cfg) {
  const options = {
    host: cfg.smtpHost,
    port: cfg.smtpPort,
    secure: cfg.smtpSecure,
    family: 4,
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    auth: {
      user: cfg.smtpUser,
      pass: cfg.smtpPass,
    },
  };
  if (!cfg.smtpSecure && cfg.smtpPort === 587) {
    options.requireTLS = true;
  }
  return options;
}

function getTransporter(cfg) {
  const key = `${cfg.smtpHost}:${cfg.smtpPort}:${cfg.smtpSecure}:${cfg.smtpUser}`;
  if (!transporter || transporterKey !== key) {
    transporter = nodemailer.createTransport(transporterOptions(cfg));
    transporterKey = key;
  }
  return transporter;
}

function fallbackConfig(cfg) {
  if (cfg.smtpPort === 465 && cfg.smtpSecure) {
    return { ...cfg, smtpPort: 587, smtpSecure: false };
  }
  if (cfg.smtpPort === 587 && !cfg.smtpSecure) {
    return { ...cfg, smtpPort: 465, smtpSecure: true };
  }
  return null;
}

/**
 * @param {{ toEmail: string, toName?: string, subject: string, html: string }} input
 */
export async function sendSmtpEmail({ toEmail, toName, subject, html }) {
  if (!smtpConfigured()) {
    return { ok: false, error: 'smtp_not_configured' };
  }

  const cfg = getSmtpConfig();
  const mail = {
    from: `"${cfg.smtpSenderName}" <${cfg.smtpSenderEmail}>`,
    to: toName && toName !== toEmail ? `"${toName}" <${toEmail}>` : toEmail,
    subject,
    html,
  };

  try {
    await getTransporter(cfg).sendMail(mail);
    return { ok: true };
  } catch (primaryError) {
    const fallback = fallbackConfig(cfg);
    if (fallback) {
      try {
        console.warn('[smtp] primary failed, retry port', fallback.smtpPort, primaryError?.message || primaryError);
        await getTransporter(fallback).sendMail(mail);
        return { ok: true };
      } catch (fallbackError) {
        console.error('[smtp] fallback failed', fallbackError?.message || fallbackError);
        return { ok: false, error: 'email_send_failed' };
      }
    }
    console.error('[smtp] send failed', primaryError?.message || primaryError);
    return { ok: false, error: 'email_send_failed' };
  }
}

export async function verifySmtpConnection() {
  if (!smtpConfigured()) return { ok: false, error: 'smtp_not_configured' };

  const cfg = getSmtpConfig();
  try {
    await getTransporter(cfg).verify();
    return { ok: true, port: cfg.smtpPort, secure: cfg.smtpSecure };
  } catch (primaryError) {
    const fallback = fallbackConfig(cfg);
    if (fallback) {
      try {
        await getTransporter(fallback).verify();
        console.warn('[smtp] verify ok on fallback port', fallback.smtpPort);
        return { ok: true, port: fallback.smtpPort, secure: fallback.smtpSecure, fallback: true };
      } catch (fallbackError) {
        return { ok: false, error: String(fallbackError?.message || fallbackError) };
      }
    }
    return { ok: false, error: String(primaryError?.message || primaryError) };
  }
}
