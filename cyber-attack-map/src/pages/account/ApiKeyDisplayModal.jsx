import { useEffect, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { ModalShell } from '../../components/ui/ModalShell.jsx';

/**
 * @param {{
 *   open: boolean,
 *   apiKey: string,
 *   reset?: boolean,
 *   onClose: () => void,
 * }} props
 */
export function ApiKeyDisplayModal({ open, apiKey, reset = false, onClose }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  if (!open || !apiKey) return null;

  const copyKey = () => {
    navigator.clipboard?.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      titleId="api-key-display-title"
      closeLabel={t('account.apiKeyModalClose')}
      panelClassName="max-w-xl"
    >
      <div className="thin-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto p-5 sm:p-6">
        <h2
          id="api-key-display-title"
          className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-primary"
        >
          {t('account.apiKeyModalTitle')}
        </h2>

        {reset && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-200">
            {t('account.apiKeyResetSuccess')}
          </p>
        )}

        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-relaxed text-red-800 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300">
          {t('account.apiKeyLeakWarning')}
        </p>

        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slark-muted">
          {t('account.apiKeyLabel')}
        </p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <code className="thin-scrollbar max-h-32 min-h-[3.25rem] flex-1 overflow-auto break-all rounded-xl border border-slark-border bg-slark-card px-3 py-3 font-mono text-[11px] leading-relaxed text-slark-dark dark:border-slark-border/50 dark:bg-slark-dark/60 dark:text-slark-primary sm:max-h-40 sm:text-xs">
            {apiKey}
          </code>
          <button
            type="button"
            onClick={copyKey}
            className="shrink-0 rounded-xl bg-slark-primary px-4 py-3 text-[10px] font-bold uppercase tracking-wider text-white hover:bg-slark-primary-hover sm:min-w-[7.5rem]"
          >
            {copied ? t('account.copied') : t('account.copyKey')}
          </button>
        </div>

        <p className="mt-3 text-[10px] leading-relaxed text-slark-muted">{t('account.apiKeyModalWarning')}</p>
      </div>

      <div className="shrink-0 border-t border-slark-border p-4 sm:p-5 dark:border-slark-border/50">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-xl border border-slark-border bg-slark-bg px-4 py-3 text-xs font-bold uppercase tracking-widest text-slark-text transition hover:border-slark-primary hover:text-slark-primary dark:text-white"
        >
          {t('account.apiKeyModalClose')}
        </button>
      </div>
    </ModalShell>
  );
}
