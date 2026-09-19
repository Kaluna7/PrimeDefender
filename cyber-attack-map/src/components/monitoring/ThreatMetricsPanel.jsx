import { useMemo } from 'react';
import { THREAT_CATEGORY } from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

const RATE_BUCKETS = 15;
const RATE_CHART_H = 88;
const CHART_W = 220;
const CHART_PAD = { top: 8, right: 6, bottom: 6, left: 6 };

const THREAT_LINES = [
  { id: THREAT_CATEGORY.DDOS, color: '#f43f5e', labelKey: 'threatCategory.ddos' },
  { id: THREAT_CATEGORY.INTRUSION, color: '#fbbf24', labelKey: 'threatCategory.intrusion' },
  { id: THREAT_CATEGORY.BOTNET, color: '#34d399', labelKey: 'threatCategory.botnet' },
];

function matchesCategory(attack, categoryId) {
  if (categoryId === THREAT_CATEGORY.DDOS) return attack.category === THREAT_CATEGORY.DDOS;
  if (categoryId === THREAT_CATEGORY.INTRUSION) return attack.category === THREAT_CATEGORY.INTRUSION;
  if (categoryId === THREAT_CATEGORY.BOTNET) return attack.category === THREAT_CATEGORY.BOTNET;
  return false;
}

function buildCategoryRateSeries(attacks, categoryId) {
  const now = Date.now();
  return Array.from({ length: RATE_BUCKETS }, (_, i) => {
    const bucketEnd = now - (RATE_BUCKETS - 1 - i) * 60_000;
    const bucketStart = bucketEnd - 60_000;
    return attacks.reduce((sum, a) => {
      if (a.createdAt >= bucketStart && a.createdAt < bucketEnd && matchesCategory(a, categoryId)) {
        return sum + (typeof a.hitCount === 'number' && a.hitCount > 0 ? a.hitCount : 1);
      }
      return sum;
    }, 0);
  });
}

function buildLinePath(values, width, height, maxY) {
  const innerW = Math.max(width - CHART_PAD.left - CHART_PAD.right, 1);
  const innerH = Math.max(height - CHART_PAD.top - CHART_PAD.bottom, 1);
  const n = values.length;
  const safeMax = Math.max(maxY, 1);

  return values
    .map((v, i) => {
      const x = CHART_PAD.left + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
      const y = CHART_PAD.top + innerH - (v / safeMax) * innerH;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

export function ThreatMetricsPanel({ attacks, eventsPerMin, variant = 'light' }) {
  const { t } = useI18n();
  const dark = variant === 'dark';

  const lineSeries = useMemo(
    () =>
      THREAT_LINES.map((line) => ({
        ...line,
        values: buildCategoryRateSeries(attacks, line.id),
      })),
    [attacks],
  );

  const maxY = useMemo(() => {
    const peak = Math.max(...lineSeries.flatMap((s) => s.values), 0);
    return Math.max(peak, 1);
  }, [lineSeries]);

  const hasChartData = lineSeries.some((series) => series.values.some((v) => v > 0));

  const panelBorder = dark ? 'border-slate-600/50 bg-white/[0.04]' : 'border-slark-border bg-slark-card';
  const mutedText = dark ? 'text-slate-400' : 'text-slark-muted';

  return (
    <aside
      className={`flex w-full flex-col ${
        dark ? 'shrink-0 gap-2 px-3 py-3' : 'min-h-0 flex-1 gap-3 px-3 py-3'
      } ${dark ? 'bg-transparent' : 'bg-slark-bg'}`}
      aria-label="Threat metrics"
    >
      <div>
        <h2
          className={`font-cyber text-[10px] font-bold uppercase tracking-[0.32em] ${
            dark ? 'text-slate-100' : 'text-slark-dark'
          }`}
        >
          {t('metrics.title')}
        </h2>
        <p className={`mt-0.5 text-[9px] uppercase tracking-wider ${mutedText}`}>
          {t('metrics.session', { n: attacks.length })}
        </p>
      </div>

      <div className={`rounded-lg border px-2 py-2 shadow-sm ${panelBorder}`}>
        <div className="flex items-baseline justify-end gap-2">
          <p className="font-cyber text-sm tabular-nums text-slark-primary">
            {eventsPerMin.toFixed(1)}
            <span className={`ml-1 text-[9px] font-sans font-normal ${mutedText}`}>{t('metrics.evtMin')}</span>
          </p>
        </div>

        <svg
          viewBox={`0 0 ${CHART_W} ${RATE_CHART_H}`}
          className="mt-1 w-full"
          role="img"
          aria-label={t('metrics.liveRate')}
        >
          {[0.25, 0.5, 0.75].map((ratio) => {
            const y =
              CHART_PAD.top +
              (RATE_CHART_H - CHART_PAD.top - CHART_PAD.bottom) * ratio;
            return (
              <line
                key={ratio}
                x1={CHART_PAD.left}
                x2={CHART_W - CHART_PAD.right}
                y1={y}
                y2={y}
                stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}
                strokeWidth="1"
              />
            );
          })}

          {hasChartData
            ? lineSeries.map((series) => {
                if (!series.values.some((v) => v > 0)) return null;
                return (
                  <path
                    key={series.id}
                    d={buildLinePath(series.values, CHART_W, RATE_CHART_H, maxY)}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity={0.95}
                  />
                );
              })
            : (
              <text
                x={CHART_W / 2}
                y={RATE_CHART_H / 2 + 3}
                textAnchor="middle"
                fill={dark ? '#64748b' : '#94a3b8'}
                fontSize="9"
                fontFamily="monospace"
              >
                {t('metrics.noChartData')}
              </text>
            )}
        </svg>

        <p className={`mt-0.5 text-[8px] ${mutedText}`}>{t('metrics.rateChartHint')}</p>

        <ul className="mt-2 flex flex-col gap-1.5 border-t border-slate-600/30 pt-2">
          {lineSeries.map((series) => (
            <li key={series.id} className="flex items-center gap-2 text-[8px] leading-none">
              <span
                className="h-[2px] w-5 shrink-0 rounded-full"
                style={{ backgroundColor: series.color }}
                aria-hidden
              />
              <span className={dark ? 'text-slate-300' : 'text-slark-text'}>{t(series.labelKey)}</span>
              <span className={`ml-auto font-mono tabular-nums ${mutedText}`}>
                {t(`metrics.lineColor.${series.id}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
