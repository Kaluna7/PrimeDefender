import { getStoredSessionToken } from './auth.js';

const BRIDGE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function authHeaders() {
  const token = getStoredSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/**
 * @param {'view' | 'reset'} [purpose]
 */
export async function requestApiKeyReveal(purpose = 'view') {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/account/api-key/reveal/send`, {
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
  return data;
}

export async function verifyApiKeyReveal({ challengeId, code }) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/account/api-key/reveal/verify`, {
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
  return data;
}

export function extractApiKeyFromPaymentResult(result) {
  if (!result) return null;
  return result.apiKey || result.activated?.apiKey || null;
}
