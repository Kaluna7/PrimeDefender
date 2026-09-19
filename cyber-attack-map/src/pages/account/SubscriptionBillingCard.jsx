import { useCallback, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { ApiKeyDisplayModal } from './ApiKeyDisplayModal.jsx';
import { ApiKeyVerifyModal } from './ApiKeyVerifyModal.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';
import { requestApiKeyReveal, verifyApiKeyReveal } from '../../services/apiKey.js';

/**
 * @param {{ user: { apiKey?: { prefix?: string, hasKey?: boolean } } | null, compact?: boolean }} props
 */
export function SubscriptionBillingCard({ user, compact = false }) {
  const { t } = useI18n();
  const hasKey = Boolean(user?.apiKey?.hasKey || user?.apiKey?.prefix);
  const maskedKey = user?.apiKey?.prefix || 'pd_••••••••••••';

  const [verifyOpen, setVerifyOpen] = useState(false);
  const [displayOpen, setDisplayOpen] = useState(false);
  const [challengeId, setChallengeId] = useState('');
  const [emailMasked, setEmailMasked] = useState('');
  const [verifyPurpose, setVerifyPurpose] = useState(/** @type {'view' | 'reset'} */ ('view'));
  const [verifyError, setVerifyError] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [revealedKey, setRevealedKey] = useState('');
  const [keyWasReset, setKeyWasReset] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  const verifyErrorMessage = useCallback(
    (code) => {
      const map = {
        invalid_code: t('account.verifyApiKeyInvalid'),
        challenge_expired: t('account.verifyApiKeyExpired'),
        challenge_mismatch: t('account.verifyApiKeyExpired'),
        smtp_not_configured: t('account.verifyApiKeyEmailFailed'),
        email_send_failed: t('account.verifyApiKeyEmailFailed'),
        user_not_found: t('account.verifyApiKeyNotSignedIn'),
        api_key_missing: t('account.keyLoading'),
        not_authenticated: t('account.verifyApiKeyNotSignedIn'),
        endpoint_not_found: t('account.verifyApiKeyServerOutdated'),
        send_failed: t('account.verifyApiKeySendFailed'),
        verify_failed: t('account.verifyApiKeyGeneric'),
        reset_failed: t('account.verifyApiKeyResetFailed'),
      };
      return map[code] || t('account.verifyApiKeyGeneric');
    },
    [t]
  );

  const openVerifyModal = useCallback((purpose) => {
    setVerifyPurpose(purpose);
    setVerifyError('');
    setChallengeId('');
    setEmailMasked('');
    setVerifyOpen(true);
  }, []);

  const sendVerificationCode = useCallback(async () => {
    setVerifyError('');
    setSendingCode(true);
    const result = await requestApiKeyReveal(verifyPurpose);
    setSendingCode(false);
    if (!result.ok) {
      setVerifyError(verifyErrorMessage(result.error));
      return { ok: false };
    }
    setChallengeId(result.challengeId);
    setEmailMasked(result.emailMasked || '');
    return { ok: true };
  }, [verifyPurpose, verifyErrorMessage]);

  const handleViewKey = () => {
    setKeyWasReset(false);
    openVerifyModal('view');
  };

  const handleResetRequest = () => {
    setResetConfirmOpen(true);
  };

  const handleResetConfirm = () => {
    setResetConfirmOpen(false);
    setKeyWasReset(false);
    openVerifyModal('reset');
  };

  const handleVerifyClose = () => {
    setVerifyOpen(false);
    setVerifyError('');
    setChallengeId('');
    setEmailMasked('');
  };

  const handleVerifySubmit = async (code) => {
    setVerifyError('');
    const result = await verifyApiKeyReveal({ challengeId, code });
    if (!result.ok) {
      setVerifyError(verifyErrorMessage(result.error));
      return;
    }
    setVerifyOpen(false);
    setRevealedKey(result.apiKey);
    setKeyWasReset(Boolean(result.reset));
    setDisplayOpen(true);
  };

  const handleResend = async () => {
    await sendVerificationCode();
  };

  return (
    <>
      <div
        className={`rounded-xl border border-slark-primary/25 bg-gradient-to-br from-slark-card to-slark-bg shadow-sm dark:border-slark-primary/30 dark:from-slark-dark/80 dark:to-slark-dark dark:shadow-none ${
          compact ? 'p-4' : 'p-6'
        }`}
      >
        <h2
          className={`font-cyber font-bold uppercase text-slark-primary ${
            compact ? 'text-[10px] tracking-[0.16em]' : 'text-xs tracking-[0.2em]'
          }`}
        >
          {t('account.apiKeyLabel')}
        </h2>

        <dl className={`grid ${compact ? 'mt-3 gap-2 text-sm' : 'mt-4 gap-3'}`}>
          <div>
            <dd className="mt-0">
              {hasKey ? (
                <>
                  <code
                    className={`block w-full rounded-lg border border-slark-border bg-slark-bg font-mono tracking-wide text-slark-muted dark:border-slark-border/50 dark:bg-slark-dark/60 ${
                      compact ? 'px-2.5 py-1.5 text-[10px]' : 'px-3 py-2 text-[11px]'
                    }`}
                  >
                    {maskedKey}
                  </code>
                  <p
                    className={`rounded-lg border border-amber-200/80 bg-amber-50/80 leading-relaxed text-amber-900 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-200 ${
                      compact
                        ? 'mt-2 px-2.5 py-1.5 text-[9px]'
                        : 'mt-3 px-3 py-2 text-[10px]'
                    }`}
                  >
                    {t('account.apiKeyLeakWarning')}
                  </p>
                  <div className={`flex flex-wrap ${compact ? 'mt-2 gap-1.5' : 'mt-3 gap-2'}`}>
                    <button
                      type="button"
                      onClick={handleViewKey}
                      className={`rounded-lg bg-slark-primary font-bold uppercase tracking-wider text-white hover:bg-slark-primary-hover ${
                        compact ? 'px-2.5 py-1.5 text-[9px]' : 'px-3 py-2 text-[10px]'
                      }`}
                    >
                      {t('account.viewApiKey')}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetRequest}
                      className={`rounded-lg border border-slark-border font-bold uppercase tracking-wider text-slark-muted transition hover:border-red-400 hover:text-red-600 dark:hover:border-red-500/50 dark:hover:text-red-400 ${
                        compact ? 'px-2.5 py-1.5 text-[9px]' : 'px-3 py-2 text-[10px]'
                      }`}
                    >
                      {t('account.resetApiKey')}
                    </button>
                  </div>
                </>
              ) : (
                <p className={`text-slark-muted ${compact ? 'text-[11px]' : 'text-xs'}`}>
                  {t('account.keyLoading')}
                </p>
              )}
              <p
                className={`leading-relaxed text-slark-muted ${
                  compact ? 'mt-1.5 text-[9px]' : 'mt-2 text-[10px]'
                }`}
              >
                {t('account.apiKeyHint')}
              </p>
            </dd>
          </div>
        </dl>
      </div>

      <ModalShell
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        titleId="api-key-reset-title"
        closeLabel={t('account.resetConfirmCancel')}
        panelClassName="max-w-sm"
      >
        <div className="p-5 sm:p-6">
          <h3 id="api-key-reset-title" className="font-cyber text-sm font-bold text-slark-text dark:text-white">
            {t('account.resetConfirmTitle')}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slark-muted">{t('account.resetConfirmBody')}</p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setResetConfirmOpen(false)}
              className="flex-1 rounded-xl border border-slark-border px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-slark-muted"
            >
              {t('account.resetConfirmCancel')}
            </button>
            <button
              type="button"
              onClick={handleResetConfirm}
              className="flex-1 rounded-xl bg-red-600 px-3 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-red-700"
            >
              {t('account.resetConfirmAction')}
            </button>
          </div>
        </div>
      </ModalShell>

      <ApiKeyVerifyModal
        open={verifyOpen}
        purpose={verifyPurpose}
        emailMasked={emailMasked}
        sending={sendingCode}
        error={verifyError}
        onClose={handleVerifyClose}
        onRequestCode={sendVerificationCode}
        onSubmit={handleVerifySubmit}
        onResend={handleResend}
      />

      <ApiKeyDisplayModal
        open={displayOpen}
        apiKey={revealedKey}
        reset={keyWasReset}
        onClose={() => setDisplayOpen(false)}
      />
    </>
  );
}

/** @param {{ apiKey: string, reset?: boolean, onClose: () => void }} props */
export function ApiKeySuccessPopup({ apiKey, reset = false, onClose }) {
  return <ApiKeyDisplayModal open={Boolean(apiKey)} apiKey={apiKey} reset={reset} onClose={onClose} />;
}
