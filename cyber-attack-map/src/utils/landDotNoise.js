/**
 * Ray-cast point-in-polygon (GeoJSON ring: [lon, lat]).
 */
export function pointInRing(lon, lat, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect =
      (yi > lat) !== (yj > lat) && lon < ((xj - xi) * (lat - yi)) / (yj - yi || 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInPolygonRings(lon, lat, rings) {
  if (!pointInRing(lon, lat, rings[0])) return false;
  for (let h = 1; h < rings.length; h++) {
    if (pointInRing(lon, lat, rings[h])) return false;
  }
  return true;
}

function ringBbox(ring) {
  let minLon = 180;
  let maxLon = -180;
  let minLat = 90;
  let maxLat = -90;
  for (const [x, y] of ring) {
    if (x < minLon) minLon = x;
    if (x > maxLon) maxLon = x;
    if (y < minLat) minLat = y;
    if (y > maxLat) maxLat = y;
  }
  return { minLon, maxLon, minLat, maxLat, area: (maxLon - minLon) * (maxLat - minLat) };
}

function collectPolygonAreaItems(fc) {
  const items = [];
  let sum = 0;
  for (const f of fc?.features || []) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') {
      const bb = ringBbox(g.coordinates[0]);
      const w = bb.area;
      if (w < 1.2) continue;
      items.push({ coordinates: g.coordinates, bbox: bb, weight: w });
      sum += w;
    } else if (g.type === 'MultiPolygon') {
      for (const poly of g.coordinates) {
        const bb = ringBbox(poly[0]);
        const w = bb.area;
        if (w < 1.2) continue;
        items.push({ coordinates: poly, bbox: bb, weight: w });
        sum += w;
      }
    }
  }
  return { items, sum };
}

function buildRegularDotGrid(items, stepLon, stepLat) {
  const out = [];
  for (const { coordinates, bbox } of items) {
    let row = 0;
    for (let lat = bbox.minLat; lat <= bbox.maxLat; lat += stepLat) {
      const offset = row % 2 === 0 ? 0 : stepLon * 0.5;
      for (let lon = bbox.minLon + offset; lon <= bbox.maxLon; lon += stepLon) {
        if (pointInPolygonRings(lon, lat, coordinates)) {
          out.push([lon, lat]);
        }
      }
      row += 1;
    }
  }
  return out;
}

/**
 * Natural Earth land polygons → scatter positions for a halftone / "digital land" look.
 * @param {GeoJSON.FeatureCollection} fc
 * @param {number} totalDots
 * @returns {Array<{ position: [number, number] }>}
 */
export function buildLandDotPositionsFromGeoJSON(fc, totalDots) {
  const features = fc?.features;
  if (!features?.length) return [];

  const { items, sum } = collectPolygonAreaItems(fc);
  if (sum <= 0) return [];

  // Use a deterministic geo grid instead of random scatter so the continents
  // read like a checkpoint-style dot matrix, not a noisy point cloud.
  const stepLon = Math.sqrt(sum / Math.max(totalDots, 1));
  const stepLat = stepLon * 0.78;
  const out = buildRegularDotGrid(items, stepLon, stepLat);

  return out.map((position) => ({ position }));
}

const DEFAULT_LAND_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';

/**
 * @param {string} [url]
 * @param {number} [totalDots]
 */
export async function fetchLandDotDataset(url = DEFAULT_LAND_URL, totalDots = 11000) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Land GeoJSON fetch failed: ${res.status}`);
  const fc = await res.json();
  return buildLandDotPositionsFromGeoJSON(fc, totalDots);
}
