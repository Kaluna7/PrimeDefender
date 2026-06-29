import { useMemo } from 'react';
import { ATTACK_TYPE_LINE_HEX, getAttackTypePanelStyles } from '../../constants/attackTypeColors.js';
import { threatCategoryLabelKey } from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { dedupeAttackerIncidents, incidentAttackTypeKey } from '../../utils/dedupeAttackerIncidents.js';
import { deriveProtectionBucket } from '../../utils/deriveProtectionBucket.js';
import { formatIncidentWhen } from '../../utils/formatIncidentTime.js';

function fmtCoord(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '—';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lon).toFixed(4)}°${ew}`;
}

function dash(s) {
  return s && String(s).trim() ? s : '—';
}

function detectionLabel(attack, t) {
  const bucket = deriveProtectionBucket(attack);
  if (bucket) return t(`protect.${bucket}`);
  if (attack.detection) return attack.detection;
  return t(threatCategoryLabelKey(attack.category));
}

/**
 * @param {{
 *   incidents?: object[];
 *   selectedId?: string | null;
 *   onSelectAttack?: (attack: object) => void;
 *   variant?: 'light' | 'dark';
 * }} props
 */
export function IncidentDetailPanel({
  incidents = [],
  selectedId = null,
  onSelectAttack,
  variant = 'light',
}) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';

  const shellClass = dark ? 'bg-slark-dark text-slate-200' : 'border-slark-border bg-slark-card';
  const headerBorder = dark ? 'border-slate-600/50' : 'border-slark-border';
  const titleClass = dark ? 'text-slate-100' : 'text-slark-text';
  const mutedClass = dark ? 'text-slate-400' : 'text-slark-muted';
  const rowEven = dark ? 'bg-white/[0.03]' : 'bg-slark-card';
  const rowOdd = dark ? 'bg-white/[0.07]' : 'bg-white';
  const rowSelected = dark
    ? 'border-slark-primary/55 bg-slark-primary/[0.1] ring-1 ring-slark-primary/30'
    : 'border-slark-primary bg-slark-primary/[0.05] ring-1 ring-slark-primary/25';

  const entries = useMemo(() => dedupeAttackerIncidents(incidents), [incidents]);

  return (
    <section className={`flex min-h-0 flex-1 flex-col ${shellClass}`} aria-label={t('detail.title')}>
      <div className={`border-b px-3 py-2.5 ${headerBorder}`}>
        <h2 className={`font-cyber text-[10px] font-bold uppercase tracking-[0.22em] ${titleClass}`}>
          {t('detail.title')}
        </h2>
        <p className={`mt-0.5 text-[9px] uppercase tracking-wider ${mutedClass}`}>
          {entries.length
            ? t('detail.listSubtitle', { n: entries.length })
            : t('detail.emptyList')}
        </p>
      </div>

      <div
        className={`${dark ? 'thin-scrollbar-dark' : 'thin-scrollbar'} min-h-0 flex-1 overflow-y-auto px-2 py-2`}
      >
        {entries.length === 0 ? (
          <p className={`px-2 py-8 text-center text-[10px] leading-relaxed ${mutedClass}`}>
            {t('detail.emptyList')}
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {entries.map(({ incident, count, latestAt, firstAt }, index) => {
              const ip = incident.attackerIp?.trim();
              const from = incident.from;
              const bucket = deriveProtectionBucket(incident);
              const typeStyles = bucket ? getAttackTypePanelStyles(bucket, { hot: true }) : null;
              const accent = bucket ? ATTACK_TYPE_LINE_HEX[bucket] : undefined;
              const selected = selectedId === incident.id;
              const zebra = index % 2 === 0 ? rowEven : rowOdd;
              const interactive = Boolean(onSelectAttack);

              return (
                <li
                  key={`${ip || incident.id}-${incidentAttackTypeKey(incident)}`}
                  className={`relative rounded-lg border px-2.5 py-2 ${
                    selected ? rowSelected : zebra
                  } ${interactive ? 'cursor-pointer transition hover:brightness-110' : ''}`}
                  style={!selected && typeStyles ? typeStyles.row : undefined}
                  onClick={interactive ? () => onSelectAttack(incident) : undefined}
                  onKeyDown={
                    interactive
                      ? (e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onSelectAttack(incident);
                          }
                        }
                      : undefined
                  }
                  role={interactive ? 'button' : undefined}
                  tabIndex={interactive ? 0 : undefined}
                >
                  <div className="flex items-start justify-between gap-2 pr-1">
                    <p className="min-w-0 flex-1 break-all font-mono text-[11px] font-semibold tabular-nums text-slark-primary">
                      {ip || t('detail.unknownIp')}
                    </p>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {count > 1 ? (
                        <span
                          className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold tabular-nums ${
                            dark
                              ? 'border-slate-500/50 bg-white/[0.06] text-slate-300'
                              : 'border-slark-border bg-slark-bg text-slark-muted'
                          }`}
                        >
                          {t('detail.repeatCount', { n: count })}
                        </span>
                      ) : null}
                      {typeStyles ? (
                        <span
                          className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center"
                          aria-hidden
                        >
                          <span
                            className="protect-threat-dot-ping absolute h-2 w-2 rounded-full"
                            style={typeStyles.ping}
                          />
                          <span
                            className="protect-threat-dot--live relative h-2 w-2 rounded-full ring-1 ring-white/15"
                            style={typeStyles.dot}
                          />
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <p className={`mt-1.5 text-[9px] leading-snug ${mutedClass}`}>
                    <span className={dark ? 'text-slate-300' : 'text-slark-text'}>
                      {dash(incident.sourceLabel)}
                    </span>
                    <span className="mx-1 opacity-60">·</span>
                    <span className="font-mono tabular-nums">{fmtCoord(from?.lat, from?.lon)}</span>
                  </p>

                  <p
                    className="mt-1.5 font-mono text-[9px] font-medium"
                    style={accent ? { color: accent } : undefined}
                  >
                    {detectionLabel(incident, t)}
                  </p>

                  <p className={`mt-0.5 truncate font-mono text-[9px] ${mutedClass}`}>
                    {dash(incident.method)} {dash(incident.path)}
                    {incident.targetLabel ? ` → ${incident.targetLabel}` : ''}
                  </p>

                  <div className={`mt-2 flex items-center justify-between gap-2 border-t pt-1.5 ${headerBorder}`}>
                    <p className={`text-[7px] font-bold uppercase tracking-wider ${mutedClass}`}>
                      {count > 1 ? t('detail.lastAttack') : t('detail.attackTime')}
                    </p>
                    <p className={`font-mono text-[9px] tabular-nums ${dark ? 'text-slate-200' : 'text-slark-dark'}`}>
                      {formatIncidentWhen(latestAt, locale, 'short')}
                    </p>
                  </div>

                  {count > 1 && firstAt !== latestAt ? (
                    <p className={`mt-0.5 text-right font-mono text-[8px] tabular-nums ${mutedClass}`}>
                      {t('detail.firstAttack')}: {formatIncidentWhen(firstAt, locale, 'short')}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
