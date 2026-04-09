import { THREAT_CATEGORY, DDOS_VECTOR, SEVERITY_ORDER } from '../constants/threatCategories.js';

const ALLOWED_CATEGORY = new Set(Object.values(THREAT_CATEGORY));

function normalizeDdos(rawDdos) {
  if (!rawDdos || typeof rawDdos !== 'object') return undefined;

  const out = {};
  if (typeof rawDdos.vector === 'string' && Object.values(DDOS_VECTOR).includes(rawDdos.vector)) {
    out.vector = rawDdos.vector;
  }
  if (Array.isArray(rawDdos.dependencies)) {
    out.dependencies = rawDdos.dependencies.filter((x) => typeof x === 'string');
  }
  if (typeof rawDdos.peakGbps === 'number' && Number.isFinite(rawDdos.peakGbps)) {
    out.peakGbps = rawDdos.peakGbps;
  }
  if (typeof rawDdos.packetsPerSec === 'number' && Number.isFinite(rawDdos.packetsPerSec)) {
    out.packetsPerSec = rawDdos.packetsPerSec;
  }

  return Object.keys(out).length ? out : undefined;
}

/**
 * Normalize upstream (middleware) payloads. Does not invent categories, metrics, or labels.
 * Expected minimum: { from: { lat, lon }, to: { lat, lon } }.
 */
export function normalizeAttackPayload(raw) {
  let category = THREAT_CATEGORY.UNKNOWN;
  if (raw.category && ALLOWED_CATEGORY.has(raw.category)) {
    category = raw.category;
  }

  let severity = 'medium';
  if (raw.severity && SEVERITY_ORDER.includes(raw.severity)) {
    severity = raw.severity;
  }

  let ddos;
  if (category === THREAT_CATEGORY.DDOS) {
    ddos = normalizeDdos(raw.ddos);
  }

  const sourceLabel =
    typeof raw.sourceLabel === 'string'
      ? raw.sourceLabel
      : typeof raw.source === 'string'
        ? raw.source
        : '';
  const targetLabel =
    typeof raw.targetLabel === 'string'
      ? raw.targetLabel
      : typeof raw.target === 'string'
        ? raw.target
        : '';

  const id =
    typeof raw.id === 'string' && raw.id.length > 0
      ? raw.id
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

  const tenantId = typeof raw.tenantId === 'string' ? raw.tenantId : undefined;
  const siteId = typeof raw.siteId === 'string' ? raw.siteId : undefined;

  const blocked =
    typeof raw.blocked === 'boolean'
      ? raw.blocked
      : raw.action === 'blocked' || raw.mitigation === 'block';

  const path = typeof raw.path === 'string' ? raw.path : undefined;
  const method = typeof raw.method === 'string' ? raw.method : undefined;
  const action = typeof raw.action === 'string' ? raw.action : undefined;

  let osiLayer;
  const L = raw.osiLayer ?? raw.layer;
  if (typeof L === 'number' && L >= 1 && L <= 7) osiLayer = L;
  else if (typeof L === 'string' && /^\d+$/.test(L)) {
    const n = Number(L);
    if (n >= 1 && n <= 7) osiLayer = n;
  }

  const attackerIpRaw = raw.attackerIp ?? raw.clientIp ?? raw.sourceIp;
  const attackerIp =
    typeof attackerIpRaw === 'string' && attackerIpRaw.trim() ? attackerIpRaw.trim().slice(0, 64) : undefined;

  const userAgent =
    typeof raw.userAgent === 'string' && raw.userAgent.trim()
      ? raw.userAgent.trim().slice(0, 512)
      : undefined;

  const detection =
    typeof raw.detection === 'string' && raw.detection.trim()
      ? raw.detection.trim().slice(0, 120)
      : undefined;

  return {
    id,
    from: raw.from,
    to: raw.to,
    category,
    severity,
    ddos,
    sourceLabel,
    targetLabel,
    tenantId,
    siteId,
    blocked: blocked || undefined,
    path,
    method,
    action,
    osiLayer,
    attackerIp,
    userAgent,
    detection,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
  };
}
