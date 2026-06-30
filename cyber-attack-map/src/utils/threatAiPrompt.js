/** Build iwconfig-style lines + JSON for Gemini (same semantics as IncidentDetailPanel). */

function fmtCoord(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '—';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lon).toFixed(4)}°${ew}`;
}

function dash(s) {
  return s && String(s).trim() ? s : '—';
}

/**
 * @param {Record<string, unknown>} attack
 * @param {{ inetScope?: string; protectedSite?: string }} labels
 */
export function buildThreatReadoutText(attack, labels = {}) {
  const inetScope = labels.inetScope ?? 'Scope:Global';
  const protectedSite = labels.protectedSite ?? 'your asset';
  const from = attack.from;
  const to = attack.to;
  const hw = attack.id ? String(attack.id).replace(/-/g, '').slice(0, 12) : '—';

  const lines = [
    `slark-src0   Link encap:Slark  HWaddr ${hw}`,
    `          inet addr:${dash(attack.attackerIp)}  ${inetScope}`,
    `          geo: ${dash(attack.sourceLabel)}`,
    `          coords: ${fmtCoord(from?.lat, from?.lon)}  (WGS84)`,
    `slark-dst0   inet dst:${fmtCoord(to?.lat, to?.lon)}  (${protectedSite})`,
    `route:    ${dash(attack.targetLabel)}`,
    `request:  ${dash(attack.method)} ${dash(attack.path)}`,
    `ua:       ${dash(attack.userAgent)}`,
    attack.detection ? `detect:   ${attack.detection}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Friendly one-line message shown in the chat bubble when sending from History/Attacker.
 * @param {Record<string, unknown>} attack
 * @param {(key: string, vars?: Record<string, string>) => string} t
 */
export function buildThreatAiUserMessage(attack, t) {
  const category = String(attack.category || attack.detection || 'security incident').trim();
  const source = String(attack.sourceLabel || attack.attackerIp || 'unknown source').trim();
  const target = String(attack.targetLabel || 'protected asset').trim();
  return t('aiChat.incidentExplainRequest', { category, source, target });
}

/**
 * Full prompt block for the model: readout + structured subset (no secrets beyond ingest).
 * @param {Record<string, unknown>} attack normalized attack
 * @param {string} [locale]
 */
export function buildThreatAiPrompt(attack, locale = 'en') {
  const readout = buildThreatReadoutText(attack, {
    inetScope: 'Scope:Global',
    protectedSite: 'protected asset',
  });

  const structured = {
    id: attack.id,
    category: attack.category,
    severity: attack.severity,
    blocked: attack.blocked,
    action: attack.action,
    detection: attack.detection,
    path: attack.path,
    method: attack.method,
    sourceLabel: attack.sourceLabel,
    targetLabel: attack.targetLabel,
    attackerIp: attack.attackerIp,
    from: attack.from,
    to: attack.to,
    ddos: attack.ddos,
    createdAt: attack.createdAt,
  };

  const intro =
    locale === 'id'
      ? [
          'Operator mengirim insiden ini dari dashboard Slark (History atau Attacker).',
          'Jelaskan dengan nada ramah dan menenangkan untuk anggota tim SOC.',
          'Bahasa balasan: Bahasa Indonesia.',
          'Cakupan: apa yang terjadi; implikasi posture keamanan/sistem; intent atau teknik (cantumkan ketidakpastian); langkah pemeriksaan dan mitigasi.',
          'Pakai paragraf pendek atau bullet. Jangan mengarang IP, payload, atau nama tool.',
        ]
      : [
          'An operator sent this incident from the Slark monitoring dashboard (History or Attacker view).',
          'Explain in a friendly, reassuring tone suitable for a SOC team member.',
          'Reply language: English.',
          'Cover: what happened; system/security posture; likely intent or technique (note uncertainty); concrete next checks and mitigations.',
          'Use short paragraphs or bullet points. Do not invent IPs, payloads, or tool names.',
        ];

  return [
    ...intro,
    '',
    '--- Network-style readout (iwconfig-like) ---',
    readout,
    '',
    '--- Structured ingest fields ---',
    JSON.stringify(structured, null, 2),
  ].join('\n');
}
