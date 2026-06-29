import { createPortal } from 'react-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { useModalBodyLock } from '../../hooks/useModalBodyLock.js';

/**
 * Full-screen loading overlay while waiting for Midtrans Snap in another tab.
 * @param {{ open: boolean }} props
 */
export function PaymentSnapWaitingOverlay({ open }) {
  const { t } = useI18n();
  useModalBodyLock(open);
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-slark-bg/85 p-6 backdrop-blur-sm dark:bg-slark-dark/90"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-md rounded-2xl border border-slark-primary/30 bg-slark-card p-8 text-center shadow-xl dark:bg-slark-dark/95">
        <div
          className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-slark-primary/25 border-t-slark-primary"
          aria-hidden
        />
        <p className="font-cyber mt-6 text-sm font-bold uppercase tracking-wider text-slark-text dark:text-white">
          {t('purchase.snapWaitingTitle')}
        </p>
        <p className="mt-3 text-sm text-slark-muted">{t('purchase.snapWaitingBody')}</p>
        <p className="mt-2 text-xs text-slark-muted/80">{t('purchase.snapWaitingHint')}</p>
      </div>
    </div>,
    document.body
  );
}
