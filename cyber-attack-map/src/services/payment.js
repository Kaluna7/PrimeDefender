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

export async function createSnapCheckout(planId) {
  const res = await fetch(`${BRIDGE_URL.replace(/\/$/, '')}/payment/snap`, {
    method: 'POST',
    credentials: 'include',
    headers: authHeaders(),
    body: JSON.stringify({ planId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || 'checkout_failed', hint: data.hint };
  }
  return data;
}

export function loadMidtransSnap({ clientKey, isProduction }) {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.snap) {
      resolve(window.snap);
      return;
    }
    const src = isProduction
      ? 'https://app.midtrans.com/snap/snap.js'
      : 'https://app.sandbox.midtrans.com/snap/snap.js';
    const existing = document.querySelector(`script[data-midtrans-snap="${src}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.snap));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.setAttribute('data-client-key', clientKey);
    script.setAttribute('data-midtrans-snap', src);
    script.onload = () => resolve(window.snap);
    script.onerror = () => reject(new Error('snap_script_failed'));
    document.body.appendChild(script);
  });
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
