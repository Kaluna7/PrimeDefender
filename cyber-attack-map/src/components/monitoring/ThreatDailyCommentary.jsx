import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { isGeminiConfigured } from '../../services/geminiChat.js';
import {
  buildFallbackDailyComments,
  generateDailyThreatCommentary,
} from '../../services/threatDailyCommentary.js';
import { buildDailyThreatSeries } from '../../utils/threatDailySeries.js';

/**
 * @param {{ attacks: { createdAt: number, category?: string }[]; variant?: 'light' | 'dark' }} props
 */
export function ThreatDailyCommentary({ attacks, variant = 'light' }) {
  const { t, locale } = useI18n();
  const dark = variant === 'dark';
  const [comments, setComments] = useState(/** @type {{ date: string, comment: string }[]} */ ([]));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [source, setSource] = useState(/** @type {'ai' | 'fallback' | ''} */ (''));
  const reqIdRef = useRef(0);

  const series = useMemo(
    () => buildDailyThreatSeries(attacks, 14, locale),
    [attacks, locale],
  );

  const fingerprint = useMemo(
    () => series.map((p) => `${p.dateKey}:${p.volume}`).join('|'),
    [series],
  );

  useEffect(() => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setError('');

    const run = async () => {
      try {
        if (isGeminiConfigured()) {
          const aiComments = await generateDailyThreatCommentary(series, locale);
          if (reqId !== reqIdRef.current) return;
          setComments(aiComments);
          setSource('ai');
          return;
        }
        throw new Error('GEMINI_KEY_MISSING');
      } catch {
        if (reqId !== reqIdRef.current) return;
        setComments(buildFallbackDailyComments(series, t));
        setSource('fallback');
        if (!isGeminiConfigured()) {
          setError(t('monitoring.intelCommentNoKey'));
        }
      } finally {
        if (reqId === reqIdRef.current) setLoading(false);
      }
    };

    void run();
  }, [fingerprint, series, locale, t]);

  const titleClass = dark ? 'text-slate-100' : 'text-slark-dark';
  const mutedClass = dark ? 'text-slate-400' : 'text-slark-muted';
  const bodyClass = dark ? 'text-slate-200' : 'text-slark-text';
  const cardClass = dark
    ? 'rounded-xl border border-slate-600/50 bg-white/[0.04] px-4 py-3 shadow-sm'
    : 'rounded-xl border border-slark-border bg-slark-bg px-4 py-3 shadow-sm';
  const skeletonClass = dark
    ? 'animate-pulse rounded-xl border border-slate-600/40 bg-white/[0.03] px-4 py-3'
    : 'animate-pulse rounded-xl border border-slark-border bg-slark-card/60 px-4 py-3';

  return (
    <section
      className={`border-t px-4 py-4 sm:px-6 sm:py-5 ${dark ? 'border-slate-600/50' : 'border-slark-border'}`}
      aria-label={t('monitoring.intelCommentTitle')}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className={`font-cyber text-[10px] font-bold uppercase tracking-[0.28em] ${titleClass}`}>
            {t('monitoring.intelCommentTitle')}
          </h3>
          <p className={`mt-1 text-[10px] ${mutedClass}`}>{t('monitoring.intelCommentSubtitle')}</p>
        </div>
        {source === 'ai' && !loading ? (
          <span
            className={`rounded-full border px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-slark-primary ${
              dark ? 'border-slark-primary/35 bg-slark-primary/10' : 'border-slark-primary/25 bg-slark-card'
            }`}
          >
            {t('monitoring.intelCommentAiBadge')}
          </span>
        ) : null}
      </div>

      {loading ? (
        <div className="space-y-2">
          {series.map((d) => (
            <div key={d.dateKey} className={skeletonClass}>
              <div className={`h-2 w-16 rounded ${dark ? 'bg-slate-600/50' : 'bg-slark-border'}`} />
              <div className={`mt-2 h-3 w-full max-w-md rounded ${dark ? 'bg-slate-600/40' : 'bg-slark-border/80'}`} />
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {comments.map((row, i) => {
            const point = series[i];
            const vol = point?.volume ?? 0;
            return (
              <li key={`${row.date}-${i}`} className={cardClass}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className={`font-cyber text-[11px] font-bold uppercase tracking-wider ${titleClass}`}>
                    {row.date}
                  </p>
                  <span
                    className={`font-mono text-[10px] tabular-nums ${
                      vol > 0 ? 'text-slark-primary' : mutedClass
                    }`}
                  >
                    {vol} {t('monitoring.intelCommentIncidents')}
                  </span>
                </div>
                <p className={`mt-2 text-sm leading-relaxed ${bodyClass}`}>{row.comment}</p>
              </li>
            );
          })}
        </ul>
      )}

      {error ? <p className={`mt-3 text-[10px] ${mutedClass}`}>{error}</p> : null}
    </section>
  );
}
