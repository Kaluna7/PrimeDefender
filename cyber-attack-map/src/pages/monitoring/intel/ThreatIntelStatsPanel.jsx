import { useMemo } from 'react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SEVERITY_ACCENT } from '../history/historyFeedUtils.js';
import { computeIntelMonthStats } from './intelMonthStats.js';

const SEVERITY_ROWS = [
  { key: 'high', labelKey: 'history.severity.high', color: SEVERITY_ACCENT.high },
  { key: 'medium', labelKey: 'history.severity.medium', color: SEVERITY_ACCENT.medium },
  { key: 'low', labelKey: 'history.severity.low', color: SEVERITY_ACCENT.low },
];

/**
 * @param {{ attacks: object[]; variant?: 'light' | 'dark'; embedded?: boolean }} props
 */
export function ThreatIntelStatsPanel({ attacks, variant = 'dark', embedded = false }) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';
  const stats = useMemo(() => computeIntelMonthStats(attacks, locale), [attacks, locale]);

  const titleClass = dark ? 'text-slate-100' : 'text-slark-dark';
  const mutedClass = dark ? 'text-slate-400' : 'text-slark-muted';

  return (
    <aside
      className={`flex h-full min-h-0 w-full flex-col px-3 py-3 sm:px-4 sm:py-4 ${
        embedded
          ? ''
          : `rounded-xl border lg:w-[min(100%,15rem)] lg:shrink-0 lg:basis-[15rem] ${
              dark ? 'border-slate-600/50 bg-[#1a2332]' : 'border-slark-border bg-slark-card'
            }`
      }`}
      aria-label={t('intel.statsTitle')}
    >
      <h3 className={`font-cyber text-[9px] font-bold uppercase tracking-[0.22em] ${titleClass}`}>
        {t('intel.statsTitle')}
      </h3>
      <p className={`mt-0.5 text-[9px] ${mutedClass}`}>{t('intel.statsSubtitle')}</p>

      <div className={`mt-4 rounded-lg border px-3 py-3 ${dark ? 'border-slate-600/45 bg-white/[0.03]' : 'border-slark-border bg-slark-bg'}`}>
        <p className={`text-[8px] font-bold uppercase tracking-wider ${mutedClass}`}>
          {t('intel.monthPeak')}
        </p>
        <p className="mt-1 font-cyber text-2xl font-bold tabular-nums text-slark-primary">
          {stats.peakCount.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
        </p>
        <p className={`mt-1 text-[10px] leading-snug ${dark ? 'text-slate-300' : 'text-slark-text'}`}>
          {stats.peakLabel ?? t('intel.noPeak')}
        </p>
        <p className={`mt-2 font-mono text-[9px] tabular-nums ${mutedClass}`}>
          {t('intel.monthTotal', {
            n: stats.monthTotal.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US'),
          })}
        </p>
      </div>

      <div className="mt-4 min-h-0 flex-1">
        <p className={`text-[8px] font-bold uppercase tracking-wider ${mutedClass}`}>
          {t('intel.severityBreakdown')}
        </p>
        <ul className="mt-2 space-y-2.5">
          {SEVERITY_ROWS.map(({ key, labelKey, color }) => {
            const count = stats.severity[key];
            const pct = Math.round((count / stats.severityTotal) * 100);
            return (
              <li key={key}>
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-[10px] font-semibold ${dark ? 'text-slate-200' : 'text-slark-text'}`}>
                    {t(labelKey)}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-slark-primary">{count}</span>
                </div>
                <div className={`mt-1 h-1.5 overflow-hidden rounded-full ${dark ? 'bg-slate-700/60' : 'bg-slark-border'}`}>
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                  />
                </div>
                <p className={`mt-0.5 text-right font-mono text-[8px] tabular-nums ${mutedClass}`}>{pct}%</p>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
