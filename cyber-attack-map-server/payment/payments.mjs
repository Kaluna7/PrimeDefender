import { createHash, randomBytes } from 'node:crypto';
import {
  CHECKOUT_PAYMENT_METHODS,
  PAYMENT_METHOD_CATEGORIES,
  buildCoreChargeBody,
  parseChargeDisplay,
  resolveCheckoutMethod,
} from './checkoutMethods.mjs';
import { getPlan, listPlans } from './plans.mjs';
import {
  activateSubscriptionForOrder,
  createPendingOrder,
  findOrderByOrderId,
  findPendingOrdersByEmail,
  persistenceRequired,
} from '../db/usersMongo.mjs';

const PAID_STATUSES = new Set(['capture', 'settlement']);

export function getMidtransConfig() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  return {
    merchantId: process.env.MIDTRANS_MERCHANT_ID?.trim() || '',
    clientKey: process.env.MIDTRANS_CLIENT_KEY?.trim() || '',
    serverKey: process.env.MIDTRANS_SERVER_KEY?.trim() || '',
    isProduction,
    snapBase: isProduction ? 'https://app.midtrans.com' : 'https://app.sandbox.midtrans.com',
    apiBase: isProduction ? 'https://api.midtrans.com' : 'https://api.sandbox.midtrans.com',
  };
}

function isMidtransPaid(data) {
  const status = data?.transaction_status;
  const fraud = data?.fraud_status;
  return (
    PAID_STATUSES.has(status) &&
    (fraud == null || fraud === '' || fraud === 'accept')
  );
}

async function fetchMidtransOrderStatus(orderId) {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey) return { ok: false, error: 'midtrans_not_configured' };
  const res = await fetch(`${cfg.apiBase}/v2/${encodeURIComponent(orderId)}/status`, {
    method: 'GET',
    headers: {
      Authorization: authHeader(cfg.serverKey),
      Accept: 'application/json',
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error('[midtrans] status check failed', orderId, res.status, JSON.stringify(data).slice(0, 300));
    return { ok: false, error: 'status_check_failed', detail: data };
  }
  return { ok: true, data };
}

export function midtransConfigured() {
  const c = getMidtransConfig();
  return Boolean(c.clientKey && c.serverKey);
}

function authHeader(serverKey) {
  const token = Buffer.from(`${serverKey}:`).toString('base64');
  return `Basic ${token}`;
}

function newOrderId() {
  return `PD-${Date.now()}-${randomBytes(4).toString('hex')}`;
}

/**
 * @param {{ email: string, name: string, planId: string, frontendUrl: string, paymentMethod?: string }} input
 */
export async function createSnapTransaction(input) {
  if (persistenceRequired()) {
    return { ok: false, error: 'mongo_disabled' };
  }
  const cfg = getMidtransConfig();
  if (!midtransConfigured()) {
    return { ok: false, error: 'midtrans_not_configured' };
  }

  const plan = getPlan(input.planId);
  if (!plan) return { ok: false, error: 'invalid_plan' };

  if (input.paymentMethod && !resolveCheckoutMethod(input.paymentMethod)) {
    return { ok: false, error: 'invalid_payment_method' };
  }

  const orderId = newOrderId();
  const pending = await createPendingOrder({
    orderId,
    email: input.email,
    planId: plan.id,
    amount: plan.amount,
  });
  if (!pending.ok) return pending;

  const itemName = plan.nameId;
  const body = {
    transaction_details: {
      order_id: orderId,
      gross_amount: plan.amount,
    },
    customer_details: {
      email: input.email,
      first_name: (input.name || input.email).slice(0, 40),
    },
    item_details: [
      {
        id: plan.id,
        price: plan.amount,
        quantity: 1,
        name: itemName.slice(0, 50),
      },
    ],
    callbacks: {
      finish: `${input.frontendUrl}/purchase?status=finish&order_id=${orderId}`,
      unfinish: `${input.frontendUrl}/purchase?status=unfinish&order_id=${orderId}`,
      error: `${input.frontendUrl}/purchase?status=error&order_id=${orderId}`,
    },
  };

  const res = await fetch(`${cfg.snapBase}/snap/v1/transactions`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(cfg.serverKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    console.error('[midtrans] snap failed', res.status, JSON.stringify(data).slice(0, 400));
    return { ok: false, error: 'snap_failed', detail: data };
  }

  return {
    ok: true,
    snapToken: data.token,
    orderId,
    redirectUrl: data.redirect_url,
    plan: {
      id: plan.id,
      amount: plan.amount,
      months: plan.months,
    },
  };
}

const CHARGE_OK_STATUSES = new Set(['pending', 'settlement', 'capture']);

/**
 * Charge lewat Midtrans Core API — instruksi pembayaran ditampilkan di UI kita.
 * @param {{ email: string, name: string, planId: string, paymentMethod: string, frontendUrl?: string }} input
 */
export async function createCoreChargeTransaction(input) {
  if (persistenceRequired()) {
    return { ok: false, error: 'mongo_disabled' };
  }
  const cfg = getMidtransConfig();
  if (!midtransConfigured()) {
    return { ok: false, error: 'midtrans_not_configured' };
  }

  const plan = getPlan(input.planId);
  if (!plan) return { ok: false, error: 'invalid_plan' };

  const method = resolveCheckoutMethod(input.paymentMethod);
  if (!method) return { ok: false, error: 'invalid_payment_method' };

  const orderId = newOrderId();
  const pending = await createPendingOrder({
    orderId,
    email: input.email,
    planId: plan.id,
    amount: plan.amount,
  });
  if (!pending.ok) return pending;

  if (method.paymentType === 'credit_card') {
    const snapBody = {
      transaction_details: {
        order_id: orderId,
        gross_amount: plan.amount,
      },
      customer_details: {
        email: input.email,
        first_name: (input.name || input.email).slice(0, 40),
      },
      item_details: [
        {
          id: plan.id,
          price: plan.amount,
          quantity: 1,
          name: plan.nameId.slice(0, 50),
        },
      ],
      enabled_payments: ['credit_card'],
      callbacks: input.frontendUrl
        ? {
            finish: `${input.frontendUrl}/purchase?status=finish&order_id=${orderId}`,
            unfinish: `${input.frontendUrl}/purchase?status=unfinish&order_id=${orderId}`,
            error: `${input.frontendUrl}/purchase?status=error&order_id=${orderId}`,
          }
        : undefined,
    };

    const snapRes = await fetch(`${cfg.snapBase}/snap/v1/transactions`, {
      method: 'POST',
      headers: {
        Authorization: authHeader(cfg.serverKey),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(snapBody),
    });

    const snapData = await snapRes.json().catch(() => ({}));
    if (!snapRes.ok || !snapData.redirect_url) {
      console.error('[midtrans] card snap failed', snapRes.status, JSON.stringify(snapData).slice(0, 400));
      return { ok: false, error: 'charge_failed', detail: snapData };
    }

    return {
      ok: true,
      orderId,
      transactionStatus: 'pending',
      paymentMethod: method.id,
      display: parseChargeDisplay(method, { redirect_url: snapData.redirect_url }),
      plan: {
        id: plan.id,
        amount: plan.amount,
        months: plan.months,
      },
    };
  }

  const chargeBody = buildCoreChargeBody({
    orderId,
    plan,
    email: input.email,
    name: input.name || input.email,
    method,
    frontendUrl: input.frontendUrl,
  });
  if (!chargeBody) return { ok: false, error: 'invalid_payment_method' };

  const res = await fetch(`${cfg.apiBase}/v2/charge`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(cfg.serverKey),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(chargeBody),
  });

  const data = await res.json().catch(() => ({}));
  const status = data.transaction_status;
  if (!res.ok || !CHARGE_OK_STATUSES.has(status)) {
    console.error('[midtrans] charge failed', res.status, JSON.stringify(data).slice(0, 400));
    return { ok: false, error: 'charge_failed', detail: data };
  }

  if (status === 'settlement' || status === 'capture') {
    await activateSubscriptionForOrder(orderId);
  }

  return {
    ok: true,
    orderId,
    transactionStatus: status,
    paymentMethod: method.id,
    display: parseChargeDisplay(method, data),
    plan: {
      id: plan.id,
      amount: plan.amount,
      months: plan.months,
    },
  };
}

export function verifyNotificationSignature(payload) {
  const cfg = getMidtransConfig();
  if (!cfg.serverKey) return false;
  const orderId = payload.order_id;
  const statusCode = payload.status_code;
  const grossAmount = payload.gross_amount;
  const signatureKey = payload.signature_key;
  if (!orderId || !statusCode || grossAmount == null || !signatureKey) return false;
  const expected = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${cfg.serverKey}`)
    .digest('hex');
  return expected === signatureKey;
}

/**
 * Konfirmasi pembayaran lewat API Midtrans (untuk localhost tanpa webhook).
 * @param {string} orderId
 * @param {string} userEmail
 */
export async function confirmOrderPayment(orderId, userEmail) {
  if (persistenceRequired()) return { ok: false, error: 'mongo_disabled' };
  const order = await findOrderByOrderId(orderId);
  if (!order) return { ok: false, error: 'order_not_found' };
  const email = String(userEmail).toLowerCase().trim();
  if (order.email !== email) return { ok: false, error: 'order_forbidden' };

  if (order.status === 'paid') {
    const activated = await activateSubscriptionForOrder(orderId);
    return { ok: true, already: true, activated };
  }

  const statusRes = await fetchMidtransOrderStatus(orderId);
  if (!statusRes.ok) return statusRes;

  if (!isMidtransPaid(statusRes.data)) {
    return {
      ok: false,
      error: 'not_paid_yet',
      transactionStatus: statusRes.data?.transaction_status,
    };
  }

  const activated = await activateSubscriptionForOrder(orderId);
  if (!activated.ok) return activated;
  return { ok: true, activated, transactionStatus: statusRes.data.transaction_status };
}

/** Cek semua order pending user ke Midtrans dan aktifkan yang sudah bayar. */
export async function syncPendingPaymentsForEmail(userEmail) {
  const email = String(userEmail).toLowerCase().trim();
  const pending = await findPendingOrdersByEmail(email);
  const results = [];
  for (const order of pending) {
    const r = await confirmOrderPayment(order.orderId, email);
    results.push({ orderId: order.orderId, ...r });
  }
  const activated = results.some((r) => r.ok && !r.already);
  return { ok: true, checked: results.length, results, activated };
}

/**
 * Midtrans HTTP notification handler.
 * @param {Record<string, string>} payload
 */
export async function handleMidtransNotification(payload) {
  if (!verifyNotificationSignature(payload)) {
    return { ok: false, error: 'invalid_signature' };
  }

  const orderId = payload.order_id;
  const transactionStatus = payload.transaction_status;
  const fraud = payload.fraud_status;

  const order = await findOrderByOrderId(orderId);
  if (!order) return { ok: false, error: 'order_not_found' };

  if (transactionStatus === 'expire' || transactionStatus === 'cancel' || transactionStatus === 'deny') {
    return { ok: true, status: transactionStatus };
  }

  const paid = isMidtransPaid({ transaction_status: transactionStatus, fraud_status: fraud });

  if (!paid) {
    return { ok: true, status: transactionStatus, pending: true };
  }

  const activated = await activateSubscriptionForOrder(orderId);
  return { ok: true, status: 'paid', activated };
}

export function getPublicPaymentConfig() {
  const cfg = getMidtransConfig();
  return {
    ok: true,
    clientKey: cfg.clientKey,
    isProduction: cfg.isProduction,
    merchantId: cfg.merchantId,
    plans: listPlans().map((p) => ({
      id: p.id,
      months: p.months,
      amount: p.amount,
      labelEn: p.labelEn,
      labelId: p.labelId,
    })),
    paymentMethods: CHECKOUT_PAYMENT_METHODS.map((m) => ({
      id: m.id,
      labelEn: m.labelEn,
      labelId: m.labelId,
      descriptionEn: m.descriptionEn,
      descriptionId: m.descriptionId,
      category: m.category,
      brandColor: m.brandColor,
      icon: m.icon,
      badges: m.badges || [],
    })),
    paymentMethodCategories: PAYMENT_METHOD_CATEGORIES.map((c) => ({
      id: c.id,
      labelEn: c.labelEn,
      labelId: c.labelId,
    })),
    midtransConfigured: midtransConfigured(),
    mongoRequired: persistenceRequired(),
  };
}
