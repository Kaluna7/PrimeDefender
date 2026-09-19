/**
 * Groups repeated ingest/socket reports into one monitor row + one map arc.
 * Group by site + attacker + path + category + detection (geo not used for dedupe).
 */

/**
 * @param {Record<string, unknown>} entry - normalized attack shape
 * @returns {string}
 */
export function fingerprintForEntry(entry) {
  if (typeof entry.id === 'string' && entry.id.startsWith('demo-')) {
    return `id:${entry.id}`;
  }
  const site = (entry.siteId || '').trim();
  const ip = (entry.attackerIp || '').trim().toLowerCase();
  const path = (entry.path || '').slice(0, 256);
  const method = (entry.method || '').toUpperCase();
  const cat = entry.category || 'unknown';
  // Keep different detection rules separate (e.g. bot_activity vs bad_ua).
  const det = String(entry.detection || entry.detectType || '')
    .toLowerCase()
    .trim()
    .slice(0, 96);
  if (site || ip) {
    return `v:${site}|${ip}|${method}|${path}|${cat}|${det}`;
  }
  const f = entry.from;
  const t = entry.to;
  if (!f || !t) {
    return `id:${entry.id}`;
  }
  const fl = Math.round(f.lat * 100);
  const flo = Math.round(f.lon * 100);
  const tl = Math.round(t.lat * 100);
  const tlo = Math.round(t.lon * 100);
  return `g:${fl},${flo}|${tl},${tlo}|${cat}`;
}
