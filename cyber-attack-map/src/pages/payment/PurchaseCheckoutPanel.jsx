import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PaymentMethodPicker } from '../../components/payment/PaymentMethodPicker.jsx';
import { PaymentOutcomeModal } from '../../components/payment/PaymentOutcomeModal.jsx';
import { PaymentSnapWaitingOverlay } from '../../components/payment/PaymentSnapWaitingOverlay.jsx';
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
import { planTitle } from './planTitle.js';

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

/**
 * @param {{
 *   planId: string,
 *   onBack: () => void,
 *   onPaymentSuccess: (orderId?: string) => void,
 *   config?: object | null,
 *   user?: object | null,
 *   loadingParent?: boolean,
 * }} props
 */
export function PurchaseCheckoutPanel({
  planId,
  onBack,
  onPaymentSuccess,
  config: configProp,
  user: userProp,
  loadingParent = false,
}) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [config, setConfig] = useState(configProp ?? null);
  const [user, setUser] = useState(userProp ?? null);
  const [loading, setLoading] = useState(!configProp);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [processing, setProcessing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');
  const [paymentResult, setPaymentResult] = useState(null);
  const [snapWaiting, setSnapWaiting] = useState(false);
  const [outcomeModal, setOutcomeModal] = useState(null);
  const snapPollRef = useRef(null);
  const snapPopupRef = useRef(null);

  useEffect(() => {
    setConfig(configProp ?? null);
    setUser(userProp ?? null);
    if (configProp) setLoading(false);
  }, [configProp, userProp]);

  useEffect(() => {
    setSelectedMethod('');
    setPaymentResult(null);
    setError('');
    setSnapWaiting(false);
    setOutcomeModal(null);
  }, [planId]);

  useEffect(() => {
    return () => {
      if (snapPollRef.current) clearInterval(snapPollRef.current);
    };
  }, []);

  const stopSnapWatch = useCallback(() => {
    if (snapPollRef.current) {
      clearInterval(snapPollRef.current);
      snapPollRef.current = null;
    }
    snapPopupRef.current = null;
    setSnapWaiting(false);
  }, []);

  const handleSnapSuccess = useCallback(
    (orderId) => {
      stopSnapWatch();
      setOutcomeModal('success');
      window.dispatchEvent(new Event('slark-auth-change'));
      onPaymentSuccess(orderId);
    },
    [onPaymentSuccess, stopSnapWatch]
  );

  const handleSnapDeclined = useCallback(() => {
    stopSnapWatch();
    setOutcomeModal('declined');
    setPaymentResult(null);
  }, [stopSnapWatch]);

  const beginSnapPolling = useCallback(
    (orderId) => {
      if (snapPollRef.current) clearInterval(snapPollRef.current);

      const poll = async () => {
        try {
          const confirmed = await confirmPaymentOrder(orderId);
          if (confirmed.ok) {
            handleSnapSuccess(orderId);
            return;
          }

          if (confirmed.error === 'payment_declined' || confirmed.declined) {
            handleSnapDeclined();
            return;
          }

          const popupClosed = !snapPopupRef.current || snapPopupRef.current.closed;
          if (popupClosed) {
            const retry = await confirmPaymentOrder(orderId);
            if (retry.ok) {
              handleSnapSuccess(orderId);
              return;
            }
            if (retry.error === 'payment_declined' || retry.declined) {
              handleSnapDeclined();
              return;
            }
            handleSnapDeclined();
          }
        } catch {
          /* keep polling until popup closes or success */
        }
      };

      poll();
      snapPollRef.current = setInterval(poll, 2500);
    },
    [handleSnapDeclined, handleSnapSuccess]
  );

  const openSnapPopup = useCallback((redirectUrl, existingPopup = null) => {
    let popup = existingPopup;
    if (popup && !popup.closed) {
      popup.location.href = redirectUrl;
      return popup;
    }

    popup = window.open(redirectUrl, '_blank');
    if (popup) {
      try {
        popup.opener = null;
      } catch {
        /* ignore */
      }
    }
    return popup;
  }, []);

  const startSnapPaymentWatch = useCallback(
    (orderId, redirectUrl, existingPopup = null) => {
      if (snapPollRef.current) {
        clearInterval(snapPollRef.current);
        snapPollRef.current = null;
      }

      setSnapWaiting(true);
      setError('');
      const popup = openSnapPopup(redirectUrl, existingPopup);
      snapPopupRef.current = popup;

      if (!popup) {
        setSnapWaiting(false);
        setError(t('purchase.snapPopupBlocked'));
        return;
      }

      beginSnapPolling(orderId);
    },
    [beginSnapPolling, openSnapPopup, t]
  );

  const handleManualSnapOpen = useCallback(() => {
    const redirectUrl = paymentResult?.display?.redirectUrl;
    const orderId = paymentResult?.orderId;
    if (!redirectUrl || !orderId) return;
    setError('');
    startSnapPaymentWatch(orderId, redirectUrl);
  }, [paymentResult, startSnapPaymentWatch]);

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
    if (configProp) return undefined;
    let cancelled = false;
    (async () => {
      const [cfg, auth] = await Promise.all([fetchPaymentConfig(), fetchAuthStatus()]);
      if (cancelled) return;
      setConfig(cfg);
      setUser(auth.ok ? auth.user : null);
      setLoading(false);
      if (!auth.ok) {
        navigate(`/?getstarted=1&return=${encodeURIComponent(`/purchase/checkout/${planId}`)}`, { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [configProp, navigate, planId]);

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
      navigate(`/?getstarted=1&return=${encodeURIComponent(`/purchase/checkout/${planId}`)}`);
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

    const isCardSnap = selectedMethod === 'credit_card';
    let snapPopup = null;
    if (isCardSnap) {
      setSnapWaiting(true);
      snapPopup = window.open('about:blank', '_blank');
      if (snapPopup) {
        try {
          snapPopup.opener = null;
        } catch {
          /* ignore */
        }
        snapPopupRef.current = snapPopup;
      }
    }

    try {
      const result = await createPaymentCharge(plan.id, selectedMethod);
      if (!result.ok) {
        if (isCardSnap) {
          snapPopup?.close();
          stopSnapWatch();
        }
        setError(checkoutErrorMessage(result.error));
        return;
      }
      setPaymentResult(result);
      if (result.display?.type === 'redirect' && result.display.redirectUrl) {
        startSnapPaymentWatch(result.orderId, result.display.redirectUrl, snapPopup);
      } else if (isCardSnap) {
        snapPopup?.close();
        stopSnapWatch();
      }
    } catch {
      if (isCardSnap) {
        snapPopup?.close();
        stopSnapWatch();
      }
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
        onPaymentSuccess(paymentResult.orderId);
        return;
      }
      await syncPendingPayments();
      const auth = await fetchAuthStatus();
      if (auth.ok && auth.user?.subscription?.active) {
        window.dispatchEvent(new Event('slark-auth-change'));
        onPaymentSuccess();
        return;
      }
      setError(t('purchase.paymentPending'));
    } catch {
      setError(t('purchase.checkoutFailed'));
    } finally {
      setChecking(false);
    }
  };

  const isLoading = loading || loadingParent;

  if (!isLoading && !plan) {
    return (
      <div className="mx-auto w-full max-w-5xl text-center">
        <h1 className="font-cyber text-xl font-bold text-slark-text dark:text-white">
          {t('purchase.checkoutInvalidPlan')}
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="mt-6 inline-block rounded-xl border border-slark-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:border-slark-primary hover:text-slark-primary"
        >
          {t('purchase.checkoutBackPlans')}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slark-muted transition hover:text-slark-primary"
      >
        ← {t('purchase.checkoutBackPlans')}
      </button>

      <p className="font-cyber mt-6 text-xs uppercase tracking-[0.35em] text-slark-primary">
        {t('purchase.checkoutTitle')}
      </p>
      <h1 className="font-cyber mt-2 text-2xl font-bold text-slark-text dark:text-white">
        {isLoading ? '…' : planTitle(t, plan)}
      </h1>
      <p className="mt-2 text-sm text-slark-muted">{t('purchase.checkoutSubtitle')}</p>

      <div className="mt-8 rounded-2xl border border-slark-primary/30 bg-slark-card p-6 shadow-sm dark:bg-slark-dark/80 dark:shadow-none">
        <p className="text-xs font-semibold uppercase tracking-wider text-slark-muted">
          {t('purchase.checkoutTotal')}
        </p>
        <p className="font-cyber mt-2 text-3xl font-bold tabular-nums text-slark-text dark:text-white">
          {isLoading ? '…' : formatIdr(plan.amount)}
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
            loading={isLoading}
          />

          {error && (
            <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || processing || !selectedMethod}
            className="mt-6 w-full rounded-xl bg-slark-primary px-4 py-3.5 text-xs font-bold uppercase tracking-widest text-white shadow-slark transition hover:bg-slark-primary-hover disabled:opacity-50"
          >
            {processing ? t('purchase.checkoutProcessing') : t('purchase.checkoutPayNow')}
          </button>
        </form>
      )}

      {paymentResult && paymentResult.display?.type !== 'redirect' && (
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

      {paymentResult?.display?.type === 'redirect' && error && !snapWaiting && (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
          <p>{error}</p>
          {paymentResult.display.redirectUrl && (
            <button
              type="button"
              onClick={handleManualSnapOpen}
              className="mt-3 inline-flex rounded-lg bg-slark-primary px-3 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-slark-primary-hover"
            >
              {t('purchase.checkoutContinueCard')}
            </button>
          )}
        </div>
      )}

      <PaymentSnapWaitingOverlay open={snapWaiting} />
      <PaymentOutcomeModal
        open={outcomeModal === 'success' || outcomeModal === 'declined'}
        variant={outcomeModal === 'success' ? 'success' : 'declined'}
        userEmail={user?.email || ''}
        onClose={() => {
          setOutcomeModal(null);
          if (outcomeModal === 'declined') setPaymentResult(null);
        }}
        onContinue={() => {
          setOutcomeModal(null);
          onBack();
        }}
      />
    </div>
  );
}
