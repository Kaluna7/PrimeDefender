import { useEffect, useMemo, useState } from 'react';
import { CountryFlag } from '../../../components/ui/CountryFlag.jsx';
import { GoogleMapsLink } from '../../../components/ui/GoogleMapsLink.jsx';
import { ATTACK_TYPE_LINE_HEX } from '../../../constants/attackTypeColors.js';
import { threatCategoryLabelKey } from '../../../constants/threatCategories.js';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { deriveProtectionBucket } from '../../../utils/deriveProtectionBucket.js';
import { formatIncidentWhen } from '../../../utils/formatIncidentTime.js';
import { SEVERITY_BADGE } from '../history/historyFeedUtils.js';
import {
  computeAttackerTodayStats,
  groupAttackerIpsToday,
  incidentsForIpToday,
  topAttackTypesForIpToday,
} from './attackerTodayUtils.js';

function dash(s) {
  return s && String(s).trim() ? s : '—';
}

function fmtCoord(from) {
  if (!from || typeof from.lat !== 'number' || typeof from.lon !== 'number') return '—';
  const ns = from.lat >= 0 ? 'N' : 'S';
  const ew = from.lon >= 0 ? 'E' : 'W';
  return `${Math.abs(from.lat).toFixed(4)}°${ns}  ${Math.abs(from.lon).toFixed(4)}°${ew}`;
}

function AttackerIpRow({ row, selected, onSelect, t, locale }) {
  const { ip, count, blockedCount, latestAt, attack } = row;
  const sev = attack.severity || 'medium';

  return (
    <button
      type="button"
      onClick={() => onSelect(ip)}
      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition hover:brightness-110 ${
        selected
          ? 'border-slark-primary/50 bg-slark-primary/10 ring-1 ring-slark-primary/35'
          : 'border-slate-600/40 bg-[#1a2332] hover:border-slate-500/50'
      }`}
    >
      <CountryFlag attack={attack} size="sm" className="shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-[12px] font-semibold text-slate-100">{ip}</p>
        <p className="mt-0.5 truncate text-[10px] text-slate-400">
          {dash(attack.geoMeta?.location || attack.sourceLabel)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="font-mono text-[10px] tabular-nums text-slate-400">
          {formatIncidentWhen(latestAt, locale, 'time')}
        </span>
        <div className="flex items-center gap-1.5">
          <span
            className={`rounded border px-1.5 py-px font-mono text-[8px] font-bold tabular-nums ${
              blockedCount > 0
                ? 'border-emerald-500/40 bg-emerald-600/15 text-emerald-200'
                : 'border-slate-600/50 bg-white/[0.04] text-slate-400'
            }`}
          >
            {count}×
          </span>
          <span
            className={`rounded border px-1 py-px font-mono text-[7px] font-bold uppercase ${SEVERITY_BADGE[sev]}`}
          >
            {t(`history.severity.${sev}`)}
          </span>
        </div>
      </div>
    </button>
  );
}

function AttackerProfilePanel({ attacks, ip, onViewDetails, onSelectIncident, t, locale, now }) {
  const profileAttack = useMemo(() => {
    if (!ip) return null;
    const list = incidentsForIpToday(attacks, ip, now);
    return list[0] ?? null;
  }, [attacks, ip, now]);

  const window = useMemo(() => {
    if (!ip) return { count: 0, firstAt: null, lastAt: null, blockedCount: 0 };
    const list = incidentsForIpToday(attacks, ip, now);
    if (!list.length) return { count: 0, firstAt: null, lastAt: null, blockedCount: 0 };
    const times = list.map((a) => a.createdAt);
    return {
      count: list.length,
      firstAt: Math.min(...times),
      lastAt: Math.max(...times),
      blockedCount: list.filter((a) => a.blocked === true || a.action === 'blocked').length,
    };
  }, [attacks, ip, now]);

  const topTypes = useMemo(() => topAttackTypesForIpToday(attacks, ip, now), [attacks, ip, now]);
  const incidents = useMemo(() => incidentsForIpToday(attacks, ip, now), [attacks, ip, now]);

  return (
    <aside className="flex w-full flex-col overflow-hidden rounded-xl border border-slate-600/45 bg-slark-dark lg:h-full lg:min-h-0 lg:max-w-md lg:flex-none lg:basis-[clamp(18rem,28vw,28rem)]">
      <div className="shrink-0 border-b border-slate-600/45 px-4 py-3">
        <h3 className="font-cyber text-[10px] font-bold uppercase tracking-[0.2em] text-slate-100">
          {t('attacker.profileTitle')}
        </h3>
      </div>

      <div className="thin-scrollbar-dark px-4 py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain">
        {!ip || !profileAttack ? (
          <p className="py-10 text-center text-[11px] leading-relaxed text-slate-500">
            {t('attacker.profileEmpty')}
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2.5">
                <CountryFlag attack={profileAttack} size="md" />
                <p className="font-mono text-xl font-bold text-slark-primary">{ip}</p>
              </div>
              <p className="mt-1 text-[12px] text-slate-300">
                {dash(profileAttack.geoMeta?.location || profileAttack.sourceLabel)}
              </p>
            </div>

            <div className="rounded-lg border border-slate-600/40 bg-gradient-to-br from-slate-800/80 to-slate-900/90 p-3">
              <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">
                {t('detail.coordinates')}
              </p>
              <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 flex-1 font-mono text-[10px] text-slate-300">
                  {fmtCoord(profileAttack.from)}
                </p>
                <GoogleMapsLink point={profileAttack.from} label={t('history.openInGoogleMaps')} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-slate-600/40 bg-white/[0.03] px-2 py-2.5">
                <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('attacker.attacksToday')}</p>
                <p className="font-mono text-xl font-bold text-slate-100">{window.count}</p>
              </div>
              <div className="rounded border border-emerald-500/30 bg-emerald-600/10 px-2 py-2.5">
                <p className="text-[8px] uppercase tracking-wider text-emerald-400/80">{t('feed.blocked')}</p>
                <p className="font-mono text-xl font-bold text-emerald-200">{window.blockedCount}</p>
              </div>
              <div className="col-span-1 rounded border border-slate-600/40 bg-white/[0.03] px-2 py-2 text-left">
                <p className="text-[8px] uppercase tracking-wider text-slate-500">{t('detail.firstAttack')}</p>
                <p className="font-mono text-[9px] text-slate-300">
                  {window.firstAt ? formatIncidentWhen(window.firstAt, locale, 'short') : '—'}
                </p>
                <p className="mt-1.5 text-[8px] uppercase tracking-wider text-slate-500">{t('detail.lastAttack')}</p>
                <p className="font-mono text-[9px] text-slate-300">
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

            {incidents.length > 0 ? (
              <div>
                <p className="mb-2 text-[8px] font-bold uppercase tracking-wider text-slate-500">
                  {t('attacker.incidentsToday', { n: incidents.length })}
                </p>
                <ul className="space-y-1.5">
                  {incidents.map((incident) => {
                    const bucket = deriveProtectionBucket(incident);
                    const dotColor = bucket ? ATTACK_TYPE_LINE_HEX[bucket] : '#64748b';
                    const sev = incident.severity || 'medium';
                    return (
                      <li key={incident.id}>
                        <button
                          type="button"
                          onClick={() => onSelectIncident?.(incident)}
                          className="flex w-full items-center gap-2 rounded-md border border-slate-600/35 bg-white/[0.03] px-2 py-1.5 text-left transition hover:bg-white/[0.06]"
                        >
                          <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ backgroundColor: dotColor }}
                            aria-hidden
                          />
                          <span className="min-w-0 flex-1 truncate font-mono text-[9px] text-slate-300">
                            {t(threatCategoryLabelKey(incident.category))}
                          </span>
                          <span className="shrink-0 font-mono text-[8px] tabular-nums text-slate-500">
                            {formatIncidentWhen(incident.createdAt, locale, 'time')}
                          </span>
                          <span
                            className={`shrink-0 rounded border px-1 py-px font-mono text-[6px] font-bold uppercase ${SEVERITY_BADGE[sev]}`}
                          >
                            {t(`history.severity.${sev}`)}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            <button
              type="button"
              className="w-full rounded border border-slark-primary/40 bg-slark-primary/10 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slark-primary transition hover:bg-slark-primary/20"
              onClick={() => onViewDetails?.(profileAttack)}
            >
              {t('history.viewDetails')}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}

/**
 * @param {{
 *   attacks: object[];
 *   onViewDetails?: (attack: object) => void;
 *   shellClass?: string;
 * }} props
 */
export function AttackerTabView({ attacks, onViewDetails, shellClass = '' }) {
  const { t, locale } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  const [selectedIp, setSelectedIp] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const ipRows = useMemo(() => groupAttackerIpsToday(attacks, now), [attacks, now]);
  const stats = useMemo(() => computeAttackerTodayStats(attacks, now), [attacks, now]);

  useEffect(() => {
    if (selectedIp && !ipRows.some((r) => r.ip === selectedIp)) {
      setSelectedIp(null);
    }
  }, [ipRows, selectedIp]);

  return (
    <div className="mx-auto flex w-full max-w-[1920px] flex-1 flex-col gap-3 px-3 py-3 sm:px-4 lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden lg:px-5 lg:py-4">
      <div className={`flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-600/45 bg-slark-dark lg:min-h-0 ${shellClass}`}>
        <header className="shrink-0 border-b border-slate-600/45 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-cyber text-base font-bold uppercase tracking-[0.12em] text-slate-100 sm:text-lg">
                {t('attacker.title')}
              </h2>
              <p className="mt-1 text-[10px] text-slate-400">{t('attacker.subtitle')}</p>
            </div>
            <time className="font-mono text-[11px] tabular-nums text-slate-400" dateTime={new Date(now).toISOString()}>
              {formatIncidentWhen(now, locale, 'short')}
            </time>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: t('attacker.statsUnique'), value: stats.uniqueIps, accent: 'text-blue-300' },
              { label: t('attacker.statsTotal'), value: stats.total, accent: 'text-slate-100' },
              { label: t('attacker.statsBlocked'), value: stats.blocked, accent: 'text-emerald-300' },
            ].map(({ label, value, accent }) => (
              <div key={label} className="rounded-lg border border-slate-600/40 bg-[#1a2332]/80 px-3 py-2">
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
                <p className={`font-mono text-lg font-bold tabular-nums ${accent}`}>
                  {value.toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')}
                </p>
              </div>
            ))}
          </div>
        </header>

        <div className="shrink-0 border-b border-slate-600/45 px-4 py-2">
          <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-400">
            {t('attacker.ipList')}
            {ipRows.length > 0 ? ` (${ipRows.length})` : ''}
          </p>
        </div>

        <div className="thin-scrollbar-dark px-3 py-2 sm:px-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
          {ipRows.length === 0 ? (
            <p className="px-2 py-12 text-center text-[11px] leading-relaxed text-slate-500">
              {t('attacker.emptyList')}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {ipRows.map((row) => (
                <li key={row.ip}>
                  <AttackerIpRow
                    row={row}
                    selected={selectedIp === row.ip}
                    onSelect={setSelectedIp}
                    t={t}
                    locale={locale}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <AttackerProfilePanel
        attacks={attacks}
        ip={selectedIp}
        now={now}
        onViewDetails={onViewDetails}
        onSelectIncident={onViewDetails}
        t={t}
        locale={locale}
      />
    </div>
  );
}
