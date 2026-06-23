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
      className="flex w-full flex-shrink-0 flex-col gap-3 bg-slark-bg px-3 py-3"
      aria-label="Threat metrics"
    >
      <div>
        <h2 className="font-cyber text-[10px] font-bold uppercase tracking-[0.32em] text-slark-dark">
          {t('metrics.title')}
        </h2>
        <p className="mt-0.5 text-[9px] uppercase tracking-wider text-slark-muted">
          {t('metrics.session', { n: attacks.length })}
        </p>
      </div>

      <div className="rounded-lg border border-slark-primary/20 bg-slark-card px-2.5 py-2 shadow-sm">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-slark-primary">DDoS</p>
        <p className="font-cyber mt-1 text-2xl tabular-nums text-slark-primary">
          {stats.ddos}
        </p>
        <p className="mt-1 font-mono text-[9px] text-slark-muted">
          σ peak ≈ {stats.avgGbps || '—'} Gbps
        </p>
      </div>

      <ul className="flex flex-col gap-2 text-[10px]">
        <li className="flex justify-between gap-2 border-b border-slark-border pb-1.5 text-slark-text">
          <span>Intrusion</span>
          <span className="font-mono tabular-nums">{stats.intrusion}</span>
        </li>
        <li className="flex justify-between gap-2 border-b border-slark-border pb-1.5 text-slark-text">
          <span>Malware</span>
          <span className="font-mono tabular-nums">{stats.malware}</span>
        </li>
        <li className="flex justify-between gap-2 border-b border-slark-border pb-1.5 text-slark-text">
          <span>Botnet / C2</span>
          <span className="font-mono tabular-nums">{stats.botnet}</span>
        </li>
        <li className="flex justify-between gap-2 text-slark-muted">
          <span>{t('metrics.unspecified')}</span>
          <span className="font-mono tabular-nums">{stats.unknown}</span>
        </li>
      </ul>

      <div className="mt-auto rounded border border-slark-border bg-slark-card px-2 py-2">
        <p className="text-[9px] uppercase tracking-wider text-slark-muted">{t('metrics.liveRate')}</p>
        <p className="font-cyber mt-0.5 text-lg tabular-nums text-slark-primary">
          {eventsPerMin.toFixed(1)}
          <span className="ml-1 text-[10px] font-sans font-normal text-slark-muted">{t('metrics.evtMin')}</span>
        </p>
      </div>
    </aside>
  );
}
