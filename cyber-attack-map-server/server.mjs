/**
 * Bridge v2: Socket.io + HTTP ingest. Tidak pernah membuat serangan sintetis.
 * Auth: INGEST_TOKEN (legacy) atau API key (data/api-keys.json) via X-Api-Key / Bearer / X-Ingest-Token.
 */
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { createApiKey, loadApiKeys, revokeApiKey, verifyApiKey } from './ingest/apiKeys.mjs';
import { normalizeIncident } from './ingest/normalizeIncident.mjs';
import {
  findHistoryByOwnerUserId,
  findHistoryOlderThanWindow,
  findRecentByCreatedAt,
  findRecentByOwnerUserId,
  insertIncident,
  mongoDisabled,
} from './db/mongo.mjs';
import {
  authConfigured,
  getAuthConfig,
  getSession,
  handleGoogleCallback,
  loginWithPassword,
  parseSessionCookie,
  registerWithPassword,
  sessionCookieHeader,
  signOut,
  smtpConfigured,
  startGoogleOAuth,
  verifyChallenge,
} from './auth/auth.mjs';
import {
  confirmOrderPayment,
  createSnapTransaction,
  getPublicPaymentConfig,
  handleMidtransNotification,
  midtransConfigured,
  syncPendingPaymentsForEmail,
} from './payment/payments.mjs';
import { getUserByEmail, migrateLegacyVerifiedUsers, persistenceRequired } from './db/usersMongo.mjs';
import { ensureUserApiKey, resolveUserByIngestApiKey, verifyUserIngestApiKey } from './auth/userApiKeys.mjs';

const PORT = Number(process.env.PORT) || 3000;
const INGEST_TOKEN = process.env.INGEST_TOKEN?.trim() || '';
const ADMIN_SECRET = process.env.ADMIN_SECRET?.trim() || '';
const INGEST_ENABLED = process.env.INGEST_ENABLED === 'true';
const BRIDGE_VERSION = 2;
const MAX_BODY = 512 * 1024;
const FRONTEND_URL = process.env.FRONTEND_URL?.trim() || 'http://localhost:5173';
const AUTH_COOKIE_SECURE = process.env.AUTH_COOKIE_SECURE === 'true';

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

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed =
    origin === FRONTEND_URL ||
    origin === 'http://localhost:5173' ||
    origin === 'http://127.0.0.1:5173';
  if (allowed && origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Ingest-Token, X-Api-Key, X-Admin-Secret'
  );
}

function sessionFromRequest(req) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const cookieToken = parseSessionCookie(req.headers.cookie);
  return getSession(typeof bearer === 'string' && bearer ? bearer : cookieToken);
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
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
    authConfigured: authConfigured(),
    mongo: {
      persistence: !mongoDisabled(),
    },
  };
}

function reqUrl(req) {
  return new URL(req.url || '/', 'http://127.0.0.1');
}

function extractIngestToken(req) {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const headerToken = req.headers['x-ingest-token'];
  const apiKey = req.headers['x-api-key'];
  return typeof apiKey === 'string'
    ? apiKey
    : typeof headerToken === 'string'
      ? headerToken
      : typeof bearer === 'string'
        ? bearer
        : '';
}

async function authorizeIngest(req) {
  const token = extractIngestToken(req);
  if (!token) return false;
  if (INGEST_TOKEN && token === INGEST_TOKEN) return true;
  if (await verifyUserIngestApiKey(token)) return true;
  return verifyApiKey(token);
}

/** @returns {Promise<{ id: string, email: string } | null>} */
async function resolveIngestOwner(req) {
  const token = extractIngestToken(req);
  if (!token) return null;
  return resolveUserByIngestApiKey(token);
}

async function ingestAuthAllowed(req, res) {
  const keys = await loadApiKeys();
  const hasLegacyKeys = Boolean(INGEST_TOKEN) || keys.length > 0;
  const hasUserKeys = !mongoDisabled();
  if (!hasLegacyKeys && !hasUserKeys) {
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
  applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const p = pathname(req.url);

  if (p === '/auth/google' && req.method === 'GET') {
    const started = startGoogleOAuth();
    if (!started.ok) {
      redirect(res, `${FRONTEND_URL}/signin?error=${started.error}`);
      return;
    }
    redirect(res, started.url);
    return;
  }

  if (p === '/auth/google/callback' && req.method === 'GET') {
    const q = reqUrl(req).searchParams;
    const result = await handleGoogleCallback({
      code: q.get('code') || '',
      state: q.get('state') || '',
    });
    if (!result.ok) {
      redirect(res, `${FRONTEND_URL}/signin?error=${result.error}`);
      return;
    }
    if (result.directLogin && result.sessionToken) {
      res.setHeader(
        'Set-Cookie',
        sessionCookieHeader(result.sessionToken, { secure: AUTH_COOKIE_SECURE })
      );
      const sessionQ = encodeURIComponent(result.sessionToken);
      redirect(res, `${FRONTEND_URL}/?hub=1&session=${sessionQ}`);
      return;
    }
    const emailQ = encodeURIComponent(result.email);
    redirect(
      res,
      `${FRONTEND_URL}/signin?challenge=${encodeURIComponent(result.challengeId)}&email=${emailQ}`
    );
    return;
  }

  if (p === '/auth/verify' && req.method === 'POST') {
    try {
      const rawText = await readBody(req);
      const body = JSON.parse(rawText || '{}');
      const verified = await verifyChallenge({
        challengeId: body.challengeId,
        code: body.code,
      });
      if (!verified.ok) {
        sendJson(res, 400, verified);
        return;
      }
      res.setHeader('Set-Cookie', sessionCookieHeader(verified.sessionToken, { secure: AUTH_COOKIE_SECURE }));
      sendJson(res, 200, {
        ok: true,
        sessionToken: verified.sessionToken,
        user: verified.user,
      });
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  if (p === '/auth/register' && req.method === 'POST') {
    try {
      const rawText = await readBody(req);
      const body = JSON.parse(rawText || '{}');
      const result = await registerWithPassword({
        email: body.email,
        password: body.password,
      });
      if (!result.ok) {
        sendJson(res, 400, result);
        return;
      }
      sendJson(res, 200, result);
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  if (p === '/auth/login' && req.method === 'POST') {
    try {
      const rawText = await readBody(req);
      const body = JSON.parse(rawText || '{}');
      const result = await loginWithPassword({
        email: body.email,
        password: body.password,
      });
      if (!result.ok) {
        const status = result.error === 'verification_required' ? 403 : 401;
        sendJson(res, status, result);
        return;
      }
      res.setHeader('Set-Cookie', sessionCookieHeader(result.sessionToken, { secure: AUTH_COOKIE_SECURE }));
      sendJson(res, 200, {
        ok: true,
        sessionToken: result.sessionToken,
        user: result.user,
      });
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  if (p === '/auth/me' && req.method === 'GET') {
    const session = sessionFromRequest(req);
    if (!session) {
      sendJson(res, 401, { ok: false, error: 'not_authenticated' });
      return;
    }
    let stored = await getUserByEmail(session.email);
    if (stored?.subscription?.active && !stored?.apiKey) {
      await ensureUserApiKey(session.email);
      stored = await getUserByEmail(session.email);
    }
    sendJson(res, 200, {
      ok: true,
      user: stored
        ? {
            id: stored.id,
            email: stored.email,
            name: stored.name,
            picture: stored.picture,
            subscription: stored.subscription,
            apiKey: stored.apiKey,
          }
        : {
            email: session.email,
            name: session.name,
            picture: session.picture,
            subscription: null,
            apiKey: null,
          },
    });
    return;
  }

  if (p === '/account/incidents/recent' && req.method === 'GET') {
    const session = sessionFromRequest(req);
    const stored = session?.email ? await getUserByEmail(session.email) : null;
    if (!stored?.id) {
      sendJson(res, 401, { ok: false, error: 'not_authenticated' });
      return;
    }
    if (mongoDisabled()) {
      sendJson(res, 503, { ok: false, error: 'mongo_disabled' });
      return;
    }
    try {
      const hours = Math.min(168, Math.max(1, Number(reqUrl(req).searchParams.get('hours')) || 24));
      const incidents = await findRecentByOwnerUserId(stored.id, hours * 3600 * 1000);
      sendJson(res, 200, { ok: true, hours, count: incidents.length, incidents });
    } catch (e) {
      sendJson(res, 503, { ok: false, error: 'mongo_unavailable', message: String(e?.message || e) });
    }
    return;
  }

  if (p === '/account/incidents/history' && req.method === 'GET') {
    const session = sessionFromRequest(req);
    const stored = session?.email ? await getUserByEmail(session.email) : null;
    if (!stored?.id) {
      sendJson(res, 401, { ok: false, error: 'not_authenticated' });
      return;
    }
    if (mongoDisabled()) {
      sendJson(res, 503, { ok: false, error: 'mongo_disabled' });
      return;
    }
    try {
      const q = reqUrl(req).searchParams;
      const hours = Math.min(168, Math.max(1, Number(q.get('windowHours')) || 24));
      const windowMs = hours * 3600 * 1000;
      const limit = Math.min(500, Math.max(1, Number(q.get('limit')) || 50));
      const skip = Math.max(0, Number(q.get('skip')) || 0);
      const incidents = await findHistoryByOwnerUserId({
        ownerUserId: stored.id,
        windowMs,
        skip,
        limit,
      });
      sendJson(res, 200, { ok: true, windowHours: hours, skip, limit, count: incidents.length, incidents });
    } catch (e) {
      sendJson(res, 503, { ok: false, error: 'mongo_unavailable', message: String(e?.message || e) });
    }
    return;
  }

  if (p === '/payment/config' && req.method === 'GET') {
    sendJson(res, 200, getPublicPaymentConfig());
    return;
  }

  if (p === '/payment/snap' && req.method === 'POST') {
    const session = sessionFromRequest(req);
    if (!session?.email) {
      sendJson(res, 401, { ok: false, error: 'not_authenticated' });
      return;
    }
    if (!midtransConfigured()) {
      sendJson(res, 503, { ok: false, error: 'midtrans_not_configured' });
      return;
    }
    if (persistenceRequired()) {
      sendJson(res, 503, {
        ok: false,
        error: 'mongo_disabled',
        hint: 'Set MONGODB_DISABLED=false and run MongoDB for subscriptions.',
      });
      return;
    }
    try {
      const rawText = await readBody(req);
      const body = JSON.parse(rawText || '{}');
      const result = await createSnapTransaction({
        email: session.email,
        name: session.name || session.email,
        planId: body.planId,
        frontendUrl: FRONTEND_URL,
      });
      if (!result.ok) {
        sendJson(res, 400, result);
        return;
      }
      sendJson(res, 200, result);
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  if (p === '/payment/confirm' && req.method === 'POST') {
    const session = sessionFromRequest(req);
    if (!session?.email) {
      sendJson(res, 401, { ok: false, error: 'not_authenticated' });
      return;
    }
    try {
      const rawText = await readBody(req);
      const body = JSON.parse(rawText || '{}');
      const orderId = body.orderId || body.order_id;
      if (!orderId) {
        sendJson(res, 400, { ok: false, error: 'missing_order_id' });
        return;
      }
      const result = await confirmOrderPayment(orderId, session.email);
      sendJson(res, result.ok ? 200 : 400, result);
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  if (p === '/payment/sync' && req.method === 'POST') {
    const session = sessionFromRequest(req);
    if (!session?.email) {
      sendJson(res, 401, { ok: false, error: 'not_authenticated' });
      return;
    }
    try {
      const result = await syncPendingPaymentsForEmail(session.email);
      sendJson(res, 200, result);
    } catch (e) {
      sendJson(res, 500, { ok: false, error: 'sync_failed', message: String(e?.message || e) });
    }
    return;
  }

  if (p === '/payment/notification' && req.method === 'POST') {
    try {
      const rawText = await readBody(req);
      const body = JSON.parse(rawText || '{}');
      const result = await handleMidtransNotification(body);
      sendJson(res, result.ok ? 200 : 403, result);
    } catch {
      sendJson(res, 400, { ok: false, error: 'bad_json' });
    }
    return;
  }

  if (p === '/auth/signout' && req.method === 'POST') {
    const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const cookieToken = parseSessionCookie(req.headers.cookie);
    signOut(typeof bearer === 'string' && bearer ? bearer : cookieToken);
    res.setHeader('Set-Cookie', 'pd_session=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax');
    sendJson(res, 200, { ok: true });
    return;
  }

  if (p === '/auth/status' && req.method === 'GET') {
    const cfg = getAuthConfig();
    sendJson(res, 200, {
      ok: true,
      configured: authConfigured(),
      google: Boolean(cfg.googleClientId && cfg.googleClientSecret),
      smtp: smtpConfigured(),
    });
    return;
  }

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
      const owner = await resolveIngestOwner(req);
      if (owner) {
        incident.ownerUserId = owner.id;
        incident.ownerEmail = owner.email;
      }
      if (incident.ownerUserId) {
        io.to(`user:${incident.ownerUserId}`).emit('attack', incident);
      } else {
        io.emit('attack', incident);
      }
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

io.on('connection', async (socket) => {
  const authRaw = socket.handshake.auth?.sessionToken || socket.handshake.query?.session;
  const token = typeof authRaw === 'string' ? authRaw : '';
  const session = getSession(token) || getSession(parseSessionCookie(socket.handshake.headers?.cookie));
  if (session?.email) {
    const stored = await getUserByEmail(session.email);
    if (stored?.id) {
      socket.join(`user:${stored.id}`);
      socket.data.ownerUserId = stored.id;
    }
  }
  console.log('socket client', socket.id, socket.data.ownerUserId ? `user:${socket.data.ownerUserId}` : 'anon');
});

httpServer.listen(PORT, () => {
  console.log(`[bridge v${BRIDGE_VERSION}] ingest: ${INGEST_ENABLED ? 'ON' : 'OFF (set INGEST_ENABLED=true)'}`);
  console.log(`HTTP  GET  http://localhost:${PORT}/health`);
  console.log(`HTTP  POST http://localhost:${PORT}/ingest  (X-Api-Key or INGEST_TOKEN)`);
  console.log(`ADMIN      http://localhost:${PORT}/admin/api-keys  (X-Admin-Secret)`);
  if (ADMIN_SECRET) console.log('Admin: key management enabled');
  else console.log('Admin: set ADMIN_SECRET to create API keys');
  console.log(`Socket.io  http://localhost:${PORT}`);
  if (!mongoDisabled()) {
    migrateLegacyVerifiedUsers()
      .then(() => console.log('[auth] legacy users marked email-verified'))
      .catch((e) => console.warn('[auth] legacy user migration skipped:', e?.message || e));
  }
});
