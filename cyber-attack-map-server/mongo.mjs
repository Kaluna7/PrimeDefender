import { MongoClient } from 'mongodb';

const URI = (process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017').trim();
const DB_NAME = (process.env.MONGODB_DB || 'primedefender').trim();
const COLLECTION = (process.env.MONGODB_COLLECTION || 'incidents').trim();

/** @type {MongoClient | null} */
let client = null;
/** @type {import('mongodb').Collection | null} */
let collection = null;
let connectPromise = null;
let indexesEnsured = false;

export function mongoDisabled() {
  return process.env.MONGODB_DISABLED === 'true' || URI === '';
}

async function ensureIndexes(coll) {
  if (indexesEnsured) return;
  await coll.createIndex({ createdAt: -1 });
  await coll.createIndex({ storedAt: -1 });
  indexesEnsured = true;
}

export async function getCollection() {
  if (mongoDisabled()) return null;
  if (collection) return collection;
  if (!connectPromise) {
    connectPromise = MongoClient.connect(URI, { maxPoolSize: 10 })
      .then((c) => {
        client = c;
        collection = client.db(DB_NAME).collection(COLLECTION);
        return ensureIndexes(collection).then(() => collection);
      })
      .catch((e) => {
        connectPromise = null;
        collection = null;
        client = null;
        throw e;
      });
  }
  return connectPromise;
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
    .find({ createdAt: { $gte: cutoff } })
    .sort({ createdAt: -1 })
    .limit(500)
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
    .find({ createdAt: { $lt: cutoff } })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .toArray();
  return rows.map(stripMongo);
}
