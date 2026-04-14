import { useMemo } from 'react';
import { THREAT_CATEGORY } from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function ThreatMetricsPanel({ attacks, eventsPerMin }) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    let ddos = 0;
    let intrusion = 0;
    let malware = 0;
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
      else if (a.category === THREAT_CATEGORY.MALWARE) malware += 1;
      else if (a.category === THREAT_CATEGORY.BOTNET) botnet += 1;
      else unknown += 1;
    }

    const avgGbps = ddosCount ? ddosGbpsSum / ddosCount : 0;

    return {
      ddos,
      intrusion,
      malware,
      botnet,
      unknown,
      avgGbps: Math.round(avgGbps * 10) / 10,
    };
  }, [attacks]);

  return (
    <aside
      className="flex w-full flex-shrink-0 flex-col gap-3 bg-white/90 px-3 py-3 backdrop-blur-md dark:bg-black/50"
      aria-label="Threat metrics"
    >
      <div>
        <h2 className="font-cyber text-[10px] font-bold uppercase tracking-[0.32em] text-cyan-900 dark:text-cyan-200/90">
          {t('metrics.title')}
        </h2>
        <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slate-500 dark:text-cyan-700/90">
          {t('metrics.session', { n: attacks.length })}
        </p>
      </div>

      <div className="rounded-lg border border-rose-200/90 bg-rose-50/95 px-2.5 py-2 shadow-sm dark:border-rose-500/35 dark:bg-rose-950/25 dark:shadow-[inset_0_1px_0_rgba(251,113,133,0.12)]">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-rose-700 dark:text-rose-300/90">DDoS</p>
        <p className="font-cyber mt-1 text-2xl tabular-nums text-rose-800 dark:text-rose-100 dark:drop-shadow-[0_0_14px_rgba(251,113,133,0.35)]">
          {stats.ddos}
        </p>
        <p className="mt-1 font-mono text-[9px] text-rose-700/80 dark:text-rose-200/70">
          σ peak ≈ {stats.avgGbps || '—'} Gbps
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-[10px]">
        <li className="flex justify-between gap-2 border-b border-slate-200/90 pb-1.5 text-amber-800 dark:border-cyan-900/30 dark:text-amber-200/85">
          <span>Intrusion</span>
          <span className="font-mono tabular-nums">{stats.intrusion}</span>
        </li>
        <li className="flex justify-between gap-2 border-b border-slate-200/90 pb-1.5 text-violet-800 dark:border-cyan-900/30 dark:text-violet-200/85">
          <span>Malware</span>
          <span className="font-mono tabular-nums">{stats.malware}</span>
        </li>
        <li className="flex justify-between gap-2 border-b border-slate-200/90 pb-1.5 text-emerald-800 dark:border-cyan-900/30 dark:text-emerald-200/85">
          <span>Botnet / C2</span>
          <span className="font-mono tabular-nums">{stats.botnet}</span>
        </li>
        <li className="flex justify-between gap-2 text-slate-600 dark:text-slate-400/90">
          <span>{t('metrics.unspecified')}</span>
          <span className="font-mono tabular-nums">{stats.unknown}</span>
        </li>
      </ul>

      <div className="mt-auto rounded border border-cyan-200/90 bg-cyan-50/90 px-2 py-2 dark:border-cyan-800/40 dark:bg-cyan-950/25">
        <p className="text-[9px] uppercase tracking-wider text-cyan-700 dark:text-cyan-600">{t('metrics.liveRate')}</p>
        <p className="font-cyber text-neon mt-0.5 text-lg tabular-nums">
          {eventsPerMin.toFixed(1)}
          <span className="ml-1 text-[10px] font-sans font-normal text-cyan-700 dark:text-cyan-600">{t('metrics.evtMin')}</span>
        </p>
      </div>
    </aside>
  );
}
