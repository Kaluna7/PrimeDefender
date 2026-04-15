import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import worldGeo from '../../assets/world.geo.json';
import { fetchLandDotDataset } from '../../utils/landDotNoise.js';
import { GEO_BOUNDING, LAND_DOT_COUNT, MAP_BASE } from '../../config/cyberMapConfig.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { MAX_MAP_ARCS } from '../../constants/monitoringLimits.js';

echarts.registerMap('world', worldGeo);

function hasValidEndpoints(a) {
  const f = a?.from;
  const t = a?.to;
  return (
    f &&
    t &&
    typeof f.lat === 'number' &&
    typeof f.lon === 'number' &&
    typeof t.lat === 'number' &&
    typeof t.lon === 'number' &&
    Number.isFinite(f.lat) &&
    Number.isFinite(f.lon) &&
    Number.isFinite(t.lat) &&
    Number.isFinite(t.lon)
  );
}

/** Last N valid incidents — each stays on the map as new ones arrive (until cap). */
export function pickDisplayAttacks(attacks) {
  return attacks.filter(hasValidEndpoints).slice(-MAX_MAP_ARCS);
}

function quantizeCoord(n) {
  return Math.round(n * 100) / 100;
}

function routeKeyForAttack(a) {
  return [
    quantizeCoord(a.from.lat),
    quantizeCoord(a.from.lon),
    quantizeCoord(a.to.lat),
    quantizeCoord(a.to.lon),
  ].join('|');
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function curvenessForRoute(routeKey) {
  const hash = hashString(routeKey);
  const lane = hash % 7;
  const sign = hash % 2 === 0 ? 1 : -1;
  return sign * (0.08 + lane * 0.024);
}

function collapseRoutes(attacks, selectedAttackId) {
  const byRoute = new Map();
  for (const attack of attacks) {
    const key = routeKeyForAttack(attack);
    const current = byRoute.get(key);
    if (!current) {
      byRoute.set(key, { attack, routeKey: key, count: 1 });
      continue;
    }

    current.count += 1;
    const selectedWins = selectedAttackId && attack.id === selectedAttackId;
    if (selectedWins || attack.createdAt >= current.attack.createdAt) {
      current.attack = selectedWins ? attack : attack;
    }
  }
  return Array.from(byRoute.values());
}

/** Single map palette — not tied to app light/dark theme. */
const GEO_BORDER = 'rgba(100, 190, 220, 0.45)';
const LAND_FILL = 'rgba(38, 52, 74, 0.96)';
const LAND_DOT = 'rgba(150, 200, 230, 0.4)';
const MARKER_LABEL = '#f1f5f9';

function buildOption(landDots, attacks, selectedAttackId) {
  const landData = landDots.map((d) => ({
    value: d.position,
  }));

  const recent = attacks.slice(-MAX_MAP_ARCS);
  const routes = collapseRoutes(recent, selectedAttackId);
  const highlightedIds = new Set(
    selectedAttackId ? [selectedAttackId] : routes.slice(-2).map((r) => r.attack.id).filter(Boolean)
  );

  const lineData = routes.map(({ attack: a, routeKey, count }, index) => {
    const baseW = Math.min(3, 1.1 + (a.ddos?.peakGbps ? Math.min(1.2, a.ddos.peakGbps * 0.04) : 0));
    const hi = highlightedIds.has(a.id);
    const curveness = curvenessForRoute(routeKey);
    return {
      coords: [
        [a.from.lon, a.from.lat],
        [a.to.lon, a.to.lat],
      ],
      attackId: a.id,
      routeKey,
      routeCount: count,
      lineStyle: {
        width: hi ? Math.max(baseW, 3.4) : Math.min(3.1, baseW + Math.min(0.45, (count - 1) * 0.12)),
        curveness,
        opacity: hi ? 0.98 : Math.max(0.62, 0.78 + (index % 4) * 0.05),
        color: hi ? '#ffb020' : '#ff9328',
      },
    };
  });

  const pulseData = [];
  for (const { attack: a, count } of routes) {
    const selected = highlightedIds.has(a.id);
    const sourceTitle = a.sourceLabel || a.attackerIp || '';
    const targetTitle = a.targetLabel || a.sourceLabel || '';

    pulseData.push({
      value: [a.from.lon, a.from.lat],
      attackId: a.id,
      name: sourceTitle,
      symbolSize: Math.min(8, 5 + Math.min(3, count - 1)),
      itemStyle: {
        color: 'rgba(255,150,70,0.55)',
        shadowBlur: 8,
        shadowColor: 'rgba(255,120,40,0.35)',
      },
      label: {
        show: Boolean(sourceTitle),
        formatter: '{b}',
        position: 'left',
        distance: 6,
        color: selected ? '#ffffff' : 'rgba(241,245,249,0.92)',
        fontSize: 10,
        fontWeight: selected ? 700 : 500,
        backgroundColor: selected ? 'rgba(8,12,20,0.82)' : 'rgba(8,12,20,0.58)',
        padding: [2, 5],
        borderRadius: 4,
      },
    });
    pulseData.push({
      value: [a.to.lon, a.to.lat],
      attackId: a.id,
      name: targetTitle,
      symbolSize: selected ? 12 : Math.min(10, 7 + Math.min(3, count - 1)),
      itemStyle: {
        color: 'rgba(255,165,65,0.98)',
        shadowBlur: selected ? 22 : 12,
        shadowColor: 'rgba(255,130,40,0.55)',
      },
      label: {
        show: Boolean(targetTitle),
        formatter: '{b}',
        color: selected ? '#ffffff' : 'rgba(241,245,249,0.88)',
        fontSize: 11,
        fontWeight: selected ? 700 : 500,
        position: 'right',
        distance: 6,
        backgroundColor: selected ? 'rgba(8,12,20,0.82)' : 'rgba(8,12,20,0.56)',
        padding: [2, 5],
        borderRadius: 4,
      },
    });
  }

  return {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    geo: {
      map: 'world',
      roam: false,
      zoom: 1.08,
      center: [0, 14],
      boundingCoords: GEO_BOUNDING,
      aspectScale: 0.72,
      layoutCenter: ['50%', '50%'],
      layoutSize: '100%',
      itemStyle: {
        areaColor: LAND_FILL,
        borderColor: GEO_BORDER,
        borderWidth: 0.7,
      },
      emphasis: { disabled: true },
      silent: true,
    },
    series: [
      {
        id: 'land',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 1,
        silent: true,
        data: landData,
        symbolSize: 1.4,
        itemStyle: {
          color: LAND_DOT,
        },
        large: true,
        largeThreshold: 2500,
        progressive: 600,
        animation: false,
      },
      {
        id: 'arcs',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        data: lineData,
        /** Per-route styles only — a series-level lineStyle merges badly and can hide multiple arcs. */
        effect: {
          show: true,
          period: 5.5 + (routes.length % 5) * 0.15,
          trailLength: 0.28,
          symbol: 'arrow',
          symbolSize: 4,
          color: 'rgba(255,160,70,0.75)',
        },
      },
      {
        id: 'pulse',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: {
          brushType: 'stroke',
          scale: 3.4,
          period: 5,
        },
        symbolSize: 8,
        showEffectOn: 'render',
        labelLayout: {
          hideOverlap: false,
        },
        data: pulseData,
      },
    ],
  };
}

export function AttackMap({ attacks, selectedAttackId, onSelectAttackId }) {
  const { t } = useI18n();
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const selectIdRef = useRef(onSelectAttackId);
  const displayAttacksRef = useRef([]);
  const [landDots, setLandDots] = useState([]);
  selectIdRef.current = onSelectAttackId;

  const displayAttacks = useMemo(() => pickDisplayAttacks(attacks), [attacks]);
  displayAttacksRef.current = displayAttacks;

  const mapHint =
    attacks.length > 0
      ? selectedAttackId
        ? t('monitoring.mapHintHighlight', { n: displayAttacks.length })
        : t('monitoring.mapHintAll', { n: displayAttacks.length })
      : '';

  useEffect(() => {
    let cancelled = false;
    fetchLandDotDataset(undefined, LAND_DOT_COUNT)
      .then((dots) => {
        if (!cancelled) setLandDots(dots);
      })
      .catch(() => {
        if (!cancelled) setLandDots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!chartRef.current || chartInstanceRef.current) return undefined;

    const el = chartRef.current;
    const chart = echarts.init(el, null, { renderer: 'canvas' });
    chartInstanceRef.current = chart;

    function handleClick(params) {
      const id = params?.data?.attackId;
      if (typeof id === 'string' && id.length > 0) {
        selectIdRef.current?.(id);
        return;
      }
      if (params?.seriesIndex === 1 && typeof params?.dataIndex === 'number') {
        const recent = displayAttacksRef.current;
        const a = recent[params.dataIndex];
        if (a?.id) selectIdRef.current?.(a.id);
      }
    }
    chart.on('click', handleClick);

    const ro = new ResizeObserver(() => {
      chart.resize();
    });
    ro.observe(el);

    return () => {
      chart.off('click', handleClick);
      ro.disconnect();
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart) return;
    chart.setOption(buildOption(landDots, displayAttacks, selectedAttackId), {
      notMerge: true,
      lazyUpdate: true,
    });
  }, [landDots, displayAttacks, selectedAttackId]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden" style={{ backgroundColor: MAP_BASE }}>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34, 211, 238, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.06) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          opacity: 0.32,
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background:
            'radial-gradient(ellipse 85% 75% at 50% 45%, rgba(12,16,24,0) 0%, rgba(12,16,24,0.2) 58%, rgba(12,16,24,0.38) 100%)',
        }}
      />
      <div ref={chartRef} className="absolute inset-0 z-[1] h-full w-full" aria-label="Cyber threat map" />
      {mapHint ? (
        <p className="pointer-events-none absolute bottom-2 left-2 right-2 z-20 rounded-lg border border-slate-200/80 bg-white/90 px-2 py-1.5 text-[10px] leading-snug text-slate-600 shadow-sm dark:border-slate-600/60 dark:bg-slate-950/90 dark:text-slate-400">
          {mapHint}
        </p>
      ) : null}
    </div>
  );
}
