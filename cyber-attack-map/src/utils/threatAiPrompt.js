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
    `pd-src0   Link encap:PrimeDefender  HWaddr ${hw}`,
    `          inet addr:${dash(attack.attackerIp)}  ${inetScope}`,
    `          geo: ${dash(attack.sourceLabel)}`,
    `          coords: ${fmtCoord(from?.lat, from?.lon)}  (WGS84)`,
    `pd-dst0   inet dst:${fmtCoord(to?.lat, to?.lon)}  (${protectedSite})`,
    `route:    ${dash(attack.targetLabel)}`,
    `request:  ${dash(attack.method)} ${dash(attack.path)}`,
    `ua:       ${dash(attack.userAgent)}`,
    attack.detection ? `detect:   ${attack.detection}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}

/**
 * Full prompt block for the model: readout + structured subset (no secrets beyond ingest).
 * @param {Record<string, unknown>} attack normalized attack
 */
export function buildThreatAiPrompt(attack) {
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

  return [
    'Explain this security incident for a SOC analyst.',
    'Infer likely tools/techniques only when supported by fields (e.g. sqli in detection → SQL injection tooling such as sqlmap is a plausible recon/exploit path; state uncertainty when data is missing).',
    '',
    '--- Network-style readout (iwconfig-like) ---',
    readout,
    '',
    '--- Structured ingest fields ---',
    JSON.stringify(structured, null, 2),
  ].join('\n');
}
