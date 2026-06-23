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

function coordString(point) {
  const lat = point?.lat;
  const lon = point?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return undefined;
  return `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
}

function synthesizeGeoMeta(rawGeoMeta, sourceLabel, fromPoint) {
  const fromCoords = coordString(fromPoint);
  const location =
    rawGeoMeta && typeof rawGeoMeta.location === 'string' && rawGeoMeta.location.trim()
      ? rawGeoMeta.location.trim().slice(0, 160)
      : sourceLabel || undefined;
  const coordinates =
    rawGeoMeta && typeof rawGeoMeta.coordinates === 'string' && rawGeoMeta.coordinates.trim()
      ? rawGeoMeta.coordinates.trim().slice(0, 64)
      : fromCoords;
  const accuracy =
    rawGeoMeta && typeof rawGeoMeta.accuracy === 'string' && rawGeoMeta.accuracy.trim()
      ? rawGeoMeta.accuracy.trim().slice(0, 32)
      : fromCoords
        ? 'MEDIUM'
        : undefined;
  const note =
    rawGeoMeta && typeof rawGeoMeta.note === 'string' && rawGeoMeta.note.trim()
      ? rawGeoMeta.note.trim().slice(0, 200)
      : fromCoords
        ? 'Derived from incident coordinates'
        : undefined;

  if (!location && !coordinates && !accuracy && !note) return undefined;
  return { location, coordinates, accuracy, note };
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
  const incidentId =
    typeof raw.incidentId === 'string' && raw.incidentId.trim()
      ? raw.incidentId.trim().slice(0, 128)
      : undefined;

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

  const requestId =
    typeof (raw.requestId ?? raw.request_id) === 'string' && String(raw.requestId ?? raw.request_id).trim()
      ? String(raw.requestId ?? raw.request_id).trim().slice(0, 128)
      : undefined;

  const forwardedFor =
    typeof (raw.forwardedFor ?? raw.requestHeaders?.['x-forwarded-for']) === 'string' &&
    String(raw.forwardedFor ?? raw.requestHeaders?.['x-forwarded-for']).trim()
      ? String(raw.forwardedFor ?? raw.requestHeaders?.['x-forwarded-for']).trim().slice(0, 512)
      : undefined;

  const targetServiceRaw = raw.targetService ?? raw.target?.service;
  const targetService =
    typeof targetServiceRaw === 'string' && targetServiceRaw.trim() ? targetServiceRaw.trim().slice(0, 120) : undefined;

  const authStatus =
    typeof raw.authStatus === 'string' && raw.authStatus.trim() ? raw.authStatus.trim().slice(0, 64) : undefined;

  const detectTypeRaw = raw.detectType ?? raw.detect?.type;
  const detectType =
    typeof detectTypeRaw === 'string' && detectTypeRaw.trim() ? detectTypeRaw.trim().slice(0, 120) : undefined;

  const detectConfidenceRaw = raw.detectConfidence ?? raw.detect?.confidence;
  const detectConfidence =
    typeof detectConfidenceRaw === 'number' && Number.isFinite(detectConfidenceRaw)
      ? detectConfidenceRaw
      : undefined;

  const responseStatusRaw = raw.responseStatus ?? raw.response?.status;
  const responseStatus =
    typeof responseStatusRaw === 'number' && Number.isFinite(responseStatusRaw) ? Math.round(responseStatusRaw) : undefined;

  const responseTimeMsRaw = raw.responseTimeMs ?? raw.response?.response_time_ms;
  const responseTimeMs =
    typeof responseTimeMsRaw === 'number' && Number.isFinite(responseTimeMsRaw) ? Math.round(responseTimeMsRaw) : undefined;

  const mitigationRaw = raw.mitigation ?? raw.actionMeta?.mitigation;
  const mitigation =
    typeof mitigationRaw === 'string' && mitigationRaw.trim() ? mitigationRaw.trim().slice(0, 64) : undefined;

  const ipIntelIspRaw = raw.ipIntelIsp ?? raw.ip_intel?.isp;
  const ipIntelIsp =
    typeof ipIntelIspRaw === 'string' && ipIntelIspRaw.trim() ? ipIntelIspRaw.trim().slice(0, 120) : undefined;

  const requestsLast1mRaw = raw.requestsLast1m ?? raw.behavior?.requests_last_1m;
  const requestsLast1m =
    typeof requestsLast1mRaw === 'number' && Number.isFinite(requestsLast1mRaw) ? Math.round(requestsLast1mRaw) : undefined;

  const geoMetaRaw = raw.geoMeta ?? raw.geo;
  const geoMeta = synthesizeGeoMeta(
    geoMetaRaw && typeof geoMetaRaw === 'object' ? geoMetaRaw : undefined,
    sourceLabel,
    raw.from
  );

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
    incidentId,
    blocked: blocked || undefined,
    path,
    method,
    action,
    osiLayer,
    attackerIp,
    userAgent,
    detection,
    requestId,
    forwardedFor,
    targetService,
    authStatus,
    detectType,
    detectConfidence,
    responseStatus,
    responseTimeMs,
    mitigation,
    ipIntelIsp,
    requestsLast1m,
    geoMeta,
    ownerUserId: typeof raw.ownerUserId === 'string' ? raw.ownerUserId : undefined,
    ownerEmail: typeof raw.ownerEmail === 'string' ? raw.ownerEmail : undefined,
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
  };
}
