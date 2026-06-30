/**
 * @param {{ dateKey: string; date: string; comment: string; volume?: number }[]} entries
 * @param {{ from?: string; to?: string; query?: string }} filters
 */
export function filterCommentEntries(entries, { from, to, query }) {
  const q = query?.trim().toLowerCase() ?? '';
  return entries.filter((row) => {
    if (from && row.dateKey < from) return false;
    if (to && row.dateKey > to) return false;
    if (!q) return true;
    return row.date.toLowerCase().includes(q) || row.comment.toLowerCase().includes(q) || row.dateKey.includes(q);
  });
}

/** @param {{ createdAt: number }[]} attacks */
export function resolveCommentHistoryDays(attacks, maxDays = 90) {
  const timestamps = attacks.map((a) => a.createdAt).filter((ts) => Number.isFinite(ts));
  if (!timestamps.length) return Math.min(30, maxDays);
  const min = Math.min(...timestamps);
  const span = Math.ceil((Date.now() - min) / 86400000) + 1;
  return Math.min(Math.max(span, 14), maxDays);
}

/**
 * @param {{ label: string; dateKey: string; volume: number }[]} series
 * @param {{ date: string; comment: string }[]} comments
 */
export function mergeCommentEntries(series, comments) {
  return series.map((point, i) => ({
    dateKey: point.dateKey,
    date: comments[i]?.date || point.label,
    comment: comments[i]?.comment || '',
    volume: point.volume,
  }));
}
