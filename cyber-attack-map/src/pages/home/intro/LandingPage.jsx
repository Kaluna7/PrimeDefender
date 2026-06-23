import { Link } from 'react-router-dom';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { LandingHeader } from './LandingHeader.jsx';
import { LandingFooter } from './LandingFooter.jsx';
import { WhySlarkScrollSection } from './WhySlarkScrollSection.jsx';

import { SLARK as C } from '../../../theme/slarkColors.js';

function SectionHeading({ eyebrow, title }) {
  return (
    <div className="text-center">
      <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
        {eyebrow}
      </p>
      <h2 className="font-cyber mt-3 text-2xl font-bold sm:text-3xl" style={{ color: C.text }}>
        {title}
      </h2>
    </div>
  );
}

/**
 * Landing publik untuk tamu (belum login) — marketing, fitur, pricing.
 */
export function LandingPage({ onGetStarted }) {
  const { t } = useI18n();

  const features = [
    { type: 'map', title: t('home.feature1Title'), body: t('home.feature1Body'), accent: C.primary },
    { type: 'middleware', title: t('home.feature2Title'), body: t('home.feature2Body'), accent: C.dark },
    { type: 'alert', title: t('home.feature3Title'), body: t('home.feature3Body'), accent: C.primary },
  ];

  const flowSteps = [
    t('home.flowStep1'),
    t('home.flowStep2'),
    t('home.flowStep3'),
    t('home.flowStep4'),
  ];

  const tiers = [
    {
      name: t('home.tierObserver'),
      price: t('home.tierObserverPrice'),
      desc: t('home.tierObserverDesc'),
      accent: C.dark,
      popular: false,
    },
    {
      name: t('home.tierSentinel'),
      price: t('home.tierSentinelPrice'),
      desc: t('home.tierSentinelDesc'),
      accent: C.primary,
      popular: true,
    },
    {
      name: t('home.tierFortress'),
      price: t('home.tierFortressPrice'),
      desc: t('home.tierFortressDesc'),
      accent: C.dark,
      popular: false,
    },
  ];

  return (
    <div className="relative min-h-full w-full bg-[#FFFFFF] text-[#111827]">
      <div className="relative flex min-h-[100dvh] flex-col">
        <LandingHeader onGetStarted={onGetStarted} />

        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -left-32 top-20 h-96 w-96 rounded-full blur-[100px]"
            style={{ backgroundColor: 'rgba(198,40,40,0.06)' }}
          />
          <div
            className="absolute -right-24 top-[40%] h-80 w-80 rounded-full blur-[90px]"
            style={{ backgroundColor: 'rgba(31,41,55,0.04)' }}
          />
        </div>

        <section className="relative flex flex-1 flex-col justify-center px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto w-full max-w-3xl">
            <div className="animate-home-intro-in text-center opacity-0 sm:text-left" style={{ animationDelay: '0.05s' }}>
            <p className="font-cyber text-[10px] uppercase tracking-[0.45em]" style={{ color: C.primary }}>
              {t('brand.name')}
            </p>
            <p
              className="mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]"
              style={{ borderColor: C.border, color: C.dark }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: C.primary }} />
              {t('home.introEyebrow')}
            </p>
            <h1
              className="font-cyber mt-6 text-3xl font-bold leading-tight sm:text-4xl lg:text-[2.65rem]"
              style={{ color: C.text }}
            >
              {t('home.heroTitle')}
            </h1>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-start">
              <button
                type="button"
                onClick={onGetStarted}
                className="font-cyber rounded-xl border border-[#C62828] bg-[#C62828] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.24em] text-white shadow-[0_4px_14px_rgba(198,40,40,0.25)] transition hover:border-[#B71C1C] hover:bg-[#B71C1C] sm:text-sm"
              >
                {t('home.introCtaPrimary')}
              </button>
              <Link
                to="/docs"
                className="inline-flex items-center justify-center rounded-xl border border-[#E2E8F0] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-[#1F2937] transition hover:border-[#C62828] hover:text-[#C62828] sm:text-sm"
              >
                {t('home.introCtaSecondary')}
              </Link>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 pt-8">
              {[
                { value: '24/7', label: t('home.hero3dLine1'), color: C.primary },
                { value: 'API', label: t('home.feature2Title'), color: C.dark },
                { value: 'Live', label: t('home.feature1Title'), color: C.primary },
              ].map((stat) => (
                <div key={stat.label} className="text-center sm:text-left">
                  <p className="font-cyber text-lg font-bold sm:text-xl" style={{ color: stat.color }}>
                    {stat.value}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-wider sm:text-xs" style={{ color: C.textMuted }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
            </div>
          </div>
        </section>
      </div>

      <WhySlarkScrollSection
        eyebrow={t('brand.name')}
        title={t('home.sectionFeatures')}
        brandName={t('brand.name')}
        finaleTagline={t('home.featuresFinaleTagline')}
        scrollHint={t('home.featuresScrollHint')}
        features={features}
      />

      <section id="flow" className="relative px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow={t('home.introEyebrow')} title={t('home.sectionFlow')} />
          <div className="mt-12 space-y-4">
            {flowSteps.map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border p-5 sm:gap-6 sm:p-6"
                style={{ borderColor: C.border, backgroundColor: C.card }}
              >
                <div className="flex shrink-0 flex-col items-center">
                  <span
                    className="font-cyber flex h-10 w-10 items-center justify-center rounded-xl border text-sm font-bold"
                    style={{ borderColor: `${C.primary}40`, backgroundColor: `${C.primary}0d`, color: C.primary }}
                  >
                    {index + 1}
                  </span>
                  {index < flowSteps.length - 1 && (
                    <span className="mt-2 hidden h-full w-px sm:block" style={{ backgroundColor: C.border }} />
                  )}
                </div>
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.25em]"
                    style={{ color: C.primary }}
                  >
                    {t('home.introStepLabel')} {index + 1}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed sm:text-base" style={{ color: C.textMuted }}>
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="relative px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <SectionHeading eyebrow={t('home.ctaApiPurchase')} title={t('home.sectionPricing')} />
          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {tiers.map((tier) => (
              <article
                key={tier.name}
                className="relative rounded-2xl border p-6"
                style={
                  tier.popular
                    ? {
                        borderColor: C.primary,
                        backgroundColor: C.card,
                        boxShadow: '0 4px 24px rgba(198,40,40,0.1)',
                      }
                    : { borderColor: C.border, backgroundColor: C.card }
                }
              >
                {tier.popular && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ borderColor: C.primary, backgroundColor: C.bg, color: C.primary }}
                  >
                    {t('home.popular')}
                  </span>
                )}
                <p className="font-cyber text-sm font-bold uppercase tracking-wider" style={{ color: tier.accent }}>
                  {tier.name}
                </p>
                <p className="font-cyber mt-4 text-3xl font-bold" style={{ color: C.text }}>
                  {tier.price}
                  {tier.price !== t('home.tierFortressPrice') && (
                    <span className="text-sm font-normal" style={{ color: C.textMuted }}>
                      {t('home.perMonth')}
                    </span>
                  )}
                </p>
                <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textMuted }}>
                  {tier.desc}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-8 text-center text-xs" style={{ color: C.textMuted }}>
            {t('home.pricingFootnote')}
          </p>
        </div>
      </section>

      <LandingFooter onGetStarted={onGetStarted} />
    </div>
  );
}
