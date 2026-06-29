import { useMemo } from 'react';
import {
  CATEGORY_STYLE,
  DDOS_VECTOR,
  THREAT_CATEGORY,
  SEVERITY_STYLE,
  threatCategoryLabelKey,
} from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { summarizeAttackLog } from '../../utils/attackLogFormatter.js';
import { formatIncidentWhen } from '../../utils/formatIncidentTime.js';

const VECTOR_LABEL = {
  [DDOS_VECTOR.VOLUMETRIC]: 'Volumetric',
  [DDOS_VECTOR.PROTOCOL]: 'Protocol',
  [DDOS_VECTOR.APPLICATION]: 'Application',
};

function formatPps(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M pps`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K pps`;
  return `${Math.round(n)} pps`;
}

function labelOrDash(s) {
  return s && String(s).trim() ? s : '—';
}

export function LiveAttackFeed({
  attacks,
  maxRows = 22,
  socketEnabled = true,
  socketConnected = false,
  bridgeState = 'ok',
  selectedId = null,
  onSelectAttack,
  className = '',
  variant = 'light',
  /** When set, overrides default empty-state copy (e.g. archive / history list). */
  emptyHint = null,
}) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';

  const rows = useMemo(() => {
    return [...attacks].reverse().slice(0, maxRows);
  }, [attacks, maxRows]);

  const emptyMessage =
    emptyHint ||
    (() => {
      if (!socketEnabled) {
        return t('feed.emptySocketOff');
      }
      if (bridgeState === 'checking') {
        return t('feed.emptyChecking');
      }
      if (bridgeState === 'bad') {
        return t('feed.emptyBad');
      }
      if (!socketConnected) {
        return t('feed.emptyConnecting');
      }
      return t('feed.emptyIdle');
    })();

  const ui = dark
    ? {
        empty: 'text-slate-400',
        scroll: 'thin-scrollbar-dark',
        cardEven: 'border-slate-600/55 bg-[#1a2332] shadow-sm',
        cardOdd: 'border-slate-600/45 bg-[#2c3a50] shadow-sm',
        cardSelected: 'border-slark-primary/55 ring-1 ring-slark-primary/35 bg-slark-primary/[0.12]',
        attackerEven: 'border-rose-500/30 bg-rose-950/35',
        attackerOdd: 'border-rose-500/40 bg-rose-950/55',
        attackerLabel: 'text-rose-300',
        attackerIp: 'text-slate-100',
        muted: 'text-slate-400',
        blocked: 'border-emerald-500/35 bg-emerald-950/40 text-emerald-200',
        blockedTag: 'text-emerald-300',
        path: 'text-slate-200',
        routeFrom: 'text-slate-200',
        routeTo: 'text-amber-300',
        routeArrow: 'text-slate-500',
        body: 'text-slate-200',
        logBoxEven: 'border-slate-600/45 bg-black/15',
        logBoxOdd: 'border-slate-600/40 bg-black/25',
        logChip: 'border-slate-600/45 bg-white/[0.05] text-slate-400',
        logCellEven: 'border-slate-600/40 bg-white/[0.04]',
        logCellOdd: 'border-slate-600/35 bg-white/[0.07]',
        logText: 'text-slate-200',
        ddosBorder: 'border-rose-500/30',
        ddosText: 'text-rose-300',
        ddosChip: 'bg-rose-950/60 text-rose-200',
        ddosGbps: 'text-amber-300',
        ddosMuted: 'text-rose-400',
        depChip: 'border-slate-600/40 bg-white/[0.05] text-slate-200',
      }
    : {
        empty: 'text-slark-muted',
        scroll: 'thin-scrollbar',
        cardEven: 'border-slark-border bg-slark-card shadow-sm',
        cardOdd: 'border-slate-200 bg-slate-50 shadow-sm',
        cardSelected: 'border-slark-primary ring-1 ring-slark-primary/30 bg-slark-primary/[0.06]',
        attackerEven: 'border-rose-200/90 bg-gradient-to-r from-rose-50/95 to-slark-bg',
        attackerOdd: 'border-rose-300/90 bg-gradient-to-r from-rose-100/90 to-white',
        attackerLabel: 'text-rose-800',
        attackerIp: 'text-slark-text',
        muted: 'text-slark-muted',
        blocked: 'border-emerald-300/80 bg-emerald-50/95 text-emerald-900',
        blockedTag: 'text-emerald-700',
        path: 'text-slark-dark',
        routeFrom: 'text-slark-dark',
        routeTo: 'text-amber-800',
        routeArrow: 'text-slark-muted',
        body: 'text-slark-text',
        logBoxEven: 'border-slark-border bg-slark-bg',
        logBoxOdd: 'border-slate-200 bg-white',
        logChip: 'border-slark-border bg-slark-card text-slark-muted',
        logCellEven: 'border-slark-border bg-slark-card',
        logCellOdd: 'border-slate-200 bg-white',
        logText: 'text-slark-text',
        ddosBorder: 'border-rose-200/90',
        ddosText: 'text-rose-800',
        ddosChip: 'bg-rose-100 text-rose-900',
        ddosGbps: 'text-amber-800',
        ddosMuted: 'text-rose-600',
        depChip: 'border-slark-border bg-slark-card text-slark-text',
      };

  return (
    <section
      className={`flex h-full min-h-0 flex-col ${
        dark ? 'bg-slark-dark text-slate-200' : 'border-l border-slark-border bg-slark-bg'
      } ${className}`}
      aria-label="Live attack feed"
    >
      <div className={`px-3 py-2.5 ${dark ? 'border-b border-slate-600/50' : 'border-b border-slark-border'}`}>
        <h2
          className={`font-cyber text-[11px] font-bold uppercase tracking-[0.28em] ${
            dark ? 'text-slate-100' : 'text-slark-text'
          }`}
        >
          {t('feed.title')}
        </h2>
        <p
          className={`mt-0.5 text-[10px] uppercase tracking-wider ${
            dark ? 'text-slate-400' : 'text-slark-muted'
          }`}
        >
          {t('feed.subtitle')}
        </p>
      </div>

      <div className={`${ui.scroll} min-h-0 flex-1 overflow-y-auto px-2 py-2`}>
        {rows.length === 0 ? (
          <p className={`px-2 py-6 text-center text-[11px] leading-relaxed ${ui.empty}`}>
            {emptyMessage}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((a, index) => {
              const cat = CATEGORY_STYLE[a.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
              const sev = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium;
              const logSummary = summarizeAttackLog(a);

              const selected = selectedId === a.id;
              const isEven = index % 2 === 0;
              const zebra = isEven ? ui.cardEven : ui.cardOdd;
              const attackerBox = isEven ? ui.attackerEven : ui.attackerOdd;
              const logBox = isEven ? ui.logBoxEven : ui.logBoxOdd;
              const logCell = isEven ? ui.logCellEven : ui.logCellOdd;
              return (
                <li
                  key={a.id}
                  className={`rounded-md border px-2.5 py-2 ${
                    selected ? ui.cardSelected : zebra
                  } ${onSelectAttack ? 'cursor-pointer transition hover:border-slark-primary/70' : ''}`}
                  onClick={() => onSelectAttack?.(a)}
                  onKeyDown={(e) => {
                    if (onSelectAttack && (e.key === 'Enter' || e.key === ' ')) {
                      e.preventDefault();
                      onSelectAttack(a);
                    }
                  }}
                  role={onSelectAttack ? 'button' : undefined}
                  tabIndex={onSelectAttack ? 0 : undefined}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      <span
                        className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide ${cat.badgeClass}`}
                      >
                        {t(threatCategoryLabelKey(a.category))}
                      </span>
                      <span
                        className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase ${sev.className}`}
                      >
                        {sev.label}
                      </span>
                    </div>
                    <div className={`shrink-0 text-right ${ui.muted}`}>
                      <p className="text-[7px] font-bold uppercase tracking-wider">{t('feed.attackedAt')}</p>
                      <p className={`font-mono text-[9px] tabular-nums ${dark ? 'text-slate-200' : 'text-slark-text'}`}>
                        {formatIncidentWhen(a.createdAt, locale, 'short')}
                      </p>
                    </div>
                  </div>

                  <div className={`mt-2 rounded-md border px-2 py-1.5 ${attackerBox}`}>
                    <p className={`text-[8px] font-bold uppercase tracking-wider ${ui.attackerLabel}`}>
                      {t('feed.attackerLabel')}
                    </p>
                    <p className={`mt-0.5 font-mono text-[10px] font-semibold ${ui.attackerIp}`}>
                      {a.attackerIp?.trim() ? a.attackerIp : t('feed.unknownIp')}
                    </p>
                    <p className={`mt-0.5 text-[9px] ${ui.muted}`}>
                      {labelOrDash(a.sourceLabel)}
                    </p>
                  </div>

                  {(a.siteId || a.tenantId) && (
                    <p className={`mt-1.5 text-[9px] ${ui.muted}`}>
                      {t('feed.customerSite')}{' '}
                      <span className={`font-mono ${dark ? 'text-slate-500' : 'text-slark-muted/80'}`}>
                        {a.siteId || a.tenantId}
                      </span>
                    </p>
                  )}

                  {(a.blocked || a.path) && (
                    <p className={`mt-1.5 rounded border px-1.5 py-1 font-mono text-[9px] ${ui.blocked}`}>
                      <span className={ui.blockedTag}>{t('feed.blocked')}</span>
                      {a.method && a.path && (
                        <>
                          {' '}
                          <span className={ui.muted}>{a.method}</span>{' '}
                          <span className={ui.path}>{a.path}</span>
                        </>
                      )}
                      {a.path && !a.method && <span className={ui.path}> {a.path}</span>}
                    </p>
                  )}

                  <p className={`mt-1.5 font-mono text-[10px] leading-snug ${ui.body}`}>
                    <span className={ui.routeFrom}>{labelOrDash(a.sourceLabel)}</span>
                    <span className={`mx-1 ${ui.routeArrow}`}>→</span>
                    <span className={ui.routeTo}>{labelOrDash(a.targetLabel)}</span>
                  </p>

                  <div className={`mt-2 rounded-md border p-2 ${logBox}`}>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`font-mono text-[8px] font-bold uppercase tracking-wider ${ui.muted}`}>
                        {t('feed.logTitle')}
                      </p>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide ${ui.logChip}`}
                      >
                        {t('feed.openDetail')}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className={`rounded border px-2 py-1 ${logCell}`}>
                        <p className={`text-[8px] uppercase tracking-wide ${ui.muted}`}>ID</p>
                        <p className={`mt-0.5 truncate font-mono ${ui.logText}`}>{logSummary.requestId}</p>
                      </div>
                      <div className={`rounded border px-2 py-1 ${logCell}`}>
                        <p className={`text-[8px] uppercase tracking-wide ${ui.muted}`}>Detect</p>
                        <p className={`mt-0.5 truncate font-mono ${ui.logText}`}>{logSummary.detectType}</p>
                      </div>
                      <div className={`col-span-2 rounded border px-2 py-1 ${logCell}`}>
                        <p className={`text-[8px] uppercase tracking-wide ${ui.muted}`}>Location</p>
                        <p className={`mt-0.5 truncate font-mono ${ui.logText}`}>{logSummary.geoLocation}</p>
                      </div>
                      <div className={`rounded border px-2 py-1 ${logCell}`}>
                        <p className={`text-[8px] uppercase tracking-wide ${ui.muted}`}>Response</p>
                        <p className={`mt-0.5 font-mono ${ui.logText}`}>{logSummary.responseStatus}</p>
                      </div>
                      <div className={`rounded border px-2 py-1 ${logCell}`}>
                        <p className={`text-[8px] uppercase tracking-wide ${ui.muted}`}>Action</p>
                        <p className={`mt-0.5 truncate font-mono ${ui.logText}`}>{logSummary.mitigation}</p>
                      </div>
                      <div className={`col-span-2 rounded border px-2 py-1 ${logCell}`}>
                        <p className={`text-[8px] uppercase tracking-wide ${ui.muted}`}>Request</p>
                        <p className={`mt-0.5 truncate font-mono ${ui.logText}`}>{logSummary.request}</p>
                      </div>
                    </div>
                  </div>

                  {a.category === THREAT_CATEGORY.DDOS && (
                    <div className={`mt-2 space-y-1.5 border-t pt-2 ${ui.ddosBorder}`}>
                      {a.ddos ? (
                        <>
                          <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] ${ui.ddosText}`}>
                            <span className={`uppercase tracking-wider ${ui.ddosMuted}`}>DDoS</span>
                            {a.ddos.vector && (
                              <span className={`rounded px-1 py-0.5 font-mono ${ui.ddosChip}`}>
                                {VECTOR_LABEL[a.ddos.vector] ?? a.ddos.vector}
                              </span>
                            )}
                            {typeof a.ddos.peakGbps === 'number' && (
                              <>
                                <span className={ui.muted}>·</span>
                                <span className={`font-mono tabular-nums ${ui.ddosGbps}`}>
                                  ~{a.ddos.peakGbps} Gbps
                                </span>
                              </>
                            )}
                            {typeof a.ddos.packetsPerSec === 'number' && (
                              <>
                                <span className={ui.muted}>·</span>
                                <span className="font-mono tabular-nums text-slark-primary">
                                  {formatPps(a.ddos.packetsPerSec)}
                                </span>
                              </>
                            )}
                          </div>
                          {Array.isArray(a.ddos.dependencies) && a.ddos.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className={`text-[8px] uppercase tracking-wider ${ui.muted}`}>
                                {t('feed.chain')}
                              </span>
                              {a.ddos.dependencies.map((dep, i) => (
                                <span
                                  key={`${a.id}-d${i}`}
                                  className={`rounded border px-1.5 py-0.5 font-mono text-[8px] ${ui.depChip}`}
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className={`text-[9px] ${ui.ddosMuted}`}>{t('feed.ddosNoMeta')}</p>
                      )}
                    </div>
                  )}

                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
