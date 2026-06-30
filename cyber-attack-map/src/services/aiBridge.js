import { getStoredSessionToken } from './auth.js';

const BRIDGE_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000').replace(/\/$/, '');

/** @type {boolean | null} */
let configuredCache = null;

function bridgeHeaders() {
  const token = getStoredSessionToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * @returns {Promise<boolean>}
 */
export async function fetchAiConfigured() {
  try {
    const res = await fetch(`${BRIDGE_URL}/ai/status`, { credentials: 'include' });
    if (!res.ok) {
      configuredCache = false;
      return false;
    }
    const data = await res.json();
    configuredCache = Boolean(data.configured);
    return configuredCache;
  } catch {
    configuredCache = false;
    return false;
  }
}

/** @returns {boolean} */
export function isAiConfigured() {
  return configuredCache === true;
}

/**
 * @param {{ variant?: 'threat' | 'landing'; messages: { role: string; content: string }[]; locale?: string }} params
 * @returns {Promise<string>}
 */
export async function sendAiChat({ variant = 'threat', messages, locale = 'en' }) {
  const res = await fetch(`${BRIDGE_URL}/ai/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: bridgeHeaders(),
    body: JSON.stringify({ variant, messages, locale }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === 'not_authenticated') {
      throw new Error('AI_NOT_AUTHENTICATED');
    }
    if (data.error === 'ai_not_configured') {
      throw new Error('AI_NOT_CONFIGURED');
    }
    if (data.error === 'ai_rate_limited') {
      throw new Error('AI_RATE_LIMITED');
    }
    if (data.error === 'ai_invalid_key') {
      throw new Error('AI_INVALID_KEY');
    }
    if (data.error === 'ai_model_not_found') {
      throw new Error('AI_MODEL_NOT_FOUND');
    }
    throw new Error(typeof data.error === 'string' ? data.error : 'ai_chat_failed');
  }

  return typeof data.reply === 'string' ? data.reply : '';
}

/**
 * @param {{ dailyPoints: object[]; locale?: string }} params
 * @returns {Promise<{ date: string; comment: string }[]>}
 */
export async function fetchDailyCommentary({ dailyPoints, locale }) {
  const res = await fetch(`${BRIDGE_URL}/ai/intel/daily-commentary`, {
    method: 'POST',
    credentials: 'include',
    headers: bridgeHeaders(),
    body: JSON.stringify({ dailyPoints, locale }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (data.error === 'ai_not_configured') {
      throw new Error('AI_NOT_CONFIGURED');
    }
    throw new Error(typeof data.error === 'string' ? data.error : 'commentary_failed');
  }

  return Array.isArray(data.comments) ? data.comments : [];
}
