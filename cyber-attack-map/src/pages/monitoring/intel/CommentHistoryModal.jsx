import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { filterCommentEntries } from './commentHistoryUtils.js';

/**
 * @param {{
 *   open: boolean;
 *   onClose: () => void;
 *   entries: { dateKey: string; date: string; comment: string; volume?: number }[];
 *   variant?: 'light' | 'dark';
 * }} props
 */
export function CommentHistoryModal({ open, onClose, entries, variant = 'dark' }) {
  const { t } = useI18n();
  const dark = variant === 'dark';
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [query, setQuery] = useState('');

  const bounds = useMemo(() => {
    if (!entries.length) return { min: '', max: '' };
    const keys = entries.map((e) => e.dateKey).sort();
    return { min: keys[0], max: keys[keys.length - 1] };
  }, [entries]);

  useEffect(() => {
    if (!open) return undefined;
    setFromDate(bounds.min);
    setToDate(bounds.max);
    setQuery('');
    const scrollRoot = document.getElementById('app-scroll-root');
    const prevBody = document.body.style.overflow;
    const prevRoot = scrollRoot?.style.overflow ?? '';
    document.body.style.overflow = 'hidden';
    if (scrollRoot) scrollRoot.style.overflow = 'hidden';
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevBody;
      if (scrollRoot) scrollRoot.style.overflow = prevRoot;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, bounds.min, bounds.max, onClose]);

  const filtered = useMemo(
    () =>
      filterCommentEntries(entries, { from: fromDate || undefined, to: toDate || undefined, query }).sort((a, b) =>
        b.dateKey.localeCompare(a.dateKey),
      ),
    [entries, fromDate, toDate, query],
  );

  if (!open) return null;

  const shell = dark
    ? 'border-slate-600/60 bg-slark-dark text-slate-200'
    : 'border-slark-border bg-slark-bg text-slark-text';
  const inputClass = dark
    ? 'rounded-lg border border-slate-600/50 bg-[#1a2332] px-2.5 py-1.5 text-[11px] text-slate-200 focus:border-slark-primary/50 focus:outline-none'
    : 'rounded-lg border border-slark-border bg-slark-bg px-2.5 py-1.5 text-[11px] focus:border-slark-primary/40 focus:outline-none';
  const dateInputClass = dark ? `${inputClass} date-input-icon-white` : inputClass;
  const muted = dark ? 'text-slate-400' : 'text-slark-muted';

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slark-dark/50 backdrop-blur-sm" aria-label={t('intel.commentHistoryClose')} onClick={onClose} />
      <div
        className={`relative z-10 flex h-[88dvh] w-full min-h-0 max-w-2xl flex-col overflow-hidden rounded-t-2xl border shadow-xl sm:h-auto sm:max-h-[88vh] sm:rounded-2xl ${shell}`}
        style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
      >
        <div className={`flex items-start justify-between gap-3 border-b px-4 py-3 ${dark ? 'border-slate-600/50' : 'border-slark-border'}`}>
          <div>
            <h2 className="font-cyber text-sm font-bold uppercase tracking-wide text-slate-100">
              {t('intel.commentHistoryTitle')}
            </h2>
            <p className={`mt-0.5 text-[10px] ${muted}`}>{t('intel.commentHistorySubtitle')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition ${
              dark
                ? 'border-rose-500/25 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                : 'border-rose-200 bg-rose-50 text-rose-600'
            }`}
            aria-label={t('intel.commentHistoryClose')}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>

        <div className={`shrink-0 space-y-3 border-b px-4 py-3 ${dark ? 'border-slate-600/50 bg-[#1a2332]/50' : 'border-slark-border bg-slark-card/40'}`}>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>{t('intel.commentHistoryFrom')}</span>
              <input
                type="date"
                value={fromDate}
                min={bounds.min}
                max={toDate || bounds.max}
                onChange={(e) => setFromDate(e.target.value)}
                className={`mt-1 w-full ${dateInputClass}`}
              />
            </label>
            <label className="block">
              <span className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>{t('intel.commentHistoryTo')}</span>
              <input
                type="date"
                value={toDate}
                min={fromDate || bounds.min}
                max={bounds.max}
                onChange={(e) => setToDate(e.target.value)}
                className={`mt-1 w-full ${dateInputClass}`}
              />
            </label>
          </div>
          <label className="block">
            <span className={`text-[9px] font-bold uppercase tracking-wider ${muted}`}>{t('intel.commentHistorySearch')}</span>
            <div className="relative mt-1">
              <Search
                className={`pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${muted}`}
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('intel.commentHistorySearchPlaceholder')}
                className={`w-full pl-8 ${inputClass}`}
              />
            </div>
          </label>
          <p className={`text-[10px] ${muted}`}>
            {t('intel.commentHistoryResultCount', { n: filtered.length })}
          </p>
        </div>

        <ul className="thin-scrollbar-dark min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4">
          {filtered.length === 0 ? (
            <li className={`py-10 text-center text-[11px] ${muted}`}>{t('intel.commentHistoryEmpty')}</li>
          ) : (
            filtered.map((row) => (
              <li
                key={row.dateKey}
                className={`border-b py-3 last:border-b-0 ${dark ? 'border-slate-600/40' : 'border-slark-border'}`}
              >
                <p className="font-cyber text-[10px] font-bold uppercase tracking-wider text-slark-primary">{row.date}</p>
                <p className={`mt-1.5 text-[13px] leading-relaxed ${dark ? 'text-slate-200' : 'text-slark-text'}`}>{row.comment}</p>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}
