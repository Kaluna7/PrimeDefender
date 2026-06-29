import { randomBytes, randomUUID } from 'node:crypto';
import { hashApiKey } from '../ingest/apiKeys.mjs';
import { getNamedCollection, mongoDisabled } from '../db/mongo.mjs';

async function usersColl() {
  return getNamedCollection('users');
}

/**
 * Buat API key untuk user jika belum ada (setelah langganan aktif).
 * @param {string} email
 */
export async function ensureUserApiKey(email) {
  const coll = await usersColl();
  if (!coll) return null;
  const normalized = String(email).toLowerCase().trim();
  const doc = await coll.findOne({ email: normalized });
  if (doc?.apiKey?.plain) {
    let hash = doc.apiKey.hash;
    if (!hash) {
      hash = hashApiKey(doc.apiKey.plain);
      const prefix = doc.apiKey.prefix || `${doc.apiKey.plain.slice(0, 12)}…`;
      await coll.updateOne(
        { email: normalized },
        { $set: { 'apiKey.hash': hash, 'apiKey.prefix': prefix, updatedAt: Date.now() } }
      );
    }
    return {
      apiKey: doc.apiKey.plain,
      prefix: doc.apiKey.prefix || `${doc.apiKey.plain.slice(0, 12)}…`,
      createdAt: doc.apiKey.createdAt,
      existing: true,
    };
  }
  if (doc?.apiKey?.hash) {
    return {
      apiKey: null,
      prefix: doc.apiKey.prefix || 'pd_••••••••••••',
      createdAt: doc.apiKey.createdAt,
      existing: true,
    };
  }
  const apiKey = `pd_${randomBytes(24).toString('base64url')}`;
  const hash = hashApiKey(apiKey);
  const prefix = `${apiKey.slice(0, 12)}…`;
  const createdAt = Date.now();
  await coll.updateOne(
    { email: normalized },
    {
      $set: {
        apiKey: { id: randomUUID(), hash, plain: apiKey, prefix, createdAt },
        updatedAt: createdAt,
      },
    },
    { upsert: true }
  );
  return { apiKey, prefix, createdAt, existing: false };
}

/**
 * @param {string} email
 * @returns {Promise<string | null>}
 */
export async function getUserApiKeyPlain(email) {
  const coll = await usersColl();
  if (!coll) return null;
  const normalized = String(email).toLowerCase().trim();
  const doc = await coll.findOne({ email: normalized });
  return doc?.apiKey?.plain || null;
}

/**
 * Ganti API key user dengan yang baru (langganan harus aktif).
 * @param {string} email
 */
export async function regenerateUserApiKey(email) {
  const coll = await usersColl();
  if (!coll) return null;
  const normalized = String(email).toLowerCase().trim();
  const doc = await coll.findOne({ email: normalized });
  if (!doc) return null;

  const now = Date.now();
  const sub = doc.subscription;
  const active = sub?.expiresAt > now && (!sub.status || sub.status === 'active');
  if (!active) return null;

  const apiKey = `pd_${randomBytes(24).toString('base64url')}`;
  const hash = hashApiKey(apiKey);
  const prefix = `${apiKey.slice(0, 12)}…`;
  const createdAt = now;

  await coll.updateOne(
    { email: normalized },
    {
      $set: {
        apiKey: { id: randomUUID(), hash, plain: apiKey, prefix, createdAt },
        updatedAt: createdAt,
      },
    }
  );

  return { apiKey, prefix, createdAt };
}

/**
 * @param {string} plainKey
 */
export async function verifyUserIngestApiKey(plainKey) {
  const owner = await resolveUserByIngestApiKey(plainKey);
  return Boolean(owner);
}

/**
 * Pemilik insiden untuk POST /ingest (API key user + langganan aktif).
 * @param {string} plainKey
 * @returns {Promise<{ id: string, email: string } | null>}
 */
export async function resolveUserByIngestApiKey(plainKey) {
  if (mongoDisabled() || !plainKey) return null;
  const coll = await usersColl();
  if (!coll) return null;
  const h = hashApiKey(plainKey);
  const now = Date.now();
  const doc = await coll.findOne({
    'apiKey.hash': h,
    'subscription.expiresAt': { $gt: now },
  });
  if (!doc) return null;
  const sub = doc.subscription;
  if (!sub || (sub.status && sub.status !== 'active')) return null;
  return { id: String(doc._id), email: doc.email };
}
