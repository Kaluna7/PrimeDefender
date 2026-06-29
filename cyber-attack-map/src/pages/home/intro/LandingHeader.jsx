import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import siteIcon from '../../../assets/images/icon.webp';

const NAV = [
  { href: '#features', labelKey: 'home.sectionFeatures' },
  { href: '#flow', labelKey: 'home.sectionFlow' },
  { href: '#pricing', labelKey: 'home.sectionPricing' },
  { href: '#faq', labelKey: 'home.sectionFaq' },
];

const SCROLL_DELTA = 8;
const TOP_REVEAL = 32;

export function LandingHeader({ onGetStarted }) {
  const { t } = useI18n();
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    const scroller = document.getElementById('app-scroll-root');
    if (!scroller) return undefined;

    lastYRef.current = scroller.scrollTop;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const delta = y - lastYRef.current;

        if (y <= TOP_REVEAL) {
          setHidden(false);
        } else if (delta > SCROLL_DELTA) {
          setHidden(true);
        } else if (delta < -SCROLL_DELTA) {
          setHidden(false);
        }

        lastYRef.current = y;
        tickingRef.current = false;
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-40 border-b border-[#E2E8F0] bg-[#FFFFFF]/95 backdrop-blur-md transition-transform duration-300 ease-out will-change-transform ${
        hidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'
      }`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 pr-16 sm:px-6 sm:pr-24">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5">
          <img
            src={siteIcon}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
            aria-hidden
          />
          <span className="font-cyber text-sm font-bold uppercase tracking-[0.12em] text-[#C62828] sm:text-base">
            {t('brand.name')}
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Landing">
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
            to="/about"
            className="rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6B7280] transition hover:bg-[#F8FAFC] hover:text-[#C62828]"
          >
            {t('nav.about')}
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
