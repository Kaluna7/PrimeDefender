/** Locale-aware incident timestamps for feed cards and attacker panel. */
export function formatIncidentWhen(ts, locale, style = 'full') {
  const loc = locale === 'id' ? 'id-ID' : 'en-GB';
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return '—';

  if (style === 'time') {
    return d.toLocaleTimeString(loc, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  if (style === 'short') {
    return d.toLocaleString(loc, {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  return d.toLocaleString(loc, { hour12: false });
}
