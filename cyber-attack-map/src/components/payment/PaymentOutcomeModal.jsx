import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useModalBodyLock } from '../../hooks/useModalBodyLock.js';

/**
 * @param {{
 *   open: boolean,
 *   variant: 'success' | 'declined',
 *   userEmail?: string,
 *   onClose: () => void,
 *   onContinue?: () => void,
 * }} props
 */
export function PaymentOutcomeModal({ open, variant, userEmail = '', onClose, onContinue }) {
  const { t } = useI18n();
  useModalBodyLock(open);
  if (!open || typeof document === 'undefined') return null;

  const isSuccess = variant === 'success';
  const title = isSuccess ? t('purchase.snapThankYouTitle') : t('purchase.snapDeclinedTitle');
  const body = isSuccess
    ? t('purchase.snapThankYouBody')
    : t('purchase.snapDeclinedBody');
  const emailNote =
    isSuccess && userEmail
      ? t('purchase.snapThankYouEmail').replace('{email}', userEmail)
      : '';

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label={t('purchase.snapDeclinedClose')}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-outcome-title"
        className={`relative w-full max-w-md rounded-2xl border p-6 shadow-2xl ${
          isSuccess
            ? 'border-emerald-500/35 bg-slark-card dark:bg-slark-dark/95'
            : 'border-red-500/35 bg-slark-card dark:bg-slark-dark/95'
        }`}
      >
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            isSuccess
              ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              : 'bg-red-500/15 text-red-600 dark:text-red-400'
          }`}
          aria-hidden
        >
          {isSuccess ? '✓' : '✕'}
        </div>
        <h2
          id="payment-outcome-title"
          className="font-cyber mt-5 text-center text-lg font-bold text-slark-text dark:text-white"
        >
          {title}
        </h2>
        <p className="mt-3 text-center text-sm text-slark-muted">{body}</p>
        {emailNote && (
          <p className="mt-3 rounded-xl border border-emerald-500/25 bg-emerald-50/60 px-3 py-2 text-center text-xs text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-300">
            {emailNote}
          </p>
        )}
        <button
          type="button"
          onClick={isSuccess && onContinue ? onContinue : onClose}
          className={`mt-6 w-full rounded-xl px-4 py-3 text-xs font-bold uppercase tracking-widest text-white ${
            isSuccess
              ? 'bg-emerald-600 hover:bg-emerald-700'
              : 'bg-slark-primary hover:bg-slark-primary-hover'
          }`}
        >
          {isSuccess ? t('purchase.snapThankYouContinue') : t('purchase.snapDeclinedClose')}
        </button>
      </div>
    </div>,
    document.body
  );
}
