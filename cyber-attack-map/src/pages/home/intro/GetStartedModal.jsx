import { useEffect } from 'react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SignInPanel } from '../../../components/auth/SignInPanel.jsx';

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {() => void} [props.onSuccess]
 * @param {'signup' | 'login'} [props.defaultMode]
 * @param {string} [props.initialChallengeId]
 * @param {string} [props.initialEmail]
 * @param {string} [props.initialError]
 */
export function GetStartedModal({
  open,
  onClose,
  onSuccess,
  defaultMode = 'signup',
  initialChallengeId = '',
  initialEmail = '',
  initialError = '',
}) {
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
      className="auth-modal-overlay fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="get-started-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0f172a]/50 backdrop-blur-md"
        onClick={onClose}
        aria-label={t('home.getStartedModalClose')}
      />

      <div className="auth-modal-shell relative z-[101] w-full sm:max-w-[28rem]">
        <div className="auth-modal-handle sm:hidden" aria-hidden />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg text-[#6b7280] transition hover:bg-[#f8fafc] hover:text-[#c62828] sm:right-4 sm:top-4"
          aria-label={t('home.getStartedModalClose')}
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>

        <div className="auth-modal-body">
          <SignInPanel
            defaultMode={defaultMode}
            initialChallengeId={initialChallengeId}
            initialEmail={initialEmail}
            initialError={initialError}
            onSuccess={handleSuccess}
          />
        </div>
      </div>
    </div>
  );
}
