import { useMemo } from 'react';
import {
  CATEGORY_STYLE,
  DDOS_VECTOR,
  THREAT_CATEGORY,
  SEVERITY_STYLE,
} from '../constants/threatCategories.js';
import { useI18n } from '../i18n/I18nContext.jsx';

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
      className="flex h-full min-h-0 flex-col border-l border-cyan-900/35 bg-black/55 backdrop-blur-md"
      aria-label="Live attack feed"
    >
      <div className="border-b border-cyan-900/40 px-3 py-2.5">
        <h2 className="font-cyber text-[11px] font-bold uppercase tracking-[0.28em] text-cyan-200/95">
          {t('feed.title')}
        </h2>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-cyan-600/90">{t('feed.subtitle')}</p>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-cyan-700/90">
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
                  className={`rounded-md border bg-gradient-to-br from-slate-950/90 to-black/80 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(34,211,238,0.06)] ${
                    selected
                      ? 'border-cyan-400/70 ring-1 ring-cyan-500/40'
                      : 'border-cyan-900/45'
                  } ${onSelectAttack ? 'cursor-pointer transition hover:border-cyan-600/55' : ''}`}
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

                  {(a.siteId || a.tenantId) && (
                    <p className="mt-1.5 text-[9px] text-slate-500">
                      {t('feed.customerSite')}{' '}
                      <span className="font-mono text-slate-400">{a.siteId || a.tenantId}</span>
                    </p>
                  )}

                  {(a.blocked || a.path) && (
                    <p className="mt-1.5 rounded border border-emerald-800/40 bg-emerald-950/30 px-1.5 py-1 font-mono text-[9px] text-emerald-200/95">
                      <span className="text-emerald-500/90">{t('feed.blocked')}</span>
                      {a.method && a.path && (
                        <>
                          {' '}
                          <span className="text-slate-500">{a.method}</span>{' '}
                          <span className="text-cyan-200/90">{a.path}</span>
                        </>
                      )}
                      {a.path && !a.method && <span className="text-cyan-200/90"> {a.path}</span>}
                    </p>
                  )}

                  {a.attackerIp && (
                    <p className="mt-1 font-mono text-[9px] text-emerald-400/90">
                      inet {a.attackerIp}
                    </p>
                  )}

                  <p className="mt-1.5 font-mono text-[10px] leading-snug text-cyan-100/95">
                    <span className="text-cyan-500/90">{labelOrDash(a.sourceLabel)}</span>
                    <span className="mx-1 text-cyan-800">→</span>
                    <span className="text-amber-100/90">{labelOrDash(a.targetLabel)}</span>
                  </p>

                  {a.category === THREAT_CATEGORY.DDOS && (
                    <div className="mt-2 space-y-1.5 border-t border-rose-900/25 pt-2">
                      {a.ddos ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-rose-200/85">
                            <span className="uppercase tracking-wider text-rose-400/80">DDoS</span>
                            {a.ddos.vector && (
                              <>
                                <span className="rounded bg-rose-950/60 px-1 py-0.5 font-mono text-rose-100/90">
                                  {VECTOR_LABEL[a.ddos.vector] ?? a.ddos.vector}
                                </span>
                              </>
                            )}
                            {typeof a.ddos.peakGbps === 'number' && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="font-mono tabular-nums text-amber-200/90">
                                  ~{a.ddos.peakGbps} Gbps
                                </span>
                              </>
                            )}
                            {typeof a.ddos.packetsPerSec === 'number' && (
                              <>
                                <span className="text-slate-500">·</span>
                                <span className="font-mono tabular-nums text-cyan-300/80">
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
                                  className="rounded border border-slate-700/60 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[8px] text-slate-300/95"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[9px] text-rose-300/75">{t('feed.ddosNoMeta')}</p>
                      )}
                    </div>
                  )}

                  <p className="mt-1.5 text-right font-mono text-[9px] text-cyan-700/90">
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
