import { THREAT_CATEGORY } from '../../../constants/threatCategories.js';
import { deriveProtectionBucket } from '../../../utils/deriveProtectionBucket.js';
import { dedupeAttackerIncidents } from '../../../utils/dedupeAttackerIncidents.js';

export const HISTORY_FILTER_IDS = ['all', 'intrusion', 'malicious', 'suspicious', 'bot', 'info'];

const INTRUSION_BUCKETS = new Set([
  'sqli',
  'xss',
  'bruteForce',
  'pathTraversal',
  'fileInclusion',
  'cmdInjection',
  'authBypass',
]);

const MALICIOUS_BUCKETS = new Set(['scanner', 'ddos', 'cmdInjection']);

export function historyFilterMatch(attack, filterId) {
  if (filterId === 'all') return true;
  const bucket = deriveProtectionBucket(attack);
  const cat = attack.category;
  const sev = attack.severity || 'medium';

  if (filterId === 'intrusion') {
    return cat === THREAT_CATEGORY.INTRUSION || (bucket && INTRUSION_BUCKETS.has(bucket));
  }
  if (filterId === 'malicious') {
    return cat === THREAT_CATEGORY.DDOS || (bucket && MALICIOUS_BUCKETS.has(bucket));
  }
  if (filterId === 'suspicious') {
    return bucket === 'suspiciousRequest' || bucket === 'suspiciousUa';
  }
  if (filterId === 'bot') {
    return cat === THREAT_CATEGORY.BOTNET || bucket === 'botActivity';
  }
  if (filterId === 'info') {
    return sev === 'low' || cat === THREAT_CATEGORY.UNKNOWN;
  }
  return true;
}

export function severityFilterMatch(attack, severityFilter) {
  if (!severityFilter || severityFilter === 'all') return true;
  return (attack.severity || 'medium') === severityFilter;
}

export function countByHistoryFilter(attacks) {
  return Object.fromEntries(
    HISTORY_FILTER_IDS.map((id) => [id, attacks.filter((a) => historyFilterMatch(a, id)).length]),
  );
}

export function isIncidentBlocked(attack) {
  if (attack.blocked === true) return true;
  if (attack.blocked === false) return false;
  if (attack.action === 'blocked') return true;
  if (attack.action === 'observed') return false;
  return Boolean(attack.blocked);
}

export function computeHistoryStats(attacks) {
  const total = attacks.length;
  const blocked = attacks.filter(isIncidentBlocked).length;
  const nonBlocked = attacks.filter((a) => !isIncidentBlocked(a)).length;
  const uniqueIps = new Set(attacks.map((a) => a.attackerIp?.trim()).filter(Boolean)).size;
  return {
    total,
    blocked,
    nonBlocked,
    uniqueIps,
    blockedPct: total ? Math.round((blocked / total) * 1000) / 10 : 0,
    nonBlockedPct: total ? Math.round((nonBlocked / total) * 1000) / 10 : 0,
  };
}

export function topAttackTypesForIp(attacks, ip) {
  if (!ip) return [];
  const counts = new Map();
  for (const a of attacks) {
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

export function attackerWindow(attacks, ip) {
  if (!ip) return { count: 0, firstAt: null, lastAt: null };
  const list = attacks.filter((a) => a.attackerIp?.trim() === ip);
  if (!list.length) return { count: 0, firstAt: null, lastAt: null };
  const times = list.map((a) => a.createdAt);
  return {
    count: list.length,
    firstAt: Math.min(...times),
    lastAt: Math.max(...times),
  };
}

export function recentAttackRows(attacks, limit) {
  const rows = dedupeAttackerIncidents(attacks);
  if (typeof limit === 'number' && limit > 0) return rows.slice(0, limit);
  return rows;
}

export const SEVERITY_ACCENT = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#64748b',
};

export const SEVERITY_BORDER = {
  critical: 'border-rose-500/55',
  high: 'border-orange-500/55',
  medium: 'border-amber-500/50',
  low: 'border-slate-500/45',
};

export const SEVERITY_BADGE = {
  critical: 'border-rose-500/50 bg-rose-600/20 text-rose-200',
  high: 'border-orange-500/50 bg-orange-600/20 text-orange-200',
  medium: 'border-amber-500/50 bg-amber-600/20 text-amber-200',
  low: 'border-slate-500/50 bg-slate-600/20 text-slate-300',
};
