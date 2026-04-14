import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';

export function ApiPurchasePage() {
  const { t, locale } = useI18n();

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.purchase')}`;
  }, [t, locale]);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-gradient-to-b from-slate-50 to-white px-4 py-10 pb-24 dark:from-black dark:to-slate-950">
      <div className="mx-auto max-w-3xl">
        <p className="font-cyber text-xs uppercase tracking-[0.35em] text-cyan-700 dark:text-cyan-600">{t('brand.name')}</p>
        <h1 className="font-cyber mt-2 text-2xl font-bold text-slate-900 dark:text-cyan-50 md:text-3xl">{t('purchase.title')}</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-cyan-600/95">{t('purchase.subtitle')}</p>
        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-cyan-600/95">{t('purchase.body')}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            to="/settings"
            className="rounded-xl border border-cyan-500/50 bg-cyan-600 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-sm hover:bg-cyan-500 dark:bg-cyan-950/40 dark:text-cyan-100 dark:hover:bg-cyan-900/50"
          >
            {t('purchase.ctaSettings')}
          </Link>
          <Link
            to="/monitoring"
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-cyan-500 hover:text-cyan-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-cyan-800 dark:hover:text-cyan-200"
          >
            {t('purchase.ctaMonitoring')}
          </Link>
          <Link
            to="/"
            className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 hover:border-cyan-500 hover:text-cyan-800 dark:border-slate-700 dark:text-slate-400 dark:hover:border-cyan-800 dark:hover:text-cyan-200"
          >
            {t('purchase.backHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
