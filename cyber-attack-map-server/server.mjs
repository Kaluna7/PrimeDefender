/**
 * Bridge v2: Socket.io + HTTP ingest. Tidak pernah membuat serangan sintetis.
 * Auth: INGEST_TOKEN (legacy) atau API key (data/api-keys.json) via X-Api-Key / Bearer / X-Ingest-Token.
 */
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApiKey, loadApiKeys, revokeApiKey, verifyApiKey } from './apiKeys.mjs';
import { normalizeIncident } from './normalizeIncident.mjs';
import {
  findHistoryOlderThanWindow,
  findRecentByCreatedAt,
  insertIncident,
  mongoDisabled,
} from './mongo.mjs';

const PORT = Number(process.env.PORT) || 3000;
const INGEST_TOKEN = process.env.INGEST_TOKEN?.trim() || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || '';
const INGEST_ENABLED = process.env.INGEST_ENABLED === 'true';
const BRIDGE_VERSION = 2;
const MAX_BODY = 512 * 1024;

function pathname(url) {
  if (!url) return '/';
  const q = url.indexOf('?');
  return q === -1 ? url : url.slice(0, q);
}

function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function applyCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Ingest-Token, X-Api-Key, X-Admin-Secret'
  );
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      total += chunk.length;
      if (total > MAX_BODY) {
        reject(new Error('payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function healthPayload() {
  return {
    ok: true,
    service: 'cyber-attack-map-server',
    version: BRIDGE_VERSION,
    ingestEnabled: INGEST_ENABLED,
    adminConfigured: Boolean(ADMIN_SECRET),
    mongo: {
      persistence: !mongoDisabled(),
    },
  };
}

function reqUrl(req) {
  return new URL(req.url || '/', 'http://127.0.0.1');
}

async function authorizeIngest(req) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const headerToken = req.headers['x-ingest-token'];
  const apiKey = req.headers['x-api-key'];
  const token =
    typeof apiKey === 'string'
      ? apiKey
      : typeof headerToken === 'string'
        ? headerToken
        : typeof bearer === 'string'
          ? bearer
          : '';
  if (!token) return false;
  if (INGEST_TOKEN && token === INGEST_TOKEN) return true;
  return verifyApiKey(token);
}

async function ingestAuthAllowed(req, res) {
  const keys = await loadApiKeys();
  if (!INGEST_TOKEN && keys.length === 0) {
    sendJson(res, 503, {
      ok: false,
      error: 'no_auth_configured',
      hint: 'Set INGEST_TOKEN or create keys: POST /admin/api-keys with X-Admin-Secret (ADMIN_SECRET on server).',
      version: BRIDGE_VERSION,
    });
    return false;
  }
  const ok = await authorizeIngest(req);
  if (!ok) {
    sendJson(res, 401, { ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

function assertAdmin(req, res) {
  if (!ADMIN_SECRET) {
    sendJson(res, 503, {
      ok: false,
      error: 'admin_disabled',
      hint: 'Set ADMIN_SECRET in bridge .env to manage API keys.',
    });
    return false;
  }
  const h = req.headers['x-admin-secret'];
  if (typeof h !== 'string' || h !== ADMIN_SECRET) {
    sendJson(res, 401, { ok: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

const httpServer = createServer(async (req, res) => {
  applyCors(res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const p = pathname(req.url);

  if (req.method === 'GET' && (p === '/' || p === '/?')) {
    sendJson(res, 200, {
      ...healthPayload(),
      note: 'Bridge v2 — set INGEST_ENABLED=true for POST /ingest. Use INGEST_TOKEN or per-customer API keys.',
        endpoints: {
        health: 'GET /health',
        ingest: 'POST /ingest',
        adminKeys: 'GET|POST /admin/api-keys, DELETE /admin/api-keys/:id (X-Admin-Secret)',
        incidentsRecent: 'GET /admin/incidents/recent?hours=24 (X-Admin-Secret)',
        incidentsHistory: 'GET /admin/incidents/history?windowHours=24&limit=50&skip=0 (X-Admin-Secret)',
      },
    });
    return;
  }

  if (req.method === 'GET' && (p === '/health' || req.url?.startsWith('/health?'))) {
    sendJson(res, 200, healthPayload());
    return;
  }

  if (p === '/admin/api-keys' || p === '/admin/api-keys/') {
    try {
      if (req.method === 'GET') {
        if (!assertAdmin(req, res)) return;
        const keys = await loadApiKeys();
        sendJson(res, 200, {
          ok: true,
          keys: keys.map((k) => ({
            id: k.id,
            prefix: k.prefix,
            label: k.label,
            createdAt: k.createdAt,
          })),
        });
        return;
      }
      if (req.method === 'POST') {
        if (!assertAdmin(req, res)) return;
        const rawText = await readBody(req);
        let label = '';
        try {
          const j = JSON.parse(rawText || '{}');
          if (typeof j.label === 'string') label = j.label;
        } catch {
          /* empty body ok */
        }
        const created = await createApiKey(label);
        sendJson(res, 201, {
          ok: true,
          id: created.id,
          apiKey: created.apiKey,
          prefix: created.prefix,
          createdAt: created.createdAt,
          warning: 'Store this key once; it is not shown again.',
        });
        return;
      }
    } catch (e) {
      sendJson(res, 500, { ok: false, error: 'admin_error' });
      return;
    }
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method not allowed');
    return;
  }

  if (req.method === 'DELETE' && p.startsWith('/admin/api-keys/')) {
    const id = p.slice('/admin/api-keys/'.length).replace(/\/$/, '');
    if (!id) {
      sendJson(res, 400, { ok: false, error: 'missing_id' });
      return;
    }
    if (!assertAdmin(req, res)) return;
    const revoked = await revokeApiKey(id);
    sendJson(res, 200, { ok: true, revoked });
    return;
  }

  const adminPath = reqUrl(req).pathname.replace(/\/$/, '') || '/';
  if (req.method === 'GET' && adminPath === '/admin/incidents/recent') {
    if (!assertAdmin(req, res)) return;
    if (mongoDisabled()) {
      sendJson(res, 503, {
        ok: false,
        error: 'mongo_disabled',
        hint: 'Unset MONGODB_DISABLED or set MONGODB_URI.',
      });
      return;
    }
    try {
      const q = reqUrl(req).searchParams;
      const hours = Math.min(168, Math.max(1, Number(q.get('hours')) || 24));
      const ms = hours * 3600 * 1000;
      const incidents = await findRecentByCreatedAt(ms);
      sendJson(res, 200, { ok: true, hours, count: incidents.length, incidents });
    } catch (e) {
      sendJson(res, 503, { ok: false, error: 'mongo_unavailable', message: String(e?.message || e) });
    }
    return;
  }

  if (req.method === 'GET' && adminPath === '/admin/incidents/history') {
    if (!assertAdmin(req, res)) return;
    if (mongoDisabled()) {
      sendJson(res, 503, {
        ok: false,
        error: 'mongo_disabled',
        hint: 'Unset MONGODB_DISABLED or set MONGODB_URI.',
      });
      return;
    }
    try {
      const q = reqUrl(req).searchParams;
      const hours = Math.min(168, Math.max(1, Number(q.get('windowHours')) || 24));
      const windowMs = hours * 3600 * 1000;
      const limit = Math.min(500, Math.max(1, Number(q.get('limit')) || 50));
      const skip = Math.max(0, Number(q.get('skip')) || 0);
      const incidents = await findHistoryOlderThanWindow({ windowMs, skip, limit });
      sendJson(res, 200, {
        ok: true,
        windowHours: hours,
        skip,
        limit,
        count: incidents.length,
        incidents,
      });
    } catch (e) {
      sendJson(res, 503, { ok: false, error: 'mongo_unavailable', message: String(e?.message || e) });
    }
    return;
  }

  if (req.method === 'POST' && (p === '/ingest' || p === '/ingest/')) {
    try {
      if (!INGEST_ENABLED) {
        sendJson(res, 403, {
          ok: false,
          error: 'ingest_disabled',
          hint: 'Set INGEST_ENABLED=true when ready.',
          version: BRIDGE_VERSION,
        });
        return;
      }

      if (!(await ingestAuthAllowed(req, res))) return;

      const rawText = await readBody(req);
      const parsed = JSON.parse(rawText);
      const payload = parsed.attack ?? parsed.event ?? parsed;

      if (
        !payload ||
        !payload.from ||
        !payload.to ||
        typeof payload.from.lat !== 'number' ||
        typeof payload.from.lon !== 'number' ||
        typeof payload.to.lat !== 'number' ||
        typeof payload.to.lon !== 'number'
      ) {
        sendJson(res, 400, {
          ok: false,
          error: 'invalid_payload',
          hint: 'Require from: { lat, lon }, to: { lat, lon }',
        });
        return;
      }

      const incident = normalizeIncident(payload);
      io.emit('attack', incident);
      await insertIncident(incident);
      const tag = [incident.siteId, incident.tenantId, incident.id].filter(Boolean).join(' ') || 'event';
      console.log('[ingest] broadcast → UI', tag);
      sendJson(res, 200, { ok: true, broadcast: true });
    } catch (e) {
      if (e.message === 'payload too large') {
        sendJson(res, 413, { ok: false, error: 'payload_too_large' });
        return;
      }
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

const io = new Server(httpServer, {
  cors: { origin: '*' },
});

io.on('connection', (socket) => {
  console.log('socket client', socket.id);
});

httpServer.listen(PORT, () => {
  console.log(`[bridge v${BRIDGE_VERSION}] ingest: ${INGEST_ENABLED ? 'ON' : 'OFF (set INGEST_ENABLED=true)'}`);
  console.log(`HTTP  GET  http://localhost:${PORT}/health`);
  console.log(`HTTP  POST http://localhost:${PORT}/ingest  (X-Api-Key or INGEST_TOKEN)`);
  console.log(`ADMIN      http://localhost:${PORT}/admin/api-keys  (X-Admin-Secret)`);
  if (ADMIN_SECRET) console.log('Admin: key management enabled');
  else console.log('Admin: set ADMIN_SECRET to create API keys');
  console.log(`Socket.io  http://localhost:${PORT}`);
});
