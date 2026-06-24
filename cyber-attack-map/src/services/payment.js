import { getStoredSessionToken } from './auth.js';

const BRIDGE_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

function authHeaders() {
  const token = getStoredSessionToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function fetchPaymentConfig() {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/payment/config`, { cache: 'no-store' });
  return res.json();
}

export async function createPaymentCharge(planId, paymentMethod) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/payment/charge`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ planId, paymentMethod }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || 'checkout_failed', hint: data.hint, detail: data.detail };
  }
  return data;
}

export async function confirmPaymentOrder(orderId) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/payment/confirm`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ orderId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || 'confirm_failed', ...data };
  return data;
}

export async function syncPendingPayments() {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/payment/sync`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: data.error || 'sync_failed' };
  return data;
}

export function formatIdr(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}
