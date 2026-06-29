import { getStoredSessionToken } from './auth.js';

const BRIDGE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function authHeaders() {
  const token = getStoredSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function requestPasswordChangeCode() {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/account/password-change/send`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({}),
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

export async function verifyPasswordChangeCode({ challengeId, code }) {
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
  return data;
}

export async function completePasswordChange({ challengeId, password, confirmPassword }) {
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
  return data;
}
