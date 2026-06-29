/**
 * @param {{ lat?: number; lon?: number } | null | undefined} point
 * @returns {string | null}
 */
export function googleMapsSearchUrl(point) {
  const lat = point?.lat;
  const lon = point?.lon;
  if (typeof lat !== 'number' || typeof lon !== 'number') return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
}
