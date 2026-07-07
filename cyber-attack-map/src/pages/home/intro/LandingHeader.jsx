import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { LanguageFlag } from '../../../components/layout/LanguageFlag.jsx';
import siteIcon from '../../../assets/images/icon.webp';

const LANGUAGE_OPTIONS = [
  { id: 'en', labelKey: 'profile.languageEnglish' },
  { id: 'id', labelKey: 'profile.languageIndonesian' },
];

const NAV = [
  { href: '#features', labelKey: 'home.sectionFeatures' },
  { href: '#flow', labelKey: 'home.sectionFlow' },
  { href: '#pricing', labelKey: 'home.sectionPricing' },
  { href: '#faq', labelKey: 'home.sectionFaq' },
];

const SCROLL_DELTA = 8;
const TOP_REVEAL = 32;
const HEADER_ZONE_PX = 68;

export function LandingHeader({ onGetStarted }) {
  const { t, locale, setLocale } = useI18n();
  const [hidden, setHidden] = useState(false);
  const [overHero, setOverHero] = useState(true);
  const [langOpen, setLangOpen] = useState(false);
  const lastYRef = useRef(0);
  const tickingRef = useRef(false);
  const langRef = useRef(null);

  useEffect(() => {
    const scroller = document.getElementById('app-scroll-root');
    if (!scroller) return undefined;

    const syncHeaderTheme = () => {
      const hero = document.getElementById('landing-hero');
      if (!hero) {
        setOverHero(scroller.scrollTop < 120);
        return;
      }
      setOverHero(hero.getBoundingClientRect().bottom > HEADER_ZONE_PX);
    };

    lastYRef.current = scroller.scrollTop;
    syncHeaderTheme();

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        const delta = y - lastYRef.current;

        syncHeaderTheme();

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

    const onResize = () => syncHeaderTheme();

    scroller.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!langOpen) return undefined;
    const onPointer = (e) => {
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setLangOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [langOpen]);

  const navLinkClass = `landing-header-nav whitespace-nowrap rounded-lg px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] transition xl:px-3 xl:text-xs xl:tracking-[0.14em] ${
    overHero ? 'landing-header-nav--hero' : 'landing-header-nav--light'
  }`;

  return (
    <header
      className={`landing-header fixed left-0 right-0 top-0 z-40 border-b will-change-transform ${
        overHero ? 'landing-header--hero' : 'landing-header--light'
      } ${hidden ? '-translate-y-full pointer-events-none' : 'translate-y-0'}`}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="grid w-full grid-cols-[auto_1fr_auto] items-center gap-3 py-3.5 pl-4 pr-3 sm:gap-4 sm:pl-6 sm:pr-5 lg:pl-8 lg:pr-8 xl:pl-10 xl:pr-10">
        <Link to="/" className="group flex shrink-0 items-center gap-2.5 justify-self-start">
          <img
            src={siteIcon}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 rounded-lg object-cover"
            aria-hidden
          />
          <span
            className={`hidden font-cyber text-sm font-bold uppercase tracking-[0.12em] text-[#C62828] sm:inline sm:text-base ${
              overHero ? 'landing-header-brand--hero' : ''
            }`}
          >
            {t('brand.name')}
          </span>
        </Link>

        <nav
          className="hidden min-w-0 items-center justify-center gap-0.5 justify-self-center lg:flex xl:gap-1"
          aria-label="Landing"
        >
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className={navLinkClass}>
              {t(item.labelKey)}
            </a>
          ))}
          <Link to="/about" className={navLinkClass}>
            {t('nav.about')}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 justify-self-end sm:gap-2.5">
          <div className="relative" ref={langRef}>
            <button
              type="button"
              onClick={() => setLangOpen((v) => !v)}
              aria-expanded={langOpen}
              aria-haspopup="listbox"
              aria-label={t('profile.changeLanguage')}
              className={`landing-header-lang flex items-center gap-1 rounded-lg border px-2 py-1.5 transition sm:gap-1.5 sm:px-2.5 sm:py-2 ${
                overHero ? 'landing-header-lang--hero' : 'landing-header-lang--light'
              }`}
            >
              <LanguageFlag locale={locale} className="border-[#E2E8F0]/80 shadow-none" />
              <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] sm:inline">
                {locale === 'id' ? 'ID' : 'EN'}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 shrink-0 transition-transform motion-safe:duration-200 ${langOpen ? 'rotate-180' : ''}`}
                strokeWidth={2}
                aria-hidden
              />
            </button>

            {langOpen ? (
              <div
                role="listbox"
                aria-label={t('profile.changeLanguage')}
                className="absolute right-0 top-full z-50 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] py-1 shadow-lg"
              >
                {LANGUAGE_OPTIONS.map(({ id, labelKey }) => {
                  const selected = locale === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => {
                        setLocale(id);
                        setLangOpen(false);
                      }}
                      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition ${
                        selected
                          ? 'bg-[#FEF2F2] font-semibold text-[#C62828]'
                          : 'text-[#374151] hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <LanguageFlag locale={id} className="border-[#E2E8F0]/80 shadow-none" />
                      <span className="min-w-0 flex-1">{t(labelKey)}</span>
                      {selected ? (
                        <Check className="h-4 w-4 shrink-0 text-[#C62828]" strokeWidth={2.5} aria-hidden />
                      ) : (
                        <span className="h-4 w-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onGetStarted}
            className="font-cyber rounded-lg border border-[#C62828] bg-[#C62828] px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-white transition hover:border-[#B71C1C] hover:bg-[#B71C1C] sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.18em]"
          >
            {t('home.introCtaPrimary')}
          </button>
        </div>
      </div>
    </header>
  );
}
