/** @typedef {'en' | 'id'} Locale */

export const LOCALES = [
  { id: 'en', label: 'English' },
  { id: 'id', label: 'Bahasa Indonesia' },
];

export const translations = {
  en: {
    brand: {
      name: 'PrimeDefender',
      tagline: 'Real-time threat visibility for websites you protect',
    },
    nav: {
      home: 'Home',
      monitoring: 'Monitoring',
      settings: 'Settings',
      docs: 'Integration',
    },
    home: {
      heroTitle: 'See attacks the moment they hit your customers’ sites',
      heroSubtitle:
        'Generate API keys in Settings, give each customer a key, and have their site POST incidents to your bridge with `X-Api-Key` — the map only shows what they send.',
      sectionFlow: 'How it works',
      flowStep1:
        'Your customer installs your middleware in front of their site (reverse proxy, worker, or app layer) — similar in spirit to Cloudflare sitting in front of origin.',
      flowStep2:
        'When traffic looks suspicious (e.g. DDoS or brute force on `/login`), your middleware blocks or challenges the request on their infrastructure — you own that logic.',
      flowStep3:
        'In the same request path, your code calls PrimeDefender `POST /ingest` with attack type, labels (e.g. login page), and approximate coordinates from IP geo — the monitoring map updates in real time.',
      flowStep4:
        'PrimeDefender does not proxy their traffic; it only visualizes incidents you report after your middleware decides to block or flag.',
      ctaMonitoring: 'Open monitoring',
      ctaSettings: 'Language & preferences',
      sectionFeatures: 'Why PrimeDefender',
      feature1Title: 'Live attack map',
      feature1Body: 'Google Maps + deck.gl arcs from source to target, tuned for SOC-style dashboards.',
      feature2Title: 'Middleware-driven',
      feature2Body: 'Your bridge ingests JSON via POST /ingest when ingest is enabled — you control what counts as an incident.',
      feature3Title: 'Browser notifications',
      feature3Body: 'Optional alerts when new incidents arrive, so you never miss a spike.',
      sectionPricing: 'Pricing',
      pricingFootnote: 'Prices in USD / month. Contact us for Fortress or annual billing.',
      tierObserver: 'Observer',
      tierObserverPrice: '$39',
      tierObserverDesc: 'Single property, live map & feed, standard email summaries.',
      tierSentinel: 'Sentinel',
      tierSentinelPrice: '$129',
      tierSentinelDesc: 'Up to 10 sites, full API ingest, priority queue, 99.5% SLA target.',
      tierFortress: 'Fortress',
      tierFortressPrice: 'Custom',
      tierFortressDesc: 'Unlimited scale, dedicated support, optional on-prem bridge.',
      perMonth: '/mo',
      popular: 'Popular',
    },
    settings: {
      title: 'Settings',
      languageTitle: 'Language',
      languageHint: 'Applies to this browser. Choice is saved locally.',
      bridgeTitle: 'Bridge (backend)',
      bridgeUrlLabel: 'Dashboard talks to this URL (VITE_SOCKET_URL)',
      apiKeysTitle: 'Customer API keys',
      apiKeysIntro:
        'Create keys on the bridge with your admin secret. Customers put the key in their server env and send `POST /ingest` with header `X-Api-Key`.',
      adminSecretLabel: 'Admin secret',
      adminSecretHint: 'Same as ADMIN_SECRET on the bridge. Not stored in this app.',
      createKey: 'Create key',
      listKeys: 'Refresh list',
      keyLabelOptional: 'Label (optional)',
      newKeyTitle: 'New key (copy now)',
      newKeyWarn: 'This value is not shown again.',
      copy: 'Copy',
      noKeys: 'No keys yet.',
      revoke: 'Revoke',
      clientSnippetTitle: 'On the customer website (example)',
      adminRequired:
        'Bridge must have ADMIN_SECRET set. Keys are stored in bridge data/api-keys.json.',
      errorGeneric: 'Request failed',
    },
    monitoring: {
      title: 'LIVE CYBER ATTACK MAP',
      subtitle:
        'Incidents appear only after your middleware sends them to the bridge (INGEST_ENABLED=true + POST /ingest). This UI only connects to bridge v{version}.',
      bridgeBadTitle: 'The process at {url} is not bridge v{version} (or unreachable).',
      bridgeBadBody:
        'Stop old Node processes on that port, then run server.mjs from cyber-attack-map-server. Labels like “APAC” / “N. America West” with huge Gbps usually come from an outdated demo server, not your app.',
      events: 'Events',
      ddos: 'DDoS',
      socketOff: 'Socket: disabled (env)',
      bridgeCheck: '○ Verifying bridge v{version}…',
      bridgeRejected: '✕ Bridge rejected',
      listening: '● Listening (v{version})',
      connecting: '○ Connecting…',
      notifyBlocked: 'Notifications blocked',
      notifyAllow: 'Allow incident notifications',
      notifyOn: 'Notifications: on',
    },
    detail: {
      title: 'Source readout',
      selectHint: 'Select an incident in the feed to see attacker IP, geo, and request details (iwconfig-style readout).',
      readoutCaption: 'Network-style snapshot (from ingest payload)',
      inetScope: 'Scope:Global',
      protectedSite: 'your asset',
      close: '×',
      noIpHint:
        'No attacker IP in payload — enable reporting from middleware (attackerIp / clientIp) with the real client address.',
    },
    feed: {
      title: 'Live attacks',
      subtitle: 'Stream · newest first',
      emptySocketOff: 'Socket disabled (VITE_SOCKET_DISABLED).',
      emptyChecking: 'Verifying bridge server (must be v2 on GET /health)…',
      emptyBad:
        'Bridge rejected: stop the old Node server on this port and run the latest server.mjs. “Continent + Gbps” patterns are usually from the old demo, not your system.',
      emptyConnecting: 'Connecting to bridge…',
      emptyIdle:
        'No incidents yet. Set INGEST_ENABLED=true on the bridge, then POST /ingest from your middleware when ready.',
      customerSite: 'Customer / site:',
      blocked: 'BLOCKED',
      chain: 'Chain',
      ddosNoMeta: 'DDoS (no extended metrics in payload)',
    },
    metrics: {
      title: 'Threat mix',
      session: 'Session (last {n} events)',
      liveRate: 'Live rate',
      evtMin: 'evt/min',
      unspecified: 'Unspecified',
    },
    protect: {
      title: 'Protections (session)',
      subtitle: 'Counts from detection rules / ingest labels. Red = at least one hit.',
      sqli: 'SQL injection',
      xss: 'Cross-site scripting',
      bruteForce: 'Brute force (login)',
      pathTraversal: 'Path traversal',
      cmdInjection: 'Command injection',
      suspiciousUa: 'Suspicious User-Agent',
      ddos: 'DDoS / flood',
    },
    map: {
      noToken:
        'Set environment variable VITE_GOOGLE_MAPS_API_KEY in .env with your Google Maps API key (Maps JavaScript API enabled), then restart Vite.',
    },
    notifications: {
      title: 'Security incident',
      bodyFallback: 'New incident on the map',
    },
  },
  id: {
    brand: {
      name: 'PrimeDefender',
      tagline: 'Visibilitas ancaman real-time untuk website yang Anda lindungi',
    },
    nav: {
      home: 'Beranda',
      monitoring: 'Monitoring',
      settings: 'Pengaturan',
      docs: 'Integrasi',
    },
    home: {
      heroTitle: 'Lihat serangan saat terjadi pada situs pelanggan Anda',
      heroSubtitle:
        'Buat API key di Pengaturan, berikan ke tiap pelanggan, lalu situs mereka mengirim insiden ke bridge Anda dengan header `X-Api-Key` — peta hanya menampilkan data yang mereka kirim.',
      sectionFlow: 'Alur kerja',
      flowStep1:
        'Pelanggan memasang middleware Anda di depan website mereka (reverse proxy, worker, atau lapisan aplikasi) — mirip konsep Cloudflare di depan origin.',
      flowStep2:
        'Saat traffic mencurigakan (mis. DDoS atau brute force di `/login`), middleware Anda memblokir atau challenge di infrastruktur mereka — logika itu milik Anda.',
      flowStep3:
        'Pada jalur yang sama, kode Anda memanggil PrimeDefender `POST /ingest` dengan jenis serangan, label (mis. halaman login), dan koordinat perkiraan dari geo IP — peta monitoring ter-update live.',
      flowStep4:
        'PrimeDefender tidak mem-proxy traffic mereka; hanya memvisualkan insiden yang Anda laporkan setelah middleware memutuskan blokir atau flag.',
      ctaMonitoring: 'Buka monitoring',
      ctaSettings: 'Bahasa & preferensi',
      sectionFeatures: 'Mengapa PrimeDefender',
      feature1Title: 'Peta serangan live',
      feature1Body: 'Google Maps + deck.gl dari sumber ke sasaran, cocok untuk gaya SOC.',
      feature2Title: 'Didorong middleware',
      feature2Body:
        'Bridge Anda mengunggah JSON lewat POST /ingest saat diizinkan — Anda yang menentukan insiden.',
      feature3Title: 'Notifikasi browser',
      feature3Body: 'Opsional saat insiden baru tiba agar tidak terlewat.',
      sectionPricing: 'Harga',
      pricingFootnote: 'Harga dalam USD / bulan. Hubungi kami untuk Fortress atau tahunan.',
      tierObserver: 'Observer',
      tierObserverPrice: '$39',
      tierObserverDesc: 'Satu properti, peta & feed, ringkasan email standar.',
      tierSentinel: 'Sentinel',
      tierSentinelPrice: '$129',
      tierSentinelDesc: 'Hingga 10 situs, API ingest penuh, antrean prioritas, SLA 99,5%.',
      tierFortress: 'Fortress',
      tierFortressPrice: 'Kustom',
      tierFortressDesc: 'Skala tak terbatas, dukungan khusus, opsi on-prem.',
      perMonth: '/bln',
      popular: 'Populer',
    },
    settings: {
      title: 'Pengaturan',
      languageTitle: 'Bahasa',
      languageHint: 'Berlaku di browser ini. Pilihan disimpan lokal.',
      bridgeTitle: 'Bridge (backend)',
      bridgeUrlLabel: 'Dashboard memakai URL ini (VITE_SOCKET_URL)',
      apiKeysTitle: 'API key pelanggan',
      apiKeysIntro:
        'Buat key di bridge dengan rahasia admin. Pelanggan menyimpan key di env server dan mengirim `POST /ingest` dengan header `X-Api-Key`.',
      adminSecretLabel: 'Rahasia admin',
      adminSecretHint: 'Sama dengan ADMIN_SECRET di bridge. Tidak disimpan di aplikasi ini.',
      createKey: 'Buat key',
      listKeys: 'Muat ulang daftar',
      keyLabelOptional: 'Label (opsional)',
      newKeyTitle: 'Key baru (salin sekarang)',
      newKeyWarn: 'Nilai ini tidak ditampilkan lagi.',
      copy: 'Salin',
      noKeys: 'Belum ada key.',
      revoke: 'Cabut',
      clientSnippetTitle: 'Di website pelanggan (contoh)',
      adminRequired: 'Bridge harus punya ADMIN_SECRET. Key disimpan di data/api-keys.json pada server bridge.',
      errorGeneric: 'Permintaan gagal',
    },
    monitoring: {
      title: 'PETA SERANGAN SIBER LIVE',
      subtitle:
        'Insiden hanya muncul setelah middleware mengirim ke bridge (INGEST_ENABLED=true + POST /ingest). UI hanya menyambung ke bridge v{version}.',
      bridgeBadTitle: 'Proses di {url} bukan bridge v{version} (atau tidak terjangkau).',
      bridgeBadBody:
        'Hentikan proses Node lama di port itu, lalu jalankan server.mjs dari cyber-attack-map-server. Label seperti “APAC” / Gbps besar biasanya dari demo lama.',
      events: 'Event',
      ddos: 'DDoS',
      socketOff: 'Socket: nonaktif (env)',
      bridgeCheck: '○ Memverifikasi bridge v{version}…',
      bridgeRejected: '✕ Bridge ditolak',
      listening: '● Mendengarkan (v{version})',
      connecting: '○ Menyambung…',
      notifyBlocked: 'Notifikasi diblokir',
      notifyAllow: 'Izinkan notifikasi insiden',
      notifyOn: 'Notifikasi: aktif',
    },
    detail: {
      title: 'Baca sumber',
      selectHint:
        'Pilih insiden di feed untuk IP penyerang, geo, dan detail (tampilan mirip readout iwconfig).',
      readoutCaption: 'Snapshot jaringan (dari payload ingest)',
      inetScope: 'Scope:Global',
      protectedSite: 'aset Anda',
      close: '×',
      noIpHint:
        'Belum ada IP penyerang di payload — aktifkan pelaporan di middleware (attackerIp / clientIp) dengan alamat klien asli.',
    },
    feed: {
      title: 'Serangan live',
      subtitle: 'Aliran · terbaru dulu',
      emptySocketOff: 'Socket dinonaktifkan (VITE_SOCKET_DISABLED).',
      emptyChecking: 'Memverifikasi bridge (harus v2 di GET /health)…',
      emptyBad:
        'Bridge ditolak: hentikan server Node lama di port ini dan jalankan server.mjs terbaru. Pola “benua + Gbps” biasanya dari demo lama.',
      emptyConnecting: 'Menyambung ke bridge…',
      emptyIdle:
        'Belum ada insiden. Set INGEST_ENABLED=true pada bridge lalu POST /ingest dari middleware saat siap.',
      customerSite: 'Pelanggan / situs:',
      blocked: 'DIBLOKIR',
      chain: 'Rantai',
      ddosNoMeta: 'DDoS (tanpa metrik tambahan di payload)',
    },
    metrics: {
      title: 'Campuran ancaman',
      session: 'Sesi ({n} event terakhir)',
      liveRate: 'Laju live',
      evtMin: 'evt/mnt',
      unspecified: 'Tak ditentukan',
    },
    protect: {
      title: 'Perlindungan (sesi)',
      subtitle: 'Jumlah dari aturan deteksi / label ingest. Merah = ada insiden.',
      sqli: 'SQL injection',
      xss: 'Cross-site scripting',
      bruteForce: 'Brute force (login)',
      pathTraversal: 'Path traversal',
      cmdInjection: 'Command injection',
      suspiciousUa: 'User-Agent mencurigakan',
      ddos: 'DDoS / flood',
    },
    map: {
      noToken:
        'Setel variabel lingkungan VITE_GOOGLE_MAPS_API_KEY di .env dengan kunci Google Maps (Maps JavaScript API diaktifkan), lalu restart Vite.',
    },
    notifications: {
      title: 'Insiden keamanan',
      bodyFallback: 'Insiden baru di peta',
    },
  },
};

/**
 * @param {Locale} locale
 * @param {string} key dot.path
 * @param {Record<string, string | number>} [vars]
 */
function lookup(dict, parts) {
  let v = dict;
  for (const p of parts) {
    v = v?.[p];
  }
  return v;
}

export function translate(locale, key, vars) {
  const parts = key.split('.');
  const dict = translations[locale] || translations.en;
  let v = lookup(dict, parts);
  if (typeof v !== 'string') {
    v = lookup(translations.en, parts);
  }
  let s = typeof v === 'string' ? v : key;
  if (vars) {
    for (const [k, val] of Object.entries(vars)) {
      s = s.replace(new RegExp(`\\{${k}\\}`, 'g'), String(val));
    }
  }
  return s;
}
