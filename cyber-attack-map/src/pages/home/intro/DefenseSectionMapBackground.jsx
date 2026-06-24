import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { DEMO_THREAT_ROUTES } from '../../../data/demoThreatRoutes.js';
import { fetchLandDotDataset } from '../../../utils/landDotNoise.js';
import { buildCyberMapOption } from '../../../utils/cyberMapChart.js';

const DEFENSE_LAND_DOTS = 7200;
const DEMO_ARC_CAP = 10;

function buildDefenseDemoAttacks() {
  return DEMO_THREAT_ROUTES.slice(0, DEMO_ARC_CAP).map((route, i) => ({
    ...route,
    id: `defense-demo-${i}`,
    createdAt: Date.now() - i * 90_000,
  }));
}

/** ECharts threat map — demo arcs as a subtle section background. */
export function DefenseSectionMapBackground() {
  const chartRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const chartInstanceRef = useRef(/** @type {echarts.ECharts | null} */ (null));
  const [landDots, setLandDots] = useState([]);
  const [highlightId, setHighlightId] = useState(/** @type {string | null} */ (null));

  const attacks = useMemo(() => buildDefenseDemoAttacks(), []);

  useEffect(() => {
    if (!attacks.length) return undefined;
    let idx = 0;
    setHighlightId(attacks[0].id);
    const timer = window.setInterval(() => {
      idx = (idx + 1) % attacks.length;
      setHighlightId(attacks[idx].id);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [attacks]);

  useEffect(() => {
    let cancelled = false;
    fetchLandDotDataset(undefined, DEFENSE_LAND_DOTS)
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

  useLayoutEffect(() => {
    const el = chartRef.current;
    if (!el || !landDots.length || chartInstanceRef.current) return undefined;

    const chart = echarts.init(el, null, { renderer: 'canvas' });
    chartInstanceRef.current = chart;

    const resize = () => chart.resize();
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartInstanceRef.current = null;
    };
  }, [landDots]);

  useLayoutEffect(() => {
    const chart = chartInstanceRef.current;
    if (!chart || !landDots.length) return;

    chart.setOption(
      buildCyberMapOption(landDots, attacks, {
        selectedAttackId: highlightId,
        variant: 'defense-bg',
        maxArcs: DEMO_ARC_CAP,
      }),
      { notMerge: true, lazyUpdate: true },
    );
    requestAnimationFrame(() => chart.resize());
  }, [landDots, attacks, highlightId]);

  return (
    <div className="defense-echart-map absolute inset-0" aria-hidden>
      <div ref={chartRef} className="defense-echart-canvas h-full w-full" />
    </div>
  );
}
