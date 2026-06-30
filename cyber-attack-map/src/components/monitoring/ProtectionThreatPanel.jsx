import { useMemo } from 'react';
import { getAttackTypePanelStyles } from '../../constants/attackTypeColors.js';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { deriveProtectionBucket, PROTECTION_ORDER } from '../../utils/deriveProtectionBucket.js';

export function ProtectionThreatPanel({ attacks, variant = 'light' }) {
  const { t } = useI18n();
  const dark = variant === 'dark';

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
      className={`flex w-full flex-col border-t lg:min-h-0 lg:flex-1 lg:overflow-hidden ${
        dark ? 'gap-2 border-slate-600/50 bg-transparent px-3 py-3' : 'gap-1 border-slark-border bg-slark-card px-2 py-3'
      }`}
      aria-label={t('protect.title')}
    >
      <div className={`shrink-0 ${dark ? 'space-y-1' : ''}`}>
        <h2
          className={`font-cyber px-1 text-[10px] font-bold uppercase tracking-[0.28em] ${
            dark ? 'text-slate-100' : 'text-slark-dark'
          }`}
        >
          {t('protect.title')}
        </h2>
        <p className={`px-1 text-[8px] leading-snug ${dark ? 'text-slate-400' : 'text-slark-muted'}`}>
          {t('protect.subtitle')}
        </p>
      </div>
      <ul
        className={`flex flex-col gap-1 lg:thin-scrollbar-dark lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain ${
          dark ? 'pr-0.5' : 'mt-1'
        }`}
      >
        {PROTECTION_ORDER.map((key) => {
          const cnt = counts[key];
          const hot = cnt > 0;
          const typeStyles = getAttackTypePanelStyles(key, { hot });
          return (
            <li
              key={key}
              className={`flex items-center justify-between gap-3 rounded-md border font-mono transition-colors ${
                dark ? 'px-2 py-1 text-[9px] leading-snug' : 'px-1.5 py-1 text-[9px]'
              }`}
              style={typeStyles.row}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2 leading-tight">
                <span className="relative flex h-2.5 w-2.5 shrink-0 items-center justify-center" aria-hidden>
                  {hot ? (
                    <span
                      className="protect-threat-dot-ping absolute h-2 w-2 rounded-full"
                      style={typeStyles.ping}
                    />
                  ) : null}
                  <span
                    className={`relative h-2 w-2 rounded-full ring-1 ring-white/10 ${
                      hot ? 'protect-threat-dot--live' : ''
                    }`}
                    style={typeStyles.dot}
                  />
                </span>
                <span
                  className={hot ? 'font-medium' : dark ? 'text-slate-300' : 'text-slark-muted'}
                  style={typeStyles.label}
                >
                  {t(`protect.${key}`)}
                </span>
              </span>
              <span
                className={`shrink-0 tabular-nums ${
                  hot ? 'font-cyber text-sm sm:text-base' : dark ? 'text-slate-400' : 'text-slark-muted'
                }`}
                style={typeStyles.count}
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
