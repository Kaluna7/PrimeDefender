/**
 * Server-side GeoIP enrichment for ingest.
 * Prefers city-level coordinates across free providers (not WHOIS).
 */
import { isIP } from 'node:net';

const GEO_TTL_MS = 60 * 60 * 1000;
const GEO_TIMEOUT_MS = 1200;

/** @type {Map<string, { expiresAt: number, value: GeoLookupResult }>} */
const cache = new Map();

/**
 * @typedef {{
 *   lat: number,
 *   lon: number,
 *   label: string,
 *   isp?: string,
 *   city?: string,
 *   region?: string,
 *   country?: string,
 *   countryCode?: string,
 *   accuracy: 'HIGH' | 'MEDIUM' | 'LOW',
 *   provider: string,
 *   note: string,
 * }} GeoLookupResult
 */

function pruneCache() {
  const now = Date.now();
  for (const [k, v] of cache) {
    if (v.expiresAt <= now) cache.delete(k);
  }
}

/**
 * @param {string} ip
 */
export function isPrivateOrReservedIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  let cleaned = ip.trim();
  if (!cleaned) return true;
  if (cleaned.startsWith('::ffff:')) cleaned = cleaned.slice(7);
  if (isIP(cleaned) === 0) return true;

  if (cleaned.includes(':')) {
    const low = cleaned.toLowerCase();
    if (low === '::1' || low === '::') return true;
    if (low.startsWith('fe80:') || low.startsWith('fc') || low.startsWith('fd')) return true;
    return false;
  }

  const parts = cleaned.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

/**
 * @param {string | undefined | null} country
 * @param {string | undefined | null} region
 * @param {string | undefined | null} city
 */
function formatLabel(country, region, city) {
  if (!country) return undefined;
  const parts = [];
  if (city) parts.push(city);
  if (region && region !== city) {
    if (country === 'United States' || !city) parts.push(region);
    else if (!city.toLowerCase().includes(region.toLowerCase())) parts.push(region);
  }
  parts.push(country);
  const seen = new Set();
  const ordered = [];
  for (const p of parts) {
    const key = String(p).trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    ordered.push(String(p).trim());
  }
  return ordered.length ? ordered.join(', ') : undefined;
}

/**
 * @param {unknown} lat
 * @param {unknown} lon
 */
function validCoords(lat, lon) {
  const la = typeof lat === 'number' ? lat : Number(lat);
  const lo = typeof lon === 'number' ? lon : Number(lon);
  if (!Number.isFinite(la) || !Number.isFinite(lo)) return null;
  if (Math.abs(la) < 0.01 && Math.abs(lo) < 0.01) return null;
  if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
  return { lat: la, lon: lo };
}

/**
 * @param {string} url
 * @param {(json: any) => GeoLookupResult | null} parse
 */
async function fetchCandidate(url, parse) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(GEO_TIMEOUT_MS) });
    if (!res.ok) return null;
    const json = await res.json();
    const out = parse(json);
    if (!out || !validCoords(out.lat, out.lon)) return null;
    return out;
  } catch {
    return null;
  }
}

/**
 * @param {GeoLookupResult} hit
 */
function score(hit) {
  let s = 1;
  if (hit.city) s += 4;
  if (hit.region) s += 2;
  if (hit.country) s += 1;
  if (hit.isp) s += 1;
  return s;
}

/**
 * @param {string} ip
 * @returns {Promise<GeoLookupResult | null>}
 */
export async function lookupGeoByIp(ip) {
  const cleaned = String(ip || '').trim();
  if (!cleaned || isPrivateOrReservedIp(cleaned)) return null;

  pruneCache();
  const cached = cache.get(cleaned);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const providers = [
    () =>
      fetchCandidate(`https://ipwho.is/${encodeURIComponent(cleaned)}`, (j) => {
        if (j?.success !== true) return null;
        const coords = validCoords(j.latitude, j.longitude);
        if (!coords) return null;
        const city = typeof j.city === 'string' && j.city.trim() ? j.city.trim() : undefined;
        const region = typeof j.region === 'string' && j.region.trim() ? j.region.trim() : undefined;
        const country = typeof j.country === 'string' && j.country.trim() ? j.country.trim() : undefined;
        const countryCode =
          typeof j.country_code === 'string' && j.country_code.trim()
            ? j.country_code.trim().slice(0, 2).toUpperCase()
            : undefined;
        const isp =
          typeof j.connection?.isp === 'string' && j.connection.isp.trim()
            ? j.connection.isp.trim()
            : undefined;
        const accuracy = city ? 'HIGH' : region ? 'MEDIUM' : 'LOW';
        return {
          ...coords,
          label: formatLabel(country, region, city) || cleaned,
          isp,
          city,
          region,
          country,
          countryCode,
          accuracy,
          provider: 'ipwho.is',
          note:
            accuracy === 'HIGH'
              ? 'City-level IP geolocation (ipwho.is)'
              : accuracy === 'MEDIUM'
                ? 'Region-level IP geolocation (ipwho.is)'
                : 'Country/ISP-level IP geolocation (ipwho.is)',
        };
      }),
    () =>
      fetchCandidate(`https://ipapi.co/${encodeURIComponent(cleaned)}/json/`, (j) => {
        if (j?.error) return null;
        const coords = validCoords(j.latitude, j.longitude);
        if (!coords) return null;
        const city = typeof j.city === 'string' && j.city.trim() ? j.city.trim() : undefined;
        const region = typeof j.region === 'string' && j.region.trim() ? j.region.trim() : undefined;
        const country =
          typeof j.country_name === 'string' && j.country_name.trim() ? j.country_name.trim() : undefined;
        const countryCode =
          typeof j.country_code === 'string' && j.country_code.trim()
            ? j.country_code.trim().slice(0, 2).toUpperCase()
            : undefined;
        const isp = typeof j.org === 'string' && j.org.trim() ? j.org.trim() : undefined;
        const accuracy = city ? 'HIGH' : region ? 'MEDIUM' : 'LOW';
        return {
          ...coords,
          label: formatLabel(country, region, city) || cleaned,
          isp,
          city,
          region,
          country,
          countryCode,
          accuracy,
          provider: 'ipapi.co',
          note:
            accuracy === 'HIGH'
              ? 'City-level IP geolocation (ipapi.co)'
              : accuracy === 'MEDIUM'
                ? 'Region-level IP geolocation (ipapi.co)'
                : 'Country/ISP-level IP geolocation (ipapi.co)',
        };
      }),
    () =>
      fetchCandidate(
        `http://ip-api.com/json/${encodeURIComponent(cleaned)}?fields=status,country,countryCode,regionName,city,lat,lon,isp`,
        (j) => {
          if (j?.status !== 'success') return null;
          const coords = validCoords(j.lat, j.lon);
          if (!coords) return null;
          const city = typeof j.city === 'string' && j.city.trim() ? j.city.trim() : undefined;
          const region =
            typeof j.regionName === 'string' && j.regionName.trim() ? j.regionName.trim() : undefined;
          const country = typeof j.country === 'string' && j.country.trim() ? j.country.trim() : undefined;
          const countryCode =
            typeof j.countryCode === 'string' && j.countryCode.trim()
              ? j.countryCode.trim().slice(0, 2).toUpperCase()
              : undefined;
          const isp = typeof j.isp === 'string' && j.isp.trim() ? j.isp.trim() : undefined;
          const accuracy = city ? 'HIGH' : region ? 'MEDIUM' : 'LOW';
          return {
            ...coords,
            label: formatLabel(country, region, city) || cleaned,
            isp,
            city,
            region,
            country,
            countryCode,
            accuracy,
            provider: 'ip-api.com',
            note:
              accuracy === 'HIGH'
                ? 'City-level IP geolocation (ip-api.com)'
                : accuracy === 'MEDIUM'
                  ? 'Region-level IP geolocation (ip-api.com)'
                  : 'Country/ISP-level IP geolocation (ip-api.com)',
          };
        }
      ),
  ];

  /** @type {GeoLookupResult[]} */
  const hits = [];
  // Query in parallel, pick the most precise city-level result.
  const settled = await Promise.all(providers.map((p) => p()));
  for (const hit of settled) {
    if (hit) hits.push(hit);
  }

  if (!hits.length) return null;

  hits.sort((a, b) => score(b) - score(a));
  const best = hits[0];
  cache.set(cleaned, { expiresAt: Date.now() + GEO_TTL_MS, value: best });
  return best;
}

/**
 * Enrich ingest payload attacker `from` / labels from attackerIp when possible.
 * Keeps middleware payload intact if lookup fails.
 * @param {Record<string, any>} payload
 */
export async function enrichPayloadGeo(payload) {
  if (!payload || typeof payload !== 'object') return payload;

  const ipRaw = payload.attackerIp ?? payload.clientIp ?? payload.sourceIp;
  const ip = typeof ipRaw === 'string' ? ipRaw.trim() : '';
  if (!ip || isPrivateOrReservedIp(ip)) return payload;

  const geo = await lookupGeoByIp(ip);
  if (!geo) return payload;

  const next = { ...payload };
  next.from = { lat: geo.lat, lon: geo.lon };
  next.sourceLabel = geo.label;
  next.ipIntelIsp = typeof payload.ipIntelIsp === 'string' && payload.ipIntelIsp.trim()
    ? payload.ipIntelIsp
    : geo.isp;
  next.geoMeta = {
    ...(payload.geoMeta && typeof payload.geoMeta === 'object' ? payload.geoMeta : {}),
    location: geo.label,
    coordinates: `${geo.lat.toFixed(4)}, ${geo.lon.toFixed(4)}`,
    accuracy: geo.accuracy,
    note: geo.note,
    country: geo.country,
    countryCode: geo.countryCode,
  };
  return next;
}
