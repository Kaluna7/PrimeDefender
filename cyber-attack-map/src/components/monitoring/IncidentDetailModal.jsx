import { useEffect } from 'react';
import { CATEGORY_STYLE, THREAT_CATEGORY } from '../../constants/threatCategories.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { buildThreatReadoutText } from '../../utils/threatAiPrompt.js';
import { describeAttackActivity } from '../../utils/describeAttackActivity.js';

/**
 * @param {{
 *   attack: object | null;
 *   onClose: () => void;
 *   onSendToAI?: () => void;
 * }} props
 */
export function IncidentDetailModal({ attack, onClose, onSendToAI }) {
  const { t, locale } = useI18n();
  const loc = locale === 'id' ? 'id' : 'en';

  useEffect(() => {
    if (!attack) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [attack, onClose]);

  if (!attack) return null;

  const cat = CATEGORY_STYLE[attack.category] || CATEGORY_STYLE[THREAT_CATEGORY.UNKNOWN];
  const activity = describeAttackActivity(attack, loc);
  const readout = buildThreatReadoutText(attack, {
    inetScope: t('detail.inetScope'),
    protectedSite: t('detail.protectedSite'),
  });

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-modal-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/70"
        aria-label={t('incidentModal.close')}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200/95 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-950">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200/90 px-4 py-3 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id="incident-modal-title" className="font-cyber text-sm font-bold tracking-wide text-slate-900 dark:text-cyan-50">
              {t('incidentModal.title')}
            </h2>
            <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">{t('incidentModal.subtitle')}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className={`rounded border px-2 py-0.5 font-mono text-[9px] font-bold uppercase ${cat.badgeClass}`}>
              {cat.shortLabel}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t('incidentModal.close')}
            </button>
          </div>
        </div>

        <div className="thin-scrollbar flex-1 overflow-y-auto px-4 py-3">
          {/* Attacker block */}
          <section className="rounded-xl border border-rose-200/90 bg-gradient-to-br from-rose-50 to-white p-3 dark:border-rose-900/40 dark:from-rose-950/40 dark:to-slate-950">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-rose-800 dark:text-rose-300">
              {t('incidentModal.attacker')}
            </h3>
            <p className="mt-2 font-mono text-sm font-semibold text-slate-900 dark:text-rose-100">
              {attack.attackerIp?.trim() ? attack.attackerIp : t('incidentModal.unknownIp')}
            </p>
            <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="text-slate-500 dark:text-slate-500">{t('incidentModal.region')}:</span>{' '}
              {attack.sourceLabel?.trim() ? attack.sourceLabel : '—'}
            </p>
          </section>

          {/* Activity */}
          <section className="mt-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 dark:border-amber-900/35 dark:bg-amber-950/25">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-900 dark:text-amber-200">
              {t('incidentModal.activity')}
            </h3>
            <p className="mt-2 text-[13px] leading-snug text-slate-800 dark:text-amber-50/95">{activity}</p>
            {attack.path && (
              <p className="mt-2 font-mono text-[10px] text-slate-600 dark:text-slate-400">
                {attack.method && `${attack.method} `}
                {attack.path}
              </p>
            )}
          </section>

          {/* Target */}
          <section className="mt-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
              {t('incidentModal.target')}
            </h3>
            <p className="mt-1 text-[13px] text-slate-800 dark:text-cyan-100/95">{attack.targetLabel?.trim() || '—'}</p>
          </section>

          {/* Technical readout */}
          <section className="mt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-300">
              {t('incidentModal.technical')}
            </h3>
            <pre className="mt-2 whitespace-pre-wrap break-all rounded-lg border border-slate-200/90 bg-slate-50 p-2 font-mono text-[9px] leading-relaxed text-emerald-900 dark:border-slate-700 dark:bg-black/50 dark:text-emerald-400/95">
              {readout}
            </pre>
          </section>

          <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">
            {new Date(attack.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-GB', { hour12: false })}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200/90 bg-slate-50/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
          {onSendToAI && (
            <button
              type="button"
              onClick={onSendToAI}
              className="rounded-lg border border-violet-400/60 bg-violet-600 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-violet-500 dark:border-violet-500/50 dark:bg-violet-950/80 dark:text-violet-100 dark:hover:bg-violet-900/80"
            >
              {t('detail.sendToAI')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('incidentModal.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
