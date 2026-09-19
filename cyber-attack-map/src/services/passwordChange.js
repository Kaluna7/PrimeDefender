import { getStoredSessionToken } from './auth.js';

const BRIDGE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function authHeaders() {
  const token = getStoredSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * @param {{ purpose?: 'setup' | 'reset' }} [opts]
 */
export async function requestPasswordChangeCode(opts = {}) {
  try {
    const purpose = opts.purpose === 'setup' ? 'setup' : 'reset';
    const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/account/password-change/send`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ purpose }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || (res.status === 404 ? 'endpoint_not_found' : 'send_failed'),
        status: res.status,
      };
    }
    return data?.ok === false ? { ok: false, error: data.error || 'send_failed' } : { ok: true, ...data };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function verifyPasswordChangeCode({ challengeId, code }) {
  try {
    const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/account/password-change/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ challengeId, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || (res.status === 404 ? 'endpoint_not_found' : 'verify_failed'),
        status: res.status,
      };
    }
    return data?.ok === false ? { ok: false, error: data.error || 'verify_failed' } : { ok: true, ...data };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

export async function completePasswordChange({ challengeId, password, confirmPassword }) {
  try {
    const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/account/password-change/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: authHeaders(),
      body: JSON.stringify({ challengeId, password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || (res.status === 404 ? 'endpoint_not_found' : 'complete_failed'),
        status: res.status,
      };
    }
    return data?.ok === false ? { ok: false, error: data.error || 'complete_failed' } : { ok: true, ...data };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

/**
 * Public forgot-password (no session) — login screen.
 * @param {{ email: string }} input
 */
export async function requestForgotPasswordCode({ email }) {
  try {
    const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/forgot-password/send`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || (res.status === 404 ? 'endpoint_not_found' : 'send_failed'),
        status: res.status,
      };
    }
    return data?.ok === false ? { ok: false, error: data.error || 'send_failed' } : { ok: true, ...data };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

/**
 * @param {{ email: string, challengeId: string, code: string }} input
 */
export async function verifyForgotPasswordCode({ email, challengeId, code }) {
  try {
    const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/forgot-password/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, challengeId, code }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || (res.status === 404 ? 'endpoint_not_found' : 'verify_failed'),
        status: res.status,
      };
    }
    return data?.ok === false ? { ok: false, error: data.error || 'verify_failed' } : { ok: true, ...data };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}

/**
 * @param {{ email: string, challengeId: string, password: string, confirmPassword: string }} input
 */
export async function completeForgotPassword({ email, challengeId, password, confirmPassword }) {
  try {
    const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/forgot-password/complete`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, challengeId, password, confirmPassword }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || (res.status === 404 ? 'endpoint_not_found' : 'complete_failed'),
        status: res.status,
      };
    }
    return data?.ok === false ? { ok: false, error: data.error || 'complete_failed' } : { ok: true, ...data };
  } catch {
    return { ok: false, error: 'network_error' };
  }
}
