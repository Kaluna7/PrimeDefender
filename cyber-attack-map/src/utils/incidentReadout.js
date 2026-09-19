/** Build an iwconfig-style incident readout for the incident detail modal. */

function fmtCoord(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '-';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lon).toFixed(4)}°${ew}`;
}

function dash(value) {
  return value && String(value).trim() ? value : '-';
}

/**
 * @param {Record<string, unknown>} attack
 * @param {{ inetScope?: string; protectedSite?: string }} labels
 */
export function buildIncidentReadoutText(attack, labels = {}) {
  const inetScope = labels.inetScope ?? 'Scope:Global';
  const protectedSite = labels.protectedSite ?? 'your asset';
  const from = attack.from;
  const to = attack.to;
  const hw = attack.id ? String(attack.id).replace(/-/g, '').slice(0, 12) : '-';

  const lines = [
    `jbm-src0   Link encap:Ethernet  HWaddr ${hw}`,
    `          inet addr:${dash(attack.attackerIp)}  ${inetScope}`,
    `          geo: ${dash(attack.sourceLabel)}`,
    `          coords: ${fmtCoord(from?.lat, from?.lon)}  (WGS84)`,
    `jbm-dst0   inet dst:${fmtCoord(to?.lat, to?.lon)}  (${protectedSite})`,
    `route:    ${dash(attack.targetLabel)}`,
    `request:  ${dash(attack.method)} ${dash(attack.path)}`,
    `ua:       ${dash(attack.userAgent)}`,
    attack.detection ? `detect:   ${attack.detection}` : null,
  ].filter(Boolean);

  return lines.join('\n');
}
