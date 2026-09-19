import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { LandingHeroTypingTitle } from './LandingHeroTypingTitle.jsx';

import heroBg from '../../../assets/bg.png';
import siteIcon from '../../../assets/images/icon.webp';

import { SLARK as C } from '../../../theme/slarkColors.js';

/**
 * Landing publik untuk tamu (belum login) — hero saja, tanpa header.
 */
export function LandingPage({ onGetStarted }) {
  const { t } = useI18n();

  const heroTypingLines = useMemo(
    () => [t('home.heroTitle'), t('home.heroTyping2'), t('home.heroTyping3')],
    [t],
  );

  return (
    <div className="relative min-h-full w-full text-[#111827]" style={{ backgroundColor: C.bg }}>
      <div id="landing-hero" className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <img
            src={heroBg}
            alt=""
            className="h-full w-full scale-[1.02] object-cover object-[center_42%]"
            fetchPriority="high"
          />
          <div className="landing-hero-overlay-top absolute inset-0" />
          <div className="landing-hero-overlay-side absolute inset-0" />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background:
                'radial-gradient(ellipse 55% 45% at 72% 58%, rgba(198,40,40,0.18) 0%, transparent 70%)',
            }}
          />
        </div>

        <div
          className="animate-home-intro-in relative z-10 flex shrink-0 items-center gap-2.5 px-6 pt-6 opacity-0 sm:gap-3 sm:px-10 sm:pt-8 lg:px-14 lg:pt-10 xl:px-20"
          style={{ animationDelay: '0.02s' }}
        >
          <img
            src={siteIcon}
            alt=""
            width={50}
            height={50}
            className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
            aria-hidden
          />
          <p className="landing-hero-brand font-cyber text-sm font-bold uppercase tracking-[0.14em] sm:text-base sm:tracking-[0.16em]">
            {t('brand.name')}
          </p>
        </div>

        <section className="landing-hero-content relative flex min-h-0 flex-1 flex-col justify-center pb-16 pl-6 pr-4 sm:pb-20 sm:pl-10 sm:pr-6 lg:pb-24 lg:pl-14 lg:pr-10 xl:pl-20">
          <div className="w-full text-left">
            <div
              className="animate-home-intro-in w-full max-w-4xl opacity-0 sm:max-w-5xl lg:max-w-[64rem] xl:max-w-[74rem] 2xl:max-w-[80rem]"
              style={{ animationDelay: '0.05s' }}
            >
              <div className="landing-hero-typing-slot">
                <LandingHeroTypingTitle
                  lines={heroTypingLines}
                  className="landing-hero-title font-cyber text-[2.15rem] font-bold leading-[1.12] sm:text-[2.85rem] md:text-[3.35rem] lg:text-[3.85rem] lg:leading-[1.08] xl:text-[4.35rem] 2xl:text-[4.65rem]"
                />
              </div>
            </div>
          </div>

          <div
            className="landing-hero-cta-desktop animate-home-intro-in mt-14 hidden w-full flex-row items-center justify-center gap-3 opacity-0 sm:mt-16 sm:flex lg:mt-20"
            style={{ animationDelay: '0.18s' }}
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="landing-hero-cta-primary font-cyber text-xs font-bold uppercase tracking-[0.22em] text-white transition sm:text-sm"
            >
              {t('home.introCtaPrimary')}
            </button>
            <Link
              to="/docs"
              className="landing-hero-cta-secondary inline-flex items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] transition sm:text-sm"
            >
              {t('home.introCtaSecondary')}
            </Link>
          </div>

          <div
            className="landing-hero-cta-mobile animate-home-intro-in mt-12 flex w-full flex-col items-center justify-center gap-3 opacity-0 sm:hidden"
            style={{ animationDelay: '0.18s' }}
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="landing-hero-cta-primary font-cyber w-full max-w-xs text-xs font-bold uppercase tracking-[0.22em] text-white transition"
            >
              {t('home.introCtaPrimary')}
            </button>
            <Link
              to="/docs"
              className="landing-hero-cta-secondary inline-flex w-full max-w-xs items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] transition"
            >
              {t('home.introCtaSecondary')}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
