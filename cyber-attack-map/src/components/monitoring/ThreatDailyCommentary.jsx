import { useEffect, useMemo, useRef, useState } from 'react';
import { History } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import {
  buildFallbackDailyComments,
  generateDailyThreatCommentary,
} from '../../services/threatDailyCommentary.js';
import { fetchAiConfigured } from '../../services/aiBridge.js';
import { buildDailyThreatSeries } from '../../utils/threatDailySeries.js';
import { CommentHistoryModal } from '../../pages/monitoring/intel/CommentHistoryModal.jsx';
import {
  mergeCommentEntries,
  resolveCommentHistoryDays,
} from '../../pages/monitoring/intel/commentHistoryUtils.js';
import {
  getTodayCommentSlot,
  loadCachedTodayComment,
  saveCachedTodayComment,
} from '../../pages/monitoring/intel/todayCommentSchedule.js';

async function loadComments(series, locale, t) {
  try {
    if (await fetchAiConfigured()) {
      return await generateDailyThreatCommentary(series, locale);
    }
  } catch {
    /* fallback below */
  }
  return buildFallbackDailyComments(series, t);
}

function useTodayCommentSlot() {
  const [slot, setSlot] = useState(() => getTodayCommentSlot());

  useEffect(() => {
    const tick = () => {
      const next = getTodayCommentSlot();
      setSlot((prev) => (prev !== next ? next : prev));
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return slot;
}

/**
 * @param {{ attacks: { createdAt: number, category?: string }[]; variant?: 'light' | 'dark'; embedded?: boolean }} props
 */
export function ThreatDailyCommentary({ attacks, variant = 'light', embedded = false }) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';
  const commentSlot = useTodayCommentSlot();
  const [todayEntry, setTodayEntry] = useState(
    /** @type {{ dateKey: string; date: string; comment: string; volume: number } | null} */ (null),
  );
  const [historyEntries, setHistoryEntries] = useState(
    /** @type {{ dateKey: string; date: string; comment: string; volume: number }[]} */ ([]),
  );
  const [loadingToday, setLoadingToday] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const reqIdRef = useRef(0);

  /** Two days so fallback/AI can compare with yesterday; only today is shown in the card. */
  const todayLoadSeries = useMemo(
    () => buildDailyThreatSeries(attacks, 2, locale),
    [attacks, locale],
  );

  const todayPoint = todayLoadSeries[todayLoadSeries.length - 1] ?? null;
  const todayVolume = todayPoint?.volume ?? 0;

  const historyDays = useMemo(() => resolveCommentHistoryDays(attacks), [attacks]);
  const historySeries = useMemo(
    () => buildDailyThreatSeries(attacks, historyDays, locale),
    [attacks, historyDays, locale],
  );

  const todayFingerprint = useMemo(
    () => todayLoadSeries.map((p) => `${p.dateKey}:${p.volume}`).join('|'),
    [todayLoadSeries],
  );

  const historyFingerprint = useMemo(
    () => historySeries.map((p) => `${p.dateKey}:${p.volume}`).join('|'),
    [historySeries],
  );

  useEffect(() => {
    if (!todayPoint) {
      setTodayEntry(null);
      setLoadingToday(false);
      return;
    }

    if (todayVolume === 0) {
      setLoadingToday(false);
      setTodayEntry({
        dateKey: todayPoint.dateKey,
        date: todayPoint.label,
        comment: t('intel.todaySafe'),
        volume: 0,
      });
      return;
    }

    const cached = loadCachedTodayComment(todayPoint.dateKey, commentSlot, todayFingerprint);
    if (cached) {
      setLoadingToday(false);
      setTodayEntry({
        dateKey: todayPoint.dateKey,
        date: todayPoint.label,
        comment: cached,
        volume: todayVolume,
      });
      return;
    }

    const reqId = ++reqIdRef.current;
    setLoadingToday(true);
    void loadComments(todayLoadSeries, locale, t).then((comments) => {
      if (reqId !== reqIdRef.current) return;
      const merged = mergeCommentEntries(todayLoadSeries, comments);
      const entry = merged.length ? merged[merged.length - 1] : null;
      if (entry?.comment) {
        saveCachedTodayComment(todayPoint.dateKey, commentSlot, todayFingerprint, entry.comment);
      }
      setTodayEntry(entry);
      setLoadingToday(false);
    });
  }, [commentSlot, locale, t, todayFingerprint, todayLoadSeries, todayPoint, todayVolume]);

  useEffect(() => {
    const comments = buildFallbackDailyComments(historySeries, t);
    setHistoryEntries(mergeCommentEntries(historySeries, comments));
  }, [historyFingerprint, historySeries, t]);

  useEffect(() => {
    if (!todayEntry) return;
    setHistoryEntries((prev) =>
      prev.map((row) =>
        row.dateKey === todayEntry.dateKey
          ? { ...row, comment: todayEntry.comment, date: todayEntry.date }
          : row,
      ),
    );
  }, [todayEntry]);

  const titleClass = dark ? 'text-slate-100' : 'text-slark-dark';
  const mutedClass = dark ? 'text-slate-400' : 'text-slark-muted';
  const quietClass = dark ? 'text-slate-500' : 'text-slark-muted/75';
  const bodyClass = dark ? 'text-slate-200' : 'text-slark-text';

  return (
    <>
      <section
        className={
          embedded
            ? 'flex h-full min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5'
            : `border-t px-4 py-4 sm:px-6 sm:py-5 ${dark ? 'border-slate-600/50' : 'border-slark-border'}`
        }
        aria-label={t('intel.todayCommentTitle')}
      >
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h3 className={`font-cyber text-[10px] font-bold uppercase tracking-[0.28em] ${titleClass}`}>
            {t('intel.todayCommentTitle')}
          </h3>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition ${
              dark
                ? 'border-slate-600/50 bg-white/[0.04] text-slate-300 hover:border-slark-primary/40 hover:text-slark-primary'
                : 'border-slark-border bg-slark-bg text-slark-muted hover:border-slark-primary/30 hover:text-slark-primary'
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden />
            {t('intel.commentHistoryButton')}
          </button>
        </div>

        {loadingToday ? (
          <div
            className={`flex min-h-0 flex-1 animate-pulse flex-col rounded-lg border px-4 py-4 ${
              dark ? 'border-slate-600/40 bg-white/[0.03]' : 'border-slark-border bg-slark-card/60'
            }`}
          >
            <div className={`h-3 w-full max-w-xl rounded ${dark ? 'bg-slate-600/40' : 'bg-slark-border/80'}`} />
            <div className={`mt-2.5 h-3 w-4/5 max-w-md rounded ${dark ? 'bg-slate-600/35' : 'bg-slark-border/70'}`} />
          </div>
        ) : todayEntry ? (
          <div
            className={`flex min-h-0 flex-1 flex-col rounded-lg border px-4 py-4 ${
              todayEntry.volume === 0 ? 'items-center justify-center text-center' : ''
            } ${
              dark ? 'border-slate-600/40 bg-white/[0.03]' : 'border-slark-border bg-slark-bg'
            }`}
          >
            <p
              className={
                todayEntry.volume === 0
                  ? `text-[11px] leading-relaxed ${quietClass}`
                  : `text-[13px] leading-relaxed sm:text-sm ${bodyClass}`
              }
            >
              {todayEntry.comment}
            </p>
          </div>
        ) : (
          <div
            className={`flex min-h-0 flex-1 items-center justify-center rounded-lg border px-4 ${
              dark ? 'border-slate-600/40 bg-white/[0.02]' : 'border-slark-border bg-slark-card/40'
            }`}
          >
            <p className={`text-center text-[11px] ${mutedClass}`}>{t('intel.commentHistoryEmpty')}</p>
          </div>
        )}
      </section>

      <CommentHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        entries={historyEntries}
        variant={variant}
      />
    </>
  );
}
