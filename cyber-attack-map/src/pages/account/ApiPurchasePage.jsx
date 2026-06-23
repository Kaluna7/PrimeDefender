import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { SubscriptionBillingCard } from '../../components/account/SubscriptionBillingCard.jsx';
import { fetchAuthStatus } from '../../services/auth.js';
import {
  confirmPaymentOrder,
  createSnapCheckout,
  fetchPaymentConfig,
  formatIdr,
  loadMidtransSnap,
  syncPendingPayments,
} from '../../services/payment.js';

function planTitle(t, locale, plan) {
  if (locale === 'id') {
    if (plan.id === 'sub_6m') return t('purchase.plan6m');
    if (plan.id === 'sub_1y') return t('purchase.plan1y');
    return t('purchase.plan2y');
  }
  if (plan.id === 'sub_6m') return t('purchase.plan6m');
  if (plan.id === 'sub_1y') return t('purchase.plan1y');
  return t('purchase.plan2y');
}

export function ApiPurchasePage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [payingPlanId, setPayingPlanId] = useState('');
  const [paymentOverlayOpen, setPaymentOverlayOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [syncing, setSyncing] = useState(false);
  const lastOrderIdRef = useRef('');

  const closePaymentOverlay = useCallback(() => {
    setPaymentOverlayOpen(false);
  }, []);

  const statusParam = searchParams.get('status');
  const orderIdParam = searchParams.get('order_id');

  const refreshUser = useCallback(async () => {
    const auth = await fetchAuthStatus();
    setUser(auth.ok ? auth.user : null);
  }, []);

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.purchase')}`;
  }, [t, locale]);

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
      await syncPendingPayments();
      await refreshUser();
      window.dispatchEvent(new Event('slark-auth-change'));
      const auth = await fetchAuthStatus();
      if (auth.ok && auth.user?.subscription?.active) {
        setMessage(t('purchase.syncSuccess'));
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

  const handleBuy = async (planId) => {
    setError('');
    setMessage('');
    if (!user) {
      navigate('/signin');
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

    setPayingPlanId(planId);
    try {
      const checkout = await createSnapCheckout(planId);
      if (!checkout.ok) {
        const errMap = {
          not_authenticated: t('purchase.signInRequired'),
          mongo_disabled: t('purchase.mongoRequired'),
          midtrans_not_configured: t('purchase.midtransNotReady'),
          snap_failed: t('purchase.snapFailed'),
        };
        setError(errMap[checkout.error] || t('purchase.checkoutFailed'));
        return;
      }

      if (!config?.clientKey) {
        setError(t('purchase.midtransNotReady'));
        return;
      }

      const snap = await loadMidtransSnap({
        clientKey: config.clientKey,
        isProduction: config.isProduction,
      });

      lastOrderIdRef.current = checkout.orderId;
      setPaymentOverlayOpen(true);

      snap.pay(checkout.snapToken, {
        onSuccess: async () => {
          closePaymentOverlay();
          const ok = await confirmPaymentAndRefresh(checkout.orderId);
          if (!ok) await runSyncPayments();
        },
        onPending: async () => {
          closePaymentOverlay();
          setMessage(t('purchase.paymentPending'));
          await confirmPaymentAndRefresh(checkout.orderId);
        },
        onError: () => {
          closePaymentOverlay();
          setError(t('purchase.paymentError'));
        },
        onClose: () => {
          closePaymentOverlay();
          setMessage(t('purchase.paymentClosed'));
        },
      });
    } catch {
      closePaymentOverlay();
      setError(t('purchase.checkoutFailed'));
    } finally {
      setPayingPlanId('');
    }
  };

  const activeSub = user?.subscription?.active;

  return (
    <div className="relative min-h-full">
      {paymentOverlayOpen && (
        <div
          className="pointer-events-none fixed inset-0 z-[100] bg-slark-dark/25 backdrop-blur-lg dark:bg-black/40"
          aria-hidden
        />
      )}
      <div
        className={`thin-scrollbar h-full overflow-y-auto bg-slark-bg px-4 py-10 pb-24 pt-16 transition-[filter,transform] duration-300 dark:bg-slark-dark ${
          paymentOverlayOpen
            ? 'pointer-events-none scale-[0.995] blur-md brightness-[0.92] dark:brightness-75'
            : ''
        }`}
      >
      <div className="mx-auto max-w-4xl">
        <p className="font-cyber text-xs uppercase tracking-[0.35em] text-slark-primary">
          {t('brand.name')}
        </p>
        <h1 className="font-cyber mt-2 text-2xl font-bold text-slark-text dark:text-white md:text-3xl">
          {t('purchase.title')}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-slark-muted">{t('purchase.subtitle')}</p>

        {activeSub && user && (
          <div className="mt-8" id="subscription-billing">
            <SubscriptionBillingCard user={user} />
          </div>
        )}

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
          <p className="mt-4 text-sm text-amber-800 dark:text-amber-300">
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

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {loading &&
            [1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-48 animate-pulse rounded-2xl border border-slark-border bg-slark-card dark:bg-slark-dark/60"
              />
            ))}
          {!loading &&
            plans.map((plan) => {
              const popular = plan.id === 'sub_1y';
              return (
                <div
                  key={plan.id}
                  className={`relative flex flex-col rounded-2xl border p-5 shadow-sm transition dark:shadow-none ${
                    popular
                      ? 'border-slark-primary/50 bg-slark-card ring-2 ring-slark-primary/20 dark:bg-slark-dark/80'
                      : 'border-slark-border bg-slark-bg dark:bg-slark-dark/60'
                  }`}
                >
                  {popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-slark-primary px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      {t('purchase.popular')}
                    </span>
                  )}
                  <h2 className="font-cyber text-sm font-bold uppercase tracking-wider text-slark-text dark:text-white">
                    {planTitle(t, locale, plan)}
                  </h2>
                  <p className="mt-3 font-cyber text-2xl font-bold tabular-nums text-slark-text dark:text-white">
                    {formatIdr(plan.amount)}
                  </p>
                  <p className="mt-2 text-xs text-slark-muted">{t('purchase.perPackage')}</p>
                  <ul className="mt-4 flex-1 space-y-2 text-xs text-slark-muted">
                    <li>• {t('purchase.featureIngest')}</li>
                    <li>• {t('purchase.featureMap')}</li>
                    <li>• {t('purchase.featureKeys')}</li>
                  </ul>
                  <button
                    type="button"
                    disabled={!!payingPlanId || loading}
                    onClick={() => handleBuy(plan.id)}
                    className={`mt-5 w-full rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest transition disabled:opacity-50 ${
                      popular
                        ? 'bg-slark-primary text-white shadow-slark hover:bg-slark-primary-hover'
                        : 'border border-slark-primary/40 bg-slark-primary/10 text-slark-primary hover:bg-slark-primary/20 dark:text-white'
                    }`}
                  >
                    {payingPlanId === plan.id ? t('purchase.processing') : t('purchase.buyNow')}
                  </button>
                </div>
              );
            })}
        </div>

        <p className="mt-8 text-center text-[11px] text-slark-muted">{t('purchase.midtransNote')}</p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/settings"
            className="rounded-xl border border-slark-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:border-slark-primary hover:text-slark-primary"
          >
            {t('purchase.ctaSettings')}
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-slark-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:border-slark-primary hover:text-slark-primary"
          >
            {t('purchase.backHome')}
          </Link>
        </div>
      </div>
      </div>
    </div>
  );
}
