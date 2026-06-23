import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';

/**
 * @param {{ user: { subscription?: { active?: boolean, planId?: string, expiresAt?: number, labelEn?: string, labelId?: string }, apiKey?: { key?: string } } | null, compact?: boolean }} props
 */
export function SubscriptionBillingCard({ user, compact = false }) {
  const { t, locale } = useI18n();
  const [copied, setCopied] = useState(false);
  const sub = user?.subscription;
  const active = sub?.active;
  const apiKey = user?.apiKey?.key;

  if (!active || !sub) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-600/30 dark:bg-amber-950/30">
        <p className="text-sm text-amber-900 dark:text-amber-200">{t('account.noSubscription')}</p>
        <Link
          to="/purchase"
          className="mt-3 inline-block text-sm font-semibold text-slark-primary underline-offset-2 hover:underline"
        >
          {t('account.buySubscription')}
        </Link>
      </div>
    );
  }

  const planLabel = locale === 'id' ? sub.labelId || sub.planId : sub.labelEn || sub.planId;
  const expiresLabel = new Date(sub.expiresAt).toLocaleDateString(locale === 'id' ? 'id-ID' : 'en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard?.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className={`rounded-xl border border-slark-primary/25 bg-gradient-to-br from-slark-card to-slark-bg shadow-sm dark:border-slark-primary/30 dark:from-slark-dark/80 dark:to-slark-dark dark:shadow-none ${
        compact ? 'p-4' : 'p-6'
      }`}
    >
      <h2 className="font-cyber text-xs font-bold uppercase tracking-[0.2em] text-slark-primary">
        {t('account.subscriptionTitle')}
      </h2>

      <dl className={`mt-4 grid gap-3 ${compact ? 'text-sm' : ''}`}>
        <div className="flex flex-wrap justify-between gap-2 border-b border-slark-border pb-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slark-muted">
            {t('account.planLabel')}
          </dt>
          <dd className="font-semibold text-slark-text dark:text-white">{planLabel}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-2 border-b border-slark-border pb-3">
          <dt className="text-xs font-semibold uppercase tracking-wider text-slark-muted">
            {t('account.expiresLabel')}
          </dt>
          <dd className="font-mono text-sm text-slark-text dark:text-white/95">{expiresLabel}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wider text-slark-muted">
            {t('account.apiKeyLabel')}
          </dt>
          <dd className="mt-2">
            {apiKey ? (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <code className="thin-scrollbar max-w-full flex-1 overflow-x-auto rounded-lg border border-slark-border bg-slark-bg px-3 py-2 font-mono text-[11px] text-slark-dark dark:border-slark-border/50 dark:bg-slark-dark/60 dark:text-slark-primary">
                  {apiKey}
                </code>
                <button
                  type="button"
                  onClick={copyKey}
                  className="shrink-0 rounded-lg bg-slark-primary px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slark-primary-hover"
                >
                  {copied ? t('account.copied') : t('account.copyKey')}
                </button>
              </div>
            ) : (
              <p className="text-xs text-slark-muted">{t('account.keyLoading')}</p>
            )}
            <p className="mt-2 text-[10px] leading-relaxed text-slark-muted">
              {t('account.apiKeyHint')}
            </p>
          </dd>
        </div>
      </dl>
    </div>
  );
}
