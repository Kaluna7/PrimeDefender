import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const DEFAULT_FILE = join(process.cwd(), 'data', 'api-keys.json');

function keysPath() {
  return process.env.API_KEYS_FILE?.trim() || DEFAULT_FILE;
}

export function hashApiKey(key) {
  return createHash('sha256').update(key, 'utf8').digest('hex');
}

function safeEqualHex(a, b) {
  try {
    const ba = Buffer.from(a, 'hex');
    const bb = Buffer.from(b, 'hex');
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<Array<{ id: string; hash: string; label: string; prefix: string; createdAt: number }>>}
 */
export async function loadApiKeys() {
  try {
    const raw = await readFile(keysPath(), 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveApiKeys(keys) {
  const p = keysPath();
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(keys, null, 2), 'utf8');
}

/**
 * @param {string} label
 * @returns {Promise<{ id: string; apiKey: string; prefix: string; createdAt: number }>}
 */
export async function createApiKey(label = '') {
  const apiKey = `pd_${randomBytes(24).toString('base64url')}`;
  const hash = hashApiKey(apiKey);
  const id = randomUUID();
  const createdAt = Date.now();
  const prefix = `${apiKey.slice(0, 12)}…`;
  const keys = await loadApiKeys();
  keys.push({
    id,
    hash,
    label: typeof label === 'string' ? label.slice(0, 200) : '',
    prefix,
    createdAt,
  });
  await saveApiKeys(keys);
  return { id, apiKey, prefix, createdAt };
}

export async function revokeApiKey(id) {
  const keys = await loadApiKeys();
  const next = keys.filter((k) => k.id !== id);
  if (next.length === keys.length) return false;
  await saveApiKeys(next);
  return true;
}

/**
 * @param {string} plainKey
 * @returns {Promise<boolean>}
 */
export async function verifyApiKey(plainKey) {
  if (!plainKey || typeof plainKey !== 'string') return false;
  const keys = await loadApiKeys();
  const h = hashApiKey(plainKey);
  return keys.some((k) => safeEqualHex(h, k.hash));
}
