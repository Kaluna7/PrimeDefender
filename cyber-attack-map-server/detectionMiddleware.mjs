/**
 * MVP deteksi (sisi server pelanggan / Express):
 * 1) SQLi  2) XSS  3) Brute force (rate limit jalur login)
 * 4) Path traversal  5) Command injection  6) User-Agent mencurigakan
 * 7) DDoS / flood (rate limit global per IP)
 *
 * Pasang sebelum route. Perlu bridge + API key untuk lapor ingest.
 */
import { randomUUID } from 'node:crypto';

const DDOS_VECTOR_APP = 'application';

// ─── SQLi (keyword + pola umum) ─────────────────────────────────────────────
const SQLI_RULES = [
  { re: /'\s*or\s+['"]?\d*['"]?\s*=\s*['"]?\d*/i, id: 'or_tautology_quote' },
  { re: /'\s*or\s+['"]?1['"]?\s*=\s*['"]?1/i, id: 'or_1_1' },
  { re: /--[\s#]/i, id: 'sql_comment' },
  { re: /\bunion\s+[\w*(),\s]{0,80}\bselect\b/i, id: 'union_select' },
  { re: /\bselect\s+.{1,120}\bfrom\b/is, id: 'select_from' },
  { re: /\binto\s+outfile\b/i, id: 'into_outfile' },
  { re: /\binformation_schema\.(tables|columns)\b/i, id: 'info_schema' },
  { re: /\bsleep\s*\(\s*\d+/i, id: 'sleep_fn' },
  { re: /\bbenchmark\s*\(/i, id: 'benchmark' },
  { re: /\bwaitfor\s+delay\b/i, id: 'waitfor_delay' },
  { re: /\bor\s+['"]?\d+['"]?\s*=\s*['"]?\d+/i, id: 'or_tautology' },
  { re: /'\s*or\s+'\d+'\s*=\s*'/i, id: 'or_string_tautology' },
  { re: /\bexec\s*\(\s*xp_/i, id: 'mssql_exec' },
  { re: /;\s*(drop|delete|truncate)\s+(table|database)\b/i, id: 'destructive' },
  { re: /\bload_file\s*\(/i, id: 'load_file' },
  { re: /\bpg_sleep\s*\(/i, id: 'pg_sleep' },
];

// ─── XSS ───────────────────────────────────────────────────────────────────
const XSS_RULES = [
  { re: /<\s*script\b/i, id: 'script_tag' },
  { re: /<\s*\/\s*script\b/i, id: 'close_script' },
  { re: /<\s*script[^>]*>\s*alert\s*\(/i, id: 'script_alert' },
  { re: /javascript\s*:/i, id: 'javascript_uri' },
  { re: /vbscript\s*:/i, id: 'vbscript_uri' },
  { re: /data\s*:\s*text\/html/i, id: 'data_html' },
  { re: /<\s*[^>]{0,120}\bon\w+\s*=\s*['"]?/i, id: 'event_handler' },
  { re: /<\s*iframe\b/i, id: 'iframe_tag' },
  { re: /<\s*object\b/i, id: 'object_tag' },
  { re: /<\s*embed\b/i, id: 'embed_tag' },
  { re: /<\s*svg\b[^>]{0,200}\bon\w+/i, id: 'svg_onhandler' },
  { re: /\beval\s*\(\s*['"`]/i, id: 'eval_literal' },
  { re: /String\.fromCharCode\s*\(/i, id: 'from_char_code' },
  { re: /document\.(cookie|write|domain)\b/i, id: 'document_sink' },
  { re: /window\.(location|document)\b/i, id: 'window_sink' },
  { re: /\balert\s*\(\s*['"\d]/i, id: 'alert_probe' },
  { re: /<\s*img\b[^>]{0,120}\bonerror\b/i, id: 'img_onerror' },
  { re: /%3[Cc]\s*script/i, id: 'encoded_script' },
  { re: /\\x3c\s*script/i, id: 'hex_script' },
];

// ─── Path traversal ────────────────────────────────────────────────────────
const PATH_TRAVERSAL_RULES = [
  { re: /\.\.[\/\\]/, id: 'dot_dot_slash' },
  { re: /%2e%2e(?:%2f|%5c)|%252e%252e/i, id: 'encoded_traversal' },
  { re: /etc\/passwd|etc%2fpasswd|win\.ini/i, id: 'sensitive_file' },
];

// ─── Command injection ─────────────────────────────────────────────────────
const CMD_INJECTION_RULES = [
  { re: /[;&]\s*(ls|cat|rm|wget|curl|nc\b|netcat|bash|sh\b|cmd\.exe|powershell|ping|whoami|id)\b/i, id: 'shell_metachar' },
  { re: /&&\s*\w+/, id: 'and_and_cmd' },
  { re: /\|\s*(?:cat|ls|sh|bash|nc\b|wget|curl)\b/i, id: 'pipe_cmd' },
  { re: /`[^`\n]{1,120}`/, id: 'backtick' },
  { re: /\$\([^)\n]{1,80}\)/, id: 'dollar_subshell' },
];

// ─── User-Agent (bot / scanner) ────────────────────────────────────────────
const DEFAULT_UA_BLOCK = [
  { re: /sqlmap/i, id: 'sqlmap' },
  { re: /nikto/i, id: 'nikto' },
  { re: /^curl\//i, id: 'curl' },
  { re: /python-requests/i, id: 'python_requests' },
  { re: /^Go-http-client/i, id: 'go_http' },
  { re: /masscan|nmap|zgrab|wpscan|acunetix/i, id: 'scanner' },
];

const rateBuckets = new Map();

function clientIp(req) {
  const xff = req.headers?.['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    return xff.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || req.connection?.remoteAddress || '';
}

function pathnameAndSearch(req) {
  const u = req.url || '/';
  const q = u.indexOf('?');
  return q === -1 ? { path: u, search: '' } : { path: u.slice(0, q), search: u.slice(q) };
}

function pathMatches(actual, pattern) {
  if (pattern === actual) return true;
  if (pattern.endsWith('*')) {
    const pre = pattern.slice(0, -1);
    return actual.startsWith(pre);
  }
  return false;
}

function decodeSample(text) {
  try {
    return decodeURIComponent(text.replace(/\+/g, ' '));
  } catch {
    return text;
  }
}

/**
 * @param {string} text
 * @returns {{ id: string } | null}
 */
export function detectSqliInText(text) {
  if (!text || typeof text !== 'string') return null;
  const sample = decodeSample(text).slice(0, 8192);
  for (const rule of SQLI_RULES) {
    if (rule.re.test(sample)) return { id: rule.id };
  }
  return null;
}

/**
 * @param {string} text
 * @returns {{ id: string } | null}
 */
export function detectXssInText(text) {
  if (!text || typeof text !== 'string') return null;
  const sample = decodeSample(text).slice(0, 8192);
  for (const rule of XSS_RULES) {
    if (rule.re.test(sample)) return { id: rule.id };
  }
  return null;
}

/**
 * @param {string} text — path + query
 */
export function detectPathTraversalInText(text) {
  if (!text || typeof text !== 'string') return null;
  const raw = text.slice(0, 4096);
  const decoded = decodeSample(raw);
  const sample = `${raw}\n${decoded}`;
  for (const rule of PATH_TRAVERSAL_RULES) {
    if (rule.re.test(sample)) return { id: rule.id };
  }
  return null;
}

/**
 * @param {string} text
 */
export function detectCmdInjectionInText(text) {
  if (!text || typeof text !== 'string') return null;
  const sample = decodeSample(text).slice(0, 8192);
  for (const rule of CMD_INJECTION_RULES) {
    if (rule.re.test(sample)) return { id: rule.id };
  }
  return null;
}

/**
 * @param {string|undefined} ua
 * @param {{ blockCurl?: boolean; extraPatterns?: Array<{ re: RegExp; id: string }> }} [opts]
 */
export function detectSuspiciousUserAgent(ua, opts = {}) {
  if (!ua || typeof ua !== 'string') return null;
  const blockCurl = opts.blockCurl !== false;
  const rules = [...DEFAULT_UA_BLOCK];
  if (!blockCurl) {
    const filtered = rules.filter((r) => r.id !== 'curl');
    rules.length = 0;
    rules.push(...filtered);
  }
  if (Array.isArray(opts.extraPatterns)) {
    rules.push(...opts.extraPatterns);
  }
  for (const rule of rules) {
    if (rule.re.test(ua)) return { id: rule.id };
  }
  return null;
}

function collectScanStrings(req) {
  const { path, search } = pathnameAndSearch(req);
  const parts = [path, search];
  const ref = req.headers?.referer;
  if (typeof ref === 'string' && ref.length) parts.push(ref.slice(0, 2048));
  const body = req.body;
  if (body != null) {
    if (typeof body === 'string') parts.push(body.slice(0, 8192));
    else if (typeof body === 'object') {
      try {
        parts.push(JSON.stringify(body).slice(0, 8192));
      } catch {
        /* ignore */
      }
    }
  }
  return parts.join('\n');
}

function pruneHits(timestamps, now, windowMs) {
  while (timestamps.length && now - timestamps[0] > windowMs) {
    timestamps.shift();
  }
}

/**
 * Generic sliding-window rate limiter.
 * @returns {boolean} true = allowed, false = exceeded
 */
export function recordRateLimit(bucketKey, cfg) {
  const now = Date.now();
  let b = rateBuckets.get(bucketKey);
  if (!b) {
    b = { ts: [] };
    rateBuckets.set(bucketKey, b);
  }
  pruneHits(b.ts, now, cfg.windowMs);
  if (b.ts.length >= cfg.maxPerWindow) {
    return false;
  }
  b.ts.push(now);
  return true;
}

/** @deprecated gunakan recordRateLimit(`ddos:${ip}`, cfg) */
export function recordDdosWindow(ip, cfg) {
  return recordRateLimit(`ddos:${ip}`, cfg);
}

function matchesBrutePath(path, method, cfg) {
  const paths = cfg.paths ?? ['/login', '/signin', '/auth', '/api/login', '/api/auth'];
  const methods = cfg.methods ?? ['POST', 'GET', 'PUT', 'PATCH'];
  if (!methods.includes('*') && !methods.includes(method)) return false;
  return paths.some((p) => pathMatches(path, p));
}

async function geoLookup(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('::ffff:127.')) {
    return { lat: 0, lon: 0, label: 'loopback' };
  }
  const clean = ip.replace(/^::ffff:/, '');
  try {
    const res = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(clean)}?fields=status,lat,lon,city,country`,
      { signal: AbortSignal.timeout(4000) }
    );
    const j = await res.json();
    if (j.status === 'success' && typeof j.lat === 'number' && typeof j.lon === 'number') {
      const label = [j.city, j.country].filter(Boolean).join(', ') || clean;
      return { lat: j.lat, lon: j.lon, label };
    }
  } catch {
    /* ignore */
  }
  return { lat: 0, lon: 0, label: clean };
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
 * @param {{ enabled?: boolean; maxPerWindow?: number; windowMs?: number; paths?: string[]; methods?: string[] }} [opts.bruteForce]
 * @param {{ enabled?: boolean; blockCurl?: boolean }} [opts.suspiciousUa]
 * @param {{ enabled?: boolean }} [opts.pathTraversal]
 * @param {{ enabled?: boolean }} [opts.cmdInjection]
 */
export function createSecurityDetectionMiddleware(opts) {
  const ingestUrl = opts.bridgeIngestUrl;
  const apiKey = opts.apiKey;
  const siteRegion = opts.siteRegion;
  if (!ingestUrl || !apiKey || !siteRegion || typeof siteRegion.lat !== 'number' || typeof siteRegion.lon !== 'number') {
    throw new Error('createSecurityDetectionMiddleware: bridgeIngestUrl, apiKey, siteRegion { lat, lon } required');
  }

  const reportToBridge = opts.reportToBridge !== false;
  const geo = opts.geoLookup !== false;
  const ddosCfg = {
    enabled: opts.ddos?.enabled !== false,
    maxPerWindow: opts.ddos?.maxPerWindow ?? 120,
    windowMs: opts.ddos?.windowMs ?? 10_000,
  };
  const bruteCfg = {
    enabled: opts.bruteForce?.enabled !== false,
    maxPerWindow: opts.bruteForce?.maxPerWindow ?? 10,
    windowMs: opts.bruteForce?.windowMs ?? 60_000,
    paths: opts.bruteForce?.paths,
    methods: opts.bruteForce?.methods,
  };
  const sqliCfg = { enabled: opts.sqli?.enabled !== false };
  const xssCfg = { enabled: opts.xss?.enabled !== false };
  const pathTravCfg = { enabled: opts.pathTraversal?.enabled !== false };
  const cmdCfg = { enabled: opts.cmdInjection?.enabled !== false };
  const uaCfg = {
    enabled: opts.suspiciousUa?.enabled !== false,
    blockCurl: opts.suspiciousUa?.blockCurl,
    extraPatterns: opts.suspiciousUa?.extraPatterns,
  };
  const skip = typeof opts.skip === 'function' ? opts.skip : () => false;

  function userAgentFromReq(req) {
    const u = req.headers?.['user-agent'];
    return typeof u === 'string' ? u.slice(0, 512) : undefined;
  }

  const ingestIntrusion = (payload, req, ip) =>
    sendIngest(ingestUrl, apiKey, {
      id: randomUUID(),
      createdAt: Date.now(),
      category: 'intrusion',
      severity: payload.severity || 'high',
      from: payload.from,
      to: { lat: siteRegion.lat, lon: siteRegion.lon },
      sourceLabel: payload.sourceLabel,
      targetLabel: payload.targetLabel,
      siteId: opts.siteId,
      tenantId: opts.tenantId,
      path: payload.path,
      method: payload.method,
      blocked: true,
      action: 'blocked',
      attackerIp: ip,
      userAgent: userAgentFromReq(req),
      ...(payload.detection ? { detection: payload.detection } : {}),
    });

  return function securityDetectionMiddleware(req, res, next) {
    if (skip(req)) {
      next();
      return;
    }

    const ip = clientIp(req);
    const { path, search } = pathnameAndSearch(req);
    const method = (req.method || 'GET').toUpperCase();
    const blob = collectScanStrings(req);
    const pathQuery = `${path}${search}`;

    const runIngest = (fn) => {
      if (!reportToBridge) return;
      queueMicrotask(fn);
    };

    // 6) Suspicious User-Agent
    if (uaCfg.enabled) {
      const ua = req.headers?.['user-agent'];
      const uaHit = detectSuspiciousUserAgent(typeof ua === 'string' ? ua : '', uaCfg);
      if (uaHit) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-PrimeDefender-Detection', 'bad_user_agent');
        res.end(
          JSON.stringify({
            error: 'forbidden',
            reason: 'suspicious_user_agent',
            rule: uaHit.id,
          })
        );
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await ingestIntrusion(
              {
                severity: 'medium',
                from: { lat: from.lat, lon: from.lon },
                sourceLabel: from.label || ip,
                targetLabel: `${method} ${path} · UA:${uaHit.id}`,
                path,
                method,
                detection: `bad_ua:${uaHit.id}`,
              },
              req,
              ip
            );
          } catch (e) {
            console.error('[detection] ua ingest failed', e?.message || e);
          }
        });
        return;
      }
    }

    // 4) Path traversal
    if (pathTravCfg.enabled) {
      const hit = detectPathTraversalInText(pathQuery);
      if (hit) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-PrimeDefender-Detection', 'path_traversal');
        res.end(
          JSON.stringify({
            error: 'forbidden',
            reason: 'path_traversal',
            rule: hit.id,
          })
        );
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await ingestIntrusion(
              {
                severity: 'high',
                from: { lat: from.lat, lon: from.lon },
                sourceLabel: from.label || ip,
                targetLabel: `${method} ${path} · PathTrav:${hit.id}`,
                path,
                method,
                detection: `path_traversal:${hit.id}`,
              },
              req,
              ip
            );
          } catch (e) {
            console.error('[detection] path trav ingest failed', e?.message || e);
          }
        });
        return;
      }
    }

    // 5) Command injection
    if (cmdCfg.enabled) {
      const hit = detectCmdInjectionInText(blob);
      if (hit) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-PrimeDefender-Detection', 'cmd_injection');
        res.end(
          JSON.stringify({
            error: 'forbidden',
            reason: 'command_injection',
            rule: hit.id,
          })
        );
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await ingestIntrusion(
              {
                severity: 'critical',
                from: { lat: from.lat, lon: from.lon },
                sourceLabel: from.label || ip,
                targetLabel: `${method} ${path} · Cmd:${hit.id}`,
                path,
                method,
                detection: `cmd_injection:${hit.id}`,
              },
              req,
              ip
            );
          } catch (e) {
            console.error('[detection] cmd ingest failed', e?.message || e);
          }
        });
        return;
      }
    }

    // 1) SQLi
    if (sqliCfg.enabled) {
      const hit = detectSqliInText(blob);
      if (hit) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-PrimeDefender-Detection', 'sqli');
        res.end(
          JSON.stringify({
            error: 'forbidden',
            reason: 'sql_injection_probe',
            rule: hit.id,
          })
        );
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await ingestIntrusion(
              {
                severity: 'critical',
                from: { lat: from.lat, lon: from.lon },
                sourceLabel: from.label || ip,
                targetLabel: `${method} ${path} · SQLi:${hit.id}`,
                path,
                method,
                detection: `sqli:${hit.id}`,
              },
              req,
              ip
            );
          } catch (e) {
            console.error('[detection] sqli ingest failed', e?.message || e);
          }
        });
        return;
      }
    }

    // 2) XSS
    if (xssCfg.enabled) {
      const hit = detectXssInText(blob);
      if (hit) {
        res.statusCode = 403;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('X-PrimeDefender-Detection', 'xss');
        res.end(
          JSON.stringify({
            error: 'forbidden',
            reason: 'xss_probe',
            rule: hit.id,
          })
        );
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await ingestIntrusion(
              {
                severity: 'high',
                from: { lat: from.lat, lon: from.lon },
                sourceLabel: from.label || ip,
                targetLabel: `${method} ${path} · XSS:${hit.id}`,
                path,
                method,
                detection: `xss:${hit.id}`,
              },
              req,
              ip
            );
          } catch (e) {
            console.error('[detection] xss ingest failed', e?.message || e);
          }
        });
        return;
      }
    }

    // 3) Brute force (hanya jalur login) ATAU 7) flood global — tidak double-count
    const onBrutePath = bruteCfg.enabled && matchesBrutePath(path, method, bruteCfg);
    if (onBrutePath) {
      const allowed = recordRateLimit(`brute:${ip}:${path}`, bruteCfg);
      if (!allowed) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Retry-After', '60');
        res.setHeader('X-PrimeDefender-Detection', 'brute_force');
        res.end(JSON.stringify({ error: 'rate_limited', reason: 'brute_force_login' }));
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await ingestIntrusion(
              {
                severity: 'high',
                from: { lat: from.lat, lon: from.lon },
                sourceLabel: from.label || ip,
                targetLabel: `${method} ${path} · BruteForce`,
                path,
                method,
                detection: 'brute_force',
              },
              req,
              ip
            );
          } catch (e) {
            console.error('[detection] brute ingest failed', e?.message || e);
          }
        });
        return;
      }
    } else if (ddosCfg.enabled) {
      const allowed = recordRateLimit(`ddos:${ip}`, ddosCfg);
      if (!allowed) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Retry-After', '30');
        res.setHeader('X-PrimeDefender-Detection', 'ddos');
        res.end(JSON.stringify({ error: 'rate_limited', reason: 'ddos_flood' }));
        runIngest(async () => {
          try {
            const from = geo ? await geoLookup(ip) : { lat: 0, lon: 0, label: ip };
            await sendIngest(ingestUrl, apiKey, {
              id: randomUUID(),
              createdAt: Date.now(),
              category: 'ddos',
              severity: 'high',
              from: { lat: from.lat, lon: from.lon },
              to: { lat: siteRegion.lat, lon: siteRegion.lon },
              sourceLabel: from.label || ip,
              targetLabel: `${method} ${path} · flood`,
              siteId: opts.siteId,
              tenantId: opts.tenantId,
              path,
              method,
              blocked: true,
              action: 'blocked',
              attackerIp: ip,
              userAgent: userAgentFromReq(req),
              detection: 'ddos_flood',
              ddos: { vector: DDOS_VECTOR_APP },
            });
          } catch (e) {
            console.error('[detection] ddos ingest failed', e?.message || e);
          }
        });
        return;
      }
    }

    next();
  };
}

