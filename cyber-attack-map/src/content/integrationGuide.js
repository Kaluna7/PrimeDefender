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
VITE_GOOGLE_MAPS_API_KEY=your-maps-js-api-key
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
    cmdInjection: { enabled: true },
    bruteForce: { maxPerWindow: 10, windowMs: 60_000 },
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
          'Dashboard: set `VITE_SOCKET_URL` to your bridge. Google Maps API key is only for the frontend map.',
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
          '**Command injection:** `;`, `&&`, pipes, backticks, common shell commands.',
          '**Suspicious User-Agent:** sqlmap, curl (optional), python-requests, scanners — tune `suspiciousUa.blockCurl`.',
          '**DDoS / flood:** global per-IP window (non-login routes only when brute paths are used). Not GRE/BGP. Tune `ddos` / `skip`.',
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
          'Set `VITE_GOOGLE_MAPS_API_KEY` with a Google Maps JavaScript API key for the map.',
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
          'Dashboard: set `VITE_SOCKET_URL` ke bridge. Kunci Google Maps hanya untuk peta di frontend.',
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
          '**Command injection:** metakarakter shell & perintah umum.',
          '**User-Agent:** sqlmap, curl (opsional), python-requests, scanner.',
          '**DDoS / flood:** jendela per IP untuk route non-login. Bukan GRE/BGP.',
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
          'Set `VITE_GOOGLE_MAPS_API_KEY` untuk peta.',
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
