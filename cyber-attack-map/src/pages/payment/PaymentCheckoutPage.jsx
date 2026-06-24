import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PaymentMethodPicker } from '../../components/payment/PaymentMethodPicker.jsx';
import {
  DEFAULT_PAYMENT_METHOD_CATEGORIES,
  DEFAULT_PAYMENT_METHODS,
} from '../../constants/paymentMethods.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus } from '../../services/auth.js';
import {
  confirmPaymentOrder,
  createPaymentCharge,
  fetchPaymentConfig,
  formatIdr,
  syncPendingPayments,
} from '../../services/payment.js';

function planTitle(t, plan) {
  if (plan.id === 'sub_6m') return t('purchase.plan6m');
  if (plan.id === 'sub_1y') return t('purchase.plan1y');
  return t('purchase.plan2y');
}

function qrImageUrl(qrString) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrString)}`;
}

function PaymentInstructions({ display, plan, orderId, locale, t, onCheckStatus, checking }) {
  const [copied, setCopied] = useState('');

  const copyText = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    } catch {
      /* ignore */
    }
  };

  const expiryLabel = display.expiryTime
    ? t('purchase.checkoutExpiry').replace(
        '{date}',
        new Date(display.expiryTime).toLocaleString(locale === 'id' ? 'id-ID' : 'en-US')
      )
    : null;

  return (
    <div className="mt-8 rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-5 dark:border-emerald-500/20 dark:bg-emerald-950/20">
      <p className="font-cyber text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
        {t('purchase.checkoutInstructionsTitle')}
      </p>
      <p className="mt-1 text-xs text-slark-muted">
        {t('purchase.checkoutOrderId')}: <span className="font-mono">{orderId}</span>
      </p>

      {display.type === 'redirect' && display.redirectUrl && (
        <div className="mt-4">
          <p className="text-sm text-slark-text dark:text-white">{t('purchase.checkoutCardHint')}</p>
          <a
            href={display.redirectUrl}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover"
          >
            {t('purchase.checkoutContinueCard')}
          </a>
        </div>
      )}

      {display.type === 'va' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slark-text dark:text-white">
            {t('purchase.checkoutVaHint').replace('{amount}', formatIdr(plan.amount))}
          </p>
          {display.vaNumbers?.map((va) => {
            const key = `${va.bank}-${va.vaNumber}`;
            return (
              <div
                key={key}
                className="rounded-xl border border-slark-border bg-slark-bg px-4 py-3 dark:bg-slark-dark/80"
              >
                <p className="text-[10px] font-bold uppercase tracking-wider text-slark-muted">{va.bank}</p>
                <div className="mt-1 flex items-center justify-between gap-3">
                  <p className="font-mono text-lg font-bold tracking-wide text-slark-text dark:text-white">
                    {va.vaNumber}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyText(va.vaNumber, key)}
                    className="shrink-0 rounded-lg border border-slark-primary/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slark-primary"
                  >
                    {copied === key ? t('purchase.checkoutCopied') : t('purchase.checkoutCopy')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {display.type === 'cstore' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slark-text dark:text-white">{t('purchase.checkoutCstoreHint')}</p>
          <div className="rounded-xl border border-slark-border bg-slark-bg px-4 py-3 dark:bg-slark-dark/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slark-muted">{display.store}</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <p className="font-mono text-lg font-bold tracking-wide text-slark-text dark:text-white">
                {display.paymentCode}
              </p>
              <button
                type="button"
                onClick={() => copyText(display.paymentCode, 'cstore')}
                className="shrink-0 rounded-lg border border-slark-primary/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slark-primary"
              >
                {copied === 'cstore' ? t('purchase.checkoutCopied') : t('purchase.checkoutCopy')}
              </button>
            </div>
          </div>
        </div>
      )}

      {display.type === 'mandiri' && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slark-text dark:text-white">{t('purchase.checkoutMandiriHint')}</p>
          <div className="rounded-xl border border-slark-border bg-slark-bg px-4 py-3 dark:bg-slark-dark/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slark-muted">Biller Code</p>
            <p className="font-mono text-lg font-bold text-slark-text dark:text-white">{display.billerCode}</p>
          </div>
          <div className="rounded-xl border border-slark-border bg-slark-bg px-4 py-3 dark:bg-slark-dark/80">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slark-muted">Bill Key</p>
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-lg font-bold text-slark-text dark:text-white">{display.billKey}</p>
              <button
                type="button"
                onClick={() => copyText(display.billKey, 'bill')}
                className="shrink-0 rounded-lg border border-slark-primary/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slark-primary"
              >
                {copied === 'bill' ? t('purchase.checkoutCopied') : t('purchase.checkoutCopy')}
              </button>
            </div>
          </div>
        </div>
      )}

      {display.type === 'qris' && (
        <div className="mt-4">
          <p className="text-sm text-slark-text dark:text-white">{t('purchase.checkoutQrisHint')}</p>
          {display.qrString && (
            <img
              src={qrImageUrl(display.qrString)}
              alt="QRIS"
              className="mx-auto mt-4 rounded-xl border border-slark-border bg-white p-2"
              width={220}
              height={220}
            />
          )}
          {!display.qrString && display.qrUrl && (
            <img
              src={display.qrUrl}
              alt="QRIS"
              className="mx-auto mt-4 rounded-xl border border-slark-border bg-white p-2"
              width={220}
              height={220}
            />
          )}
        </div>
      )}

      {display.type === 'deeplink' && (
        <div className="mt-4">
          <p className="text-sm text-slark-text dark:text-white">{t('purchase.checkoutDeeplinkHint')}</p>
          {display.deeplinkUrl && (
            <a
              href={display.deeplinkUrl}
              className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover"
            >
              {t('purchase.checkoutOpenApp')}
            </a>
          )}
        </div>
      )}

      {display.type === 'pending' && (
        <p className="mt-4 text-sm text-slark-muted">{t('purchase.paymentPending')}</p>
      )}

      {expiryLabel && <p className="mt-4 text-xs text-slark-muted">{expiryLabel}</p>}

      {display.type !== 'redirect' && (
        <button
          type="button"
          disabled={checking}
          onClick={onCheckStatus}
          className="mt-5 w-full rounded-xl border border-slark-primary/40 bg-slark-primary/10 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slark-primary hover:bg-slark-primary/20 disabled:opacity-50 dark:text-white"
        >
          {checking ? t('purchase.syncing') : t('purchase.checkoutCheckStatus')}
        </button>
      )}
    </div>
  );
}

export function PaymentCheckoutPage() {
  const { planId } = useParams();
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);

  const plan = useMemo(
    () => config?.plans?.find((p) => p.id === planId) || null,
    [config, planId]
  );

  const paymentMethods = useMemo(() => {
    const fromApi = config?.paymentMethods;
    if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
    return DEFAULT_PAYMENT_METHODS;
  }, [config]);

  const paymentCategories = useMemo(() => {
    const fromApi = config?.paymentMethodCategories;
    if (Array.isArray(fromApi) && fromApi.length > 0) return fromApi;
    return DEFAULT_PAYMENT_METHOD_CATEGORIES;
  }, [config]);

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('purchase.checkoutTitle')}`;
  }, [t, locale]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cfg, auth] = await Promise.all([fetchPaymentConfig(), fetchAuthStatus()]);
      if (cancelled) return;
      setConfig(cfg);
      setUser(auth.ok ? auth.user : null);
      setLoading(false);
      if (!auth.ok) {
        navigate('/signin', { replace: true, state: { from: `/purchase/checkout/${planId}` } });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, planId]);

  const checkoutErrorMessage = useCallback(
    (code) => {
      const errMap = {
        not_authenticated: t('purchase.signInRequired'),
        mongo_disabled: t('purchase.mongoRequired'),
        midtrans_not_configured: t('purchase.midtransNotReady'),
        charge_failed: t('purchase.chargeFailed'),
        invalid_plan: t('purchase.checkoutInvalidPlan'),
        invalid_payment_method: t('purchase.checkoutSelectMethod'),
      };
      return errMap[code] || t('purchase.checkoutFailed');
    },
    [t]
  );

  const handlePay = async (e) => {
    e.preventDefault();
    setError('');
    if (!user) {
      navigate('/signin');
      return;
    }
    if (!plan) {
      setError(t('purchase.checkoutInvalidPlan'));
      return;
    }
    if (!selectedMethod) {
      setError(t('purchase.checkoutSelectMethod'));
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

    setProcessing(true);
    setPaymentResult(null);
    try {
      const result = await createPaymentCharge(plan.id, selectedMethod);
      if (!result.ok) {
        setError(checkoutErrorMessage(result.error));
        return;
      }
      setPaymentResult(result);
      if (result.display?.type === 'redirect' && result.display.redirectUrl) {
        window.location.assign(result.display.redirectUrl);
      }
    } catch {
      setError(t('purchase.checkoutFailed'));
    } finally {
      setProcessing(false);
    }
  };

  const handleCheckStatus = async () => {
    if (!paymentResult?.orderId) return;
    setChecking(true);
    setError('');
    try {
      const confirmed = await confirmPaymentOrder(paymentResult.orderId);
      if (confirmed.ok) {
        window.dispatchEvent(new Event('slark-auth-change'));
        navigate(`/purchase?status=finish&order_id=${paymentResult.orderId}`);
        return;
      }
      await syncPendingPayments();
      const auth = await fetchAuthStatus();
      if (auth.ok && auth.user?.subscription?.active) {
        navigate('/purchase?status=finish');
        return;
      }
      setError(t('purchase.paymentPending'));
    } catch {
      setError(t('purchase.checkoutFailed'));
    } finally {
      setChecking(false);
    }
  };

  if (!loading && !plan) {
    return (
      <div className="thin-scrollbar h-full overflow-y-auto bg-slark-bg px-4 py-10 pb-24 pt-16 dark:bg-slark-dark">
        <div className="mx-auto max-w-lg text-center">
          <h1 className="font-cyber text-xl font-bold text-slark-text dark:text-white">
            {t('purchase.checkoutInvalidPlan')}
          </h1>
          <Link
            to="/purchase"
            className="mt-6 inline-block rounded-xl border border-slark-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:border-slark-primary hover:text-slark-primary"
          >
            {t('purchase.checkoutBackPlans')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-slark-bg px-4 py-10 pb-24 pt-16 dark:bg-slark-dark">
      <div className="mx-auto max-w-lg">
        <Link
          to="/purchase"
          className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:text-slark-primary"
        >
          ← {t('purchase.checkoutBackPlans')}
        </Link>

        <p className="font-cyber mt-6 text-xs uppercase tracking-[0.35em] text-slark-primary">
          {t('purchase.checkoutTitle')}
        </p>
        <h1 className="font-cyber mt-2 text-2xl font-bold text-slark-text dark:text-white">
          {loading ? '…' : planTitle(t, plan)}
        </h1>
        <p className="mt-2 text-sm text-slark-muted">{t('purchase.checkoutSubtitle')}</p>

        <div className="mt-8 rounded-2xl border border-slark-primary/30 bg-slark-card p-6 shadow-sm dark:bg-slark-dark/80 dark:shadow-none">
          <p className="text-xs font-semibold uppercase tracking-wider text-slark-muted">
            {t('purchase.checkoutTotal')}
          </p>
          <p className="font-cyber mt-2 text-3xl font-bold tabular-nums text-slark-text dark:text-white">
            {loading ? '…' : formatIdr(plan.amount)}
          </p>
          <p className="mt-2 text-xs text-slark-muted">{t('purchase.perPackage')}</p>
        </div>

        {!paymentResult && (
          <form onSubmit={handlePay} className="mt-8">
            <p className="font-cyber text-sm font-bold uppercase tracking-wider text-slark-text dark:text-white">
              {t('purchase.checkoutPayWith')}
            </p>
            <p className="mt-1 text-xs text-slark-muted">{t('purchase.checkoutPayHint')}</p>
            <p className="mt-1 text-[10px] text-slark-muted/80">{t('purchase.checkoutMidtransNote')}</p>

            <PaymentMethodPicker
              methods={paymentMethods}
              categories={paymentCategories}
              locale={locale}
              selectedId={selectedMethod}
              onSelect={setSelectedMethod}
              disabled={processing}
              loading={loading}
            />

            {error && (
              <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || processing || !selectedMethod}
              className="mt-6 w-full rounded-xl bg-slark-primary px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-slark transition hover:bg-slark-primary-hover disabled:opacity-50"
            >
              {processing ? t('purchase.checkoutProcessing') : t('purchase.checkoutPayNow')}
            </button>
          </form>
        )}

        {paymentResult && (
          <>
            {error && (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
                {error}
              </p>
            )}
            <PaymentInstructions
              display={paymentResult.display}
              plan={plan}
              orderId={paymentResult.orderId}
              locale={locale}
              t={t}
              onCheckStatus={handleCheckStatus}
              checking={checking}
            />
          </>
        )}
      </div>
    </div>
  );
}
