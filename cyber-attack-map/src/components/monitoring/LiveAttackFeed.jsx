import { useMemo } from 'react';
import {
  CATEGORY_STYLE,
  DDOS_VECTOR,
  THREAT_CATEGORY,
  SEVERITY_STYLE,
} from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';

const VECTOR_LABEL = {
  [DDOS_VECTOR.VOLUMETRIC]: 'Volumetric',
  [DDOS_VECTOR.PROTOCOL]: 'Protocol',
  [DDOS_VECTOR.APPLICATION]: 'Application',
};

function formatTime(ts, locale) {
  return new Date(ts).toLocaleTimeString(locale === 'id' ? 'id-ID' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

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
}) {
  const { t, locale } = useI18n();

  const rows = useMemo(() => {
    return [...attacks].reverse().slice(0, maxRows);
  }, [attacks, maxRows]);

  const emptyMessage = (() => {
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

  return (
    <section
      className={`flex h-full min-h-0 flex-col border-l border-slate-200/90 bg-white/90 backdrop-blur-md dark:border-cyan-900/35 dark:bg-black/55 ${className}`}
      aria-label="Live attack feed"
    >
      <div className="border-b border-slate-200/90 px-3 py-2.5 dark:border-cyan-900/40">
        <h2 className="font-cyber text-[11px] font-bold uppercase tracking-[0.28em] text-slate-800 dark:text-cyan-200/95">
          {t('feed.title')}
        </h2>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slate-500 dark:text-cyan-600/90">{t('feed.subtitle')}</p>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-slate-500 dark:text-cyan-700/90">
            {emptyMessage}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((a) => {
              const cat = CATEGORY_STYLE[a.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
              const sev = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium;

              const selected = selectedId === a.id;
              return (
                <li
                  key={a.id}
                  className={`rounded-md border bg-gradient-to-br from-white to-slate-50 px-2.5 py-2 shadow-sm dark:from-slate-950/90 dark:to-black/80 dark:shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] ${
                    selected
                      ? 'border-cyan-500 ring-1 ring-cyan-400/50 dark:border-cyan-400/70 dark:ring-cyan-500/40'
                      : 'border-slate-200/95 dark:border-cyan-900/45'
                  } ${onSelectAttack ? 'cursor-pointer transition hover:border-cyan-500/70 dark:hover:border-cyan-600/55' : ''}`}
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
                    <span
                      className={`inline-flex shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide ${cat.badgeClass}`}
                    >
                      {cat.shortLabel}
                    </span>
                    <span
                      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase ${sev.className}`}
                    >
                      {sev.label}
                    </span>
                  </div>

                  <div className="mt-2 rounded-md border border-rose-200/90 bg-gradient-to-r from-rose-50/95 to-white px-2 py-1.5 dark:border-rose-900/45 dark:from-rose-950/35 dark:to-slate-950/40">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-400/95">
                      {t('feed.attackerLabel')}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] font-semibold text-slate-900 dark:text-rose-100">
                      {a.attackerIp?.trim() ? a.attackerIp : t('feed.unknownIp')}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slate-600 dark:text-slate-400">
                      {labelOrDash(a.sourceLabel)}
                    </p>
                  </div>

                  {(a.siteId || a.tenantId) && (
                    <p className="mt-1.5 text-[9px] text-slate-500">
                      {t('feed.customerSite')}{' '}
                      <span className="font-mono text-slate-400">{a.siteId || a.tenantId}</span>
                    </p>
                  )}

                  {(a.blocked || a.path) && (
                    <p className="mt-1.5 rounded border border-emerald-300/80 bg-emerald-50/95 px-1.5 py-1 font-mono text-[9px] text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/30 dark:text-emerald-200/95">
                      <span className="text-emerald-700 dark:text-emerald-500/90">{t('feed.blocked')}</span>
                      {a.method && a.path && (
                        <>
                          {' '}
                          <span className="text-slate-500">{a.method}</span>{' '}
                          <span className="text-cyan-800 dark:text-cyan-200/90">{a.path}</span>
                        </>
                      )}
                      {a.path && !a.method && (
                        <span className="text-cyan-800 dark:text-cyan-200/90"> {a.path}</span>
                      )}
                    </p>
                  )}

                  <p className="mt-1.5 font-mono text-[10px] leading-snug text-slate-800 dark:text-cyan-100/95">
                    <span className="text-cyan-700 dark:text-cyan-500/90">{labelOrDash(a.sourceLabel)}</span>
                    <span className="mx-1 text-slate-400 dark:text-cyan-800">→</span>
                    <span className="text-amber-800 dark:text-amber-100/90">{labelOrDash(a.targetLabel)}</span>
                  </p>

                  {a.category === THREAT_CATEGORY.DDOS && (
                    <div className="mt-2 space-y-1.5 border-t border-rose-200/90 pt-2 dark:border-rose-900/25">
                      {a.ddos ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-rose-800 dark:text-rose-200/85">
                            <span className="uppercase tracking-wider text-rose-600 dark:text-rose-400/80">DDoS</span>
                            {a.ddos.vector && (
                              <>
                                <span className="rounded bg-rose-100 px-1 py-0.5 font-mono text-rose-900 dark:bg-rose-950/60 dark:text-rose-100/90">
                                  {VECTOR_LABEL[a.ddos.vector] ?? a.ddos.vector}
                                </span>
                              </>
                            )}
                            {typeof a.ddos.peakGbps === 'number' && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="font-mono tabular-nums text-amber-800 dark:text-amber-200/90">
                                  ~{a.ddos.peakGbps} Gbps
                                </span>
                              </>
                            )}
                            {typeof a.ddos.packetsPerSec === 'number' && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="font-mono tabular-nums text-cyan-800 dark:text-cyan-300/80">
                                  {formatPps(a.ddos.packetsPerSec)}
                                </span>
                              </>
                            )}
                          </div>
                          {Array.isArray(a.ddos.dependencies) && a.ddos.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[8px] uppercase tracking-wider text-slate-500">
                                {t('feed.chain')}
                              </span>
                              {a.ddos.dependencies.map((dep, i) => (
                                <span
                                  key={`${a.id}-d${i}`}
                                  className="rounded border border-slate-300/90 bg-slate-100/90 px-1.5 py-0.5 font-mono text-[8px] text-slate-700 dark:border-slate-700/60 dark:bg-slate-900/80 dark:text-slate-300/95"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[9px] text-rose-700 dark:text-rose-300/75">{t('feed.ddosNoMeta')}</p>
                      )}
                    </div>
                  )}

                  <p className="mt-1.5 text-right font-mono text-[9px] text-slate-500 dark:text-cyan-700/90">
                    {formatTime(a.createdAt, locale)}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
