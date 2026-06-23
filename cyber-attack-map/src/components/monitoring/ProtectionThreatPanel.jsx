import { useMemo } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { deriveProtectionBucket, PROTECTION_ORDER } from '../../utils/deriveProtectionBucket.js';

export function ProtectionThreatPanel({ attacks }) {
  const { t } = useI18n();

  const counts = useMemo(() => {
    const c = Object.fromEntries(PROTECTION_ORDER.map((k) => [k, 0]));
    for (const a of attacks) {
      const b = deriveProtectionBucket(a);
      if (b && c[b] !== undefined) c[b] += 1;
    }
    return c;
  }, [attacks]);

  return (
    <aside
      className="flex w-full flex-shrink-0 flex-col gap-1 border-t border-slark-border bg-slark-card px-2 py-3"
      aria-label={t('protect.title')}
    >
      <h2 className="font-cyber px-1 text-[10px] font-bold uppercase tracking-[0.28em] text-slark-dark">
        {t('protect.title')}
      </h2>
      <p className="px-1 text-[8px] leading-snug text-slark-muted">{t('protect.subtitle')}</p>
      <ul className="mt-1 flex flex-col gap-1">
        {PROTECTION_ORDER.map((key) => {
          const cnt = counts[key];
          const hot = cnt > 0;
          return (
            <li
              key={key}
              className={`flex items-center justify-between gap-2 rounded border px-1.5 py-1 font-mono text-[9px] ${
                hot
                  ? 'border-slark-primary/30 bg-slark-bg'
                  : 'border-slark-border bg-slark-bg'
              }`}
            >
              <span
                className={`min-w-0 flex-1 leading-tight ${hot ? 'text-slark-primary' : 'text-slark-muted'}`}
              >
                {t(`protect.${key}`)}
              </span>
              <span
                className={`shrink-0 tabular-nums ${
                  hot ? 'font-cyber text-base text-slark-primary' : 'text-slark-muted'
                }`}
              >
                {cnt}
              </span>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
