import { deriveProtectionBucket } from '../../../utils/deriveProtectionBucket.js';
import { isIncidentBlocked } from '../history/historyFeedUtils.js';

/** Local midnight for the current calendar day. */
export function startOfTodayMs(now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function filterAttacksToday(attacks, now = Date.now()) {
  const start = startOfTodayMs(now);
  return attacks.filter((a) => a.createdAt >= start);
}

/**
 * One row per unique attacker IP (today only), newest activity first.
 * @param {object[]} attacks
 */
export function groupAttackerIpsToday(attacks, now = Date.now()) {
  const today = filterAttacksToday(attacks, now);
  const map = new Map();

  for (const attack of today) {
    const ip = attack.attackerIp?.trim();
    if (!ip) continue;

    const existing = map.get(ip);
    if (!existing) {
      map.set(ip, {
        ip,
        count: 1,
        blockedCount: isIncidentBlocked(attack) ? 1 : 0,
        latestAt: attack.createdAt,
        firstAt: attack.createdAt,
        attack,
        incidents: [attack],
      });
      continue;
    }

    existing.count += 1;
    existing.incidents.push(attack);
    if (isIncidentBlocked(attack)) existing.blockedCount += 1;
    if (attack.createdAt > existing.latestAt) {
      existing.latestAt = attack.createdAt;
      existing.attack = attack;
    }
    if (attack.createdAt < existing.firstAt) existing.firstAt = attack.createdAt;
  }

  return [...map.values()].sort((a, b) => b.latestAt - a.latestAt);
}

export function computeAttackerTodayStats(attacks, now = Date.now()) {
  const today = filterAttacksToday(attacks, now);
  const groups = groupAttackerIpsToday(today, now);
  const blocked = today.filter(isIncidentBlocked).length;
  return {
    total: today.length,
    uniqueIps: groups.length,
    blocked,
    nonBlocked: today.length - blocked,
  };
}

export function topAttackTypesForIpToday(attacks, ip, now = Date.now()) {
  if (!ip) return [];
  const today = filterAttacksToday(attacks, now);
  const counts = new Map();
  for (const a of today) {
    if (a.attackerIp?.trim() !== ip) continue;
    const bucket = deriveProtectionBucket(a) || a.detection || 'unknown';
    counts.set(bucket, (counts.get(bucket) || 0) + 1);
  }
  const total = [...counts.values()].reduce((s, n) => s + n, 0) || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([key, count]) => ({ key, count, pct: Math.round((count / total) * 100) }));
}

export function incidentsForIpToday(attacks, ip, now = Date.now()) {
  if (!ip) return [];
  const start = startOfTodayMs(now);
  return attacks
    .filter((a) => a.attackerIp?.trim() === ip && a.createdAt >= start)
    .sort((a, b) => b.createdAt - a.createdAt);
}
