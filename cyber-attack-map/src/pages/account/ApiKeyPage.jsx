import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus } from '../../services/auth.js';
import { ApiKeyHeroPanel } from './ApiKeyHeroPanel.jsx';
import { SubscriptionBillingCard } from './SubscriptionBillingCard.jsx';

export function ApiKeyPage() {
  const { t, locale } = useI18n();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const auth = await fetchAuthStatus();
    setUser(auth.ok ? auth.user : null);
  }, []);

  useEffect(() => {
    document.title = `${t('brand.name')} | ${t('nav.purchase')}`;
  }, [t, locale]);

  useEffect(() => {
    let cancelled = false;
    fetchAuthStatus().then((auth) => {
      if (cancelled) return;
      setUser(auth.ok ? auth.user : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onAuth = () => refreshUser();
    window.addEventListener('slark-auth-change', onAuth);
    return () => window.removeEventListener('slark-auth-change', onAuth);
  }, [refreshUser]);

  const backLink = (
    <Link
      to="/"
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:text-white"
    >
      <span aria-hidden>←</span>
      {t('purchase.backHome')}
    </Link>
  );

  return (
    <div className="relative min-h-full w-full min-w-0 lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="flex flex-col bg-slark-bg lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden dark:bg-slark-dark">
        <ApiKeyHeroPanel
          title={t('purchase.title')}
          subtitle={t('purchase.subtitle')}
          backLink={backLink}
        />

        <main className="relative flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
          <div className="relative thin-scrollbar flex flex-1 items-center justify-center px-4 py-10 pb-16 pt-14 sm:px-6 sm:py-12 sm:pb-20 lg:overflow-y-auto lg:px-10 lg:py-10 lg:pb-12">
            <div className="mx-auto w-full max-w-2xl">
              <div className="mb-6 text-center sm:mb-8">
                <h2 className="font-cyber text-xl font-bold tracking-tight text-slark-text dark:text-white sm:text-2xl">
                  {t('purchase.panelTitle')}
                </h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slark-muted sm:text-[15px]">
                  {t('purchase.panelLead')}
                </p>
              </div>

              {loading && (
                <div className="h-64 animate-pulse rounded-2xl border border-slark-border bg-slark-card dark:bg-slark-dark/60" />
              )}

              {!loading && !user && (
                <p className="text-center text-sm text-amber-800 dark:text-amber-300 sm:text-base">
                  {t('purchase.signInRequired')}{' '}
                  <Link
                    to={`/?getstarted=1&return=${encodeURIComponent('/api-key')}`}
                    className="font-semibold text-slark-primary underline"
                  >
                    {t('profile.signIn')}
                  </Link>
                </p>
              )}

              {!loading && user && (
                <div id="api-key" className="w-full">
                  <SubscriptionBillingCard user={user} />
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
