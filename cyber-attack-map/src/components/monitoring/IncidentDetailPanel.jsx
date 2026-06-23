import { useI18n } from '../../i18n/I18nContext.jsx';
import { CATEGORY_STYLE, THREAT_CATEGORY } from '../../constants/threatCategories.js';

function fmtCoord(lat, lon) {
  if (typeof lat !== 'number' || typeof lon !== 'number') return '—';
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}°${ns}  ${Math.abs(lon).toFixed(4)}°${ew}`;
}

function dash(s) {
  return s && String(s).trim() ? s : '—';
}

/**
 * @param {{ attack: object | null; onClose?: () => void; onSendToAI?: () => void }} props
 */
export function IncidentDetailPanel({ attack, onClose, onSendToAI }) {
  const { t, locale } = useI18n();

  if (!attack) {
    return (
      <section
        className="flex min-h-[8rem] flex-col border-t border-slark-border bg-slark-card px-3 py-3"
        aria-label={t('detail.title')}
      >
        <p className="text-center text-[10px] leading-relaxed text-slark-muted">{t('detail.selectHint')}</p>
      </section>
    );
  }

  const cat = CATEGORY_STYLE[attack.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
  const from = attack.from;
  const to = attack.to;
  const hw = attack.id ? attack.id.replace(/-/g, '').slice(0, 12) : '—';

  const lines = [
    `pd-src0   Link encap:Slark  HWaddr ${hw}`,
    `          inet addr:${dash(attack.attackerIp)}  ${t('detail.inetScope')}`,
    `          geo: ${dash(attack.sourceLabel)}`,
    `          coords: ${fmtCoord(from?.lat, from?.lon)}  (WGS84)`,
    `pd-dst0   inet dst:${fmtCoord(to?.lat, to?.lon)}  (${t('detail.protectedSite')})`,
    `route:    ${dash(attack.targetLabel)}`,
    `request:  ${dash(attack.method)} ${dash(attack.path)}`,
    `ua:       ${dash(attack.userAgent)}`,
    attack.detection ? `detect:   ${attack.detection}` : null,
  ].filter(Boolean);

  return (
    <section
      className="flex max-h-[min(50vh,22rem)] min-h-0 flex-col border-t border-slark-border bg-slark-bg"
      aria-label={t('detail.title')}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slark-border px-2 py-2">
        <h2 className="font-cyber text-[10px] font-bold uppercase tracking-[0.22em] text-slark-text">
          {t('detail.title')}
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <span
            className={`rounded border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase ${cat.badgeClass}`}
          >
            {cat.shortLabel}
          </span>
          {onSendToAI && (
            <button
              type="button"
              onClick={onSendToAI}
              className="rounded border border-slark-primary/40 bg-slark-card px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wide text-slark-primary hover:bg-slark-primary hover:text-white"
              title={t('detail.sendToAiHint')}
            >
              {t('detail.sendToAI')}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slark-border px-1.5 py-0.5 font-mono text-[9px] text-slark-muted hover:bg-slark-card hover:text-slark-text"
            >
              {t('detail.close')}
            </button>
          )}
        </div>
      </div>
      <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <p className="mb-2 text-[8px] uppercase tracking-wider text-slark-muted">{t('detail.readoutCaption')}</p>
        <pre className="whitespace-pre-wrap break-all font-mono text-[9px] leading-relaxed text-slark-dark">
          {lines.join('\n')}
        </pre>
        {!attack.attackerIp && (
          <p className="mt-3 border-t border-amber-200/90 pt-2 text-[9px] leading-relaxed text-amber-800">
            {t('detail.noIpHint')}
          </p>
        )}
        <p className="mt-2 text-[8px] text-slark-muted">
          {new Date(attack.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', {
            hour12: false,
          })}
        </p>
      </div>
    </section>
  );
}
