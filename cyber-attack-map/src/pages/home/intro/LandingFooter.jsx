import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SLARK as C } from '../../../theme/slarkColors.js';

export function LandingFooter({ onGetStarted }) {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-cyber text-2xl font-bold sm:text-3xl" style={{ color: C.text }}>
          {t('home.introFinalTitle')}
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: C.textMuted }}>
          {t('home.introFinalSubtitle')}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onGetStarted}
            className="font-cyber rounded-xl border border-[#C62828] bg-[#C62828] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.24em] text-white shadow-[0_4px_14px_rgba(198,40,40,0.25)] transition hover:border-[#B71C1C] hover:bg-[#B71C1C] sm:text-sm"
          >
            {t('home.introCtaPrimary')}
          </button>
          <Link
            to="/purchase"
            className="inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F2937] transition hover:border-[#C62828] hover:text-[#C62828] sm:text-sm"
          >
            {t('home.ctaApiPurchase')}
          </Link>
        </div>

        <p className="mt-12 font-cyber text-[10px] uppercase tracking-[0.35em]" style={{ color: C.textMuted }}>
          {t('brand.name')} · {year}
        </p>
      </div>
    </footer>
  );
}
