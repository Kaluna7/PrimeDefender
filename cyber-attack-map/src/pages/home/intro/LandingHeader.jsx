import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nContext.jsx';

const NAV = [
  { href: '#features', labelKey: 'home.sectionFeatures' },
  { href: '#flow', labelKey: 'home.sectionFlow' },
  { href: '#pricing', labelKey: 'home.sectionPricing' },
];

export function LandingHeader({ onGetStarted }) {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-40 border-b border-[#E2E8F0] bg-[#FFFFFF]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 pr-16 sm:px-6 sm:pr-24">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#C62828]/20 bg-[#C62828]/10 font-cyber text-sm font-bold text-[#C62828]"
            aria-hidden
          >
            SL
          </span>
          <span className="font-cyber text-sm font-bold uppercase tracking-[0.12em] text-[#111827] sm:text-base">
            {t('brand.name')}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Landing">
          {NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#C62828]"
            >
              {t(item.labelKey)}
            </a>
          ))}
          <Link
            to="/docs"
            className="rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#C62828]"
          >
            {t('home.introCtaSecondary')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center">
          <button
            type="button"
            onClick={onGetStarted}
            className="font-cyber rounded-lg border border-[#C62828] bg-[#C62828] px-3.5 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white transition hover:border-[#B71C1C] hover:bg-[#B71C1C] sm:px-4 sm:text-xs"
          >
            {t('home.introCtaPrimary')}
          </button>
        </div>
      </div>
    </header>
  );
}
