/**
 * Load persisted incidents from the bridge (MongoDB-backed).
 */

import { getStoredSessionToken } from './auth.js';

function authHeaders() {
  const token = getStoredSessionToken();
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Insiden milik akun yang login (24h). */
export async function fetchMyRecentIncidents(baseUrl, hours = 24) {
  const r = await fetch(`${baseUrl.replace(/\/$/, '')}/account/incidents/recent?hours=${hours}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, incidents: [], error: data.error || 'request_failed' };
  }
  return { ok: true, incidents: Array.isArray(data.incidents) ? data.incidents : [] };
}

export async function fetchMyHistoryIncidents(baseUrl, { windowHours = 24, limit = 50, skip = 0 } = {}) {
  const q = new URLSearchParams({
    windowHours: String(windowHours),
    limit: String(limit),
    skip: String(skip),
  });
  const r = await fetch(`${baseUrl.replace(/\/$/, '')}/account/incidents/history?${q}`, {
    method: 'GET',
    credentials: 'include',
    headers: authHeaders(),
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, incidents: [], error: data.error || 'request_failed' };
  }
  return { ok: true, incidents: Array.isArray(data.incidents) ? data.incidents : [] };
}

export async function fetchRecentIncidents(baseUrl, adminSecret, hours = 24) {
  const secret = typeof adminSecret === 'string' ? adminSecret.trim() : '';
  if (!secret) return { ok: false, incidents: [], error: 'no_admin_secret' };
  const r = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/incidents/recent?hours=${hours}`, {
    method: 'GET',
    headers: { 'X-Admin-Secret': secret },
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, incidents: [], error: data.error || 'request_failed' };
  }
  return { ok: true, incidents: Array.isArray(data.incidents) ? data.incidents : [] };
}

export async function fetchHistoryIncidents(baseUrl, adminSecret, { windowHours = 24, limit = 50, skip = 0 } = {}) {
  const secret = typeof adminSecret === 'string' ? adminSecret.trim() : '';
  if (!secret) return { ok: false, incidents: [], error: 'no_admin_secret' };
  const q = new URLSearchParams({
    windowHours: String(windowHours),
    limit: String(limit),
    skip: String(skip),
  });
  const r = await fetch(`${baseUrl.replace(/\/$/, '')}/admin/incidents/history?${q}`, {
    method: 'GET',
    headers: { 'X-Admin-Secret': secret },
    cache: 'no-store',
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.ok) {
    return { ok: false, incidents: [], error: data.error || 'request_failed' };
  }
  return { ok: true, incidents: Array.isArray(data.incidents) ? data.incidents : [] };
}
