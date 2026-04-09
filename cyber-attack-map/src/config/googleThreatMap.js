/**
 * Threat-map visuals (world-only, dotted land, arcs on top).
 *
 * Stack (no Mapbox): **Google Maps JavaScript API** for projection + camera,
 * **@deck.gl/google-maps** `GoogleMapsOverlay`, **@deck.gl/layers** for arcs & dots.
 * Basemap is styled to a flat color so only deck.gl content reads as the “map”.
 */

/** Solid background — dark plum/black like the reference threat-map look. */
export const MAP_BASE = '#120c14';

/** Hide labels/POI; single fill color for all geometry. */
export const GOOGLE_MAP_STYLES = [
  { featureType: 'all', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'all', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'all', elementType: 'geometry', stylers: [{ color: MAP_BASE }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

/** World extent for one screen; cropped a bit tighter to match the reference framing. */
export const WORLD_BOUNDS = {
  north: 70,
  south: -42,
  west: -179.5,
  east: 179.5,
};

/** Inner padding for `fitBounds` — margin between frame edge and land silhouette. */
export const FIT_PADDING = { top: 34, right: 42, bottom: 36, left: 42 };

/** Stipple density for land halftone (Natural Earth polygons → scatter points). */
export const LAND_DOT_COUNT = 16000;

/** Dashboard card cap (see MonitoringPage): less wide and a bit taller, like the reference screenshot. */
export const MAP_CARD_MAX = { widthPx: 550, heightPx: 350 };
