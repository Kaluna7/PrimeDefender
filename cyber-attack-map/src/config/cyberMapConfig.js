/**
 * 2D cyber threat map — **Apache ECharts** (`geo` + `lines` + `effectScatter` + land scatter).
 * Bundled world GeoJSON; no external map tile/API keys required.
 */

/** Panel background (“ocean”) — same in all app themes. */
export const MAP_BASE = '#0c1018';

/** Stipple density (Natural Earth → grid dots). */
export const LAND_DOT_COUNT = 14000;

/** Max card size in Monitoring (wide ~16∶9 feel). */
export const MAP_CARD_MAX = { widthPx: 720, heightPx: 405 };

/** Geo framing — crop polar oceans; tweak to match your reference screenshot. */
export const GEO_BOUNDING = [
  [-180, 72],
  [180, -48],
];
