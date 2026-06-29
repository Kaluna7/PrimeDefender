/**
 * Hardened detection middleware (customer-side / Express):
 * SQLi, XSS, brute force, path traversal, command injection,
 * DDoS/flood, bot activity, scanner, suspicious request,
 * auth bypass probes, and file inclusion.
 */
import { randomUUID } from 'node:crypto';
import { getCountryCentroid } from '../ingest/geoCentroid.mjs';
import {
  AUTH_BYPASS_RULES,
  BEHAVIOR_RATE_DEFAULTS,
  classifyUaHit,
  CMD_INJECTION_RULES,
  DEFAULT_UA_BLOCK,
  detectBotActivity,
  FILE_INCLUSION_RULES,
  LOGIN_PATHS,
  PATH_TRAVERSAL_RULES,
  SCANNER_PATH_RULES,
  SENSITIVE_SCAN_PATHS,
  SQLI_RULES,
  SUSPICIOUS_REQUEST_RULES,
  XSS_RULES,
} from './detectionRules.mjs';

const DDOS_VECTOR_APP = 'application';
const SAMPLE_LIMIT = 8192;
const PATH_SAMPLE_LIMIT = 4096;
const GEO_CACHE_TTL_MS = 10 * 60_000;
const GEO_LOOKUP_TIMEOUT_MS = 4000;
const REQUEST_COUNT_WINDOW_MS = 60_000;
const BUCKET_IDLE_TTL_MS = 15 * 60_000;
const HOUSEKEEPING_EVERY = 512;
const STATIC_ASSET_RE = /\.(?:avif|bmp|css|gif|ico|jpeg|jpg|js|json|map|mp3|mp4|png|svg|txt|webm|webp|woff2?)$/i;
const GEO_CACHE = new Map();
const rateBuckets = new Map();
let housekeepingCounter = 0;

function defaultSkip(req) {
  const method = (req.method || 'GET').toUpperCase();
  const { path } = pathnameAndSearch(req);
  return (
    (method === 'GET' || method === 'HEAD') &&
    (path === '/health' || path === '/favicon.ico' || STATIC_ASSET_RE.test(path))
  );
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function normalizeIp(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let ip = raw.trim();
  if (!ip) return '';
  if (ip.startsWith('[') && ip.includes(']')) {
    ip = ip.slice(1, ip.indexOf(']'));
  }
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  const ipv4WithPort = ip.match(/^(\d{1,3}(?:\.\d{1,3}){3}):\d+$/);
  if (ipv4WithPort) ip = ipv4WithPort[1];
  return ip;
}

function isPrivateOrReservedIp(ip) {
  if (!ip) return true;
  const low = ip.toLowerCase();
  if (low === '::1' || low === 'localhost') return true;
  if (low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd')) return true;
  if (low.includes(':')) return false;
  const parts = low.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 192 && b === 0) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

function extractSourceGeoOverride(req) {
  const headers = req.headers || {};
  const latRaw =
    headers['x-slark-source-lat'] ??
    headers['x-prime-source-lat'] ??
    headers['x-attacker-lat'] ??
    headers['x-source-lat'];
  const lonRaw =
    headers['x-slark-source-lon'] ??
    headers['x-prime-source-lon'] ??
    headers['x-attacker-lon'] ??
    headers['x-source-lon'];
  const labelRaw =
    headers['x-slark-source-label'] ??
    headers['x-prime-source-label'] ??
    headers['x-attacker-label'] ??
    headers['x-source-label'];

  const lat = typeof latRaw === 'string' ? Number(latRaw) : NaN;
  const lon = typeof lonRaw === 'string' ? Number(lonRaw) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat: clamp(lat, -85, 85),
    lon: clamp(lon, -180, 180),
    label: typeof labelRaw === 'string' && labelRaw.trim() ? labelRaw.trim().slice(0, 120) : 'header-geo',
  };
}

function clientIp(req) {
  const directHeaders = [
    req.headers?.['cf-connecting-ip'],
    req.headers?.['x-real-ip'],
    req.headers?.['x-forwarded-for'],
  ];
  for (const raw of directHeaders) {
    if (typeof raw === 'string' && raw.trim()) {
      return normalizeIp(raw.split(',')[0].trim());
    }
  }
  return normalizeIp(req.socket?.remoteAddress || req.connection?.remoteAddress || '');
}

function pathnameAndSearch(req) {
  const u = req.url || '/';
  const q = u.indexOf('?');
  return q === -1 ? { path: u, search: '' } : { path: u.slice(0, q), search: u.slice(q) };
}

function pathMatches(actual, pattern) {
  if (pattern === actual) return true;
  if (pattern.endsWith('*')) return actual.startsWith(pattern.slice(0, -1));
  return false;
}

function decodeSample(text) {
  try {
    return decodeURIComponent(String(text).replace(/\+/g, ' '));
  } catch {
    return String(text);
  }
}

function decodeDeep(text, passes = 3) {
  let out = String(text ?? '');
  for (let i = 0; i < passes; i += 1) {
    const next = decodeSample(out);
    if (next === out) break;
    out = next;
  }
  return out;
}

function decodeDeepSample(text) {
  const raw = String(text ?? '');
  const once = decodeSample(raw);
  const deep = decodeDeep(raw);
  return `${raw}\n${once}\n${deep}`.slice(0, SAMPLE_LIMIT);
}

function sliceText(value, limit) {
  return typeof value === 'string' ? value.slice(0, limit) : '';
}

function runRules(text, rules, transform = (v) => v, limit = SAMPLE_LIMIT) {
  if (!text || typeof text !== 'string') return null;
  const sample = transform(text).slice(0, limit);
  for (const rule of rules) {
    if (rule.re.test(sample)) return { id: rule.id };
  }
  return null;
}

function collectScanContext(req) {
  const { path, search } = pathnameAndSearch(req);
  const method = (req.method || 'GET').toUpperCase();
  const ua = typeof req.headers?.['user-agent'] === 'string' ? req.headers['user-agent'].slice(0, 512) : '';
  const ref = typeof req.headers?.referer === 'string' ? req.headers.referer.slice(0, 2048) : '';
  const body = req.body;
  let bodyText = '';
  if (body != null) {
    if (typeof body === 'string') bodyText = body.slice(0, SAMPLE_LIMIT);
    else if (typeof body === 'object') {
      try {
        bodyText = JSON.stringify(body).slice(0, SAMPLE_LIMIT);
      } catch {
        bodyText = '';
      }
    }
  }

  const pathQuery = `${path}${search}`.slice(0, PATH_SAMPLE_LIMIT);
  const decodedPathQuery = decodeSample(pathQuery);
  const requestBlob = [pathQuery, decodedPathQuery, ref, bodyText].filter(Boolean).join('\n').slice(0, SAMPLE_LIMIT);
  const headerBlob = [
    ua,
    typeof req.headers?.['x-original-url'] === 'string' ? req.headers['x-original-url'] : '',
    typeof req.headers?.['x-rewrite-url'] === 'string' ? req.headers['x-rewrite-url'] : '',
    typeof req.headers?.['x-http-method-override'] === 'string' ? req.headers['x-http-method-override'] : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(0, SAMPLE_LIMIT);

  return { path, search, method, ua, ref, bodyText, pathQuery, decodedPathQuery, requestBlob, headerBlob };
}

export function detectSqliInText(text) {
  return runRules(text, SQLI_RULES, decodeDeepSample);
}

export function detectXssInText(text) {
  return runRules(text, XSS_RULES, decodeDeepSample);
}

export function detectPathTraversalInText(text) {
  if (!text || typeof text !== 'string') return null;
  const raw = text.slice(0, PATH_SAMPLE_LIMIT);
  const decoded = decodeDeep(raw);
  return runRules(`${raw}\n${decoded}`, PATH_TRAVERSAL_RULES, (v) => v, PATH_SAMPLE_LIMIT * 2);
}

export function detectCmdInjectionInText(text) {
  return runRules(text, CMD_INJECTION_RULES, decodeDeepSample);
}

export function detectFileInclusionInText(text) {
  return runRules(text, FILE_INCLUSION_RULES, decodeDeepSample);
}

export function detectAuthBypassInText(text) {
  return runRules(text, AUTH_BYPASS_RULES, decodeDeepSample);
}

export function detectSuspiciousRequestInText(text) {
  return runRules(text, SUSPICIOUS_REQUEST_RULES, decodeDeepSample);
}

export function detectScannerPath(text) {
  return runRules(text, SCANNER_PATH_RULES, (v) => v, PATH_SAMPLE_LIMIT);
}

export function detectSuspiciousUserAgent(ua, opts = {}) {
  if (!ua || typeof ua !== 'string') return null;
  const blockCurl = opts.blockCurl !== false;
  const rules = [...DEFAULT_UA_BLOCK];
  if (!blockCurl) {
    const filtered = rules.filter((r) => r.id !== 'curl');
    rules.length = 0;
    rules.push(...filtered);
  }
  if (Array.isArray(opts.extraPatterns)) rules.push(...opts.extraPatterns);
  for (const rule of rules) {
    if (rule.re.test(ua)) return { id: rule.id };
  }
  return null;
}

function pruneHits(bucket, now, windowMs) {
  while (bucket.ts.length && now - bucket.ts[0] > windowMs) bucket.ts.shift();
}

function cleanupState(now = Date.now()) {
  for (const [key, bucket] of rateBuckets) {
    if (!bucket.ts.length || now - bucket.lastSeen > BUCKET_IDLE_TTL_MS) rateBuckets.delete(key);
  }
  for (const [key, cached] of GEO_CACHE) {
    if (cached.expiresAt <= now) GEO_CACHE.delete(key);
  }
}

function recordRateWindow(bucketKey, cfg) {
  const now = Date.now();
  let bucket = rateBuckets.get(bucketKey);
  if (!bucket) {
    bucket = { ts: [], lastSeen: now };
    rateBuckets.set(bucketKey, bucket);
  }
  bucket.lastSeen = now;
  pruneHits(bucket, now, cfg.windowMs);
  const allowed = bucket.ts.length < cfg.maxPerWindow;
  if (allowed) bucket.ts.push(now);
  housekeepingCounter += 1;
  if (housekeepingCounter % HOUSEKEEPING_EVERY === 0) cleanupState(now);
  const retryAfterSec =
    bucket.ts.length > 0 ? Math.max(1, Math.ceil((bucket.ts[0] + cfg.windowMs - now) / 1000)) : 1;
  return { allowed, retryAfterSec, hitsInWindow: bucket.ts.length };
}

/**
 * Generic sliding-window rate limiter.
 * @returns {boolean} true = allowed, false = exceeded
 */
export function recordRateLimit(bucketKey, cfg) {
  return recordRateWindow(bucketKey, cfg).allowed;
}

/** @deprecated gunakan recordRateLimit(`ddos:${ip}`, cfg) */
export function recordDdosWindow(ip, cfg) {
  return recordRateLimit(`ddos:${ip}`, cfg);
}

function matchesBrutePath(path, method, cfg) {
  const paths = cfg.paths ?? LOGIN_PATHS;
  const methods = cfg.methods ?? ['POST', 'GET', 'PUT', 'PATCH'];
  if (!methods.includes('*') && !methods.includes(method)) return false;
  return paths.some((p) => pathMatches(path, p));
}

function normalizeMode(cfg, defaultMode = 'block') {
  return cfg?.mode === 'observe' ? 'observe' : defaultMode;
}

function inferCategory(detection) {
  if (detection.startsWith('ddos')) return 'ddos';
  if (detection.startsWith('bot_activity') || detection.startsWith('scanner')) return 'botnet';
  return 'intrusion';
}

function buildProtectedSiteLabel(siteRegion, siteId) {
  const parts = [];
  if (typeof siteId === 'string' && siteId.trim()) parts.push(siteId.trim());
  if (typeof siteRegion?.label === 'string' && siteRegion.label.trim()) parts.push(siteRegion.label.trim());
  return parts.length ? parts.join(' · ') : 'Protected site';
}

function composeTargetLabel(siteLabel, summary) {
  if (summary && summary.trim()) return `${siteLabel} · ${summary.trim()}`;
  return siteLabel;
}

function detectionTitle(detection) {
  if (detection.startsWith('sqli')) return 'SQLi';
  if (detection.startsWith('xss')) return 'XSS';
  if (detection.startsWith('path_traversal')) return 'PathTrav';
  if (detection.startsWith('cmd_injection')) return 'Cmd';
  if (detection.startsWith('bad_ua')) return 'UA';
  if (detection.startsWith('brute_force')) return 'BruteForce';
  if (detection.startsWith('ddos')) return 'Flood';
  if (detection.startsWith('bot_activity')) return 'Bot';
  if (detection.startsWith('scanner')) return 'Scanner';
  if (detection.startsWith('suspicious_request')) return 'Suspicious';
  if (detection.startsWith('auth_bypass')) return 'AuthBypass';
  if (detection.startsWith('file_inclusion')) return 'FileInclude';
  return 'Detection';
}

function requestIdFromReq(req) {
  const raw =
    req.id ??
    req.headers?.['x-request-id'] ??
    req.headers?.['x-correlation-id'] ??
    req.headers?.['cf-ray'];
  return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 128) : randomUUID();
}

function forwardedForFromReq(req) {
  const raw = req.headers?.['x-forwarded-for'];
  return typeof raw === 'string' && raw.trim() ? raw.trim().slice(0, 512) : undefined;
}

function inferAuthStatus(detection) {
  if (typeof detection !== 'string') return undefined;
  if (detection.startsWith('auth_bypass')) return 'bypass_attempt';
  return undefined;
}

function detectTypeFromDetection(detection) {
  if (typeof detection !== 'string' || !detection.trim()) return undefined;
  const idx = detection.indexOf(':');
  return idx === -1 ? detection.trim() : detection.slice(0, idx).trim();
}

function confidenceForDetection(detection, severity) {
  if (typeof detection !== 'string') return undefined;
  if (detection.startsWith('cmd_injection') || detection.startsWith('sqli') || detection.startsWith('file_inclusion')) {
    return 0.96;
  }
  if (detection.startsWith('xss') || detection.startsWith('path_traversal')) {
    return 0.91;
  }
  if (detection.startsWith('auth_bypass')) {
    return 0.87;
  }
  if (detection.startsWith('ddos') || detection.startsWith('brute_force') || detection.startsWith('scanner')) {
    return 0.83;
  }
  if (detection.startsWith('bot_activity')) {
    return 0.79;
  }
  if (severity === 'critical') return 0.93;
  if (severity === 'high') return 0.86;
  if (severity === 'medium') return 0.74;
  return 0.61;
}

function countRecentHits(bucketKey, withinMs = 60_000) {
  const bucket = rateBuckets.get(bucketKey);
  if (!bucket?.ts?.length) return 0;
  const now = Date.now();
  let total = 0;
  for (let i = bucket.ts.length - 1; i >= 0; i -= 1) {
    if (now - bucket.ts[i] > withinMs) break;
    total += 1;
  }
  return total;
}

function recordActivitySample(bucketKey, now = Date.now(), windowMs = REQUEST_COUNT_WINDOW_MS) {
  let bucket = rateBuckets.get(bucketKey);
  if (!bucket) {
    bucket = { ts: [], lastSeen: now };
    rateBuckets.set(bucketKey, bucket);
  }
  bucket.lastSeen = now;
  pruneHits(bucket, now, windowMs);
  bucket.ts.push(now);
  housekeepingCounter += 1;
  if (housekeepingCounter % HOUSEKEEPING_EVERY === 0) cleanupState(now);
  return bucket.ts.length;
}

function formatGeoLabel(parts, fallback) {
  const unique = [];
  for (const part of parts) {
    if (typeof part !== 'string') continue;
    const clean = part.trim();
    if (!clean) continue;
    if (!unique.includes(clean)) unique.push(clean);
  }
  return unique.join(', ') || fallback;
}

function coordString(lat, lon) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return '—';
  return `${Number(lat).toFixed(4)}, ${Number(lon).toFixed(4)}`;
}

async function fetchGeoCandidate(url, parse) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(GEO_LOOKUP_TIMEOUT_MS) });
    if (!res.ok) return null;
    const json = await res.json();
    const out = parse(json);
    if (
      out &&
      typeof out.lat === 'number' &&
      typeof out.lon === 'number' &&
      Number.isFinite(out.lat) &&
      Number.isFinite(out.lon)
    ) {
      return {
        lat: clamp(out.lat, -85, 85),
        lon: clamp(out.lon, -180, 180),
        label: out.label,
        country: out.country,
        region: out.region,
        city: out.city,
        isp: typeof out.isp === 'string' && out.isp.trim() ? out.isp.trim().slice(0, 120) : undefined,
      };
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function geoLookup(ip, siteRegion) {
  if (!ip) {
    return { lat: siteRegion.lat, lon: siteRegion.lon, label: 'unknown-source' };
  }
  if (isPrivateOrReservedIp(ip)) {
    return {
      lat: siteRegion.lat,
      lon: siteRegion.lon,
      label: ip === '127.0.0.1' || ip === '::1' ? 'loopback' : `private-network (${ip})`,
    };
  }
  const clean = normalizeIp(ip);
  const cached = GEO_CACHE.get(clean);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  let value = {
    lat: 0,
    lon: 0,
    label: clean,
    geoMeta: {
      location: clean,
      coordinates: '—',
      accuracy: 'LOW',
      note: 'Estimated from network identifier',
    },
  };
  const providers = [
    () =>
      fetchGeoCandidate(`https://ipwho.is/${encodeURIComponent(clean)}`, (j) => {
        if (j?.success !== true) return null;
        return {
          lat: j.latitude,
          lon: j.longitude,
          label: formatGeoLabel([j.city, j.region, j.country], clean),
          country: j.country,
          countryCode: j.country_code,
          region: j.region,
          city: j.city,
          isp: j.connection?.isp,
        };
      }),
    () =>
      fetchGeoCandidate(`https://ipapi.co/${encodeURIComponent(clean)}/json/`, (j) => {
        if (typeof j?.latitude !== 'number' || typeof j?.longitude !== 'number') return null;
        return {
          lat: j.latitude,
          lon: j.longitude,
          label: formatGeoLabel([j.city, j.region, j.country_name], clean),
          country: j.country_name,
          countryCode: j.country_code,
          region: j.region,
          city: j.city,
          isp: j.org,
        };
      }),
    () =>
      fetchGeoCandidate(
        `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,lat,lon,city,regionName,country,countryCode`,
        (j) => {
          if (j?.status !== 'success') return null;
          return {
            lat: j.lat,
            lon: j.lon,
            label: formatGeoLabel([j.city, j.regionName, j.country], clean),
            country: j.country,
            countryCode: j.countryCode,
            region: j.regionName,
            city: j.city,
            isp: j.isp,
          };
        }
      ),
  ];
  for (const provider of providers) {
    const hit = await provider();
    if (hit) {
      const centroid = getCountryCentroid(hit.country);
      const used = centroid || hit;
      const location = formatGeoLabel([hit.city, hit.region, hit.country], clean);
      value = {
        lat: used.lat,
        lon: used.lon,
        label: location,
        isp: hit.isp,
        geoMeta: {
          location,
          coordinates: coordString(used.lat, used.lon),
          accuracy: centroid ? 'LOW' : 'MEDIUM',
          note: centroid ? 'Estimated from ISP location using country centroid' : 'Estimated from IP geolocation',
          country: hit.country,
          countryCode: hit.countryCode,
        },
      };
      break;
    }
  }
  GEO_CACHE.set(clean, { value, expiresAt: Date.now() + GEO_CACHE_TTL_MS });
  return value;
}

async function sendIngest(ingestUrl, apiKey, body) {
  const headers = { 'Content-Type': 'application/json', 'X-Api-Key': apiKey };
  const res = await fetch(ingestUrl.replace(/\/$/, ''), {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`ingest ${res.status}`);
}

/**
 * @param {object} opts
 * @param {{ enabled?: boolean; maxPerWindow?: number; windowMs?: number; mode?: 'block'|'observe' }} [opts.ddos]
 * @param {{ enabled?: boolean; maxPerWindow?: number; windowMs?: number; paths?: string[]; methods?: string[]; mode?: 'block'|'observe' }} [opts.bruteForce]
 * @param {{ enabled?: boolean; blockCurl?: boolean; extraPatterns?: Array<{ re: RegExp; id: string }>; mode?: 'block'|'observe' }} [opts.suspiciousUa]
 */
export function createSecurityDetectionMiddleware(opts) {
  const ingestUrl = opts.bridgeIngestUrl;
  const apiKey = opts.apiKey;
  const siteRegion = opts.siteRegion;
  // IMPORTANT LICENSE GATE:
  // Missing apiKey/bridge/siteRegion means middleware must not operate.
  // - requireConfig=true  => throw (hard fail)
  // - requireConfig=false => pass-through only (no inspect/block/report)
  const strictConfig = opts.requireConfig === true;
  if (!ingestUrl || !apiKey || !siteRegion || typeof siteRegion.lat !== 'number' || typeof siteRegion.lon !== 'number') {
    if (strictConfig) {
      throw new Error('createSecurityDetectionMiddleware: bridgeIngestUrl, apiKey, siteRegion { lat, lon } required');
    }
    console.warn(
      '[detection] disabled: missing bridgeIngestUrl/apiKey/siteRegion. Middleware will pass-through only.'
    );
    return function slarkDisabledMiddleware(_req, _res, next) {
      next();
    };
  }

  const reportToBridge = opts.reportToBridge !== false;
  const geo = opts.geoLookup !== false;
  const ddosCfg = {
    enabled: opts.ddos?.enabled !== false,
    maxPerWindow: opts.ddos?.maxPerWindow ?? BEHAVIOR_RATE_DEFAULTS.ddos.maxPerWindow,
    windowMs: opts.ddos?.windowMs ?? BEHAVIOR_RATE_DEFAULTS.ddos.windowMs,
    mode: normalizeMode(opts.ddos),
  };
  const bruteCfg = {
    enabled: opts.bruteForce?.enabled !== false,
    maxPerWindow: opts.bruteForce?.maxPerWindow ?? BEHAVIOR_RATE_DEFAULTS.bruteForce.maxPerWindow,
    windowMs: opts.bruteForce?.windowMs ?? BEHAVIOR_RATE_DEFAULTS.bruteForce.windowMs,
    paths: opts.bruteForce?.paths,
    methods: opts.bruteForce?.methods,
    mode: normalizeMode(opts.bruteForce),
  };
  const scannerCfg = {
    enabled: opts.scanner?.enabled !== false,
    maxPerWindow: opts.scanner?.maxPerWindow ?? BEHAVIOR_RATE_DEFAULTS.scanner.maxPerWindow,
    windowMs: opts.scanner?.windowMs ?? BEHAVIOR_RATE_DEFAULTS.scanner.windowMs,
    mode: normalizeMode(opts.scanner),
  };
  const botCfg = {
    enabled: opts.botActivity?.enabled !== false,
    maxPerWindow: opts.botActivity?.maxPerWindow ?? BEHAVIOR_RATE_DEFAULTS.botActivity.maxPerWindow,
    windowMs: opts.botActivity?.windowMs ?? BEHAVIOR_RATE_DEFAULTS.botActivity.windowMs,
    mode: normalizeMode(opts.botActivity),
  };
  const suspiciousReqCfg = {
    enabled: opts.suspiciousRequest?.enabled !== false,
    maxPerWindow: opts.suspiciousRequest?.maxPerWindow ?? BEHAVIOR_RATE_DEFAULTS.suspiciousRequest.maxPerWindow,
    windowMs: opts.suspiciousRequest?.windowMs ?? BEHAVIOR_RATE_DEFAULTS.suspiciousRequest.windowMs,
    mode: normalizeMode(opts.suspiciousRequest),
  };
  const sqliCfg = { enabled: opts.sqli?.enabled !== false, mode: normalizeMode(opts.sqli) };
  const xssCfg = { enabled: opts.xss?.enabled !== false, mode: normalizeMode(opts.xss) };
  const pathTravCfg = { enabled: opts.pathTraversal?.enabled !== false, mode: normalizeMode(opts.pathTraversal) };
  const cmdCfg = { enabled: opts.cmdInjection?.enabled !== false, mode: normalizeMode(opts.cmdInjection) };
  const fileIncCfg = { enabled: opts.fileInclusion?.enabled !== false, mode: normalizeMode(opts.fileInclusion) };
  const authBypassCfg = { enabled: opts.authBypass?.enabled !== false, mode: normalizeMode(opts.authBypass) };
  const uaCfg = {
    enabled: opts.suspiciousUa?.enabled !== false,
    blockCurl: opts.suspiciousUa?.blockCurl,
    extraPatterns: opts.suspiciousUa?.extraPatterns,
    mode: normalizeMode(opts.suspiciousUa),
  };
  const skip = typeof opts.skip === 'function' ? opts.skip : defaultSkip;
  const siteLabel = buildProtectedSiteLabel(siteRegion, opts.siteId);

  function userAgentFromReq(req) {
    const u = req.headers?.['user-agent'];
    return typeof u === 'string' ? u.slice(0, 512) : undefined;
  }

  function runIngest(fn) {
    if (!reportToBridge) return;
    queueMicrotask(fn);
  }

  function respondBlocked(res, statusCode, reason, ruleId, detection, retryAfterSec) {
    res.statusCode = statusCode;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Slark-Detection', detection);
    if (typeof retryAfterSec === 'number' && retryAfterSec > 0) res.setHeader('Retry-After', String(retryAfterSec));
    res.end(
      JSON.stringify({
        error: statusCode === 429 ? 'rate_limited' : 'forbidden',
        reason,
        ...(ruleId ? { rule: ruleId } : {}),
      })
    );
  }

  function emitIncident(req, ip, event) {
    runIngest(async () => {
      try {
        const sourceOverride = extractSourceGeoOverride(req);
        const from = sourceOverride || (geo ? await geoLookup(ip, siteRegion) : { lat: 0, lon: 0, label: ip });
        const userAgent = userAgentFromReq(req);
        const forwardedFor = forwardedForFromReq(req);
        const requestId = requestIdFromReq(req);
        const detectType = event.detectType || detectTypeFromDetection(event.detection);
        const detectConfidence =
          typeof event.detectConfidence === 'number' ? event.detectConfidence : confidenceForDetection(event.detection, event.severity);
        const payload = {
          id: randomUUID(),
          createdAt: Date.now(),
          category: event.category || inferCategory(event.detection),
          severity: event.severity || 'high',
          from: { lat: from.lat, lon: from.lon },
          to: { lat: siteRegion.lat, lon: siteRegion.lon },
          sourceLabel: event.sourceLabel || from.label || ip,
          targetLabel: event.targetLabel || siteLabel,
          geoMeta: event.geoMeta || from.geoMeta,
          siteId: opts.siteId,
          tenantId: opts.tenantId,
          path: event.path,
          method: event.method,
          blocked: event.blocked !== false,
          action: event.blocked === false ? 'observed' : 'blocked',
          attackerIp: ip,
          userAgent,
          detection: event.detection,
          requestId,
          forwardedFor,
          targetService: event.targetService || opts.serviceName || opts.siteId || siteLabel,
          authStatus: event.authStatus || inferAuthStatus(event.detection),
          detectType,
          detectConfidence,
          responseStatus: event.responseStatus,
          responseTimeMs: event.responseTimeMs,
          mitigation: event.mitigation,
          ipIntelIsp: event.ipIntelIsp || from.isp,
          requestsLast1m: typeof event.requestsLast1m === 'number' ? event.requestsLast1m : undefined,
        };
        if (event.ddos) payload.ddos = event.ddos;
        await sendIngest(ingestUrl, apiKey, payload);
      } catch (e) {
        console.error('[detection] ingest failed', e?.message || e);
      }
    });
  }

  function handleDetection(req, res, context, cfg, detail) {
    if (!cfg?.enabled) return false;
    const blocked = cfg.mode !== 'observe';
    const baseMitigation = detail.mitigation || (blocked ? 'request_block' : 'observe');
    const requestsLast1m =
      typeof detail.requestsLast1m === 'number' ? detail.requestsLast1m : countRecentHits(`req:${context.ip}`);
    if (blocked) {
      const responseStatus = detail.statusCode ?? 403;
      const mitigation = detail.mitigation || (responseStatus === 429 ? 'temp_block' : baseMitigation);
      const responseTimeMs = Math.max(1, Date.now() - context.startedAt);
      respondBlocked(res, responseStatus, detail.reason, detail.rule, detail.detection, detail.retryAfterSec);
      emitIncident(req, context.ip, {
        blocked,
        category: detail.category,
        severity: detail.severity,
        detection: detail.detection,
        targetLabel: detail.targetLabel,
        path: context.path,
        method: context.method,
        ddos: detail.ddos,
        authStatus: detail.authStatus,
        detectType: detail.detectType,
        detectConfidence: detail.detectConfidence,
        responseStatus,
        responseTimeMs,
        mitigation,
        requestsLast1m,
      });
      return true;
    }

    res.once('finish', () => {
      const responseStatus = res.statusCode || detail.statusCode || 200;
      const mitigation = detail.mitigation || (responseStatus >= 400 ? 'observed_error' : baseMitigation);
      const responseTimeMs = Math.max(1, Date.now() - context.startedAt);
      emitIncident(req, context.ip, {
        blocked: false,
        category: detail.category,
        severity: detail.severity,
        detection: detail.detection,
        targetLabel: detail.targetLabel,
        path: context.path,
        method: context.method,
        ddos: detail.ddos,
        authStatus: detail.authStatus,
        detectType: detail.detectType,
        detectConfidence: detail.detectConfidence,
        responseStatus,
        responseTimeMs,
        mitigation,
        requestsLast1m,
      });
    });
    return false;
  }

  return function securityDetectionMiddleware(req, res, next) {
    if (skip(req)) {
      next();
      return;
    }

    const context = collectScanContext(req);
    context.startedAt = Date.now();
    context.ip = clientIp(req);
    if (!context.ip) {
      next();
      return;
    }
    recordActivitySample(`req:${context.ip}`, context.startedAt);

    const uaHit = uaCfg.enabled ? detectSuspiciousUserAgent(context.ua, uaCfg) : null;
    const uaKind = uaHit ? classifyUaHit(uaHit) : null;
    const botBehaviorHit = botCfg.enabled ? detectBotActivity(context) : null;
    const scannerPathHit = scannerCfg.enabled ? detectScannerPath(context.path) : null;
    const sensitivePathHit =
      scannerCfg.enabled && SENSITIVE_SCAN_PATHS.some((p) => pathMatches(context.path, p));
    const suspiciousHit = suspiciousReqCfg.enabled
      ? detectSuspiciousRequestInText([context.pathQuery, context.headerBlob, sliceText(context.ua, 256)].join('\n'))
      : null;
    const pathTravHit = pathTravCfg.enabled ? detectPathTraversalInText(context.pathQuery) : null;
    const fileIncludeHit = fileIncCfg.enabled
      ? detectFileInclusionInText([context.pathQuery, context.bodyText].filter(Boolean).join('\n'))
      : null;
    const cmdHit = cmdCfg.enabled ? detectCmdInjectionInText(context.requestBlob) : null;
    const sqliHit = sqliCfg.enabled ? detectSqliInText(context.requestBlob) : null;
    const xssHit = xssCfg.enabled ? detectXssInText(context.requestBlob) : null;
    const authBypassHit = authBypassCfg.enabled
      ? detectAuthBypassInText([context.pathQuery, context.headerBlob, context.bodyText].filter(Boolean).join('\n'))
      : null;

    const onBrutePath = bruteCfg.enabled && matchesBrutePath(context.path, context.method, bruteCfg);
    if (onBrutePath) {
      const bucketKey = `brute:${context.ip}:${context.path}`;
      const rate = recordRateWindow(bucketKey, bruteCfg);
      if (!rate.allowed) {
        if (
          handleDetection(req, res, context, bruteCfg, {
            statusCode: 429,
            retryAfterSec: rate.retryAfterSec,
            reason: 'brute_force_login',
            rule: 'login_window',
            severity: 'high',
            detection: 'brute_force',
            targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · BruteForce`),
            requestsLast1m: countRecentHits(bucketKey),
          })
        )
          return;
      }
    }

    if (!onBrutePath && ddosCfg.enabled) {
      const bucketKey = `ddos:${context.ip}`;
      const rate = recordRateWindow(bucketKey, ddosCfg);
      if (!rate.allowed) {
        if (
          handleDetection(req, res, context, ddosCfg, {
            statusCode: 429,
            retryAfterSec: rate.retryAfterSec,
            reason: 'ddos_flood',
            rule: 'global_window',
            severity: 'high',
            category: 'ddos',
            detection: 'ddos_flood',
            targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · flood`),
            ddos: { vector: DDOS_VECTOR_APP },
            requestsLast1m: countRecentHits(bucketKey),
          })
        )
          return;
      }
    }

    const scannerLike = Boolean(
      scannerPathHit || sensitivePathHit || uaKind === 'scanner' || (uaHit && uaKind === 'crawler'),
    );
    if (scannerLike && scannerCfg.enabled) {
      const bucketKey = `scanner:${context.ip}`;
      const rate = recordRateWindow(bucketKey, scannerCfg);
      if (!rate.allowed) {
        if (
          handleDetection(req, res, context, scannerCfg, {
            statusCode: 429,
            retryAfterSec: rate.retryAfterSec,
            reason: 'scanner_activity',
            rule: scannerPathHit?.id || (sensitivePathHit ? 'sensitive_path' : null) || uaHit?.id || 'probe_window',
            severity: 'medium',
            category: 'botnet',
            detection: `scanner:${scannerPathHit?.id || (sensitivePathHit ? 'sensitive_path' : null) || uaHit?.id || 'burst'}`,
            targetLabel: composeTargetLabel(
              siteLabel,
              `${context.method} ${context.path} · Scanner:${scannerPathHit?.id || (sensitivePathHit ? 'sensitive_path' : null) || uaHit?.id || 'burst'}`
            ),
            requestsLast1m: countRecentHits(bucketKey),
          })
        )
          return;
      }
    }

    const botSignal = Boolean(
      botBehaviorHit || uaKind === 'bot_client' || uaKind === 'automation' || uaKind === 'crawler',
    );
    if (botSignal && botCfg.enabled) {
      const botRuleId = botBehaviorHit?.id || uaHit?.id || 'behavior';
      const bucketKey = `bot:${context.ip}`;
      const rate = recordRateWindow(bucketKey, botCfg);
      if (!rate.allowed) {
        if (
          handleDetection(req, res, context, botCfg, {
            statusCode: 429,
            retryAfterSec: rate.retryAfterSec,
            reason: 'bot_activity',
            rule: botRuleId,
            severity: 'medium',
            category: 'botnet',
            detection: `bot_activity:${botRuleId}`,
            targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · Bot:${botRuleId}`),
            requestsLast1m: countRecentHits(bucketKey),
          })
        )
          return;
      }
    }

    if (uaHit && uaCfg.enabled) {
      if (
        handleDetection(req, res, context, uaCfg, {
          reason: 'suspicious_user_agent',
          rule: uaHit.id,
          severity: 'medium',
          category: uaKind === 'scanner' || uaKind === 'automation' || uaKind === 'crawler' ? 'botnet' : 'intrusion',
          detection:
            uaKind === 'scanner' || uaKind === 'automation' || uaKind === 'crawler'
              ? `bot_activity:${uaHit.id}`
              : `bad_ua:${uaHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · UA:${uaHit.id}`),
        })
      )
        return;
    }

    if ((scannerPathHit || sensitivePathHit) && scannerCfg.enabled) {
      if (
        handleDetection(req, res, context, scannerCfg, {
          reason: 'scanner_path_probe',
          rule: scannerPathHit?.id || 'sensitive_path',
          severity: 'medium',
          category: 'botnet',
          detection: `scanner:${scannerPathHit?.id || 'sensitive_path'}`,
          targetLabel: composeTargetLabel(
            siteLabel,
            `${context.method} ${context.path} · Scanner:${scannerPathHit?.id || 'sensitive_path'}`,
          ),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (pathTravHit && pathTravCfg.enabled) {
      if (
        handleDetection(req, res, context, pathTravCfg, {
          reason: 'path_traversal',
          rule: pathTravHit.id,
          severity: 'high',
          detection: `path_traversal:${pathTravHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · PathTrav:${pathTravHit.id}`),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (fileIncludeHit && fileIncCfg.enabled) {
      if (
        handleDetection(req, res, context, fileIncCfg, {
          reason: 'file_inclusion',
          rule: fileIncludeHit.id,
          severity: 'high',
          detection: `file_inclusion:${fileIncludeHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · FileInclude:${fileIncludeHit.id}`),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (cmdHit && cmdCfg.enabled) {
      if (
        handleDetection(req, res, context, cmdCfg, {
          reason: 'command_injection',
          rule: cmdHit.id,
          severity: 'critical',
          detection: `cmd_injection:${cmdHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · Cmd:${cmdHit.id}`),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (sqliHit && sqliCfg.enabled) {
      if (
        handleDetection(req, res, context, sqliCfg, {
          reason: 'sql_injection_probe',
          rule: sqliHit.id,
          severity: 'critical',
          detection: `sqli:${sqliHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · SQLi:${sqliHit.id}`),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (xssHit && xssCfg.enabled) {
      if (
        handleDetection(req, res, context, xssCfg, {
          reason: 'xss_probe',
          rule: xssHit.id,
          severity: 'high',
          detection: `xss:${xssHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · XSS:${xssHit.id}`),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (authBypassHit && authBypassCfg.enabled) {
      if (
        handleDetection(req, res, context, authBypassCfg, {
          reason: 'auth_bypass_probe',
          rule: authBypassHit.id,
          severity: 'high',
          detection: `auth_bypass:${authBypassHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · AuthBypass:${authBypassHit.id}`),
          authStatus: 'bypass_attempt',
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        })
      )
        return;
    }

    if (suspiciousHit && suspiciousReqCfg.enabled) {
      const bucketKey = `suspicious:${context.ip}`;
      const rate = recordRateWindow(bucketKey, suspiciousReqCfg);
      if (!rate.allowed) {
        if (
          handleDetection(req, res, context, suspiciousReqCfg, {
            statusCode: 429,
            retryAfterSec: rate.retryAfterSec,
            reason: 'suspicious_request_burst',
            rule: suspiciousHit.id,
            severity: 'medium',
            detection: `suspicious_request:${suspiciousHit.id}`,
            targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · Suspicious:${suspiciousHit.id}`),
            requestsLast1m: countRecentHits(bucketKey),
          })
        )
          return;
      } else if (suspiciousReqCfg.mode === 'block') {
        if (
          handleDetection(req, res, context, suspiciousReqCfg, {
            reason: 'suspicious_request',
            rule: suspiciousHit.id,
            severity: 'medium',
            detection: `suspicious_request:${suspiciousHit.id}`,
            targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · Suspicious:${suspiciousHit.id}`),
            requestsLast1m: countRecentHits(`req:${context.ip}`),
          })
        )
          return;
      } else {
        handleDetection(req, res, context, suspiciousReqCfg, {
          severity: 'medium',
          detection: `suspicious_request:${suspiciousHit.id}`,
          targetLabel: composeTargetLabel(siteLabel, `${context.method} ${context.path} · Suspicious:${suspiciousHit.id}`),
          requestsLast1m: countRecentHits(`req:${context.ip}`),
        });
      }
    }

    next();
  };
}

