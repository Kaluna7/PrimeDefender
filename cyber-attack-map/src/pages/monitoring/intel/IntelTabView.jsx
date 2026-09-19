import { ThreatDailyChart } from '../../../components/monitoring/ThreatDailyChart.jsx';
import { ThreatIntelStatsPanel } from './ThreatIntelStatsPanel.jsx';

const CARD =
  'overflow-hidden rounded-2xl border border-slate-700/60 bg-slark-dark shadow-lg ring-1 ring-black/20';

/**
 * @param {{ attacks: object[]; shellClass?: string }} props
 */
export function IntelTabView({ attacks, shellClass = '' }) {
  return (
    <div
      className={`mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-4 px-3 py-3 sm:px-4 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-5 lg:py-4 ${shellClass}`}
    >
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-stretch">
        <div className={`${CARD} flex min-h-0 min-w-0 flex-col`}>
          <ThreatDailyChart attacks={attacks} variant="dark" large embedded />
        </div>
        <div className={`${CARD} min-h-0 min-w-0`}>
          <ThreatIntelStatsPanel attacks={attacks} variant="dark" embedded />
        </div>
      </div>
    </div>
  );
}
