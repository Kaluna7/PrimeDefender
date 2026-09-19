import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';

const STEPS = ['intro', 'code', 'password', 'done'];

/**
 * @param {{
 *   open: boolean,
 *   variant?: 'forget' | 'setup',
 *   autoStart?: boolean,
 *   emailMasked?: string,
 *   sending?: boolean,
 *   error?: string,
 *   onClose: () => void,
 *   onRequestCode: () => Promise<{ ok: boolean, challengeId?: string, emailMasked?: string } | void>,
 *   onVerifyCode: (code: string, challengeId?: string) => Promise<{ ok: boolean } | void>,
 *   onComplete: (payload: { password: string, confirmPassword: string, challengeId?: string }) => Promise<{ ok: boolean } | void>,
 *   onResend?: () => void | Promise<{ ok: boolean, challengeId?: string, emailMasked?: string } | void>,
 *   onStepChange?: () => void,
 * }} props
 */
export function ChangePasswordModal({
  open,
  variant = 'forget',
  autoStart = false,
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
  const isSetup = variant === 'setup';
  const [step, setStep] = useState(/** @type {'intro' | 'code' | 'password' | 'done'} */ ('intro'));
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localEmailMasked, setLocalEmailMasked] = useState('');
  const autoStartedRef = useRef(false);
  const challengeIdRef = useRef('');
  const requestGenRef = useRef(0);
  const codeRef = useRef(/** @type {HTMLInputElement | null} */ (null));
  const passwordRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  const prefix = isSetup ? 'settings.googleSetup' : 'settings.forgetPassword';
  const label = (key) => t(`${prefix}${key}`);

  const goToStep = (next) => {
    setStep(next);
    onStepChange?.();
  };

  const applyChallengeResult = (result) => {
    if (!result?.ok) return false;
    const id = typeof result.challengeId === 'string' ? result.challengeId : '';
    if (id) challengeIdRef.current = id;
    if (result.emailMasked) setLocalEmailMasked(result.emailMasked);
    return true;
  };

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setSubmitting(false);
      setLocalEmailMasked('');
      autoStartedRef.current = false;
      challengeIdRef.current = '';
      requestGenRef.current += 1;
    }
  }, [open]);

  useEffect(() => {
    if (!open || !autoStart) return undefined;

    let cancelled = false;
    const gen = ++requestGenRef.current;

    const run = async () => {
      try {
        const result = await onRequestCode();
        if (cancelled || gen !== requestGenRef.current) return;
        if (applyChallengeResult(result)) {
          autoStartedRef.current = true;
          goToStep('code');
        }
      } catch {
        /* parent shows error via `error` prop */
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start once per open with autoStart
  }, [open, autoStart]);

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
  const shownEmail = localEmailMasked || emailMasked || '…';
  const codeBodyText = label('CodeBody').replace('{email}', shownEmail);
  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const passwordTooShort = password.length > 0 && password.length < 8;
  const canDismiss = !isSetup || step === 'done';

  const handleStartVerification = async () => {
    const gen = ++requestGenRef.current;
    const result = await onRequestCode();
    if (gen !== requestGenRef.current) return;
    if (applyChallengeResult(result)) goToStep('code');
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim() || submitting || step !== 'code') return;
    setSubmitting(true);
    try {
      const result = await onVerifyCode(code.trim(), challengeIdRef.current);
      if (result?.ok) {
        goToStep('password');
      }
    } catch {
      /* parent surfaces error */
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
      const result = await onComplete({
        password,
        confirmPassword,
        challengeId: challengeIdRef.current,
      });
      if (result?.ok) goToStep('done');
    } catch {
      /* parent surfaces error */
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!onResend) return;
    const gen = ++requestGenRef.current;
    const result = await onResend();
    if (gen !== requestGenRef.current) return;
    applyChallengeResult(result);
  };

  const stepContent = (() => {
    if (step === 'intro') {
      return (
        <div
          key="intro"
          className="motion-safe:animate-[verifyStepIn_240ms_ease-out] py-2 text-center sm:py-4"
        >
          <p className="mx-auto max-w-sm text-sm leading-relaxed text-slark-muted">{label('Intro')}</p>
          {error && (
            <p className="mx-auto mt-3 max-w-sm rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-left text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
              {error}
            </p>
          )}
          {(!autoStart || error) && (
            <button
              type="button"
              disabled={sending}
              onClick={handleStartVerification}
              className="mx-auto mt-6 w-full max-w-xs rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover disabled:opacity-50"
            >
              {sending ? label('Sending') : label('Start')}
            </button>
          )}
          {autoStart && !error && (
            <p className="mx-auto mt-6 text-xs font-semibold uppercase tracking-widest text-slark-primary">
              {label('Sending')}
            </p>
          )}
        </div>
      );
    }

    if (step === 'code') {
      return (
        <div key="code" className="motion-safe:animate-[verifyStepIn_240ms_ease-out]">
          <p className="text-sm leading-relaxed text-slark-muted">
            {sending ? label('Sending') : codeBodyText}
          </p>
          <form onSubmit={handleVerifyCode} className="mt-5">
            <label
              htmlFor="change-password-code"
              className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
            >
              {label('CodeLabel')}
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
              {submitting ? label('Verifying') : label('Continue')}
            </button>
          </form>
          {onResend && (
            <button
              type="button"
              disabled={sending}
              onClick={handleResend}
              className="mt-3 w-full text-left text-xs font-semibold text-slark-primary hover:underline disabled:opacity-50"
            >
              {label('Resend')}
            </button>
          )}
        </div>
      );
    }

    if (step === 'password') {
      return (
        <div key="password" className="motion-safe:animate-[verifyStepIn_240ms_ease-out]">
          <p className="text-sm leading-relaxed text-slark-muted">{label('NewHint')}</p>
          <form onSubmit={handleComplete} className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="change-password-new"
                className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
              >
                {label('NewLabel')}
              </label>
              <input
                ref={passwordRef}
                id="change-password-new"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slark-border bg-slark-card px-4 py-3 text-sm text-slark-text outline-none ring-slark-primary/30 focus:border-slark-primary focus:ring-2 dark:bg-slark-dark/80 dark:text-white"
                placeholder={t('auth.passwordPlaceholder')}
              />
              {passwordTooShort && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{label('TooShort')}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="change-password-confirm"
                className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
              >
                {label('ConfirmLabel')}
              </label>
              <input
                id="change-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slark-border bg-slark-card px-4 py-3 text-sm text-slark-text outline-none ring-slark-primary/30 focus:border-slark-primary focus:ring-2 dark:bg-slark-dark/80 dark:text-white"
                placeholder={t('auth.confirmPasswordPlaceholder')}
              />
              {passwordMismatch && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">{label('Mismatch')}</p>
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
              {submitting ? label('Saving') : label('Save')}
            </button>
          </form>
        </div>
      );
    }

    return (
      <div key="done" className="motion-safe:animate-[verifyStepIn_240ms_ease-out] text-center">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
          <CheckCircle2 className="h-7 w-7" strokeWidth={2} aria-hidden />
        </span>
        <p className="mt-4 text-sm font-semibold text-slark-text dark:text-white">{label('SuccessTitle')}</p>
        <p className="mt-2 text-sm leading-relaxed text-slark-muted">{label('SuccessBody')}</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover"
        >
          {label('Done')}
        </button>
      </div>
    );
  })();

  return (
    <ModalShell
      open={open}
      onClose={canDismiss ? onClose : () => {}}
      titleId="change-password-title"
      closeLabel={label('Close')}
      panelClassName="max-w-md"
    >
      <div className="flex min-h-0 flex-col overflow-hidden">
        <div className="thin-scrollbar min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <div>
            <h2
              id="change-password-title"
              className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary"
            >
              {label('Title')}
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

          <div className="relative mt-5 min-h-[14rem]">{stepContent}</div>
        </div>

        {canDismiss && step !== 'done' && (
          <div className="shrink-0 border-t border-slark-border px-5 py-4 sm:px-6 dark:border-slark-border/50">
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slark-border bg-slark-bg px-4 py-3 text-xs font-bold uppercase tracking-widest text-slark-text transition hover:border-slark-primary hover:text-slark-primary dark:text-white"
            >
              {label('Close')}
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
}
