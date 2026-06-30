/**
 * @param {{ createdAt: number; severity?: string }[]} attacks
 * @param {string} [locale]
 */
export function computeIntelMonthStats(attacks, locale = 'en') {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const t0 = monthStart.getTime();
  const t1 = monthEnd.getTime();

  const monthAttacks = attacks.filter((a) => a.createdAt >= t0 && a.createdAt < t1);
  const dailyMap = new Map();

  for (const a of monthAttacks) {
    const key = new Date(a.createdAt).toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
  }

  let peakCount = 0;
  let peakDateKey = null;
  for (const [dateKey, count] of dailyMap) {
    if (count > peakCount) {
      peakCount = count;
      peakDateKey = dateKey;
    }
  }

  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  const peakLabel = peakDateKey
    ? new Date(`${peakDateKey}T12:00:00`).toLocaleDateString(localeTag, {
        day: 'numeric',
        month: 'long',
      })
    : null;

  const severity = { high: 0, medium: 0, low: 0 };
  for (const a of monthAttacks) {
    const s = a.severity || 'medium';
    if (s === 'critical' || s === 'high') severity.high += 1;
    else if (s === 'low') severity.low += 1;
    else severity.medium += 1;
  }

  const severityTotal = severity.high + severity.medium + severity.low || 1;

  return {
    monthTotal: monthAttacks.length,
    peakCount,
    peakLabel,
    peakDateKey,
    severity,
    severityTotal,
  };
}
