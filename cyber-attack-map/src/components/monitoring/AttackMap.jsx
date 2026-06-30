import { useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { fetchLandDotDataset } from '../../utils/landDotNoise.js';
import { LAND_DOT_COUNT, MAP_BASE } from '../../config/cyberMapConfig.js';
import { buildCyberMapOption, pickDisplayAttacks } from '../../utils/cyberMapChart.js';

export { pickDisplayAttacks };

export function AttackMap({ attacks, selectedAttackId, onSelectAttackId }) {
  const chartRef = useRef(null);
  const chartInstanceRef = useRef(null);
  const selectIdRef = useRef(onSelectAttackId);
  const displayAttacksRef = useRef([]);
  const [landDots, setLandDots] = useState([]);
  selectIdRef.current = onSelectAttackId;

  const displayAttacks = useMemo(() => pickDisplayAttacks(attacks), [attacks]);
  displayAttacksRef.current = displayAttacks;

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
    chart.setOption(
      buildCyberMapOption(landDots, displayAttacks, { selectedAttackId, variant: 'monitoring' }),
      { notMerge: true, lazyUpdate: true },
    );
    chart.resize();
  }, [landDots, displayAttacks, selectedAttackId]);

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden" style={{ backgroundColor: MAP_BASE }}>
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          backgroundImage:
            'linear-gradient(rgba(198, 40, 40, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(198, 40, 40, 0.04) 1px, transparent 1px)',
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
    </div>
  );
}
