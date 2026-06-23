const BRIDGE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const SESSION_KEY = 'slark_session';

export function getStoredSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredSessionToken(token) {
  try {
    if (token) sessionStorage.setItem(SESSION_KEY, token);
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getGoogleSignInUrl() {
  return `${BRIDGE_URL.replace(/\/$/, '')}/auth/google`;
}

export async function fetchAuthStatus() {
  const token = getStoredSessionToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/me`, {
    credentials: 'include',
    headers,
  });
  if (!res.ok) return { ok: false, user: null };
  const data = await res.json();
  return data;
}

export async function verifyEmailCode({ challengeId, code }) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/verify`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ challengeId, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || 'verify_failed' };
  }
  if (data.sessionToken) {
    setStoredSessionToken(data.sessionToken);
    window.dispatchEvent(new Event('slark-auth-change'));
  }
  return data;
}

function applySessionFromResponse(data) {
  if (data.sessionToken) {
    setStoredSessionToken(data.sessionToken);
    window.dispatchEvent(new Event('slark-auth-change'));
  }
}

export async function registerWithEmail({ email, password }) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || 'register_failed' };
  }
  return data;
}

export async function loginWithEmail({ email, password }) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      error: data.error || 'login_failed',
      challengeId: data.challengeId,
      email: data.email,
    };
  }
  applySessionFromResponse(data);
  return data;
}

export async function signOut() {
  const token = getStoredSessionToken();
  await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/auth/signout`, {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).catch(() => {});
  setStoredSessionToken('');
  window.dispatchEvent(new Event('slark-auth-change'));
}
