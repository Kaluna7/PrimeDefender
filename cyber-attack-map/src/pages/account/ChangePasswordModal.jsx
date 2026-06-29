import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';

const STEPS = ['intro', 'code', 'password', 'done'];

/**
 * @param {{
 *   open: boolean,
 *   emailMasked?: string,
 *   sending?: boolean,
 *   error?: string,
 *   onClose: () => void,
 *   onRequestCode: () => Promise<{ ok: boolean, challengeId?: string, emailMasked?: string } | void>,
 *   onVerifyCode: (code: string) => Promise<{ ok: boolean } | void>,
 *   onComplete: (payload: { password: string, confirmPassword: string }) => Promise<{ ok: boolean } | void>,
 *   onResend?: () => void | Promise<void>,
 *   onStepChange?: () => void,
 * }} props
 */
export function ChangePasswordModal({
  open,
  emailMasked = '',
  sending = false,
  error = '',
  onClose,
  onRequestCode,
  onVerifyCode,
  onComplete,
  onResend,
  onStepChange,
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(/** @type {'intro' | 'code' | 'password' | 'done'} */ ('intro'));
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const codeRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const passwordRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const goToStep = (next) => {
    setStep(next);
    onStepChange?.();
  };

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (step === 'code') {
      const id = requestAnimationFrame(() => codeRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    if (step === 'password') {
      const id = requestAnimationFrame(() => passwordRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
    return undefined;
  }, [open, step]);

  if (!open) return null;

  const stepIndex = STEPS.indexOf(step);
  const codeBodyText = t('settings.changePasswordCodeBody').replace('{email}', emailMasked || '…');
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordTooShort = password.length > 0 && password.length < 8;

  const handleStartVerification = async () => {
    const result = await onRequestCode();
    if (result?.ok) goToStep('code');
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || submitting || step !== 'code') return;
    setSubmitting(true);
    try {
      const result = await onVerifyCode(code.trim());
      if (result?.ok) goToStep('password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    if (submitting || step !== 'password') return;
    if (!password || password !== confirmPassword) return;
    setSubmitting(true);
    try {
      const result = await onComplete({ password, confirmPassword });
      if (result?.ok) goToStep('done');
    } finally {
      setSubmitting(false);
    }
  };

  const stepContent = (() => {
    if (step === 'intro') {
      return (
        <div
          key="intro"
          className="motion-safe:animate-[verifyStepIn_240ms_ease-out] py-2 text-center sm:py-4"
        >
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-slark-muted">
            {t('settings.changePasswordIntro')}
          </p>
          {error && (
            <p className="mx-auto mt-3 max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={sending}
            onClick={handleStartVerification}
            className="mx-auto mt-6 w-full max-w-xs rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover disabled:opacity-50"
          >
            {sending ? t('settings.changePasswordSending') : t('settings.changePasswordStart')}
          </button>
        </div>
      );
    }

    if (step === 'code') {
      return (
        <div key="code" className="motion-safe:animate-[verifyStepIn_240ms_ease-out]">
          <button
            type="button"
            onClick={() => goToStep('intro')}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slark-muted transition hover:text-slark-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('settings.changePasswordBack')}
          </button>
          <p className="text-sm leading-relaxed text-slark-muted">
            {sending ? t('settings.changePasswordSending') : codeBodyText}
          </p>
          <form onSubmit={handleVerifyCode} className="mt-5">
            <label
              htmlFor="change-password-code"
              className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
            >
              {t('settings.changePasswordCodeLabel')}
            </label>
            <input
              ref={codeRef}
              id="change-password-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="mt-2 w-full rounded-xl border border-slark-border bg-slark-card px-4 py-3 text-center font-mono text-2xl tracking-[0.35em] text-slark-text outline-none ring-slark-primary/30 focus:border-slark-primary focus:ring-2 dark:bg-slark-dark/80 dark:text-white"
              placeholder="000000"
            />
            {error && (
              <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={code.length < 6 || submitting || sending}
              className="mt-4 w-full rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover disabled:opacity-50"
            >
              {submitting ? t('settings.changePasswordVerifying') : t('settings.changePasswordContinue')}
            </button>
          </form>
          {onResend && (
            <button
              type="button"
              disabled={sending}
              onClick={onResend}
              className="mt-3 w-full text-left text-xs font-semibold text-slark-primary hover:underline disabled:opacity-50"
            >
              {t('settings.changePasswordResend')}
            </button>
          )}
        </div>
      );
    }

    if (step === 'password') {
      return (
        <div key="password" className="motion-safe:animate-[verifyStepIn_240ms_ease-out]">
          <button
            type="button"
            onClick={() => goToStep('code')}
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slark-muted transition hover:text-slark-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            {t('settings.changePasswordBack')}
          </button>
          <p className="text-sm leading-relaxed text-slark-muted">{t('settings.changePasswordNewHint')}</p>
          <form onSubmit={handleComplete} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="change-password-new"
                className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
              >
                {t('settings.changePasswordNewLabel')}
              </label>
              <input
                ref={passwordRef}
                id="change-password-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slark-border bg-slark-card px-4 py-3 text-sm text-slark-text outline-none ring-slark-primary/30 focus:border-slark-primary focus:ring-2 dark:bg-slark-dark/80 dark:text-white"
              />
              {passwordTooShort && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t('settings.changePasswordTooShort')}
                </p>
              )}
            </div>
            <div>
              <label
                htmlFor="change-password-confirm"
                className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
              >
                {t('settings.changePasswordConfirmLabel')}
              </label>
              <input
                id="change-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slark-border bg-slark-card px-4 py-3 text-sm text-slark-text outline-none ring-slark-primary/30 focus:border-slark-primary focus:ring-2 dark:bg-slark-dark/80 dark:text-white"
              />
              {passwordMismatch && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t('settings.changePasswordMismatch')}
                </p>
              )}
            </div>
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={
                submitting ||
                password.length < 8 ||
                confirmPassword.length < 8 ||
                password !== confirmPassword
              }
              className="w-full rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover disabled:opacity-50"
            >
              {submitting ? t('settings.changePasswordSaving') : t('settings.changePasswordSave')}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div key="done" className="motion-safe:animate-[verifyStepIn_240ms_ease-out]">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" strokeWidth={2} aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-slark-text dark:text-white">
          {t('settings.changePasswordSuccessTitle')}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slark-muted">
          {t('settings.changePasswordSuccessBody')}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover"
        >
          {t('settings.changePasswordDone')}
        </button>
      </div>
    );
  })();

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="change-password-title"
      closeLabel={t('settings.changePasswordClose')}
      panelClassName="max-w-md"
    >
      <div className="flex min-h-0 flex-col overflow-hidden">
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div>
            <h2
              id="change-password-title"
              className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary"
            >
              {t('settings.changePasswordTitle')}
            </h2>
            {step !== 'done' && (
              <div className="mt-3 flex items-center gap-1.5" aria-hidden>
                {STEPS.slice(0, -1).map((id, i) => (
                  <span
                    key={id}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= stepIndex ? 'bg-slark-primary' : 'bg-slark-border dark:bg-white/15'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="relative mt-5 min-h-[11rem]">{stepContent}</div>
        </div>

        {step !== 'done' && (
          <div className="shrink-0 border-t border-slark-border px-5 py-4 sm:px-6 dark:border-slark-border/50">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slark-border bg-slark-bg px-4 py-3 text-xs font-bold uppercase tracking-widest text-slark-text transition hover:border-slark-primary hover:text-slark-primary dark:text-white"
            >
              {t('settings.changePasswordClose')}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
