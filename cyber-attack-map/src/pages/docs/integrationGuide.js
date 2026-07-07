/**
 * Customer-facing integration guide — integration steps only.
 */

/** @typedef {'python' | 'javascript'} IntegrationStack */

export const INTEGRATION_STACKS = /** @type {const} */ (['python', 'javascript']);

export const CODE_SAMPLES = {
  pythonInstall: `pip install primedefender-fastapi`,

  pythonEnv: `PRIMEDEFENDER_BRIDGE_URL=https://your-bridge-host.com
PRIMEDEFENDER_API_KEY=pd_your_key_from_slark
PRIMEDEFENDER_SITE_ID=my-api
PRIMEDEFENDER_SITE_LAT=-8.6705
PRIMEDEFENDER_SITE_LON=115.2126
PRIMEDEFENDER_SITE_REGION_LABEL=Indonesia, Bali`,

  pythonMain: `from fastapi import FastAPI
from primedefender_fastapi import PrimeDefenderMiddleware

app = FastAPI()
app.add_middleware(PrimeDefenderMiddleware)`,

  javascriptInstall: `npm install primedefender-client`,

  javascriptEnv: `PRIMEDEFENDER_BRIDGE_URL=https://your-bridge-host.com
PRIMEDEFENDER_API_KEY=pd_your_key_from_slark
PRIMEDEFENDER_SITE_ID=my-api
PRIMEDEFENDER_SITE_LAT=-8.6705
PRIMEDEFENDER_SITE_LON=115.2126
PRIMEDEFENDER_SITE_REGION_LABEL=Indonesia, Bali`,

  javascriptApp: `import express from 'express';
import { postIncident, resolveIngestUrl } from 'primedefender-client';

const app = express();
app.set('trust proxy', 1);

const ingestUrl = resolveIngestUrl(process.env.PRIMEDEFENDER_BRIDGE_URL);
const apiKey = process.env.PRIMEDEFENDER_API_KEY;
const siteId = process.env.PRIMEDEFENDER_SITE_ID || 'my-api';

app.use(async (req, res, next) => {
  const q = String(req.query.q || '');
  if (!q.includes("' OR '1'='1")) return next();

  await postIncident({
    ingestUrl,
    apiKey,
    payload: {
      from: { lat: 35.0, lon: 139.0 },
      to: {
        lat: Number(process.env.PRIMEDEFENDER_SITE_LAT),
        lon: Number(process.env.PRIMEDEFENDER_SITE_LON),
      },
      category: 'intrusion',
      severity: 'high',
      sourceLabel: req.ip || 'unknown',
      targetLabel: \`\${siteId} · \${process.env.PRIMEDEFENDER_SITE_REGION_LABEL}\`,
      siteId,
      createdAt: Date.now(),
      blocked: true,
      action: 'blocked',
      path: req.path,
      method: req.method,
      attackerIp: req.ip || '',
      userAgent: req.get('user-agent') || '',
      detection: 'sqli',
      detectType: 'sqli',
    },
  });

  return res.status(403).send('blocked');
});

app.get('/search', (_req, res) => res.json({ ok: true }));`,

  javascriptPostIncident: `import {
  postIncident,
  resolveIngestUrl,
} from 'primedefender-client';

const ingestUrl = resolveIngestUrl(process.env.PRIMEDEFENDER_BRIDGE_URL);
const result = await postIncident({
  ingestUrl,
  apiKey: process.env.PRIMEDEFENDER_API_KEY,
  payload: {
    from: { lat: 35.0, lon: 139.0 },
    to: { lat: -8.67, lon: 115.21 },
    category: 'intrusion',
    severity: 'high',
    sourceLabel: 'Japan, Tokyo',
    targetLabel: 'my-site · Indonesia, Bali',
    siteId: 'my-site',
    createdAt: Date.now(),
    blocked: true,
    action: 'blocked',
    path: '/api/x',
    method: 'GET',
    attackerIp: '203.0.113.1',
    userAgent: 'curl/8',
    detection: 'sqli',
    detectType: 'sqli',
    detectConfidence: 0.96,
    responseStatus: 403,
    mitigation: 'request_block',
  },
});

console.log(result.ok, result.status, result.bodyText);`,

  testCurlCommandEn: `curl -i "https://your-backend-host.com/search?q=' OR '1'='1"`,

  testCurlCommandId: `curl -i "https://link-backend-anda.com/search?q=' OR '1'='1"`,

  testSqliPayloadEn: `' OR '1'='1`,

  testSqliPayloadId: `' OR '1'='1`,
};

/** @typedef {{ title: string; codeKey: keyof typeof CODE_SAMPLES }} GuideCodeBlock */

/** @typedef {{ id: string; h: string; p: string[]; codeBlocks?: GuideCodeBlock[] }} GuideSection */

/**
 * @param {typeof integrationGuide.en} doc
 * @param {IntegrationStack} stack
 * @returns {GuideSection[]}
 */
export function getGuideSections(doc, stack) {
  return [...doc.commonBefore, ...doc.stackSections[stack], ...doc.commonAfter];
}

/** @param {string} sectionId @param {string} codeTitle */
export function guideCodeBlockId(sectionId, codeTitle) {
  const slug = codeTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return `${sectionId}-${slug}`;
}

/**
 * @param {typeof integrationGuide.en} doc
 * @param {IntegrationStack} stack
 */
export function getGuideNavItems(doc, stack) {
  return getGuideSections(doc, stack).map((section) => ({
    id: section.id,
    label: section.h,
    children: (section.codeBlocks ?? []).map((block) => ({
      id: guideCodeBlockId(section.id, block.title),
      label: block.title,
    })),
  }));
}

/** @param {string} text */
function stripGuideMarkup(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1');
}

/**
 * @param {typeof integrationGuide.en} doc
 * @param {IntegrationStack} stack
 * @param {string} query
 */
export function searchGuide(doc, stack, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  /** @type {{ id: string; label: string; parent?: string }[]} */
  const results = [];
  const seen = new Set();

  const push = (id, label, parent) => {
    if (seen.has(id)) return;
    seen.add(id);
    results.push({ id, label, parent });
  };

  for (const section of getGuideSections(doc, stack)) {
    const plainHeading = section.h.toLowerCase();
    if (plainHeading.includes(q)) {
      push(section.id, section.h);
    }

    for (const para of section.p) {
      const plain = stripGuideMarkup(para).toLowerCase();
      if (plain.includes(q)) {
        push(section.id, section.h);
        break;
      }
    }

    for (const block of section.codeBlocks ?? []) {
      const blockId = guideCodeBlockId(section.id, block.title);
      const titleMatch = block.title.toLowerCase().includes(q);
      const codeMatch = CODE_SAMPLES[block.codeKey]?.toLowerCase().includes(q);
      if (titleMatch || codeMatch) {
        push(blockId, block.title, section.h);
      }
    }
  }

  return results.slice(0, 8);
}

/** @type {Record<'en'|'id', {
 *   title: string;
 *   subtitle: string;
 *   stackPickerLabel: string;
 *   searchPlaceholder: string;
 *   searchNoResults: string;
 *   menuLabel: string;
 *   stacks: Record<IntegrationStack, { label: string }>;
 *   commonBefore: GuideSection[];
 *   commonAfter: GuideSection[];
 *   stackSections: Record<IntegrationStack, GuideSection[]>;
 * }>} */
export const integrationGuide = {
  en: {
    title: 'How to integrate',
    subtitle: 'Connect your backend to Slark so attacks show on your live map.',
    stackPickerLabel: 'Choose your backend',
    searchPlaceholder: 'Search documentation…',
    searchNoResults: 'No results found',
    menuLabel: 'Open menu',
    stacks: {
      python: { label: 'Python' },
      javascript: { label: 'JavaScript' },
    },
    commonBefore: [
      {
        id: 'step-api-key',
        h: 'Step 1 · Get your API key',
        p: [
          'Sign in to Slark → **Purchase** a plan → copy the **`pd_…` key** from **Account settings**.',
        ],
      },
    ],
    stackSections: {
      python: [
        {
          id: 'step-middleware',
          h: 'Step 2 · Connect middleware',
          p: [
            'Install **`primedefender-fastapi`**, set bridge URL + API key in **`.env`**, then add **`PrimeDefenderMiddleware`**. It scans requests and sends incidents to Slark automatically.',
          ],
          codeBlocks: [
            { title: 'Install', codeKey: 'pythonInstall' },
            { title: '.env', codeKey: 'pythonEnv' },
            { title: 'main.py', codeKey: 'pythonMain' },
          ],
        },
      ],
      javascript: [
        {
          id: 'step-js-package',
          h: 'Step 2 · Install primedefender-client',
          p: [
            '**`primedefender-client`** is the official npm package for JavaScript/TypeScript. It exposes **`postIncident`** and **`resolveIngestUrl`** to send incidents to your Slark bridge — the same payload contract as **`primedefender-fastapi`**. Requires **Node 18+** (built-in `fetch`).',
            'Unlike the Python package, this is **not** automatic WAF middleware — call **`postIncident`** from Express, a BFF, or your own security hook when you detect an attack.',
          ],
          codeBlocks: [{ title: 'Install', codeKey: 'javascriptInstall' }],
        },
        {
          id: 'step-middleware',
          h: 'Step 3 · Configure & connect Express',
          p: [
            'Set bridge URL + API key in **`.env`**, then wire **`postIncident`** in your Express app (example below detects a simple SQLi probe and reports it to Slark). Add the hook **before** your routes.',
          ],
          codeBlocks: [
            { title: '.env', codeKey: 'javascriptEnv' },
            { title: 'app.js', codeKey: 'javascriptApp' },
          ],
        },
        {
          id: 'step-js-api',
          h: 'Reference · postIncident',
          p: [
            'Exports: **`postIncident`**, **`resolveIngestUrl`**, and TypeScript types **`PrimeDefenderIncidentPayload`**, **`PostIncidentOptions`**, **`PostIncidentResult`**. **`resolveIngestUrl`** appends **`/ingest`** when the bridge URL is only an origin — same behavior as the Python reporter.',
          ],
          codeBlocks: [{ title: 'postIncident', codeKey: 'javascriptPostIncident' }],
        },
        {
          id: 'step-js-browser',
          h: 'Browser & API key safety',
          p: [
            'From a browser, the bridge must allow **CORS** for your web app origin. **Never** ship your **`pd_…` API key** in public front-end bundles — run **`postIncident`** from Node or a trusted backend-for-frontend.',
          ],
        },
      ],
    },
    commonAfter: [
      {
        id: 'step-test-curl',
        h: 'Test 1 — curl',
        p: [
          'Replace **`https://your-backend-host.com`** with your backend URL, then copy and run the command below in your terminal.',
          '**Connected** — a new incident appears on **Monitoring** within a few seconds.',
          '**Not connected** — no incident; check **`.env`**, restart your backend, and confirm **`PRIMEDEFENDER_BRIDGE_URL`** + **`PRIMEDEFENDER_API_KEY`**.',
        ],
        codeBlocks: [{ title: 'curl command', codeKey: 'testCurlCommandEn' }],
      },
      {
        id: 'step-test-form',
        h: 'Test 2 — login form',
        p: [
          'Open your site\'s **login page** in the browser.',
          'Paste the **SQLi payload** below into the **username or email** field, enter any password, and submit.',
          'Then open **Monitoring** — same **Connected** / **Not connected** check as Test 1.',
        ],
        codeBlocks: [{ title: 'SQLi payload', codeKey: 'testSqliPayloadEn' }],
      },
      {
        id: 'step-done',
        h: 'Done',
        p: [
          'Sign in to Slark → open **Monitoring**. Incidents from your API key appear on the map in real time.',
        ],
      },
    ],
  },
  id: {
    title: 'Cara integrasi',
    subtitle: 'Hubungkan backend Anda ke Slark agar serangan tampil di peta live.',
    stackPickerLabel: 'Pilih backend Anda',
    searchPlaceholder: 'Cari dokumentasi…',
    searchNoResults: 'Tidak ada hasil',
    menuLabel: 'Buka menu',
    stacks: {
      python: { label: 'Python' },
      javascript: { label: 'JavaScript' },
    },
    commonBefore: [
      {
        id: 'step-api-key',
        h: 'Langkah 1 · Dapatkan API key',
        p: [
          'Masuk ke Slark → **Purchase** paket → salin **key `pd_…`** di **Pengaturan akun**.',
        ],
      },
    ],
    stackSections: {
      python: [
        {
          id: 'step-middleware',
          h: 'Langkah 2 · Pasang middleware',
          p: [
            'Install **`primedefender-fastapi`**, isi URL bridge + API key di **`.env`**, lalu tambahkan **`PrimeDefenderMiddleware`**. Middleware memindai request dan mengirim insiden ke Slark otomatis.',
          ],
          codeBlocks: [
            { title: 'Install', codeKey: 'pythonInstall' },
            { title: '.env', codeKey: 'pythonEnv' },
            { title: 'main.py', codeKey: 'pythonMain' },
          ],
        },
      ],
      javascript: [
        {
          id: 'step-js-package',
          h: 'Langkah 2 · Install primedefender-client',
          p: [
            '**`primedefender-client`** adalah package npm resmi untuk JavaScript/TypeScript. Menyediakan **`postIncident`** dan **`resolveIngestUrl`** untuk mengirim insiden ke bridge Slark — kontrak payload sama dengan **`primedefender-fastapi`**. Butuh **Node 18+** (`fetch` bawaan).',
            'Berbeda dengan paket Python, ini **bukan** middleware WAF otomatis — panggil **`postIncident`** dari Express, BFF, atau hook keamanan Anda saat mendeteksi serangan.',
          ],
          codeBlocks: [{ title: 'Install', codeKey: 'javascriptInstall' }],
        },
        {
          id: 'step-middleware',
          h: 'Langkah 3 · Konfigurasi & hubungkan Express',
          p: [
            'Isi URL bridge + API key di **`.env`**, lalu sambungkan **`postIncident`** di app Express (contoh di bawah mendeteksi probe SQLi sederhana dan melaporkannya ke Slark). Pasang hook **sebelum** route Anda.',
          ],
          codeBlocks: [
            { title: '.env', codeKey: 'javascriptEnv' },
            { title: 'app.js', codeKey: 'javascriptApp' },
          ],
        },
        {
          id: 'step-js-api',
          h: 'Referensi · postIncident',
          p: [
            'Export: **`postIncident`**, **`resolveIngestUrl`**, dan tipe TypeScript **`PrimeDefenderIncidentPayload`**, **`PostIncidentOptions`**, **`PostIncidentResult`**. **`resolveIngestUrl`** menambahkan **`/ingest`** jika URL bridge hanya origin — perilaku sama dengan reporter Python.',
          ],
          codeBlocks: [{ title: 'postIncident', codeKey: 'javascriptPostIncident' }],
        },
        {
          id: 'step-js-browser',
          h: 'Browser & keamanan API key',
          p: [
            'Dari browser, bridge harus mengizinkan **CORS** untuk origin web app Anda. **Jangan** menaruh **API key `pd_…`** di bundle front-end publik — jalankan **`postIncident`** dari Node atau backend-for-frontend tepercaya.',
          ],
        },
      ],
    },
    commonAfter: [
      {
        id: 'step-test-curl',
        h: 'Tes 1 — curl',
        p: [
          'Ganti **`https://link-backend-anda.com`** dengan URL backend Anda, lalu salin dan jalankan perintah di bawah di terminal.',
          '**Terhubung** — insiden baru muncul di **Monitoring** dalam beberapa detik.',
          '**Belum terhubung** — tidak ada insiden; cek **`.env`**, restart backend, dan pastikan **`PRIMEDEFENDER_BRIDGE_URL`** + **`PRIMEDEFENDER_API_KEY`** benar.',
        ],
        codeBlocks: [{ title: 'Perintah curl', codeKey: 'testCurlCommandId' }],
      },
      {
        id: 'step-test-form',
        h: 'Tes 2 — form login',
        p: [
          'Buka **halaman login** situs Anda di browser.',
          'Tempel **payload SQLi** di bawah ke field **username atau email**, isi password apa saja, lalu kirim form.',
          'Lalu buka **Monitoring** — cek **Terhubung** / **Belum terhubung** sama seperti Tes 1.',
        ],
        codeBlocks: [{ title: 'Payload SQLi', codeKey: 'testSqliPayloadId' }],
      },
      {
        id: 'step-done',
        h: 'Selesai',
        p: [
          'Masuk ke Slark → buka **Monitoring**. Insiden dari API key Anda muncul di peta secara real time.',
        ],
      },
    ],
  },
};

/**
 * @param {string} line
 */
export function formatGuideLine(line) {
  const parts = line.split('`');
  return parts.map((part, j) =>
    j % 2 === 1 ? { type: 'code', value: part } : { type: 'text', value: part },
  );
}

/** @param {string} text */
export function splitBold(text) {
  const out = [];
  const re = /\*\*([^*]+)\*\*/g;
  let last = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ bold: false, text: text.slice(last, m.index) });
    out.push({ bold: true, text: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ bold: false, text: text.slice(last) });
  return out.length ? out : [{ bold: false, text }];
}

/** @param {string} para */
export function formatGuideParagraphHtml(para) {
  return para
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-slark-text dark:text-white/90">$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}
