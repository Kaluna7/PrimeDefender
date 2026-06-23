import { useMemo } from 'react';
import {
  CATEGORY_STYLE,
  DDOS_VECTOR,
  THREAT_CATEGORY,
  SEVERITY_STYLE,
} from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { summarizeAttackLog } from '../../utils/attackLogFormatter.js';

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
  /** When set, overrides default empty-state copy (e.g. archive / history list). */
  emptyHint = null,
}) {
  const { t, locale } = useI18n();

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

  return (
    <section
      className={`flex h-full min-h-0 flex-col border-l border-slark-border bg-slark-bg ${className}`}
      aria-label="Live attack feed"
    >
      <div className="border-b border-slark-border px-3 py-2.5">
        <h2 className="font-cyber text-[11px] font-bold uppercase tracking-[0.28em] text-slark-text">
          {t('feed.title')}
        </h2>
        <p className="mt-0.5 text-[10px] uppercase tracking-wider text-slark-muted">{t('feed.subtitle')}</p>
      </div>

      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        {rows.length === 0 ? (
          <p className="px-2 py-6 text-center text-[11px] leading-relaxed text-slark-muted">
            {emptyMessage}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((a) => {
              const cat = CATEGORY_STYLE[a.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
              const sev = SEVERITY_STYLE[a.severity] || SEVERITY_STYLE.medium;
              const logSummary = summarizeAttackLog(a);

              const selected = selectedId === a.id;
              return (
                <li
                  key={a.id}
                  className={`rounded-md border bg-slark-card px-2.5 py-2 shadow-sm ${
                    selected
                      ? 'border-slark-primary ring-1 ring-slark-primary/30'
                      : 'border-slark-border'
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

                  <div className="mt-2 rounded-md border border-rose-200/90 bg-gradient-to-r from-rose-50/95 to-slark-bg px-2 py-1.5">
                    <p className="text-[8px] font-bold uppercase tracking-wider text-rose-800">
                      {t('feed.attackerLabel')}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] font-semibold text-slark-text">
                      {a.attackerIp?.trim() ? a.attackerIp : t('feed.unknownIp')}
                    </p>
                    <p className="mt-0.5 text-[9px] text-slark-muted">
                      {labelOrDash(a.sourceLabel)}
                    </p>
                  </div>

                  {(a.siteId || a.tenantId) && (
                    <p className="mt-1.5 text-[9px] text-slark-muted">
                      {t('feed.customerSite')}{' '}
                      <span className="font-mono text-slark-muted/80">{a.siteId || a.tenantId}</span>
                    </p>
                  )}

                  {(a.blocked || a.path) && (
                    <p className="mt-1.5 rounded border border-emerald-300/80 bg-emerald-50/95 px-1.5 py-1 font-mono text-[9px] text-emerald-900">
                      <span className="text-emerald-700">{t('feed.blocked')}</span>
                      {a.method && a.path && (
                        <>
                          {' '}
                          <span className="text-slark-muted">{a.method}</span>{' '}
                          <span className="text-slark-dark">{a.path}</span>
                        </>
                      )}
                      {a.path && !a.method && (
                        <span className="text-slark-dark"> {a.path}</span>
                      )}
                    </p>
                  )}

                  <p className="mt-1.5 font-mono text-[10px] leading-snug text-slark-text">
                    <span className="text-slark-dark">{labelOrDash(a.sourceLabel)}</span>
                    <span className="mx-1 text-slark-muted">→</span>
                    <span className="text-amber-800">{labelOrDash(a.targetLabel)}</span>
                  </p>

                  <div className="mt-2 rounded-md border border-slark-border bg-slark-bg p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono text-[8px] font-bold uppercase tracking-wider text-slark-muted">
                        {t('feed.logTitle')}
                      </p>
                      <span className="rounded border border-slark-border bg-slark-card px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-slark-muted">
                        {t('feed.openDetail')}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px]">
                      <div className="rounded border border-slark-border bg-slark-card px-2 py-1">
                        <p className="text-[8px] uppercase tracking-wide text-slark-muted">ID</p>
                        <p className="mt-0.5 truncate font-mono text-slark-text">{logSummary.requestId}</p>
                      </div>
                      <div className="rounded border border-slark-border bg-slark-card px-2 py-1">
                        <p className="text-[8px] uppercase tracking-wide text-slark-muted">Detect</p>
                        <p className="mt-0.5 truncate font-mono text-slark-text">{logSummary.detectType}</p>
                      </div>
                      <div className="col-span-2 rounded border border-slark-border bg-slark-card px-2 py-1">
                        <p className="text-[8px] uppercase tracking-wide text-slark-muted">Location</p>
                        <p className="mt-0.5 truncate font-mono text-slark-text">{logSummary.geoLocation}</p>
                      </div>
                      <div className="rounded border border-slark-border bg-slark-card px-2 py-1">
                        <p className="text-[8px] uppercase tracking-wide text-slark-muted">Response</p>
                        <p className="mt-0.5 font-mono text-slark-text">{logSummary.responseStatus}</p>
                      </div>
                      <div className="rounded border border-slark-border bg-slark-card px-2 py-1">
                        <p className="text-[8px] uppercase tracking-wide text-slark-muted">Action</p>
                        <p className="mt-0.5 truncate font-mono text-slark-text">{logSummary.mitigation}</p>
                      </div>
                      <div className="col-span-2 rounded border border-slark-border bg-slark-card px-2 py-1">
                        <p className="text-[8px] uppercase tracking-wide text-slark-muted">Request</p>
                        <p className="mt-0.5 truncate font-mono text-slark-text">{logSummary.request}</p>
                      </div>
                    </div>
                  </div>

                  {a.category === THREAT_CATEGORY.DDOS && (
                    <div className="mt-2 space-y-1.5 border-t border-rose-200/90 pt-2">
                      {a.ddos ? (
                        <>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-rose-800">
                            <span className="uppercase tracking-wider text-rose-600">DDoS</span>
                            {a.ddos.vector && (
                              <>
                                <span className="rounded bg-rose-100 px-1 py-0.5 font-mono text-rose-900">
                                  {VECTOR_LABEL[a.ddos.vector] ?? a.ddos.vector}
                                </span>
                              </>
                            )}
                            {typeof a.ddos.peakGbps === 'number' && (
                              <>
                                <span className="text-slark-muted">·</span>
                                <span className="font-mono tabular-nums text-amber-800">
                                  ~{a.ddos.peakGbps} Gbps
                                </span>
                              </>
                            )}
                            {typeof a.ddos.packetsPerSec === 'number' && (
                              <>
                                <span className="text-slark-muted">·</span>
                                <span className="font-mono tabular-nums text-slark-primary">
                                  {formatPps(a.ddos.packetsPerSec)}
                                </span>
                              </>
                            )}
                          </div>
                          {Array.isArray(a.ddos.dependencies) && a.ddos.dependencies.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              <span className="text-[8px] uppercase tracking-wider text-slark-muted">
                                {t('feed.chain')}
                              </span>
                              {a.ddos.dependencies.map((dep, i) => (
                                <span
                                  key={`${a.id}-d${i}`}
                                  className="rounded border border-slark-border bg-slark-card px-1.5 py-0.5 font-mono text-[8px] text-slark-text"
                                >
                                  {dep}
                                </span>
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-[9px] text-rose-700">{t('feed.ddosNoMeta')}</p>
                      )}
                    </div>
                  )}

                  <p className="mt-1.5 text-right font-mono text-[9px] text-slark-muted">
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
