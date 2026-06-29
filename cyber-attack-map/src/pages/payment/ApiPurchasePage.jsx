import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useMatch, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { SubscriptionBillingCard, ApiKeySuccessPopup } from '../account/SubscriptionBillingCard.jsx';
import { DEFAULT_PAYMENT_METHODS } from '../../constants/paymentMethods.js';
import { fetchAuthStatus } from '../../services/auth.js';
import { extractApiKeyFromPaymentResult } from '../../services/apiKey.js';
import {
  confirmPaymentOrder,
  fetchPaymentConfig,
  formatIdr,
  syncPendingPayments,
} from '../../services/payment.js';
import { PurchaseCheckoutPanel } from './PurchaseCheckoutPanel.jsx';
import { PurchaseHeroPanel } from './PurchaseHeroPanel.jsx';
import { PurchaseRightFooter } from './PurchaseRightFooter.jsx';
import { planTitle } from './planTitle.js';

export function ApiPurchasePage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const checkoutMatch = useMatch('/purchase/checkout/:planId');
  const checkoutPlanId = checkoutMatch?.params?.planId ?? null;
  const checkoutPanelRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [successApiKey, setSuccessApiKey] = useState('');

  const statusParam = searchParams.get('status');
  const orderIdParam = searchParams.get('order_id');

  const refreshUser = useCallback(async () => {
    const auth = await fetchAuthStatus();
    setUser(auth.ok ? auth.user : null);
  }, []);

  useEffect(() => {
    document.title = checkoutPlanId
      ? `${t('brand.name')} – ${t('purchase.checkoutTitle')}`
      : `${t('brand.name')} – ${t('nav.purchase')}`;
  }, [t, locale, checkoutPlanId]);

  useEffect(() => {
    if (!checkoutPlanId) return;
    const scrollRoot = document.getElementById('app-scroll-root');
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    if (isDesktop) {
      checkoutPanelRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      scrollRoot?.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [checkoutPlanId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cfg, auth] = await Promise.all([fetchPaymentConfig(), fetchAuthStatus()]);
      if (cancelled) return;
      setConfig(cfg);
      setUser(auth.ok ? auth.user : null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onAuth = () => refreshUser();
    window.addEventListener('slark-auth-change', onAuth);
    return () => window.removeEventListener('slark-auth-change', onAuth);
  }, [refreshUser]);

  const scrollToBilling = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById('subscription-billing')?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const confirmPaymentAndRefresh = useCallback(
    async (orderId) => {
      if (!orderId) return false;
      const result = await confirmPaymentOrder(orderId);
      if (result.ok) {
        setError('');
        setMessage(t('purchase.paymentSuccess'));
        const key = extractApiKeyFromPaymentResult(result);
        if (key) setSuccessApiKey(key);
        await refreshUser();
        window.dispatchEvent(new Event('slark-auth-change'));
        scrollToBilling();
        return true;
      }
      if (result.error === 'not_paid_yet') {
        setMessage(t('purchase.paymentPending'));
        return false;
      }
      return false;
    },
    [refreshUser, scrollToBilling, t]
  );

  const runSyncPayments = useCallback(async () => {
    setSyncing(true);
    setError('');
    try {
      const syncResult = await syncPendingPayments();
      await refreshUser();
      window.dispatchEvent(new Event('slark-auth-change'));
      const auth = await fetchAuthStatus();
      if (auth.ok && auth.user?.subscription?.active) {
        setMessage(t('purchase.syncSuccess'));
        const keyFromSync = syncResult.results
          ?.map((r) => extractApiKeyFromPaymentResult(r))
          .find(Boolean);
        if (keyFromSync) setSuccessApiKey(keyFromSync);
        scrollToBilling();
      } else {
        setMessage(t('purchase.syncNone'));
      }
    } catch {
      setError(t('purchase.checkoutFailed'));
    } finally {
      setSyncing(false);
    }
  }, [refreshUser, scrollToBilling, t]);

  useEffect(() => {
    if (!user || user.subscription?.active) return undefined;
    let cancelled = false;
    (async () => {
      await syncPendingPayments();
      if (!cancelled) await refreshUser();
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.email, user?.subscription?.active, refreshUser]);

  useEffect(() => {
    if (statusParam === 'finish' && orderIdParam) {
      (async () => {
        const ok = await confirmPaymentAndRefresh(orderIdParam);
        if (!ok) await runSyncPayments();
      })();
    } else if (statusParam === 'finish') {
      runSyncPayments();
    } else if (statusParam === 'unfinish') {
      setMessage(t('purchase.paymentUnfinish'));
    } else if (statusParam === 'error') {
      setError(t('purchase.paymentError'));
    }
  }, [statusParam, orderIdParam, confirmPaymentAndRefresh, runSyncPayments, t]);

  const plans = useMemo(() => config?.plans || [], [config]);

  const paymentMethods = useMemo(() => {
    const fromApi = config?.paymentMethods;
    if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
    return DEFAULT_PAYMENT_METHODS;
  }, [config]);

  const handlePaymentSuccess = useCallback(
    (orderId) => {
      if (orderId) navigate(`/purchase?status=finish&order_id=${orderId}`);
      else navigate('/purchase?status=finish');
    },
    [navigate]
  );

  const handleBackToPlans = useCallback(() => {
    navigate('/purchase');
  }, [navigate]);

  const handleSubscribe = (planId) => {
    setError('');
    setMessage('');
    if (!user) {
      navigate('/signin', { state: { from: `/purchase/checkout/${planId}` } });
      return;
    }
    if (!config?.midtransConfigured) {
      setError(t('purchase.midtransNotReady'));
      return;
    }
    if (config?.mongoRequired) {
      setError(t('purchase.mongoRequired'));
      return;
    }
    navigate(`/purchase/checkout/${planId}`);
  };

  const activeSub = user?.subscription?.active;
  const currentPlanId = activeSub ? user?.subscription?.planId : null;

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
        <PurchaseHeroPanel
          title={t('purchase.title')}
          subtitle={t('purchase.subtitle')}
          methods={paymentMethods}
          backLink={backLink}
        />

        <main className="relative flex min-w-0 flex-1 flex-col lg:min-h-0 lg:overflow-hidden">
          <div className="relative lg:min-h-0 lg:flex-1 lg:overflow-hidden">
          <div
            className={`flex w-full flex-col lg:h-full lg:w-[200%] lg:flex-row motion-safe:transition-transform motion-safe:duration-500 motion-safe:ease-in-out ${
              checkoutPlanId ? 'lg:-translate-x-1/2' : ''
            }`}
          >
            <div
              className={`thin-scrollbar w-full shrink-0 px-3 py-5 pb-16 pt-12 sm:px-4 sm:py-6 sm:pb-20 sm:pt-14 lg:h-full lg:w-1/2 lg:overflow-y-auto lg:px-8 lg:py-8 lg:pb-10 lg:pt-12 ${
                checkoutPlanId ? 'hidden lg:block' : 'block'
              }`}
            >
              <div className="mx-auto w-full max-w-5xl">
                {activeSub && user && (
                  <div id="subscription-billing">
                    <SubscriptionBillingCard user={user} compact onRefresh={refreshUser} />
                  </div>
                )}

                <div className={activeSub ? 'mt-6' : ''}>
                  {message && (
                    <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/30 dark:text-emerald-300">
                      {message}
                    </p>
                  )}
                  {error && (
                    <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                      {error}
                    </p>
                  )}

                  {!user && !loading && (
                    <p className={`text-sm text-amber-800 dark:text-amber-300 ${activeSub ? 'mt-4' : ''}`}>
                      {t('purchase.signInRequired')}{' '}
                      <Link to="/signin" className="font-semibold text-slark-primary underline">
                        {t('profile.signIn')}
                      </Link>
                    </p>
                  )}

                  {user && !loading && !user.subscription?.active && (
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-slark-primary/25 bg-slark-card px-4 py-3">
                      <p className="flex-1 text-xs text-slark-muted">{t('purchase.syncHint')}</p>
                      <button
                        type="button"
                        disabled={syncing}
                        onClick={runSyncPayments}
                        className="shrink-0 rounded-lg bg-slark-primary px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slark-primary-hover disabled:opacity-50"
                      >
                        {syncing ? t('purchase.syncing') : t('purchase.syncButton')}
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {loading &&
                      [1, 2, 3].map((n) => (
                        <div
                          key={n}
                          className="h-52 animate-pulse rounded-2xl border border-slark-border bg-slark-card dark:bg-slark-dark/60"
                        />
                      ))}
                    {!loading &&
                      plans.map((plan) => {
                        const popular = plan.id === 'sub_1y';
                        const isCurrent = plan.id === currentPlanId;
                        const highlight = isCurrent || (!currentPlanId && popular);

                        return (
                          <div
                            key={plan.id}
                            className={`relative flex flex-col rounded-2xl border p-4 shadow-sm transition dark:shadow-none sm:p-5 ${
                              isCurrent
                                ? 'border-emerald-500/50 bg-emerald-50/50 ring-2 ring-emerald-500/25 dark:border-emerald-500/30 dark:bg-emerald-950/20'
                                : highlight
                                  ? 'border-slark-primary/50 bg-slark-card ring-2 ring-slark-primary/20 dark:bg-slark-dark/80'
                                  : 'border-slark-border bg-slark-bg dark:bg-slark-dark/60'
                            }`}
                          >
                            {isCurrent && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-600 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                {t('purchase.currentPlan')}
                              </span>
                            )}
                            {!isCurrent && popular && !currentPlanId && (
                              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-slark-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                                {t('purchase.popular')}
                              </span>
                            )}
                            <h2 className="font-cyber text-xs font-bold uppercase tracking-wider text-slark-text dark:text-white sm:text-sm">
                              {planTitle(t, plan)}
                            </h2>
                            <p className="mt-2 font-cyber text-xl font-bold tabular-nums text-slark-text dark:text-white sm:mt-3 sm:text-2xl">
                              {formatIdr(plan.amount)}
                            </p>
                            <p className="mt-1.5 text-[11px] text-slark-muted sm:mt-2 sm:text-xs">{t('purchase.perPackage')}</p>
                            <ul className="mt-3 flex-1 space-y-1.5 text-[11px] text-slark-muted sm:mt-4 sm:space-y-2 sm:text-xs">
                              <li>• {t('purchase.featureIngest')}</li>
                              <li>• {t('purchase.featureMap')}</li>
                              <li>• {t('purchase.featureKeys')}</li>
                            </ul>
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleSubscribe(plan.id)}
                              className={`mt-5 w-full rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition disabled:opacity-50 ${
                                isCurrent
                                  ? 'border border-emerald-500/40 bg-emerald-600 text-white hover:bg-emerald-700'
                                  : highlight
                                    ? 'bg-slark-primary text-white shadow-slark hover:bg-slark-primary-hover'
                                    : 'border border-slark-primary/40 bg-slark-primary/10 text-slark-primary hover:bg-slark-primary/20 dark:text-white'
                              }`}
                            >
                              {isCurrent ? t('purchase.extendPlan') : t('purchase.buyNow')}
                            </button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </div>

            <div
              ref={checkoutPanelRef}
              className={`thin-scrollbar w-full shrink-0 px-3 py-5 pb-16 pt-12 sm:px-4 sm:py-6 sm:pb-20 sm:pt-14 lg:h-full lg:w-1/2 lg:overflow-y-auto lg:px-8 lg:py-8 lg:pb-10 lg:pt-12 ${
                checkoutPlanId ? 'block' : 'hidden lg:block'
              }`}
            >
              {checkoutPlanId && (
                <PurchaseCheckoutPanel
                  planId={checkoutPlanId}
                  config={config}
                  user={user}
                  loadingParent={loading}
                  onBack={handleBackToPlans}
                  onPaymentSuccess={handlePaymentSuccess}
                />
              )}
            </div>
          </div>
          </div>
          <PurchaseRightFooter />
        </main>
      </div>

      <ApiKeySuccessPopup apiKey={successApiKey} onClose={() => setSuccessApiKey('')} />
    </div>
  );
}
