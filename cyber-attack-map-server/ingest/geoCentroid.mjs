import { readFileSync } from 'node:fs';

function normalizeName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

function iterPositions(geometry) {
  if (!geometry || typeof geometry !== 'object') return [];
  if (geometry.type === 'Polygon') {
    return geometry.coordinates.flat();
  }
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates.flat(2);
  }
  return [];
}

function centroidFromPositions(positions) {
  if (!Array.isArray(positions) || positions.length === 0) return null;
  let sumLon = 0;
  let sumLat = 0;
  let count = 0;
  for (const pair of positions) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    const [lon, lat] = pair;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    sumLon += lon;
    sumLat += lat;
    count += 1;
  }
  if (count === 0) return null;
  return {
    lat: sumLat / count,
    lon: sumLon / count,
  };
}

function collectFeatureNames(feature) {
  const props = feature?.properties || {};
  return [props.name, props.NAME, props.admin, props.ADMIN].filter(Boolean);
}

const GEOJSON_PATH = new URL('../cyber-attack-map/src/assets/world.geo.json', import.meta.url);
const COUNTRY_CENTROIDS = new Map();

try {
  const geojson = JSON.parse(readFileSync(GEOJSON_PATH, 'utf8'));
  for (const feature of geojson.features || []) {
    const centroid = centroidFromPositions(iterPositions(feature.geometry));
    if (!centroid) continue;
    for (const name of collectFeatureNames(feature)) {
      COUNTRY_CENTROIDS.set(normalizeName(name), centroid);
    }
  }
} catch {
  /* best effort only */
}

export function getCountryCentroid(countryName) {
  if (!countryName) return null;
  return COUNTRY_CENTROIDS.get(normalizeName(countryName)) || null;
}
