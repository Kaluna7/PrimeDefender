/**
 * Server-side mirror of cyber-attack-map/src/utils/normalizeAttack.js (minimal deps).
 */
import { randomBytes } from 'node:crypto';

const THREAT_CATEGORY = {
  DDOS: 'ddos',
  INTRUSION: 'intrusion',
  MALWARE: 'malware',
  BOTNET: 'botnet',
  UNKNOWN: 'unknown',
};
const ALLOWED_CATEGORY = new Set(Object.values(THREAT_CATEGORY));
const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

const DDOS_VECTOR = {
  VOLUMETRIC: 'volumetric',
  PROTOCOL: 'protocol',
  APPLICATION: 'application',
};

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

export function normalizeIncident(raw) {
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
      : `${Date.now()}-${randomBytes(6).toString('hex')}`;

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
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
  };
}
