import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import {
  buildThreatChartSeries,
  INTEL_CHART_RANGE,
} from '../../utils/threatDailySeries.js';

const LINE = '#C62828';
const PLOT_H = 220;
const LABEL_ROW_H = 40;
const PAD = { top: 14, right: 12, bottom: 10, left: 40 };

const RANGE_IDS = [
  INTEL_CHART_RANGE.WEEK,
  INTEL_CHART_RANGE.MONTH,
  INTEL_CHART_RANGE.YEAR,
  INTEL_CHART_RANGE.ALL,
];

const RANGE_PILL = {
  week: 'border-blue-500/40 bg-blue-600/15 text-blue-200',
  month: 'border-violet-500/40 bg-violet-600/15 text-violet-200',
  year: 'border-amber-500/40 bg-amber-600/15 text-amber-200',
  all: 'border-slate-500/40 bg-slate-600/15 text-slate-200',
};

const RANGE_RING = {
  week: 'ring-1 ring-blue-400/60',
  month: 'ring-1 ring-violet-400/60',
  year: 'ring-1 ring-amber-400/60',
  all: 'ring-1 ring-slate-400/60',
};

function computeMaxY(values) {
  const maxVal = values.length ? Math.max(...values) : 0;
  if (maxVal === 0) return 5;
  const padded = Math.ceil(maxVal * 1.2);
  return Math.max(padded, maxVal + 1);
}

function buildPoints(series, width, maxY) {
  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = Math.max(PLOT_H - PAD.top - PAD.bottom, 1);
  const n = Math.max(series.length, 1);

  return series.map((point, i) => {
    const x = PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
    const y = PAD.top + innerH - (point.volume / maxY) * innerH;
    return { x, y, ...point };
  });
}

function linePath(points) {
  if (!points.length) return '';
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
}

function areaPath(points) {
  if (!points.length) return '';
  const base = PLOT_H - PAD.bottom;
  const start = points[0];
  const end = points[points.length - 1];
  return `${linePath(points)} L ${end.x.toFixed(1)} ${base} L ${start.x.toFixed(1)} ${base} Z`;
}

/**
 * @param {{
 *   attacks: { createdAt: number }[];
 *   variant?: 'light' | 'dark';
 *   large?: boolean;
 *   embedded?: boolean;
 * }} props
 */
export function ThreatDailyChart({ attacks, variant = 'light', large = false, embedded = false }) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';
  const [range, setRange] = useState(INTEL_CHART_RANGE.WEEK);
  const wrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [width, setWidth] = useState(640);
  const [hoverIdx, setHoverIdx] = useState(/** @type {number | null} */ (null));

  const series = useMemo(
    () => buildThreatChartSeries(attacks, range, locale),
    [attacks, range, locale],
  );

  const dailyCounts = useMemo(() => series.map((p) => p.volume), [series]);
  const maxY = useMemo(() => computeMaxY(dailyCounts), [dailyCounts]);
  const rangeTotal = useMemo(() => dailyCounts.reduce((s, n) => s + n, 0), [dailyCounts]);
  const rangePeak = useMemo(() => Math.max(...dailyCounts, 0), [dailyCounts]);
  const allZero = rangeTotal === 0;

  const points = useMemo(() => buildPoints(series, width, maxY), [series, width, maxY]);
  const yTicks = useMemo(() => {
    const steps = 4;
    return Array.from({ length: steps + 1 }, (_, i) => Math.round((maxY / steps) * i));
  }, [maxY]);

  const labelStep = series.length > 12 ? Math.ceil(series.length / 8) : 1;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const measure = () => setWidth(Math.max(el.clientWidth, 280));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    setHoverIdx(null);
  }, [range, series.length]);

  const mutedClass = dark ? 'text-slate-400' : 'text-slark-muted';
  const titleClass = dark ? 'text-slate-100' : 'text-slark-dark';
  const gridColor = dark ? 'rgba(148, 163, 184, 0.18)' : 'rgba(148, 163, 184, 0.28)';
  const axisColor = dark ? '#94a3b8' : '#64748b';
  const innerH = PLOT_H - PAD.top - PAD.bottom;

  return (
    <section
      className={`flex w-full flex-col ${embedded ? 'min-h-0 px-3 py-3 sm:px-4 sm:py-4' : 'px-3 py-4 sm:px-5 sm:py-5'} ${large && !embedded ? 'min-h-[20rem]' : ''}`}
      aria-label={t('monitoring.intelChartTitle')}
    >
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className={`font-cyber text-[10px] font-bold uppercase tracking-[0.32em] ${titleClass}`}>
            {t('monitoring.intelChartTitle')}
          </h2>
          <p className={`mt-1 text-[10px] leading-relaxed ${mutedClass}`}>
            {t(`monitoring.intelChartSubtitle_${range}`)}
          </p>
        </div>
        <div className="flex gap-4 text-right sm:gap-5">
          <div>
            <p className={`text-[9px] uppercase tracking-wider ${mutedClass}`}>
              {t('monitoring.intelChartRangeTotal')}
            </p>
            <p className="font-cyber text-xl tabular-nums text-slark-primary">{rangeTotal}</p>
          </div>
          <div>
            <p className={`text-[9px] uppercase tracking-wider ${mutedClass}`}>
              {t('monitoring.intelChartPeak')}
            </p>
            <p className={`font-cyber text-xl tabular-nums ${titleClass}`}>{rangePeak}</p>
          </div>
        </div>
      </div>

      <div
        className="mt-3 flex shrink-0 flex-wrap gap-1.5"
        role="tablist"
        aria-label={t('monitoring.intelChartFilterLabel')}
      >
        {RANGE_IDS.map((id) => {
          const active = range === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${
                RANGE_PILL[id]
              } ${active ? RANGE_RING[id] : 'opacity-80 hover:opacity-100'}`}
              onClick={() => setRange(id)}
            >
              {t(`monitoring.intelChartFilter_${id}`)}
            </button>
          );
        })}
      </div>

      <div
        ref={wrapRef}
        className={`relative mt-3 w-full shrink-0 overflow-hidden rounded-xl border ${
          dark ? 'border-slate-600/50 bg-[#1a2332]' : 'border-slark-border bg-slark-card/40'
        }`}
      >
        {series.length === 0 ? (
          <p className={`flex items-center justify-center px-4 py-14 text-center text-[11px] ${mutedClass}`}>
            {t('monitoring.intelChartEmpty')}
          </p>
        ) : (
          <>
            <svg
              viewBox={`0 0 ${width} ${PLOT_H}`}
              width="100%"
              height={PLOT_H}
              preserveAspectRatio="none"
              className="block"
              role="img"
              aria-label={t('monitoring.intelChartTitle')}
            >
              {yTicks.map((tick) => {
                const y = PAD.top + innerH - (tick / maxY) * innerH;
                return (
                  <g key={tick}>
                    <line x1={PAD.left} y1={y} x2={width - PAD.right} y2={y} stroke={gridColor} strokeWidth="1" />
                    <text
                      x={PAD.left - 6}
                      y={y + 3.5}
                      textAnchor="end"
                      fill={axisColor}
                      fontSize="10"
                      fontFamily="ui-monospace, monospace"
                    >
                      {tick}
                    </text>
                  </g>
                );
              })}

              <line
                x1={PAD.left}
                y1={PLOT_H - PAD.bottom}
                x2={width - PAD.right}
                y2={PLOT_H - PAD.bottom}
                stroke={axisColor}
                strokeWidth="1"
              />

              <path d={areaPath(points)} fill="rgba(198, 40, 40, 0.15)" />
              <path
                d={linePath(points)}
                fill="none"
                stroke={LINE}
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {points.map((p, i) => (
                <circle
                  key={p.dateKey}
                  cx={p.x}
                  cy={p.y}
                  r={hoverIdx === i ? 6 : 4.5}
                  fill={LINE}
                  stroke={dark ? '#1a2332' : '#fff'}
                  strokeWidth="2"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIdx(i)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
              ))}

              {hoverIdx != null && points[hoverIdx] ? (
                <g pointerEvents="none">
                  <rect
                    x={Math.min(Math.max(points[hoverIdx].x - 72, PAD.left), width - PAD.right - 144)}
                    y={Math.max(points[hoverIdx].y - 44, 8)}
                    width="144"
                    height="36"
                    rx="6"
                    fill="rgba(15, 23, 42, 0.94)"
                    stroke="rgba(148, 163, 184, 0.35)"
                  />
                  <text
                    x={Math.min(Math.max(points[hoverIdx].x - 64, PAD.left + 8), width - PAD.right - 136)}
                    y={Math.max(points[hoverIdx].y - 26, 22)}
                    fill="#f8fafc"
                    fontSize="9"
                  >
                    {points[hoverIdx].fullLabel || points[hoverIdx].label}
                  </text>
                  <text
                    x={Math.min(Math.max(points[hoverIdx].x - 64, PAD.left + 8), width - PAD.right - 136)}
                    y={Math.max(points[hoverIdx].y - 12, 36)}
                    fill="#fca5a5"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {points[hoverIdx].volume} {t('monitoring.intelChartIncidents').toLowerCase()}
                  </text>
                </g>
              ) : null}
            </svg>

            {allZero ? (
              <div className="pointer-events-none absolute inset-x-0 top-[38%] flex justify-center px-4">
                <span
                  className={`rounded-md border px-2.5 py-1 text-[10px] ${
                    dark
                      ? 'border-slate-600/50 bg-slate-900/90 text-slate-400'
                      : 'border-slark-border bg-slark-bg/95 text-slark-muted'
                  }`}
                >
                  {t('monitoring.intelChartEmpty')}
                </span>
              </div>
            ) : null}

            <div
              className={`grid border-t ${dark ? 'border-slate-600/45' : 'border-slark-border'}`}
              style={{
                height: LABEL_ROW_H,
                paddingLeft: PAD.left,
                paddingRight: PAD.right,
                gridTemplateColumns: `repeat(${series.length}, minmax(0, 1fr))`,
              }}
            >
              {series.map((point, i) => {
                const show = i === 0 || i === series.length - 1 || i % labelStep === 0 || hoverIdx === i;
                return (
                  <div
                    key={point.dateKey}
                    className="flex items-center justify-center"
                    onMouseEnter={() => setHoverIdx(i)}
                    onMouseLeave={() => setHoverIdx(null)}
                  >
                    {show ? (
                      <span
                        className={`max-w-full truncate px-0.5 text-center font-mono leading-none ${
                          hoverIdx === i ? 'text-[9px] font-semibold text-slate-100' : `text-[8px] ${mutedClass}`
                        }`}
                        title={point.fullLabel || point.label}
                      >
                        {point.label}
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-600">·</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <p className={`mt-2 shrink-0 text-[9px] leading-snug ${mutedClass}`}>{t('monitoring.intelChartLegend')}</p>
    </section>
  );
}
