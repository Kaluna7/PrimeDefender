import { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';

/**
 * @param {{
 *   open: boolean,
 *   purpose?: 'view' | 'reset',
 *   emailMasked?: string,
 *   sending?: boolean,
 *   error?: string,
 *   onClose: () => void,
 *   onRequestCode: () => Promise<{ ok: boolean } | void> | { ok: boolean } | void,
 *   onSubmit: (code: string) => void | Promise<void>,
 *   onResend?: () => void | Promise<void>,
 * }} props
 */
export function ApiKeyVerifyModal({
  open,
  purpose = 'view',
  emailMasked = '',
  sending = false,
  error = '',
  onClose,
  onRequestCode,
  onSubmit,
  onResend,
}) {
  const { t } = useI18n();
  const [step, setStep] = useState(/** @type {'intro' | 'code'} */ ('intro'));
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(/** @type {HTMLInputElement | null} */ (null));

  useEffect(() => {
    if (!open) {
      setStep('intro');
      setCode('');
      setSubmitting(false);
      return undefined;
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open || step !== 'code') return undefined;
    const id = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(id);
  }, [open, step]);

  if (!open) return null;

  const introText =
    purpose === 'reset' ? t('account.verifyApiKeyIntroReset') : t('account.verifyApiKeyIntro');

  const codeBodyText = t('account.verifyApiKeyBody').replace('{email}', emailMasked || '…');

  const handleStartVerification = async () => {
    const result = await onRequestCode();
    if (result?.ok) setStep('code');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim() || submitting || step !== 'code') return;
    setSubmitting(true);
    try {
      await onSubmit(code.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="api-key-verify-title"
      closeLabel={t('account.verifyApiKeyClose')}
      panelClassName="max-w-md"
    >
      <div className="flex flex-col overflow-hidden">
        <div className="p-5 sm:p-6">
          <h2
            id="api-key-verify-title"
            className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary"
          >
            {t('account.verifyApiKeyTitle')}
          </h2>

          <div className="relative mt-4 overflow-hidden">
            {step === 'intro' ? (
              <div
                key="intro"
                className="motion-safe:animate-[verifyStepIn_240ms_ease-out]"
              >
                <p className="text-sm leading-relaxed text-slark-muted">{introText}</p>
                {error && (
                  <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
                    {error}
                  </p>
                )}
                <button
                  type="button"
                  disabled={sending}
                  onClick={handleStartVerification}
                  className="mt-5 w-full rounded-xl bg-slark-primary px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-slark-primary-hover disabled:opacity-50"
                >
                  {sending ? t('account.verifyApiKeySending') : t('account.verifyApiKeyStart')}
                </button>
              </div>
            ) : (
              <div
                key="code"
                className="motion-safe:animate-[verifyStepIn_240ms_ease-out]"
              >
                <p className="text-sm leading-relaxed text-slark-muted">
                  {sending ? t('account.verifyApiKeySending') : codeBodyText}
                </p>

                <form onSubmit={handleSubmit} className="mt-5">
                  <label
                    htmlFor="api-key-verify-code"
                    className="text-xs font-semibold uppercase tracking-wider text-slark-muted"
                  >
                    {t('account.verifyApiKeyCode')}
                  </label>
                  <input
                    ref={inputRef}
                    id="api-key-verify-code"
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
                    {submitting ? t('account.verifyApiKeyVerifying') : t('account.verifyApiKeySubmit')}
                  </button>
                </form>

                {onResend && (
                  <button
                    type="button"
                    disabled={sending}
                    onClick={onResend}
                    className="mt-3 w-full text-center text-xs font-semibold text-slark-primary hover:underline disabled:opacity-50"
                  >
                    {t('account.verifyApiKeyResend')}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="shrink-0 border-t border-slark-border px-5 py-4 sm:px-6 dark:border-slark-border/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slark-border bg-slark-bg px-4 py-3 text-xs font-bold uppercase tracking-widest text-slark-text transition hover:border-slark-primary hover:text-slark-primary dark:text-white"
          >
            {t('account.verifyApiKeyClose')}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
