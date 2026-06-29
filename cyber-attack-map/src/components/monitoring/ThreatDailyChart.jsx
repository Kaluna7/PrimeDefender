import { useLayoutEffect, useMemo, useRef } from 'react';
import * as echarts from 'echarts';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { buildDailyThreatSeries } from '../../utils/threatDailySeries.js';

const LINE = '#C62828';
const MA = '#334155';

/**
 * @param {{ attacks: { createdAt: number }[]; variant?: 'light' | 'dark' }} props
 */
export function ThreatDailyChart({ attacks, variant = 'light' }) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';
  const chartRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const chartInstRef = useRef(/** @type {echarts.ECharts | null} */ (null));

  const series = useMemo(
    () => buildDailyThreatSeries(attacks, 14, locale),
    [attacks, locale],
  );

  const labels = useMemo(() => series.map((p) => p.label), [series]);
  const dailyCounts = useMemo(() => series.map((p) => p.volume), [series]);
  const maLine = useMemo(() => series.map((p) => p.ma3), [series]);
  const peak = useMemo(() => Math.max(...dailyCounts, 4), [dailyCounts]);

  const total14 = useMemo(() => dailyCounts.reduce((s, n) => s + n, 0), [dailyCounts]);
  const todayVol = dailyCounts[dailyCounts.length - 1] ?? 0;

  useLayoutEffect(() => {
    const el = chartRef.current;
    if (!el || chartInstRef.current) return undefined;

    const chart = echarts.init(el, null, { renderer: 'canvas' });
    chartInstRef.current = chart;

    const resize = () => chart.resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    window.addEventListener('resize', resize);
    resize();

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartInstRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    let retryId = 0;

    const paint = () => {
      if (cancelled) return;
      const chart = chartInstRef.current;
      if (!chart) {
        retryId = window.requestAnimationFrame(paint);
        return;
      }

      chart.setOption(
      {
        backgroundColor: dark ? '#1a2332' : '#f8fafc',
        animationDuration: 360,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'cross' },
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          borderColor: 'rgba(148, 163, 184, 0.35)',
          textStyle: { color: '#f8fafc', fontSize: 11 },
        },
        legend: {
          top: 4,
          right: 8,
          textStyle: { color: dark ? '#94a3b8' : '#64748b', fontSize: 10 },
          data: [t('monitoring.intelChartIncidents'), 'MA(3)'],
        },
        grid: { left: 44, right: 16, top: 36, bottom: 28 },
        xAxis: {
          type: 'category',
          data: labels,
          boundaryGap: false,
          axisLine: { lineStyle: { color: dark ? '#64748b' : '#94a3b8' } },
          axisLabel: { color: dark ? '#94a3b8' : '#64748b', fontSize: 10 },
          axisTick: { show: false },
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: peak,
          minInterval: 1,
          axisLine: { show: false },
          axisTick: { show: false },
          axisLabel: { color: dark ? '#94a3b8' : '#64748b', fontSize: 10 },
          splitLine: { lineStyle: { color: dark ? 'rgba(148, 163, 184, 0.15)' : 'rgba(148, 163, 184, 0.25)' } },
        },
        series: [
          {
            name: t('monitoring.intelChartIncidents'),
            type: 'line',
            data: dailyCounts,
            smooth: 0.3,
            symbol: 'circle',
            symbolSize: 7,
            lineStyle: { width: 2.5, color: LINE },
            itemStyle: { color: LINE, borderColor: dark ? '#1a2332' : '#fff', borderWidth: 2 },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(198, 40, 40, 0.35)' },
                { offset: 1, color: 'rgba(198, 40, 40, 0.04)' },
              ]),
            },
          },
          {
            name: 'MA(3)',
            type: 'line',
            data: maLine,
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 1.5, color: MA, type: 'dashed' },
          },
        ],
      },
      true,
      );

      const resize = () => chart.resize();
      resize();
      const t1 = window.setTimeout(resize, 0);
      const t2 = window.setTimeout(resize, 150);
      return () => {
        window.clearTimeout(t1);
        window.clearTimeout(t2);
      };
    };

    const cleanupTimers = paint();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(retryId);
      cleanupTimers?.();
    };
  }, [labels, dailyCounts, maLine, peak, t, dark]);

  return (
    <section
      className="flex w-full min-h-0 flex-col px-3 py-4 sm:px-5 sm:py-5"
      aria-label={t('monitoring.intelChartTitle')}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={`font-cyber text-[10px] font-bold uppercase tracking-[0.32em] ${dark ? 'text-slate-100' : 'text-slark-dark'}`}>
            {t('monitoring.intelChartTitle')}
          </h2>
          <p className={`mt-1 text-[10px] leading-relaxed ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
            {t('monitoring.intelChartSubtitle')}
          </p>
        </div>
        <div className="flex gap-5 text-right">
          <div>
            <p className={`text-[9px] uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
              {t('monitoring.intelChartToday')}
            </p>
            <p className="font-cyber text-xl tabular-nums text-slark-primary">{todayVol}</p>
          </div>
          <div>
            <p className={`text-[9px] uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
              {t('monitoring.intelChart14d')}
            </p>
            <p className={`font-cyber text-xl tabular-nums ${dark ? 'text-slate-100' : 'text-slark-text'}`}>{total14}</p>
          </div>
        </div>
      </div>

      <div
        className={`relative mt-4 h-[min(24rem,50vh)] min-h-[280px] w-full rounded-xl border ${
          dark ? 'border-slate-600/50 bg-[#1a2332]' : 'border-slark-border bg-slark-card/40'
        }`}
      >
        <div ref={chartRef} className="absolute inset-0 h-full w-full" />
      </div>

      <p className={`mt-3 shrink-0 text-[9px] ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
        {t('monitoring.intelChartLegend')}
      </p>
    </section>
  );
}
