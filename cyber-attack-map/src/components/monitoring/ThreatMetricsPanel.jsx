import { useMemo } from 'react';
import { THREAT_CATEGORY } from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function ThreatMetricsPanel({ attacks, eventsPerMin, variant = 'light' }) {
  const { t } = useI18n();
  const dark = variant === 'dark';

  const stats = useMemo(() => {
    let ddos = 0;
    let intrusion = 0;
    let botnet = 0;
    let unknown = 0;
    let ddosGbpsSum = 0;
    let ddosCount = 0;

    for (const a of attacks) {
      if (a.category === THREAT_CATEGORY.DDOS) {
        ddos += 1;
        if (a.ddos?.peakGbps) {
          ddosGbpsSum += a.ddos.peakGbps;
          ddosCount += 1;
        }
      } else if (a.category === THREAT_CATEGORY.INTRUSION) intrusion += 1;
      else if (a.category === THREAT_CATEGORY.BOTNET) botnet += 1;
      else unknown += 1;
    }

    const avgGbps = ddosCount ? ddosGbpsSum / ddosCount : 0;

    return {
      ddos,
      intrusion,
      botnet,
      unknown,
      avgGbps: Math.round(avgGbps * 10) / 10,
    };
  }, [attacks]);

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
        <p className={`mt-0.5 text-[9px] uppercase tracking-wider ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
          {t('metrics.session', { n: attacks.length })}
        </p>
      </div>

      <div
        className={`rounded-lg border px-2.5 py-2 shadow-sm ${
          dark
            ? 'border-slark-primary/35 bg-white/[0.06]'
            : 'border-slark-primary/20 bg-slark-card'
        }`}
      >
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slark-primary">{t('threatCategory.ddos')}</p>
        <p className="font-cyber mt-1 text-2xl tabular-nums text-slark-primary">
          {stats.ddos}
        </p>
        <p className="mt-1 font-mono text-[9px] text-slark-muted">
          σ peak ≈ {stats.avgGbps || '—'} Gbps
        </p>
      </div>

      <ul className={`flex flex-col ${dark ? 'gap-1.5 text-[9px]' : 'gap-2 text-[10px]'} ${dark ? 'text-slate-200' : ''}`}>
        <li
          className={`flex justify-between gap-2 border-b pb-1.5 ${
            dark ? 'border-slate-600/50 text-slate-200' : 'border-slark-border text-slark-text'
          }`}
        >
          <span>{t('threatCategory.intrusion')}</span>
          <span className="font-mono tabular-nums">{stats.intrusion}</span>
        </li>
        <li
          className={`flex justify-between gap-2 border-b pb-1.5 ${
            dark ? 'border-slate-600/50 text-slate-200' : 'border-slark-border text-slark-text'
          }`}
        >
          <span>{t('threatCategory.botnet')}</span>
          <span className="font-mono tabular-nums">{stats.botnet}</span>
        </li>
        <li className={`flex justify-between gap-2 ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
          <span>{t('metrics.unspecified')}</span>
          <span className="font-mono tabular-nums">{stats.unknown}</span>
        </li>
      </ul>

      <div
        className={`rounded border px-2 py-2 ${
          dark ? 'border-slate-600/50 bg-white/[0.04]' : 'mt-auto border-slark-border bg-slark-card'
        }`}
      >
        <p className="text-[9px] uppercase tracking-wider text-slark-muted">{t('metrics.liveRate')}</p>
        <p className="font-cyber mt-0.5 text-lg tabular-nums text-slark-primary">
          {eventsPerMin.toFixed(1)}
          <span className="ml-1 text-[10px] font-sans font-normal text-slark-muted">{t('metrics.evtMin')}</span>
        </p>
      </div>
    </aside>
  );
}
