import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { CountryFlag } from '../../../components/ui/CountryFlag.jsx';
import { GoogleMapsLink } from '../../../components/ui/GoogleMapsLink.jsx';
import { ATTACK_TYPE_LINE_HEX } from '../../../constants/attackTypeColors.js';
import { threatCategoryLabelKey } from '../../../constants/threatCategories.js';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { describeAttackActivity } from '../../../utils/describeAttackActivity.js';
import { deriveProtectionBucket } from '../../../utils/deriveProtectionBucket.js';
import { formatIncidentWhen } from '../../../utils/formatIncidentTime.js';
import { summarizeAttackLog } from '../../../utils/attackLogFormatter.js';
import {
  HISTORY_FILTER_IDS,
  SEVERITY_ACCENT,
  SEVERITY_BADGE,
  SEVERITY_BORDER,
  attackerWindow,
  computeHistoryStats,
  countByHistoryFilter,
  historyFilterMatch,
  recentAttackRows,
  severityFilterMatch,
  topAttackTypesForIp,
  isIncidentBlocked,
} from './historyFeedUtils.js';

const FILTER_PILL_STYLE = {
  all: 'border-blue-500/40 bg-blue-600/15 text-blue-200',
  intrusion: 'border-rose-500/40 bg-rose-600/15 text-rose-200',
  malicious: 'border-amber-500/40 bg-amber-600/15 text-amber-200',
  suspicious: 'border-orange-500/40 bg-orange-600/15 text-orange-200',
  bot: 'border-violet-500/40 bg-violet-600/15 text-violet-200',
  info: 'border-sky-500/40 bg-sky-600/15 text-sky-200',
};

const FILTER_ACTIVE_RING = {
  all: 'ring-1 ring-blue-400/60',
  intrusion: 'ring-1 ring-rose-400/60',
  malicious: 'ring-1 ring-amber-400/60',
  suspicious: 'ring-1 ring-orange-400/60',
  bot: 'ring-1 ring-violet-400/60',
  info: 'ring-1 ring-sky-400/60',
};

function dash(s) {
  return s && String(s).trim() ? s : '—';
}

function shortId(id) {
  if (!id) return '—';
  const s = String(id);
  return s.length > 10 ? `${s.slice(0, 6)}…${s.slice(-4)}` : s;
}

function detectionLabel(attack, t) {
  const bucket = deriveProtectionBucket(attack);
  if (bucket) return t(`protect.${bucket}`);
  if (attack.detection) return attack.detection;
  return t(threatCategoryLabelKey(attack.category));
}

function severityDots(severity) {
  const level = { low: 1, medium: 2, high: 3, critical: 4 }[severity] || 2;
  const color = SEVERITY_ACCENT[severity] || SEVERITY_ACCENT.medium;
  return (
    <div className="flex items-center gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: i <= level ? color : '#334155' }}
        />
      ))}
    </div>
  );
}

function MiniSparkline({ values, color }) {
  const gradId = useId();
  const width = 80;
  const height = 28;
  const pad = 2;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const innerH = height - pad * 2;

  const points = values.map((v, i) => {
    const x = values.length <= 1 ? width / 2 : pad + (i / (values.length - 1)) * (width - pad * 2);
    const y = pad + innerH - ((v - min) / range) * innerH;
    return [x, y];
  });

  const polyline = points.map(([x, y]) => `${x},${y}`).join(' ');
  const area = `${pad},${height - pad} ${polyline} ${width - pad},${height - pad}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="shrink-0 overflow-visible"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${gradId})`} />
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
    </svg>
  );
}

function buildSparkline(attacks, pick) {
  const chunk = 10;
  const sorted = [...attacks].sort((a, b) => a.createdAt - b.createdAt);
  const buckets = [];
  for (let i = 0; i < sorted.length; i += chunk) {
    const slice = sorted.slice(i, i + chunk);
    buckets.push(slice.filter(pick).length);
  }
  while (buckets.length < 8) buckets.unshift(0);
  return buckets.slice(-8);
}

function fmtCoord(from) {
  if (!from || typeof from.lat !== 'number' || typeof from.lon !== 'number') return '—';
  const ns = from.lat >= 0 ? 'N' : 'S';
  const ew = from.lon >= 0 ? 'E' : 'W';
  return `${Math.abs(from.lat).toFixed(4)}°${ns}  ${Math.abs(from.lon).toFixed(4)}°${ew}`;
}

function HistoryAttackCard({ attack, index, selected, onPreview, t, locale }) {
  const sev = attack.severity || 'medium';
  const log = summarizeAttackLog(attack);
  const zebra = index % 2 === 0 ? 'bg-[#1a2332]' : 'bg-[#2c3a50]';
  const borderClass = SEVERITY_BORDER[sev] || SEVERITY_BORDER.medium;
  const blocked = attack.blocked;

  return (
    <article
      className={`overflow-hidden rounded-lg border ${borderClass} ${zebra} ${
        selected ? 'ring-1 ring-slark-primary/50' : ''
      } cursor-pointer transition hover:brightness-110`}
      onClick={() => onPreview?.(attack)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onPreview?.(attack);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-600/35 px-3 py-2">
        <span
          className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wider ${SEVERITY_BADGE[sev]}`}
        >
          {t(`history.severity.${sev}`)}
        </span>
        <span className="font-mono text-[11px] font-semibold text-slate-100">{dash(attack.attackerIp)}</span>
        <span className="font-mono text-[9px] text-slate-500">{shortId(attack.incidentId || attack.id)}</span>
        <span className="ml-auto font-mono text-[10px] tabular-nums text-slate-400">
          {formatIncidentWhen(attack.createdAt, locale, 'time')}
        </span>
      </div>

      <div className="grid gap-3 px-3 py-2.5 sm:grid-cols-3">
        <div className="min-w-0 space-y-1">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{t('history.colSource')}</p>
          <div className="flex items-start gap-1.5">
            <CountryFlag attack={attack} className="mt-0.5" />
            <div className="min-w-0">
              <p className="truncate text-[11px] text-slate-200">{dash(attack.geoMeta?.location || attack.sourceLabel)}</p>
              <p className="font-mono text-[9px] text-slate-500">{dash(attack.targetService || attack.siteId)}</p>
              <p className="font-mono text-[10px] text-slate-300">
                {dash(attack.method)} {dash(attack.path)}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-0 space-y-1">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{t('history.colDetected')}</p>
          <p className="text-sm font-semibold text-slate-100">{detectionLabel(attack, t)}</p>
          <span className="inline-block rounded border border-slate-600/50 bg-white/[0.04] px-1.5 py-0.5 text-[8px] uppercase tracking-wider text-slate-400">
            {t(threatCategoryLabelKey(attack.category))}
          </span>
          <p className="line-clamp-2 text-[10px] leading-relaxed text-slate-400">
            {describeAttackActivity(attack, locale)}
          </p>
        </div>

        <div className="min-w-0 space-y-1.5">
          <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{t('history.colAction')}</p>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('history.actionTaken')}</p>
            <span
              className={`mt-0.5 inline-block rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${
                blocked
                  ? 'border-emerald-500/40 bg-emerald-600/20 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-600/20 text-amber-200'
              }`}
            >
              {blocked ? t('feed.blocked') : dash(attack.mitigation || attack.action || '—')}
            </span>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('history.response')}</p>
            <p className="font-mono text-[11px] text-slate-200">{log.responseStatus}</p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('history.severityLabel')}</p>
            {severityDots(sev)}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-600/35 px-3 py-2">
        <p className="truncate font-mono text-[9px] text-slate-500">
          <span className="text-slate-600">{t('history.userAgent')}: </span>
          {dash(attack.userAgent)}
        </p>
      </div>
    </article>
  );
}

function HistorySidebar({
  attacks,
  profileAttack,
  selectedId,
  onSelectAttack,
  onViewDetails,
  profileSectionRef,
  t,
  locale,
}) {
  const ip = profileAttack?.attackerIp?.trim() || null;
  const window = attackerWindow(attacks, ip);
  const topTypes = topAttackTypesForIp(attacks, ip);
  const recent = recentAttackRows(attacks);

  return (
    <aside className="flex w-full shrink-0 flex-col gap-3 lg:h-full lg:min-h-0 lg:max-w-sm lg:self-stretch lg:overflow-hidden">
      <section
        ref={profileSectionRef}
        id="history-attacker-profile"
        className="flex scroll-mt-20 flex-col overflow-hidden rounded-xl border border-slate-600/45 bg-slark-dark lg:min-h-0 lg:flex-1 lg:scroll-mt-0"
      >
        <div className="shrink-0 border-b border-slate-600/45 px-3 py-2.5">
          <h3 className="font-cyber text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">
            {t('history.attackerProfile')}
          </h3>
        </div>
        <div className="thin-scrollbar-dark px-3 py-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {!profileAttack ? (
            <p className="py-6 text-center text-[10px] leading-relaxed text-slate-500">
              {t('history.profileEmpty')}
            </p>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-2">
                  <CountryFlag attack={profileAttack} size="md" />
                  <p className="font-mono text-lg font-bold text-slark-primary">
                    {dash(profileAttack.attackerIp)}
                  </p>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-300">
                  {dash(profileAttack.geoMeta?.location || profileAttack.sourceLabel)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-600/40 bg-gradient-to-br from-slate-800/80 to-slate-900/90 p-3">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{t('detail.coordinates')}</p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="min-w-0 flex-1 font-mono text-[10px] text-slate-300">{fmtCoord(profileAttack.from)}</p>
                  <GoogleMapsLink point={profileAttack.from} label={t('history.openInGoogleMaps')} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded border border-slate-600/40 bg-white/[0.03] px-2 py-2">
                  <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('history.attackerCount')}</p>
                  <p className="font-mono text-lg font-bold text-slate-100">{window.count}</p>
                </div>
                <div className="col-span-2 rounded border border-slate-600/40 bg-white/[0.03] px-2 py-2 text-left">
                  <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('detail.firstAttack')}</p>
                  <p className="font-mono text-[10px] text-slate-300">
                    {window.firstAt ? formatIncidentWhen(window.firstAt, locale, 'short') : '—'}
                  </p>
                  <p className="mt-1 text-[8px] uppercase tracking-wider text-slate-500">{t('detail.lastAttack')}</p>
                  <p className="font-mono text-[10px] text-slate-300">
                    {window.lastAt ? formatIncidentWhen(window.lastAt, locale, 'short') : '—'}
                  </p>
                </div>
              </div>
              {topTypes.length > 0 ? (
                <div>
                  <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                    {t('history.topAttackTypes')}
                  </p>
                  <ul className="space-y-2">
                    {topTypes.map(({ key, count, pct }) => {
                      const color = ATTACK_TYPE_LINE_HEX[key] || '#64748b';
                      return (
                        <li key={key}>
                          <div className="mb-0.5 flex justify-between gap-2 text-[10px]">
                            <span className="truncate text-slate-300">{t(`protect.${key}`)}</span>
                            <span className="shrink-0 font-mono text-slate-500">
                              {count} · {pct}%
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/60">
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                className="w-full rounded border border-slark-primary/40 bg-slark-primary/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slark-primary transition hover:bg-slark-primary/20"
                onClick={() => onViewDetails?.(profileAttack)}
              >
                {t('history.viewDetails')}
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="flex min-h-[6.5rem] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-600/45 bg-slark-dark lg:max-h-[min(11.5rem,26vh)]">
        <div className="shrink-0 border-b border-slate-600/45 px-3 py-2">
          <h3 className="font-cyber text-[9px] font-bold uppercase tracking-[0.2em] text-slate-100">
            {t('history.recentAttacks')}
          </h3>
        </div>
        <ul className="thin-scrollbar-dark px-1.5 py-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
          {recent.length === 0 ? (
            <li className="py-3 text-center text-[9px] text-slate-500">{t('monitoring.historyEmpty')}</li>
          ) : (
            recent.map(({ incident, latestAt }) => {
              const bucket = deriveProtectionBucket(incident);
              const dotColor = bucket ? ATTACK_TYPE_LINE_HEX[bucket] : SEVERITY_ACCENT[incident.severity || 'medium'];
              const sev = incident.severity || 'medium';
              return (
                <li key={incident.id}>
                  <button
                    type="button"
                    className={`flex w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-left transition hover:bg-white/[0.05] ${
                      selectedId === incident.id ? 'bg-slark-primary/10 ring-1 ring-slark-primary/30' : ''
                    }`}
                    onClick={() => onSelectAttack?.(incident)}
                  >
                    <CountryFlag attack={incident} className="shrink-0 scale-90" />
                    <span
                      className="protect-threat-dot-pulse h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: dotColor }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-slate-300">
                      {dash(incident.attackerIp)}
                    </span>
                    <span className="shrink-0 font-mono text-[8px] tabular-nums text-slate-500">
                      {formatIncidentWhen(latestAt, locale, 'time')}
                    </span>
                    <span
                      className={`shrink-0 rounded border px-1 py-px font-mono text-[6px] font-bold uppercase ${SEVERITY_BADGE[sev]}`}
                    >
                      {t(`history.severity.${sev}`)}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </aside>
  );
}

/**
 * @param {{
 *   attacks: object[];
 *   error?: string | null;
 *   selectedId?: string | null;
 *   onSelectAttack?: (attack: object) => void;
 *   onViewDetails?: (attack: object) => void;
 *   shellClass?: string;
 * }} props
 */
export function HistoryTabView({ attacks, error, selectedId, onSelectAttack, onViewDetails, shellClass = '' }) {
  const { t, locale } = useI18n();
  const profileSectionRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [now, setNow] = useState(() => Date.now());
  const [activeFilter, setActiveFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(24);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const filterCounts = useMemo(() => countByHistoryFilter(attacks), [attacks]);
  const filtered = useMemo(
    () =>
      [...attacks]
        .filter((a) => historyFilterMatch(a, activeFilter) && severityFilterMatch(a, severityFilter))
        .sort((a, b) => b.createdAt - a.createdAt),
    [attacks, activeFilter, severityFilter],
  );
  const visible = filtered.slice(0, visibleCount);
  const stats = useMemo(() => computeHistoryStats(attacks), [attacks]);

  const profileAttack = useMemo(
    () => (selectedId ? attacks.find((a) => a.id === selectedId) ?? null : null),
    [attacks, selectedId],
  );

  const scrollToAttackerProfile = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 1024px)').matches) return;
    requestAnimationFrame(() => {
      profileSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  const handleSelectAttack = useCallback(
    (attack) => {
      onSelectAttack?.(attack);
      scrollToAttackerProfile();
    },
    [onSelectAttack, scrollToAttackerProfile],
  );

  const sparkTotal = buildSparkline(attacks, () => true);
  const sparkBlocked = buildSparkline(attacks, isIncidentBlocked);
  const sparkNonBlocked = buildSparkline(attacks, (a) => !isIncidentBlocked(a));
  const sparkIps = useMemo(() => {
    const sorted = [...attacks].sort((a, b) => a.createdAt - b.createdAt);
    const chunk = 10;
    const buckets = [];
    for (let i = 0; i < sorted.length; i += chunk) {
      const slice = sorted.slice(i, i + chunk);
      buckets.push(new Set(slice.map((a) => a.attackerIp?.trim()).filter(Boolean)).size);
    }
    while (buckets.length < 8) buckets.unshift(0);
    return buckets.slice(-8);
  }, [attacks]);

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 px-3 py-3 sm:px-4 lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden lg:px-5 lg:py-4">
      <div className={`flex min-w-0 flex-1 flex-col gap-2 ${shellClass}`}>
        {error ? <p className="px-0.5 text-[11px] text-slark-primary">{error}</p> : null}

        <div className="flex flex-col overflow-hidden rounded-xl border border-slate-600/45 bg-slark-dark lg:min-h-0 lg:flex-1">
          <header className="shrink-0 border-b border-slate-600/45 px-3 py-3 sm:px-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-cyber text-base font-bold uppercase tracking-[0.12em] text-slate-100 sm:text-lg">
                  {t('history.title')}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <time className="font-mono text-[11px] tabular-nums text-slate-400" dateTime={new Date(now).toISOString()}>
                  {formatIncidentWhen(now, locale, 'short')}
                </time>
                <div className="relative">
                  <select
                    value={severityFilter}
                    onChange={(e) => setSeverityFilter(e.target.value)}
                    className="appearance-none rounded border border-slate-600/50 bg-[#1a2332] py-1 pl-2 pr-7 font-mono text-[10px] text-slate-300 focus:border-slark-primary/50 focus:outline-none"
                    aria-label={t('history.allSeverities')}
                  >
                    <option value="all">{t('history.allSeverities')}</option>
                    <option value="critical">{t('history.severity.critical')}</option>
                    <option value="high">{t('history.severity.high')}</option>
                    <option value="medium">{t('history.severity.medium')}</option>
                    <option value="low">{t('history.severity.low')}</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {HISTORY_FILTER_IDS.map((id) => {
                const active = activeFilter === id;
                const count = filterCounts[id];
                return (
                  <button
                    key={id}
                    type="button"
                    className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider transition ${
                      FILTER_PILL_STYLE[id]
                    } ${active ? FILTER_ACTIVE_RING[id] : 'opacity-80 hover:opacity-100'}`}
                    onClick={() => {
                      setActiveFilter(id);
                      setVisibleCount(24);
                    }}
                  >
                    {t(`history.filters.${id}`)}
                    {count > 0 ? ` (${count})` : ''}
                  </button>
                );
              })}
            </div>
          </header>

          <div className="thin-scrollbar-dark px-2 py-2 sm:px-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
            {visible.length === 0 ? (
              <p className="px-2 py-10 text-center text-[11px] text-slate-500">{t('monitoring.historyEmpty')}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {visible.map((attack, index) => (
                  <li key={attack.id}>
                    <HistoryAttackCard
                      attack={attack}
                      index={index}
                      selected={selectedId === attack.id}
                      onPreview={handleSelectAttack}
                      t={t}
                      locale={locale}
                    />
                  </li>
                ))}
              </ul>
            )}
            {filtered.length > visibleCount ? (
              <div className="mt-3 flex justify-center pb-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-slate-600/50 bg-white/[0.04] px-4 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 hover:bg-white/[0.08]"
                  onClick={() => setVisibleCount((n) => n + 24)}
                >
                  {t('history.loadMore')}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </div>

          <footer className="shrink-0 border-t border-slate-600/45 bg-[#0f172a]/80 px-2 py-2 sm:px-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {[
                {
                  label: t('history.statsTotal'),
                  value: stats.total.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US'),
                  sub: null,
                  spark: sparkTotal,
                  color: '#ef4444',
                },
                {
                  label: t('history.statsBlocked'),
                  value: stats.blocked.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US'),
                  sub: `${stats.blockedPct}%`,
                  spark: sparkBlocked,
                  color: '#22c55e',
                },
                {
                  label: t('history.statsNonBlocked'),
                  value: stats.nonBlocked.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US'),
                  sub: `${stats.nonBlockedPct}%`,
                  spark: sparkNonBlocked,
                  color: '#f97316',
                },
                {
                  label: t('history.statsUniqueIps'),
                  value: stats.uniqueIps.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US'),
                  sub: null,
                  spark: sparkIps,
                  color: '#3b82f6',
                },
              ].map(({ label, value, sub, spark, color }) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-600/40 bg-[#1a2332]/80 px-3 py-2"
                >
                  <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                  <div className="mt-0.5 flex items-end justify-between gap-2">
                    <div>
                      <p className="font-mono text-lg font-bold tabular-nums text-slate-100">{value}</p>
                      {sub ? <p className="font-mono text-[9px] text-slate-500">{sub}</p> : null}
                    </div>
                    <MiniSparkline values={spark} color={color} />
                  </div>
                </div>
              ))}
            </div>
          </footer>
        </div>
      </div>

      <HistorySidebar
        attacks={attacks}
        profileAttack={profileAttack}
        selectedId={selectedId}
        onSelectAttack={handleSelectAttack}
        onViewDetails={onViewDetails}
        profileSectionRef={profileSectionRef}
        t={t}
        locale={locale}
      />
    </div>
  );
}
