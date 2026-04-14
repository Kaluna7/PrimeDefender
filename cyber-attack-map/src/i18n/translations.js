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
      purchase: 'API purchase',
    },
    purchase: {
      title: 'Buy API access',
      subtitle: 'Choose Observer, Sentinel, or Fortress — then issue keys in Settings.',
      body:
        'After your plan is active, use Settings to create customer API keys. Keys authenticate POST /ingest on your bridge.',
      ctaSettings: 'Open Settings (API keys)',
      ctaMonitoring: 'Open monitoring',
      backHome: 'Back to home',
    },
    theme: {
      light: 'Light',
      dark: 'Dark',
      useLight: 'Switch to light theme',
      useDark: 'Switch to dark theme',
    },
    home: {
      heroTitle: 'See attacks the moment they hit your customers’ sites',
      heroSubtitle:
        'Generate API keys in Settings, give each customer a key, and have their site POST incidents to your bridge with `X-Api-Key` — the map only shows what they send.',
      hero3dLine1: 'Real-Time Cyber Defense',
      hero3dLine2: 'AI-Powered Threat Detection',
      hero3dLine3: 'Autonomous Protection System',
      hero3dLine4: 'System Fully Secured',
      hero3dScrollHint: 'Scroll to explore',
      interactiveTagline: 'Initialize the secure elevator. Power up to enter the hub.',
      turnOn: 'Turn on',
      tapMonitorHint: 'Click the console to inspect',
      carouselPrev: 'Previous item',
      carouselNext: 'Next item',
      monitorDetailTitle: 'Operations console',
      monitorDetailBody:
        'Your live link to incident visualization: middleware sends attacks to the bridge, and this dashboard renders the stream on the map.',
      goToMonitoringPage: 'Go to monitoring page',
      bookDetailTitle: 'API & system guide',
      bookDetailBody:
        'Open the full integration guide for keys, ingest, and middleware — same flow whether you start from the console or the book.',
      bookDetailOpenGuide: 'Open guide',
      exitView: 'Exit',
      chooseAction: 'Choose next step',
      introLine1: 'Initialize the secure elevator.',
      introLine2: 'Power up to reach the operations hub.',
      elevatorReady: 'READY',
      elevatorActivating: 'Activating…',
      turnOnLoading: 'Starting…',
      guidebookCta: 'API & system guide',
      guideModalClose: 'Close',
      guideModalFullDocs: 'Open full integration page',
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
      ctaApiPurchase: 'Buy API access',
      cashHoverCta: 'API billing & keys',
      ctaSettings: 'Language & preferences',
      sectionFeatures: 'Why PrimeDefender',
      feature1Title: 'Live attack map',
      feature1Body:
        'Apache ECharts 2D cyber map: dotted continents, glowing arcs, and pulse markers from source to target.',
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
      cashRegisterTypingLine: '>> API_PURCHASE .............. OK  ROUTING TO CHECKOUT',
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
      detailsRegion: 'Threat details and live feed',
      sidebarNav: 'Monitoring sections',
      navStatus: 'Status',
      navMonitoring: 'Monitoring',
      navAttacker: 'Attacker',
      navIntel: 'Intelligence',
      navReadout: 'Readout',
      navAssistant: 'Assistant',
      mapHintSelected: 'Map: route for the selected incident only.',
      mapHintAll: 'Map: up to {n} recent routes in this session — older tests (e.g. via ngrok) may still appear until you select one row.',
    },
    detail: {
      title: 'Source readout',
      selectHint:
        'Click an incident in the feed or on the map to open details. Attacker IP and region appear in each row; use Send to AI for Gemini analysis.',
      readoutCaption: 'Network-style snapshot (from ingest payload)',
      inetScope: 'Scope:Global',
      protectedSite: 'your asset',
      close: '×',
      sendToAI: 'Send to AI',
      sendToAiHint: 'Send iwconfig readout and ingest fields to the Gemini assistant below',
      noIpHint:
        'No attacker IP in payload — enable reporting from middleware (attackerIp / clientIp) with the real client address.',
    },
    incidentModal: {
      title: 'Incident detail',
      subtitle: 'Attacker context and detected activity',
      attacker: 'Attacker',
      unknownIp: 'IP not reported',
      region: 'Region / source',
      activity: 'Detected activity',
      target: 'Target / destination',
      technical: 'Technical readout',
      close: 'Close',
    },
    aiChat: {
      title: 'Threat assistant (Gemini)',
      subtitle: 'Explains selected incidents · set VITE_GEMINI_API_KEY in .env',
      clear: 'Clear chat',
      empty: 'Ask about a threat or use “Send to AI” on an incident readout.',
      placeholder: 'Type your question here… e.g. “How should we mitigate this?”',
      questionTitle: 'Your question',
      questionHint: 'Follow-ups about this session, mitigations, or the selected incident.',
      send: 'Send',
      inputLabel: 'Message',
      roleUser: 'You',
      roleAssistant: 'Assistant',
      thinking: '…Generating',
      missingKey: 'Gemini API key not configured.',
      missingKeyHint:
        'Add VITE_GEMINI_API_KEY to cyber-attack-map/.env (get a key from Google AI Studio), restart Vite. Optional: VITE_GEMINI_MODEL (default gemini-2.0-flash).',
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
      attackerLabel: 'Attacker',
      unknownIp: 'Unknown IP',
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
      fileInclusion: 'File inclusion',
      cmdInjection: 'Command injection',
      authBypass: 'Auth bypass probe',
      scanner: 'Scanner activity',
      botActivity: 'Bot activity',
      suspiciousRequest: 'Suspicious request',
      suspiciousUa: 'Suspicious User-Agent',
      ddos: 'DDoS / flood',
    },
    map: {
      loadError:
        'Could not load the world map data (network or CDN blocked). Check your connection or try again later.',
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
      purchase: 'Pembelian API',
    },
    purchase: {
      title: 'Beli akses API',
      subtitle: 'Pilih Observer, Sentinel, atau Fortress — lalu terbitkan kunci di Pengaturan.',
      body:
        'Setelah paket aktif, gunakan Pengaturan untuk membuat API key pelanggan. Key mengautentikasi POST /ingest di bridge Anda.',
      ctaSettings: 'Buka Pengaturan (API key)',
      ctaMonitoring: 'Buka monitoring',
      backHome: 'Kembali ke beranda',
    },
    theme: {
      light: 'Terang',
      dark: 'Gelap',
      useLight: 'Beralih ke tema terang',
      useDark: 'Beralih ke tema gelap',
    },
    home: {
      heroTitle: 'Lihat serangan saat terjadi pada situs pelanggan Anda',
      heroSubtitle:
        'Buat API key di Pengaturan, berikan ke tiap pelanggan, lalu situs mereka mengirim insiden ke bridge Anda dengan header `X-Api-Key` — peta hanya menampilkan data yang mereka kirim.',
      hero3dLine1: 'Pertahanan Siber Real-Time',
      hero3dLine2: 'Deteksi Ancaman Berbasis AI',
      hero3dLine3: 'Sistem Perlindungan Otonom',
      hero3dLine4: 'Sistem Sepenuhnya Aman',
      hero3dScrollHint: 'Gulir untuk menjelajah',
      interactiveTagline: 'Aktifkan elevator aman. Nyalakan untuk masuk ke hub.',
      turnOn: 'Nyalakan',
      tapMonitorHint: 'Klik konsol untuk detail',
      carouselPrev: 'Item sebelumnya',
      carouselNext: 'Item berikutnya',
      monitorDetailTitle: 'Konsol operasi',
      monitorDetailBody:
        'Tautan langsung ke visualisasi insiden: middleware mengirim serangan ke bridge, dashboard ini menampilkan aliran di peta.',
      goToMonitoringPage: 'Ke halaman monitoring',
      bookDetailTitle: 'Panduan API & sistem',
      bookDetailBody:
        'Buka panduan integrasi lengkap untuk kunci, ingest, dan middleware — alur sama baik dari konsol maupun dari buku.',
      bookDetailOpenGuide: 'Buka panduan',
      exitView: 'Keluar',
      chooseAction: 'Pilih langkah berikutnya',
      introLine1: 'Aktifkan elevator aman.',
      introLine2: 'Nyalakan untuk mencapai hub operasi.',
      elevatorReady: 'SIAP',
      elevatorActivating: 'Mengaktifkan…',
      turnOnLoading: 'Menyalakan…',
      guidebookCta: 'Panduan API & sistem',
      guideModalClose: 'Tutup',
      guideModalFullDocs: 'Buka halaman integrasi lengkap',
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
      ctaApiPurchase: 'Beli akses API',
      cashHoverCta: 'Tagihan & kunci API',
      ctaSettings: 'Bahasa & preferensi',
      sectionFeatures: 'Mengapa PrimeDefender',
      feature1Title: 'Peta serangan live',
      feature1Body:
        'Peta cyber 2D Apache ECharts: benua titik, arc bercahaya, dan marker pulse dari sumber ke sasaran.',
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
      cashRegisterTypingLine: '>> PEMBELIAN_API .............. OK  ALIHKAN KE PEMBAYARAN',
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
      detailsRegion: 'Rincian ancaman dan feed live',
      sidebarNav: 'Bagian monitoring',
      navStatus: 'Status',
      navMonitoring: 'Monitoring',
      navAttacker: 'Penyerang',
      navIntel: 'Intelijen',
      navReadout: 'Bacaan',
      navAssistant: 'Asisten',
      mapHintSelected: 'Peta: hanya rute untuk insiden yang dipilih.',
      mapHintAll:
        'Peta: sampai {n} rute terakhir di sesi ini — tes lama (mis. lewat ngrok) bisa masih tampil sampai Anda memilih satu baris.',
    },
    detail: {
      title: 'Baca sumber',
      selectHint:
        'Klik insiden di feed atau di peta untuk membuka detail. IP dan wilayah penyerang tampil di tiap baris; gunakan Kirim ke AI untuk analisis Gemini.',
      readoutCaption: 'Snapshot jaringan (dari payload ingest)',
      inetScope: 'Scope:Global',
      protectedSite: 'aset Anda',
      close: '×',
      sendToAI: 'Kirim ke AI',
      sendToAiHint: 'Kirim readout iwconfig + field ingest ke asisten Gemini di bawah',
      noIpHint:
        'Belum ada IP penyerang di payload — aktifkan pelaporan di middleware (attackerIp / clientIp) dengan alamat klien asli.',
    },
    incidentModal: {
      title: 'Detail insiden',
      subtitle: 'Konteks penyerang dan aktivitas terdeteksi',
      attacker: 'Penyerang',
      unknownIp: 'IP tidak dilaporkan',
      region: 'Wilayah / sumber',
      activity: 'Aktivitas terdeteksi',
      target: 'Target / tujuan',
      technical: 'Readout teknis',
      close: 'Tutup',
    },
    aiChat: {
      title: 'Asisten ancaman (Gemini)',
      subtitle: 'Menjelaskan insiden terpilih · set VITE_GEMINI_API_KEY di .env',
      clear: 'Hapus obrolan',
      empty: 'Tanya tentang ancaman atau pakai “Kirim ke AI” pada readout insiden.',
      placeholder: 'Tulis pertanyaan di sini… mis. “Bagaimana mitigasinya?”',
      questionTitle: 'Pertanyaan Anda',
      questionHint: 'Lanjutan tentang sesi ini, mitigasi, atau insiden yang dipilih.',
      send: 'Kirim',
      inputLabel: 'Pesan',
      roleUser: 'Anda',
      roleAssistant: 'Asisten',
      thinking: '…Menghasilkan',
      missingKey: 'API key Gemini belum diatur.',
      missingKeyHint:
        'Tambahkan VITE_GEMINI_API_KEY ke cyber-attack-map/.env (kunci dari Google AI Studio), restart Vite. Opsional: VITE_GEMINI_MODEL (default gemini-2.0-flash).',
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
      attackerLabel: 'Penyerang',
      unknownIp: 'IP tidak diketahui',
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
      fileInclusion: 'File inclusion',
      cmdInjection: 'Command injection',
      authBypass: 'Percobaan bypass auth',
      scanner: 'Aktivitas scanner',
      botActivity: 'Aktivitas bot',
      suspiciousRequest: 'Request mencurigakan',
      suspiciousUa: 'User-Agent mencurigakan',
      ddos: 'DDoS / flood',
    },
    map: {
      loadError:
        'Data peta dunia tidak bisa dimuat (jaringan atau CDN terblokir). Periksa koneksi atau coba lagi nanti.',
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
