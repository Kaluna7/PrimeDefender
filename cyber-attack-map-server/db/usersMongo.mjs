import { getNamedCollection, mongoDisabled } from './mongo.mjs';
import { ensureUserApiKey } from '../auth/userApiKeys.mjs';

let userIndexes = false;

async function usersColl() {
  const coll = await getNamedCollection('users');
  if (!coll || userIndexes) return coll;
  await coll.createIndex({ email: 1 }, { unique: true });
  userIndexes = true;
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
      $setOnInsert: { email, createdAt: now },
    },
    { upsert: true, returnDocument: 'after' }
  );
  const doc = result;
  if (!doc) return null;
  return grantFreeApiAccess(email);
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
    });
    await grantFreeApiAccess(normalized);
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

/**
 * Pastikan user mempunyai API key.
 * @param {string} email
 */
export async function grantFreeApiAccess(email) {
  const coll = await usersColl();
  if (!coll) return null;
  const normalized = String(email).toLowerCase().trim();
  if (!normalized) return null;

  const doc = await coll.findOne({ email: normalized });
  if (!doc) return null;

  await ensureUserApiKey(normalized);
  const updated = await coll.findOne({ email: normalized });
  return updated ? formatUser(updated) : null;
}

/**
 * Migrasi sekali: buat API key untuk user lama yang belum memilikinya.
 */
export async function migrateGrantFreeApiAccess() {
  const coll = await usersColl();
  if (!coll) return { updated: 0 };
  let updated = 0;
  const cursor = coll.find({});
  for await (const doc of cursor) {
    if (!doc?.email) continue;
    const hasKey = Boolean(doc.apiKey?.hash || doc.apiKey?.plain);
    if (hasKey) continue;
    await grantFreeApiAccess(doc.email);
    updated += 1;
  }
  return { updated };
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

/**
 * @param {string} email
 * @param {string} passwordHash
 */
export async function updateUserPasswordHash(email, passwordHash) {
  const coll = await usersColl();
  if (!coll) return false;
  const normalized = String(email).toLowerCase().trim();
  const result = await coll.updateOne(
    { email: normalized },
    { $set: { passwordHash, updatedAt: Date.now() } }
  );
  return result.matchedCount > 0;
}

function formatApiKeyMeta(doc) {
  const k = doc.apiKey;
  if (!k) return null;
  const plain = typeof k.plain === 'string' ? k.plain : null;
  const hasKey = Boolean(k.hash || plain || k.prefix);
  if (!hasKey) return null;
  const prefix = k.prefix || (plain ? `${plain.slice(0, 12)}…` : 'pd_••••••••••••');
  return {
    prefix,
    createdAt: k.createdAt,
    hasKey: true,
  };
}

function formatUser(doc) {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name,
    picture: doc.picture || undefined,
    apiKey: formatApiKeyMeta(doc),
  };
}
