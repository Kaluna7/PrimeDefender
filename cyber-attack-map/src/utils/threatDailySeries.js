const localeTag = (locale) => (locale === 'id' ? 'id-ID' : 'en-US');

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Week starts Monday. */
function startOfWeek(d) {
  const date = startOfDay(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date;
}

function startOfMonth(d) {
  const date = startOfDay(d);
  date.setDate(1);
  return date;
}

function startOfYear(d) {
  const date = startOfDay(d);
  date.setMonth(0, 1);
  return date;
}

function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function addMonths(d, n) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

function enumerateDays(from, to) {
  const days = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  while (cursor <= end) {
    days.push(new Date(cursor));
    cursor = addDays(cursor, 1);
  }
  return days;
}

function enumerateMonths(from, to) {
  const months = [];
  let cursor = startOfMonth(from);
  const end = startOfMonth(to);
  while (cursor <= end) {
    months.push(new Date(cursor));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

function countInWindow(attacks, t0, t1) {
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
  return { volume: total, close: total, categories, peakHour: Math.max(...hourly, 0) };
}

function formatDayLabel(day, locale) {
  return day.toLocaleDateString(localeTag(locale), {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatDayFull(day, locale) {
  return day.toLocaleDateString(localeTag(locale), {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatMonthLabel(day, locale) {
  return day.toLocaleDateString(localeTag(locale), { month: 'short', year: 'numeric' });
}

function formatMonthFull(day, locale) {
  return day.toLocaleDateString(localeTag(locale), { month: 'long', year: 'numeric' });
}

export const INTEL_CHART_RANGE = /** @type {const} */ ({
  WEEK: 'week',
  MONTH: 'month',
  YEAR: 'year',
  ALL: 'all',
});

/** @typedef {typeof INTEL_CHART_RANGE[keyof typeof INTEL_CHART_RANGE]} IntelChartRange */

/**
 * @param {{ createdAt: number, category?: string }[]} attacks
 * @param {IntelChartRange} range
 * @param {string} [locale]
 */
export function buildThreatChartSeries(attacks, range, locale = 'en') {
  const now = new Date();
  const today = startOfDay(now);
  let buckets = [];

  if (range === INTEL_CHART_RANGE.WEEK) {
    const from = startOfWeek(today);
    const weekEnd = addDays(from, 6);
    buckets = enumerateDays(from, weekEnd).map((dayStart) => ({
      dayStart,
      t1: addDays(dayStart, 1).getTime(),
      label: formatDayLabel(dayStart, locale),
      fullLabel: formatDayFull(dayStart, locale),
      dateKey: dayStart.toISOString().slice(0, 10),
    }));
  } else if (range === INTEL_CHART_RANGE.MONTH) {
    const from = startOfMonth(today);
    buckets = enumerateDays(from, today).map((dayStart) => ({
      dayStart,
      t1: addDays(dayStart, 1).getTime(),
      label: dayStart.toLocaleDateString(localeTag(locale), { day: 'numeric', month: 'short' }),
      fullLabel: formatDayFull(dayStart, locale),
      dateKey: dayStart.toISOString().slice(0, 10),
    }));
  } else if (range === INTEL_CHART_RANGE.YEAR) {
    const from = startOfYear(today);
    buckets = enumerateMonths(from, today).map((monthStart) => {
      const next = addMonths(monthStart, 1);
      return {
        dayStart: monthStart,
        t1: next.getTime(),
        label: formatMonthLabel(monthStart, locale),
        fullLabel: formatMonthFull(monthStart, locale),
        dateKey: monthStart.toISOString().slice(0, 7),
      };
    });
  } else {
    const timestamps = attacks.map((a) => a.createdAt).filter((ts) => Number.isFinite(ts));
    const from = timestamps.length ? startOfMonth(new Date(Math.min(...timestamps))) : startOfMonth(today);
    buckets = enumerateMonths(from, today).map((monthStart) => {
      const next = addMonths(monthStart, 1);
      return {
        dayStart: monthStart,
        t1: next.getTime(),
        label: formatMonthLabel(monthStart, locale),
        fullLabel: formatMonthFull(monthStart, locale),
        dateKey: monthStart.toISOString().slice(0, 7),
      };
    });
  }

  let prevClose = 0;
  return buckets.map((b) => {
    const t0 = b.dayStart.getTime();
    const stats = countInWindow(attacks, t0, b.t1);
    const open = prevClose;
    const close = stats.close;
    prevClose = close;
    return {
      label: b.label,
      fullLabel: b.fullLabel,
      dateKey: b.dateKey,
      candle: [open, close, Math.min(open, close), Math.max(open, close, stats.peakHour)],
      volume: stats.volume,
      close: stats.close,
      categories: stats.categories,
      peakHour: stats.peakHour,
    };
  });
}

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

  const tag = localeTag(locale);
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
      label: dayStart.toLocaleDateString(tag, { month: 'short', day: 'numeric' }),
      fullLabel: formatDayFull(dayStart, locale),
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
