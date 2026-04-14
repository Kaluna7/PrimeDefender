/**
 * Customer-facing integration guide (English + Indonesian).
 * Code samples are language-neutral; copy changes by locale.
 */

export const CODE_SAMPLES = {
  envBridge: `# Bridge (cyber-attack-map-server) — .env
PORT=3000
INGEST_ENABLED=true
# Buat API key per pelanggan (disimpan di data/api-keys.json):
ADMIN_SECRET=long-random-string-for-dashboard-settings
# Opsional: satu token legacy untuk semua (atau hanya pakai API key):
# INGEST_TOKEN=legacy-shared-secret`,

  envFrontend: `# Dashboard (cyber-attack-map) — .env
VITE_SOCKET_URL=https://bridge.your-domain.com
# Must match the URL where the bridge is reachable from the browser`,

  nodeFetch: `// Node.js 18+ — di server pelanggan
const BRIDGE = process.env.PRIMEDEFENDER_BRIDGE_URL;
const API_KEY = process.env.PRIMEDEFENDER_API_KEY; // dari Settings / POST /admin/api-keys

async function reportIncident(event) {
  const body = {
    from: { lat: event.srcLat, lon: event.srcLon },
    to: { lat: event.dstLat, lon: event.dstLon },
    category: event.category || 'ddos',
    severity: event.severity || 'high',
    sourceLabel: event.srcLabel,
    targetLabel: event.dstLabel,
    siteId: event.customerSiteId,
    tenantId: event.tenantId,
    id: event.idempotencyKey,
    createdAt: Date.now(),
  };
  if (event.ddos) body.ddos = event.ddos;

  const res = await fetch(\`\${BRIDGE}/ingest\`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
}`,

  detectionExpress: `// Express — import dari folder bridge Anda (contoh path monorepo)
import express from 'express';
import { createSecurityDetectionMiddleware } from '../cyber-attack-map-server/detectionMiddleware.mjs';

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '32kb' }));

app.use(
  createSecurityDetectionMiddleware({
    bridgeIngestUrl: process.env.PRIMEDEFENDER_BRIDGE_URL + '/ingest',
    apiKey: process.env.PRIMEDEFENDER_API_KEY,
    siteRegion: { lat: -6.2, lon: 106.85, label: 'Origin' },
    siteId: 'customer-site',
    ddos: { maxPerWindow: 100, windowMs: 10000 },
    sqli: { enabled: true },
    xss: { enabled: true },
    pathTraversal: { enabled: true },
    fileInclusion: { enabled: true },
    cmdInjection: { enabled: true },
    authBypass: { enabled: true, mode: 'observe' },
    bruteForce: { maxPerWindow: 10, windowMs: 60_000 },
    scanner: { maxPerWindow: 12, windowMs: 60_000 },
    botActivity: { maxPerWindow: 40, windowMs: 30_000 },
    suspiciousRequest: { maxPerWindow: 8, windowMs: 60_000, mode: 'observe' },
    suspiciousUa: { enabled: true, blockCurl: false },
    skip: (req) => /\\.(ico|png|js|css|woff2?)$/i.test(req.url || ''),
  })
);

// Route Anda di bawah ini`,

  python: `# Python 3.10+
import os
import requests

BRIDGE = os.environ["PRIMEDEFENDER_BRIDGE_URL"].rstrip("/")
API_KEY = os.environ["PRIMEDEFENDER_API_KEY"]

def report_incident(payload: dict) -> None:
    headers = {"Content-Type": "application/json", "X-Api-Key": API_KEY}
    url = BRIDGE + "/ingest"
    r = requests.post(url, json=payload, headers=headers, timeout=10)
    r.raise_for_status()

# Example:
# report_incident({
#     "from": {"lat": 37.77, "lon": -122.42},
#     "to": {"lat": 51.51, "lon": -0.13},
#     "category": "ddos",
#     "severity": "high",
#     "siteId": "customer-123",
# })`,

  fastapiProxy: `# FastAPI + Uvicorn di belakang ngrok / reverse proxy
# Pasang middleware ini PALING LUAR (sebelum middleware deteksi Anda)
# agar IP klien & GeoIP memakai pengunjung sungguhan, bukan hop AS.

from starlette.middleware.proxy_headers import ProxyHeadersMiddleware

app = FastAPI()
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts="*")  # prod: batasi host yang dipercaya

# Opsional: helper jika Anda mengambil IP manual untuk laporan ingest
def client_ip_from_request(request) -> str:
    xff = request.headers.get("x-forwarded-for") or request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    if request.client:
        return request.client.host
    return ""`,

  curl: `curl -sS -X POST "https://YOUR_BRIDGE_URL/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: pd_YOUR_CUSTOMER_KEY" \\
  -d '{
    "from": {"lat": 40.71, "lon": -74.01},
    "to": {"lat": 51.51, "lon": -0.13},
    "category": "intrusion",
    "severity": "medium",
    "sourceLabel": "Scanner",
    "targetLabel": "App server",
    "siteId": "prod-shop"
  }'`,

  payloadExample: `{
  "from": { "lat": number, "lon": number },
  "to": { "lat": number, "lon": number },
  "category": "ddos | intrusion | malware | botnet | unknown",
  "severity": "low | medium | high | critical",
  "sourceLabel": "string",
  "targetLabel": "string",
  "siteId": "your-customer-or-site-id",
  "tenantId": "optional-tenant",
  "id": "optional-unique-id-for-dedup",
  "createdAt": 1710000000000,
  "blocked": true,
  "action": "blocked",
  "path": "/login",
  "method": "GET",
  "osiLayer": 7,
  "attackerIp": "203.0.113.42",
  "userAgent": "Mozilla/5.0 …",
  "detection": "sqli:union_select",
  "ddos": {
    "vector": "volumetric | protocol | application",
    "peakGbps": 12.5,
    "packetsPerSec": 890000,
    "dependencies": ["botnet", "amplification"]
  }
}`,
};

/** @type {Record<'en'|'id', { title: string; subtitle: string; sections: Array<{ h: string; p: string[] }> }>} */
export const integrationGuide = {
  en: {
    title: 'Integration guide',
    subtitle:
      'After you purchase a plan, use this checklist to connect your middleware to PrimeDefender and see incidents on the monitoring dashboard.',
    sections: [
      {
        h: '1. What you receive from us',
        p: [
          'Bridge base URL (HTTPS), e.g. `https://bridge.your-tenant.primedefender.io`.',
          'Per-customer API keys: set `ADMIN_SECRET` on the bridge, then use **Settings** in the dashboard or `POST /admin/api-keys` to mint `pd_…` keys. Customers send `X-Api-Key` on every `POST /ingest`.',
          'Optional legacy single token `INGEST_TOKEN` still works as `X-Ingest-Token` / `Authorization: Bearer`.',
          'Dashboard: set `VITE_SOCKET_URL` to your bridge. The threat map uses ECharts in the browser (no map API key).',
        ],
      },
      {
        h: '2. Architecture (your responsibility vs ours)',
        p: [
          'Your middleware (WAF rules, scoring, rate limits) decides **when** to block and **what** to send.',
          'Your middleware sends HTTP `POST` to our bridge `/ingest` after it has classified the event.',
          'The bridge broadcasts to the dashboard over Socket.io. We do not sit in the traffic path and we do not invent attacks.',
        ],
      },
      {
        h: '2b. Built-in detection middleware (optional)',
        p: [
          'The server repo includes `detectionMiddleware.mjs`: import `createSecurityDetectionMiddleware` in the customer’s Node (Express) app.',
          '**DDoS (application layer):** per-IP request count in a sliding window; over limit → HTTP 429 and optional auto-`POST /ingest` with `category: ddos` and `ddos.vector: application`.',
          '**SQL injection:** regex/heuristic scan of URL, query string, and JSON body for common probes (e.g. `UNION SELECT`, `sleep(`, `information_schema`); match → HTTP 403 and ingest with `category: intrusion`.',
          '**XSS:** tags/sinks (`<script`, `javascript:`, `onerror`, `eval(`…).',
          '**Brute force:** stricter rate limit on `/login`, `/signin`, `/api/login`… (separate from global flood).',
          '**Path traversal:** `../`, encoded `..`, `etc/passwd` in URL.',
          '**File inclusion:** local/remote include probes such as `php://`, `file://`, or `../etc/passwd` in include-style parameters.',
          '**Command injection:** `;`, `&&`, pipes, backticks, common shell commands.',
          '**Auth bypass probes:** suspicious admin/internal paths, privilege-escalation params, and rewrite/method-override headers.',
          '**Suspicious User-Agent / bot activity:** sqlmap, curl (optional), python-requests, headless or automation clients — tune `suspiciousUa.blockCurl` and `botActivity`.',
          '**Scanner / suspicious request:** path enumeration (`/.env`, `/wp-admin`, `/phpmyadmin`, etc.) and malformed/double-encoded probing can be rate-limited or observed first.',
          '**DDoS / flood:** global per-IP window (non-login routes only when brute paths are used). Not GRE/BGP. Tune `ddos` / `skip`.',
          'The middleware caches GeoIP lookups and sends `attackerIp` + `from.lat/lon` to the bridge, so the monitoring map can show where the attacker likely comes from.',
        ],
      },
      {
        h: '3. Enable the bridge',
        p: [
          'On the server running `cyber-attack-map-server`, set `INGEST_ENABLED=true`. Without this, `/ingest` returns 403.',
          'Set `ADMIN_SECRET` and create at least one API key (or set `INGEST_TOKEN` for a single shared secret). Ingest requires `X-Api-Key` (or legacy `X-Ingest-Token` / Bearer).',
        ],
      },
      {
        h: '4. Configure the dashboard',
        p: [
          'Build the React app with `VITE_SOCKET_URL` pointing to your bridge origin (same host you use in `fetch`).',
          'No extra map key is required for the dashboard map (ECharts loads world GeoJSON from a CDN).',
        ],
      },
      {
        h: '5. Minimum JSON payload',
        p: [
          'Required: `from` and `to` with numeric `lat` and `lon` (WGS84). Everything else is optional but recommended for SOC context.',
        ],
      },
      {
        h: '6. Operational rules',
        p: [
          'Call `/ingest` only for incidents you trust — rate-limit on your side if needed.',
          'Use `mode: "observe"` first for high-risk rules (for example `authBypass` or `suspiciousRequest`) if you want to reduce false positives before enforcing a hard block.',
          'If the app runs behind Nginx, Cloudflare, **ngrok**, or another proxy/CDN, configure **trust proxy** (Express: `trust proxy`) or **FastAPI/Starlette `ProxyHeadersMiddleware`** so the real client IP comes from `X-Forwarded-For`. Otherwise GeoIP may show the **proxy data center** (e.g. US East) instead of the visitor’s country.',
          'Behind **ngrok**, take the **leftmost** IP in `X-Forwarded-For` (or rely on `ProxyHeadersMiddleware`) before GeoIP / `attackerIp` in your ingest payload.',
          'Optional: send explicit map hints with headers such as `X-Prime-Source-Lat` / `X-Prime-Source-Lon` / `X-Prime-Source-Label` if you need deterministic labels in lab setups.',
          'Use HTTPS in production. Rotate `INGEST_TOKEN` if it leaks.',
          'The UI connects only to bridge API version 2 (`GET /health` returns `version: 2`).',
        ],
      },
      {
        h: '7. Verify',
        p: [
          'Health: `GET https://YOUR_BRIDGE/health` should return `"ok": true` and `"version": 2`.',
          'Send one test `POST /ingest` with valid coordinates; the Monitoring tab should show a new row and arc within seconds.',
        ],
      },
    ],
  },
  id: {
    title: 'Panduan integrasi',
    subtitle:
      'Setelah membeli paket, gunakan checklist ini untuk menghubungkan middleware Anda ke PrimeDefender dan melihat insiden di dashboard monitoring.',
    sections: [
      {
        h: '1. Yang Anda terima dari kami',
        p: [
          'URL dasar bridge (HTTPS), mis. `https://bridge.tenant.primedefender.io`.',
          'API key per pelanggan: set `ADMIN_SECRET` di bridge, lalu buat key lewat **Pengaturan** di dashboard atau `POST /admin/api-keys`. Pelanggan mengirim `X-Api-Key` pada setiap `POST /ingest`.',
          'Opsional: satu token lama `INGEST_TOKEN` tetap bisa dipakai sebagai `X-Ingest-Token` / Bearer.',
          'Dashboard: set `VITE_SOCKET_URL` ke bridge. Peta memakai ECharts di browser (tanpa kunci peta).',
        ],
      },
      {
        h: '2. Arsitektur (tanggung jawab Anda vs kami)',
        p: [
          'Middleware Anda (aturan WAF, skor, rate limit) yang memutus **kapan** memblokir dan **apa** yang dikirim.',
          'Middleware Anda mengirim HTTP `POST` ke bridge `/ingest` setelah insiden diklasifikasi.',
          'Bridge meneruskan ke dashboard lewat Socket.io. Kami tidak berada di jalur traffic dan tidak membuat data palsu.',
        ],
      },
      {
        h: '2b. Middleware deteksi (opsional)',
        p: [
          'Repo server menyertakan `detectionMiddleware.mjs`: impor `createSecurityDetectionMiddleware` di aplikasi Express pelanggan.',
          '**DDoS (lapisan aplikasi):** hitungan request per IP dalam jendela waktu; melebihi ambang → HTTP 429 dan opsi lapor `POST /ingest` dengan `category: ddos`, vektor `application`.',
          '**SQL injection:** pemindaian pola pada URL, query, body JSON untuk probe umum (mis. `UNION SELECT`, `sleep(`, `information_schema`); cocok → HTTP 403 dan `category: intrusion`.',
          '**XSS:** tag/sink umum.',
          '**Brute force:** rate limit ketat di jalur login (terpisah dari flood global).',
          '**Path traversal:** `../`, encoding, file sensitif.',
          '**File inclusion:** probe include lokal/jarak jauh seperti `php://`, `file://`, atau `../etc/passwd` pada parameter include-style.',
          '**Command injection:** metakarakter shell & perintah umum.',
          '**Bypass auth:** probing path admin/internal, parameter eskalasi hak akses, serta header rewrite/method override yang mencurigakan.',
          '**User-Agent / bot:** sqlmap, curl (opsional), python-requests, headless browser, atau automation client.',
          '**Scanner / suspicious request:** enumerasi path sensitif (`/.env`, `/wp-admin`, `/phpmyadmin`, dll.) dan probe malformed/double-encoded bisa dibatasi atau diamati dulu.',
          '**DDoS / flood:** jendela per IP untuk route non-login. Bukan GRE/BGP.',
          'Middleware menyimpan cache GeoIP lalu mengirim `attackerIp` + `from.lat/lon` ke bridge agar peta monitoring bisa menampilkan asal perkiraan attacker.',
        ],
      },
      {
        h: '3. Menyalakan bridge',
        p: [
          'Di server `cyber-attack-map-server`, set `INGEST_ENABLED=true`. Tanpa ini, `/ingest` mengembalikan 403.',
          'Set `ADMIN_SECRET` dan buat minimal satu API key (atau pakai `INGEST_TOKEN` untuk satu rahasia bersama). Ingest membutuhkan `X-Api-Key` atau header legacy.',
        ],
      },
      {
        h: '4. Konfigurasi dashboard',
        p: [
          'Build frontend dengan `VITE_SOCKET_URL` mengarah ke origin bridge (sama dengan URL di `fetch`).',
          'Tidak perlu kunci peta tambahan untuk UI (ECharts).',
        ],
      },
      {
        h: '5. Payload JSON minimal',
        p: [
          'Wajib: `from` dan `to` dengan `lat` dan `lon` angka (WGS84). Field lain opsional tapi disarankan.',
        ],
      },
      {
        h: '6. Aturan operasi',
        p: [
          'Panggil `/ingest` hanya untuk insiden yang Anda percaya — batasi rate di sisi Anda jika perlu.',
          'Gunakan `mode: "observe"` dulu untuk rule yang rawan false positive (mis. `authBypass` atau `suspiciousRequest`) sebelum memaksa blok penuh.',
          'Jika aplikasi di belakang Nginx, Cloudflare, **ngrok**, atau proxy/CDN, set **`trust proxy`** (Express) atau **`ProxyHeadersMiddleware`** (FastAPI/Starlette) agar IP klien diambil dari `X-Forwarded-For`. Tanpa itu, GeoIP bisa menunjuk **pusat data proxy** (mis. AS) bukan negara pengunjung.',
          'Di belakang **ngrok**, pakai IP paling kiri di `X-Forwarded-For` (atau andalkan `ProxyHeadersMiddleware`) sebelum GeoIP / field `attackerIp` pada ingest.',
          'Opsional: header `X-Prime-Source-Lat` / `X-Prime-Source-Lon` / `X-Prime-Source-Label` untuk label/koordinat deterministik di lingkungan uji.',
          'Gunakan HTTPS di produksi. Ganti token jika bocor.',
          'UI hanya menyambung ke bridge versi 2 (`GET /health` mengembalikan `version: 2`).',
        ],
      },
      {
        h: '7. Verifikasi',
        p: [
          '`GET https://BRIDGE_ANDA/health` harus berisi `"ok": true` dan `"version": 2`.',
          'Kirim satu `POST /ingest` uji; tab Monitoring harus menampilkan baris dan busur baru dalam hitungan detik.',
        ],
      },
    ],
  },
};
