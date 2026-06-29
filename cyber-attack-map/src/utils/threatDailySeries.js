/**
 * Build daily OHLC + volume series from incident timestamps (trading-style chart).
 * @param {{ createdAt: number, category?: string }[]} attacks
 * @param {number} [dayCount]
 * @param {string} [locale]
 */
export function buildDailyThreatSeries(attacks, dayCount = 14, locale = 'en') {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const days = [];
  for (let i = dayCount - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  const localeTag = locale === 'id' ? 'id-ID' : 'en-US';
  let prevClose = 0;
  const points = [];

  for (const dayStart of days) {
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const t0 = dayStart.getTime();
    const t1 = dayEnd.getTime();

    const hourly = new Array(24).fill(0);
    const categories = {};
    let total = 0;
    for (const a of attacks) {
      const ts = a.createdAt;
      if (ts >= t0 && ts < t1) {
        total += 1;
        hourly[new Date(ts).getHours()] += 1;
        const cat = a.category || 'unknown';
        categories[cat] = (categories[cat] || 0) + 1;
      }
    }

    const peakHour = Math.max(...hourly, 0);
    const open = prevClose;
    const close = total;
    const high = Math.max(open, close, peakHour);
    const low = Math.min(open, close, ...hourly);

    prevClose = close;

    points.push({
      label: dayStart.toLocaleDateString(localeTag, { month: 'short', day: 'numeric' }),
      dateKey: dayStart.toISOString().slice(0, 10),
      candle: [open, close, low, high],
      volume: total,
      close,
      categories,
      peakHour,
    });
  }

  const closes = points.map((p) => p.close);
  const ma3 = closes.map((_, i) => {
    const start = Math.max(0, i - 2);
    const slice = closes.slice(start, i + 1);
    return Math.round((slice.reduce((s, n) => s + n, 0) / slice.length) * 10) / 10;
  });

  return points.map((p, i) => ({ ...p, ma3: ma3[i] }));
}
