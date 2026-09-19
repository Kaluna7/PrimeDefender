import { MongoClient } from 'mongodb';

function stripEnv(value) {
  if (!value || typeof value !== 'string') return '';
  return value.trim().replace(/^["']|["']$/g, '');
}

function normalizeMongoUri(value) {
  return stripEnv(value).replace(/\/+$/, '');
}

function isLocalMongoUri(uri) {
  if (!uri) return true;
  try {
    const parsed = new URL(uri);
    const host = (parsed.hostname || '').toLowerCase();
    return host === '127.0.0.1' || host === 'localhost' || host === '::1';
  } catch {
    return /127\.0\.0\.1|localhost/i.test(uri);
  }
}

function runningOnRailway() {
  return Boolean(
    process.env.RAILWAY_ENVIRONMENT ||
      process.env.RAILWAY_SERVICE_NAME ||
      process.env.RAILWAY_PROJECT_ID
  );
}

const RAW_URI = stripEnv(process.env.MONGODB_URI);
const URI = normalizeMongoUri(RAW_URI) || 'mongodb://127.0.0.1:27017';
const DB_NAME = stripEnv(process.env.MONGODB_DB) || 'Jagra Baya Maya';
const COLLECTION = stripEnv(process.env.MONGODB_COLLECTION) || 'incidents';
const LOCAL_MONGO = isLocalMongoUri(URI);
const ON_RAILWAY = runningOnRailway();

const MONGO_OPTIONS = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  ignoreUndefined: true,
};

/** @type {MongoClient | null} */
let client = null;
/** @type {import('mongodb').Db | null} */
let db = null;
/** @type {import('mongodb').Collection | null} */
let collection = null;
let connectPromise = null;
let indexesEnsured = false;

export function mongoDisabled() {
  const disabled = stripEnv(process.env.MONGODB_DISABLED);
  if (disabled === 'true' || URI === '') return true;
  // Localhost Mongo is fine on a laptop, but never on Railway.
  if (ON_RAILWAY && LOCAL_MONGO) return true;
  return false;
}

export function logMongoTarget() {
  if (ON_RAILWAY && LOCAL_MONGO) {
    console.error(
      '[mongo] MONGODB_URI points to localhost — set Atlas URI in Railway Variables (e.g. mongodb+srv://...)'
    );
    return;
  }
  try {
    const host = URI.includes('@') ? URI.split('@')[1]?.split('/')[0] : URI;
    console.log(`[mongo] target: ${host || '(unset)'}`);
  } catch {
    console.log('[mongo] target: (invalid URI)');
  }
}

const INCIDENT_FILTER = { category: { $exists: true } };

async function ensureIndexes(coll) {
  if (indexesEnsured) return;
  await coll.createIndex({ createdAt: -1 });
  await coll.createIndex({ storedAt: -1 });
  await coll.createIndex({ ownerUserId: 1, createdAt: -1 });
  await coll.createIndex({ ownerEmail: 1, createdAt: -1 });

  for (const oldAiIndex of [
    'docType_1_ownerEmail_1_dateKey_1_slot_1_locale_1',
    'daily_comment_unique',
  ]) {
    try {
      await coll.dropIndex(oldAiIndex);
    } catch {
      /* legacy index may not exist */
    }
  }
  indexesEnsured = true;
}

export async function getCollection() {
  if (mongoDisabled()) return null;
  if (collection) return collection;
  if (!connectPromise) {
    connectPromise = (async () => {
      try {
        const c = await MongoClient.connect(URI, MONGO_OPTIONS);
        client = c;
        db = client.db(DB_NAME);
        collection = db.collection(COLLECTION);
        try {
          await ensureIndexes(collection);
        } catch (e) {
          console.warn('[mongo] index setup warning:', e?.message || e);
        }
        return collection;
      } catch (e) {
        collection = null;
        db = null;
        connectPromise = null;
        console.error('[mongo] connect failed:', e?.message || e);
        const toClose = client;
        client = null;
        if (toClose) {
          toClose.close().catch(() => {});
        }
        return null;
      }
    })();
  }
  return connectPromise;
}

/** @param {string} name */
export async function getNamedCollection(name) {
  if (mongoDisabled()) return null;
  const ready = await getCollection();
  if (!ready || !db) return null;
  return db.collection(name);
}

/** @returns {Promise<boolean>} */
export async function pingMongo() {
  if (mongoDisabled()) return false;
  try {
    const coll = await getCollection();
    if (!coll) return false;
    await coll.db.admin().ping();
    return true;
  } catch (e) {
    console.error('[mongo] ping failed:', e?.message || e);
    return false;
  }
}

/**
 * @param {Record<string, unknown>} incident - normalized incident (no _id)
 */
export async function insertIncident(incident) {
  if (mongoDisabled()) return { ok: false, skipped: true };
  try {
    const coll = await getCollection();
    if (!coll) return { ok: false };
    await coll.insertOne({
      ...incident,
      storedAt: new Date(),
    });
    return { ok: true };
  } catch (e) {
    console.error('[mongo] insert failed:', e?.message || e);
    return { ok: false, error: String(e?.message || e) };
  }
}

function stripMongo(doc) {
  if (!doc || typeof doc !== 'object') return doc;
  const { _id, storedAt, ...rest } = doc;
  return rest;
}

/**
 * Incidents with createdAt in [now - ms, now], newest first.
 * @param {number} ms
 */
export async function findRecentByCreatedAt(ms) {
  if (mongoDisabled()) return [];
  const coll = await getCollection();
  if (!coll) return [];
  const cutoff = Date.now() - ms;
  const rows = await coll
    .find({ ...INCIDENT_FILTER, createdAt: { $gte: cutoff } })
    .sort({ createdAt: -1 })
    .limit(1001)
    .toArray();
  return rows.map(stripMongo);
}

/**
 * Incidents older than the rolling window (by createdAt), newest first.
 * @param {{ windowMs: number, skip: number, limit: number }} opts
 */
export async function findHistoryOlderThanWindow(opts) {
  if (mongoDisabled()) return [];
  const coll = await getCollection();
  if (!coll) return [];
  const { windowMs, skip, limit } = opts;
  const cutoff = Date.now() - windowMs;
  const rows = await coll
    .find({ ...INCIDENT_FILTER, createdAt: { $lt: cutoff } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return rows.map(stripMongo);
}

/**
 * Insiden live milik satu akun (24h window default via ms).
 * @param {string} ownerUserId
 * @param {number} ms
 */
export async function findRecentByOwnerUserId(ownerUserId, ms) {
  if (mongoDisabled() || !ownerUserId) return [];
  const coll = await getCollection();
  if (!coll) return [];
  const cutoff = Date.now() - ms;
  const rows = await coll
    .find({ ...INCIDENT_FILTER, ownerUserId, createdAt: { $gte: cutoff } })
    .sort({ createdAt: -1 })
    .limit(1001)
    .toArray();
  return rows.map(stripMongo);
}

/**
 * @param {{ ownerUserId: string, windowMs: number, skip: number, limit: number }} opts
 */
export async function findHistoryByOwnerUserId(opts) {
  if (mongoDisabled() || !opts.ownerUserId) return [];
  const coll = await getCollection();
  if (!coll) return [];
  const cutoff = Date.now() - opts.windowMs;
  const rows = await coll
    .find({ ...INCIDENT_FILTER, ownerUserId: opts.ownerUserId, createdAt: { $lt: cutoff } })
    .sort({ createdAt: -1 })
    .skip(opts.skip)
    .limit(opts.limit)
    .toArray();
  return rows.map(stripMongo);
}
