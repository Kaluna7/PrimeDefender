import { useEffect } from 'react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SignInPanel } from '../../../components/auth/SignInPanel.jsx';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 */
export function GetStartedModal({ open, onClose, onSuccess }) {
  const { t } = useI18n();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const handleSuccess = () => {
    onClose();
    onSuccess?.();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-started-title"
      style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#111827]/35 backdrop-blur-md"
        onClick={onClose}
        aria-label={t('home.getStartedModalClose')}
      />

      <div className="relative z-[101] w-full max-w-[19.5rem] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] shadow-[0_16px_48px_rgba(17,24,39,0.16)] sm:max-w-md">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#C62828] sm:right-3 sm:top-3 sm:h-8 sm:w-8"
          aria-label={t('home.getStartedModalClose')}
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="px-4 pb-4 pt-7 sm:px-8 sm:pb-6 sm:pt-8">
          <SignInPanel compact onSuccess={handleSuccess} />
        </div>
      </div>
    </div>
  );
}
