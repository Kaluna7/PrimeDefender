import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import worldGeo from '../../assets/world.geo.json';
import { fetchLandDotDataset } from '../../utils/landDotNoise.js';
import { GEO_BOUNDING, LAND_DOT_COUNT, MAP_BASE } from '../../config/cyberMapConfig.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

echarts.registerMap('world', worldGeo);

const MAX_ARC = 48;

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

/**
 * When an incident is selected, draw only that route so the map matches the detail panel.
 * Otherwise show the last MAX_ARC valid incidents (session can include old ngrok/US tests).
 */
export function pickDisplayAttacks(attacks, selectedAttackId) {
  const validRecent = attacks.filter(hasValidEndpoints).slice(-MAX_ARC);
  if (selectedAttackId) {
    const one = attacks.find((x) => x.id === selectedAttackId && hasValidEndpoints(x));
    if (one) return [one];
  }
  return validRecent;
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

  const recent = attacks.slice(-MAX_ARC);
  const highlightedIds = new Set(
    selectedAttackId ? [selectedAttackId] : recent.slice(-2).map((a) => a.id).filter(Boolean)
  );

  const lineData = recent.map((a, i) => ({
    coords: [
      [a.from.lon, a.from.lat],
      [a.to.lon, a.to.lat],
    ],
    attackId: a.id,
    lineStyle: {
      width: Math.min(3, 1.1 + (a.ddos?.peakGbps ? Math.min(1.2, a.ddos.peakGbps * 0.04) : 0)),
      curveness: 0.1 + (i % 9) * 0.018,
      opacity: 0.78 + (i % 4) * 0.05,
      color: '#ff9328',
    },
  }));

  const pulseData = [];
  for (const a of recent) {
    const selected = highlightedIds.has(a.id);
    const sourceTitle = a.sourceLabel || a.attackerIp || '';
    const targetTitle = a.targetLabel || a.sourceLabel || '';

    pulseData.push({
      value: [a.from.lon, a.from.lat],
      attackId: a.id,
      name: sourceTitle,
      symbolSize: 5,
      itemStyle: {
        color: 'rgba(255,150,70,0.55)',
        shadowBlur: 8,
        shadowColor: 'rgba(255,120,40,0.35)',
      },
      label: {
        show: Boolean(selected && sourceTitle),
        formatter: '{b}',
        position: 'left',
        distance: 6,
        color: MARKER_LABEL,
        fontSize: 10,
        backgroundColor: 'rgba(8,12,20,0.66)',
        padding: [2, 5],
        borderRadius: 4,
      },
    });
    pulseData.push({
      value: [a.to.lon, a.to.lat],
      attackId: a.id,
      name: targetTitle,
      symbolSize: selected ? 12 : 7,
      itemStyle: {
        color: 'rgba(255,165,65,0.98)',
        shadowBlur: selected ? 22 : 12,
        shadowColor: 'rgba(255,130,40,0.55)',
      },
      label: {
        show: Boolean(selected && targetTitle),
        formatter: '{b}',
        color: MARKER_LABEL,
        fontSize: 11,
        position: 'right',
        distance: 6,
        backgroundColor: 'rgba(8,12,20,0.66)',
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
        effect: {
          show: true,
          period: 5.5,
          trailLength: 0.42,
          symbol: 'arrow',
          symbolSize: 5,
          color: 'rgba(255,160,70,0.85)',
        },
        lineStyle: {
          color: '#ff9328',
          width: 1.35,
          opacity: 0.9,
          curveness: 0.14,
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

  const displayAttacks = useMemo(
    () => pickDisplayAttacks(attacks, selectedAttackId),
    [attacks, selectedAttackId]
  );
  displayAttacksRef.current = displayAttacks;

  const mapHint =
    attacks.length > 0
      ? selectedAttackId && displayAttacks.length === 1
        ? t('monitoring.mapHintSelected')
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
