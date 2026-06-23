import { getNamedCollection, mongoDisabled } from './mongo.mjs';
import { getPlan } from '../payment/plans.mjs';
import { ensureUserApiKey } from '../auth/userApiKeys.mjs';

let userIndexes = false;
let orderIndexes = false;

async function usersColl() {
  const coll = await getNamedCollection('users');
  if (!coll || userIndexes) return coll;
  await coll.createIndex({ email: 1 }, { unique: true });
  userIndexes = true;
  return coll;
}

async function ordersColl() {
  const coll = await getNamedCollection('orders');
  if (!coll || orderIndexes) return coll;
  await coll.createIndex({ orderId: 1 }, { unique: true });
  await coll.createIndex({ email: 1, createdAt: -1 });
  orderIndexes = true;
  return coll;
}

export function persistenceRequired() {
  return mongoDisabled();
}

/**
 * @param {{ email: string, name?: string, picture?: string }} profile
 */
export async function upsertUserByEmail(profile) {
  const coll = await usersColl();
  if (!coll) return null;
  const email = String(profile.email || '').toLowerCase().trim();
  if (!email) return null;
  const now = Date.now();
  const result = await coll.findOneAndUpdate(
    { email },
    {
      $set: {
        name: profile.name || email,
        picture: profile.picture || null,
        updatedAt: now,
      },
      $setOnInsert: { email, createdAt: now, subscription: null },
    },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = result;
  if (!doc) return null;
  return formatUser(doc);
}

export async function getUserByEmail(email) {
  const coll = await usersColl();
  if (!coll) return null;
  const doc = await coll.findOne({ email: String(email).toLowerCase().trim() });
  return doc ? formatUser(doc) : null;
}

/**
 * @param {string} email
 */
export async function findUserAuthByEmail(email) {
  const coll = await usersColl();
  if (!coll) return null;
  const doc = await coll.findOne({ email: String(email).toLowerCase().trim() });
  if (!doc) return null;
  return {
    email: doc.email,
    name: doc.name,
    picture: doc.picture || undefined,
    passwordHash: typeof doc.passwordHash === 'string' ? doc.passwordHash : null,
    emailVerifiedAt: doc.emailVerifiedAt || null,
  };
}

/**
 * @param {{ email: string, passwordHash: string, name?: string }} input
 */
export async function createPasswordUser({ email, passwordHash, name }) {
  const coll = await usersColl();
  if (!coll) return { ok: false, error: 'mongo_disabled' };
  const normalized = String(email).toLowerCase().trim();
  if (!normalized) return { ok: false, error: 'invalid_email' };
  const now = Date.now();
  try {
    await coll.insertOne({
      email: normalized,
      name: name || normalized.split('@')[0],
      passwordHash,
      picture: null,
      createdAt: now,
      updatedAt: now,
      subscription: null,
    });
    return { ok: true, email: normalized, name: name || normalized.split('@')[0] };
  } catch (e) {
    if (e?.code === 11000) return { ok: false, error: 'email_taken' };
    throw e;
  }
}

export async function isUserEmailVerified(email) {
  const coll = await usersColl();
  if (!coll) return false;
  const normalized = String(email).toLowerCase().trim();
  const doc = await coll.findOne({ email: normalized });
  if (!doc) return false;
  if (doc.emailVerifiedAt) return true;

  // Akun lama: sudah terdaftar di DB sebelum field emailVerifiedAt ada
  const legacyAt = doc.updatedAt || doc.createdAt || Date.now();
  await coll.updateOne(
    { email: normalized },
    { $set: { emailVerifiedAt: legacyAt, updatedAt: Date.now() } }
  );
  return true;
}

/** Sekali saat server start: tandai semua user lama sebagai terverifikasi. */
export async function migrateLegacyVerifiedUsers() {
  const coll = await usersColl();
  if (!coll) return;
  const now = Date.now();
  const cursor = coll.find({
    $or: [{ emailVerifiedAt: { $exists: false } }, { emailVerifiedAt: null }],
  });
  for await (const doc of cursor) {
    await coll.updateOne(
      { _id: doc._id },
      { $set: { emailVerifiedAt: doc.updatedAt || doc.createdAt || now } }
    );
  }
}

export async function markEmailVerified(email) {
  const coll = await usersColl();
  if (!coll) return;
  const normalized = String(email).toLowerCase().trim();
  const now = Date.now();
  await coll.updateOne(
    { email: normalized },
    { $set: { emailVerifiedAt: now, updatedAt: now } },
    { upsert: false }
  );
}

function formatUser(doc) {
  const sub = doc.subscription;
  const active =
    sub &&
    typeof sub.expiresAt === 'number' &&
    sub.expiresAt > Date.now() &&
    (sub.status === 'active' || !sub.status);
  const plan = sub?.planId ? getPlan(sub.planId) : null;
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    picture: doc.picture || undefined,
    subscription: sub
      ? {
          planId: sub.planId,
          expiresAt: sub.expiresAt,
          active,
          orderId: sub.orderId,
          months: plan?.months,
          labelEn: plan?.labelEn,
          labelId: plan?.labelId,
        }
      : null,
    apiKey:
      active && doc.apiKey?.plain
        ? {
            key: doc.apiKey.plain,
            prefix: doc.apiKey.prefix,
            createdAt: doc.apiKey.createdAt,
          }
        : null,
  };
}

/**
 * @param {{ orderId: string, email: string, planId: string, amount: number }} order
 */
export async function createPendingOrder(order) {
  const coll = await ordersColl();
  if (!coll) return { ok: false, error: 'mongo_disabled' };
  const plan = getPlan(order.planId);
  if (!plan) return { ok: false, error: 'invalid_plan' };
  try {
    await coll.insertOne({
      orderId: order.orderId,
      email: order.email.toLowerCase(),
      planId: order.planId,
      amount: order.amount,
      months: plan.months,
      status: 'pending',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return { ok: true };
  } catch (e) {
    if (e?.code === 11000) return { ok: false, error: 'duplicate_order' };
    throw e;
  }
}

export async function findOrderByOrderId(orderId) {
  const coll = await ordersColl();
  if (!coll) return null;
  return coll.findOne({ orderId });
}

export async function findPendingOrdersByEmail(email) {
  const coll = await ordersColl();
  if (!coll) return [];
  return coll
    .find({ email: String(email).toLowerCase().trim(), status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}

/**
 * @param {string} orderId
 * @param {{ status: string, transactionId?: string, paymentType?: string }} meta
 */
export async function updateOrderStatus(orderId, meta) {
  const coll = await ordersColl();
  if (!coll) return null;
  return coll.findOneAndUpdate(
    { orderId },
    {
      $set: {
        status: meta.status,
        midtransTransactionId: meta.transactionId || null,
        paymentType: meta.paymentType || null,
        updatedAt: Date.now(),
        ...(meta.status === 'paid' ? { paidAt: Date.now() } : {}),
      },
    },
    { returnDocument: 'after' }
  );
}

/**
 * Activate or extend subscription after successful payment.
 */
export async function activateSubscriptionForOrder(orderId) {
  const order = await findOrderByOrderId(orderId);
  if (!order) return { ok: false, error: 'order_not_found' };
  if (order.status === 'paid') {
    const keyInfo = await ensureUserApiKey(order.email);
    return {
      ok: true,
      already: true,
      expiresAt: user?.subscription?.expiresAt,
      planId: order.planId,
      apiKey: keyInfo?.apiKey,
    };
  }
  const plan = getPlan(order.planId);
  if (!plan) return { ok: false, error: 'invalid_plan' };

  const users = await usersColl();
  if (!users) return { ok: false, error: 'mongo_disabled' };

  const email = order.email;
  const user = await users.findOne({ email });
  const now = Date.now();
  const base = Math.max(now, user?.subscription?.expiresAt || 0);
  const expiresAt = base + plan.months * 30 * 24 * 60 * 60 * 1000;

  await users.updateOne(
    { email },
    {
      $set: {
        subscription: {
          planId: order.planId,
          expiresAt,
          status: 'active',
          orderId,
          activatedAt: now,
        },
        updatedAt: now,
      },
      $setOnInsert: {
        email,
        name: email,
        createdAt: now,
      },
    },
    { upsert: true }
  );

  await updateOrderStatus(orderId, { status: 'paid' });
  const keyInfo = await ensureUserApiKey(email);
  return {
    ok: true,
    expiresAt,
    planId: order.planId,
    apiKey: keyInfo?.apiKey,
    apiKeyPrefix: keyInfo?.prefix,
  };
}
