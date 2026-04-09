import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';
import { GoogleMapsOverlay } from '@deck.gl/google-maps';
import { ArcLayer, ScatterplotLayer } from '@deck.gl/layers';
import { useI18n } from '../i18n/I18nContext.jsx';
import { CATEGORY_STYLE, DDOS_VECTOR, THREAT_CATEGORY } from '../constants/threatCategories.js';
import { fetchLandDotDataset } from '../utils/landDotNoise.js';
import {
  FIT_PADDING,
  GOOGLE_MAP_STYLES,
  LAND_DOT_COUNT,
  MAP_BASE,
  WORLD_BOUNDS,
} from '../config/googleThreatMap.js';

/* global google */

const MAX_ARC_AGE_MS = 42000;
const FADE_START_MS = 14000;

function opacityForAge(ageMs) {
  if (ageMs < FADE_START_MS) {
    return 0.88 + Math.sin(ageMs * 0.004) * 0.08;
  }
  const t = (ageMs - FADE_START_MS) / (MAX_ARC_AGE_MS - FADE_START_MS);
  return Math.max(0, 0.96 * (1 - t));
}

function withAlpha(rgb, a) {
  return [rgb[0], rgb[1], rgb[2], Math.round(255 * a)];
}

function styleFor(d) {
  return CATEGORY_STYLE[d.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
}

function arcWidthForAttack(d, now) {
  const pulse = Math.sin(now * 0.0028) * 0.45;
  let w = 2 + pulse;
  if (d.category === THREAT_CATEGORY.DDOS && d.ddos?.peakGbps) {
    w += Math.min(2.2, d.ddos.peakGbps * 0.018);
  }
  return Math.min(4, Math.max(1, w));
}

function arcHeightForAttack(d) {
  if (d.category === THREAT_CATEGORY.DDOS && d.ddos?.vector === DDOS_VECTOR.VOLUMETRIC) {
    return 0.5;
  }
  if (d.category === THREAT_CATEGORY.DDOS) {
    return 0.42;
  }
  return 0.36;
}

function buildLayers(attacks, now, landDots) {
  const landLayer =
    landDots.length > 0
      ? new ScatterplotLayer({
          id: 'land-halftone',
          data: landDots,
          pickable: false,
          radiusUnits: 'pixels',
          getPosition: (d) => d.position,
          getRadius: (d) => d.r,
          getFillColor: (d) => d.fill,
          stroked: false,
        })
      : null;

  const arcData = attacks.map((a) => ({
    ...a,
    _age: now - a.createdAt,
  }));

  const arcLayer = new ArcLayer({
    id: 'cyber-arcs',
    data: arcData,
    pickable: false,
    greatCircle: true,
    numSegments: 72,
    getSourcePosition: (d) => [d.from.lon, d.from.lat],
    getTargetPosition: (d) => [d.to.lon, d.to.lat],
    getSourceColor: (d) => {
      const st = styleFor(d);
      return withAlpha(st.arcSource, opacityForAge(d._age));
    },
    getTargetColor: (d) => {
      const st = styleFor(d);
      return withAlpha(st.arcTarget, opacityForAge(d._age));
    },
    getWidth: (d) => arcWidthForAttack(d, now),
    getHeight: (d) => arcHeightForAttack(d),
  });

  const points = arcData.flatMap((d) => {
    const st = styleFor(d);
    const o = opacityForAge(d._age);
    return [
      {
        position: [d.from.lon, d.from.lat],
        fill: withAlpha(st.markerSource, Math.min(1, o + 0.06)),
        radius: d.category === THREAT_CATEGORY.DDOS ? 6 : 5,
      },
      {
        position: [d.to.lon, d.to.lat],
        fill: withAlpha(st.markerTarget, Math.min(1, o + 0.06)),
        radius: 4,
      },
    ];
  });

  const scatterLayer = new ScatterplotLayer({
    id: 'cyber-endpoints',
    data: points,
    pickable: false,
    radiusUnits: 'pixels',
    getPosition: (d) => d.position,
    getRadius: (d) => d.radius,
    getFillColor: (d) => d.fill,
    stroked: true,
    getLineWidth: 1,
    lineWidthUnits: 'pixels',
    getLineColor: [255, 255, 255, 130],
  });

  const layers = [];
  if (landLayer) layers.push(landLayer);
  layers.push(arcLayer, scatterLayer);
  return layers;
}

export function AttackMap({ attacks }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const overlayRef = useRef(null);
  const attacksRef = useRef(attacks);
  const landDotsRef = useRef([]);
  const rafRef = useRef(0);

  attacksRef.current = attacks;

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) return undefined;
    let cancelled = false;
    fetchLandDotDataset(undefined, LAND_DOT_COUNT)
      .then((dots) => {
        if (cancelled) return;
        landDotsRef.current = dots.map((d) => ({
          ...d,
          r: 1.15,
          fill: [182, 181, 192, 132],
        }));
      })
      .catch(() => {
        landDotsRef.current = [];
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || !containerRef.current) return undefined;

    let cancelled = false;
    let resizeObserver = null;
    const el = containerRef.current;
    const loader = new Loader({ apiKey, version: 'weekly' });

    loader.load().then(() => {
      if (cancelled || !el) return;

      const map = new google.maps.Map(el, {
        mapTypeId: 'roadmap',
        styles: GOOGLE_MAP_STYLES,
        backgroundColor: MAP_BASE,
        disableDefaultUI: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: false,
        clickableIcons: false,
        draggable: false,
        scrollwheel: false,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
        gestureHandling: 'none',
        tilt: 0,
        rotateControl: false,
        isFractionalZoomEnabled: false,
      });

      const fitWorld = () => {
        if (cancelled || !map) return;
        map.fitBounds(WORLD_BOUNDS, FIT_PADDING);
      };

      fitWorld();

      google.maps.event.addListenerOnce(map, 'idle', () => {
        if (cancelled) return;
        const z = map.getZoom();
        const zi = z != null ? Math.round(z) : 2;
        map.setOptions({
          minZoom: zi,
          maxZoom: zi,
        });
      });

      resizeObserver = new ResizeObserver(() => {
        if (cancelled) return;
        google.maps.event.trigger(map, 'resize');
        fitWorld();
        google.maps.event.addListenerOnce(map, 'idle', () => {
          if (cancelled) return;
          const z = map.getZoom();
          const zi = z != null ? Math.round(z) : 2;
          map.setOptions({ minZoom: zi, maxZoom: zi });
        });
      });
      resizeObserver.observe(el);

      const overlay = new GoogleMapsOverlay({
        interleaved: true,
        layers: [],
      });
      overlayRef.current = overlay;
      overlay.setMap(map);

      const tick = () => {
        if (cancelled) return;
        const o = overlayRef.current;
        if (o) {
          const now = Date.now();
          o.setProps({ layers: buildLayers(attacksRef.current, now, landDotsRef.current) });
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    });

    return () => {
      cancelled = true;
      resizeObserver?.disconnect();
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      const o = overlayRef.current;
      overlayRef.current = null;
      if (o) {
        o.finalize();
      }
    };
  }, [apiKey]);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black px-6 text-center">
        <p className="text-neon font-cyber max-w-lg text-sm leading-relaxed">{t('map.noToken')}</p>
      </div>
    );
  }

  return (
    <div
      className="map-dotworld relative h-full min-h-0 w-full max-h-full max-w-full overflow-hidden"
      style={{ backgroundColor: MAP_BASE }}
    >
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(167, 45, 92, 0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(167, 45, 92, 0.12) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          opacity: 0.55,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(circle at center, rgba(18,12,20,0) 52%, rgba(18,12,20,0.36) 76%, rgba(18,12,20,0.82) 100%)',
        }}
      />
      <div
        ref={containerRef}
        className="absolute inset-0 z-0 h-full w-full"
        aria-label="Cyber attack map"
      />
    </div>
  );
}
