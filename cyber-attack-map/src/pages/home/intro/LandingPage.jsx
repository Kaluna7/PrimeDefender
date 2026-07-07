import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { LandingHeader } from './LandingHeader.jsx';
import { LandingFooter } from './LandingFooter.jsx';
import { LandingHeroTypingTitle } from './LandingHeroTypingTitle.jsx';
import { WhySlarkScrollSection } from './WhySlarkScrollSection.jsx';
import { WhyDefenseSection } from './WhyDefenseSection.jsx';
import { FlowSection } from './FlowSection.jsx';
import { FaqSection } from './FaqSection.jsx';
import { PricingSection } from './PricingSection.jsx';
import { LandingAiChatFab } from './LandingAiChatFab.jsx';

import numberVideo from '../../../assets/video/number.mp4';
import mapVideo from '../../../assets/video/map.mp4';
import timeVideo from '../../../assets/video/time.mp4';
import trustVideo from '../../../assets/video/trust.mp4';
import complianceVideo from '../../../assets/video/compliance.mp4';
import heroBg from '../../../assets/bg.png';

import { SLARK as C } from '../../../theme/slarkColors.js';

/**
 * Landing publik untuk tamu (belum login) — marketing, fitur, pricing.
 */
export function LandingPage({ onGetStarted }) {
  const { t } = useI18n();

  const heroTypingLines = useMemo(
    () => [t('home.heroTitle'), t('home.heroTyping2'), t('home.heroTyping3')],
    [t],
  );

  const features = useMemo(
    () => [
      {
        type: 'map',
        tag: t('home.feature1Tag'),
        title: t('home.feature1Title'),
        body: t('home.feature1Body'),
        accent: C.primary,
      },
      {
        type: 'keys',
        tag: t('home.feature2Tag'),
        title: t('home.feature2Title'),
        body: t('home.feature2Body'),
        accent: C.primary,
      },
      {
        type: 'blocking',
        tag: t('home.feature3Tag'),
        title: t('home.feature3Title'),
        body: t('home.feature3Body'),
        accent: C.primary,
      },
    ],
    [t],
  );

  const defenseFootnotes = useMemo(
    () => [
      { icon: 'shield', text: t('home.defenseFootnote1') },
      { icon: 'target', text: t('home.defenseFootnote2') },
      { icon: 'speed', text: t('home.defenseFootnote3') },
    ],
    [t],
  );

  const defenseCards = useMemo(
    () => [
      {
        type: 'volume',
        title: t('home.defense1Title'),
        body: t('home.defense1Body'),
        badge: t('home.defense1Badge'),
        highlight: t('home.defense1Highlight'),
        videoSrc: numberVideo,
      },
      {
        type: 'downtime',
        title: t('home.defense2Title'),
        body: t('home.defense2Body'),
        badge: t('home.defense2Badge'),
        highlight: t('home.defense2Highlight'),
        videoSrc: timeVideo,
      },
      {
        type: 'trust',
        title: t('home.defense3Title'),
        body: t('home.defense3Body'),
        badge: t('home.defense3Badge'),
        highlight: t('home.defense3Highlight'),
        videoSrc: trustVideo,
      },
      {
        type: 'compliance',
        title: t('home.defense4Title'),
        body: t('home.defense4Body'),
        badge: t('home.defense4Badge'),
        highlight: t('home.defense4Highlight'),
        videoSrc: complianceVideo,
      },
      {
        type: 'speed',
        title: t('home.defense5Title'),
        body: t('home.defense5Body'),
        badge: t('home.defense5Badge'),
        highlight: t('home.defense5Highlight'),
        videoSrc: mapVideo,
      },
    ],
    [t],
  );

  const flowSteps = [
    { type: 'deploy', title: t('home.flowStep1Title'), body: t('home.flowStep1Body') },
    { type: 'shield', title: t('home.flowStep2Title'), body: t('home.flowStep2Body') },
    {
      type: 'ingest',
      title: t('home.flowStep3Title'),
      body: t('home.flowStep3Body'),
    },
    { type: 'map', title: t('home.flowStep4Title'), body: t('home.flowStep4Body') },
  ];

  const faqItems = useMemo(
    () => [
      { id: 'ingest', question: t('home.faq1Q'), answer: t('home.faq1A') },
      { id: 'setup', question: t('home.faq2Q'), answer: t('home.faq2A') },
      { id: 'privacy', question: t('home.faq3Q'), answer: t('home.faq3A') },
      { id: 'plans', question: t('home.faq4Q'), answer: t('home.faq4A') },
      { id: 'billing', question: t('home.faq5Q'), answer: t('home.faq5A') },
      { id: 'support', question: t('home.faq6Q'), answer: t('home.faq6A') },
    ],
    [t],
  );

  return (
    <div className="relative min-h-full w-full text-[#111827]" style={{ backgroundColor: C.bg }}>
      <LandingHeader onGetStarted={onGetStarted} />

      <div id="landing-hero" className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        <div className="h-16 shrink-0 sm:h-[4.25rem]" aria-hidden />

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

        <section className="landing-hero-content relative flex min-h-0 flex-1 flex-col justify-between sm:justify-start pl-6 pr-4 sm:pl-10 sm:pr-6 lg:pl-14 lg:pr-10 xl:pl-20">
          <div className="w-full text-left">
            <div
              className="animate-home-intro-in w-full max-w-4xl opacity-0 sm:max-w-5xl lg:max-w-[64rem] xl:max-w-[74rem] 2xl:max-w-[80rem]"
              style={{ animationDelay: '0.05s' }}
            >
              <div className="landing-hero-typing-slot">
                <LandingHeroTypingTitle
                  lines={heroTypingLines}
                  className="landing-hero-title font-cyber mt-5 text-[2.15rem] font-bold leading-[1.12] sm:mt-6 sm:text-[2.85rem] md:text-[3.35rem] lg:text-[3.85rem] lg:leading-[1.08] xl:text-[4.35rem] 2xl:text-[4.65rem]"
                />
              </div>
            </div>

            <div
              className="landing-hero-cta-desktop animate-home-intro-in hidden w-full flex-col gap-3 opacity-0 sm:flex sm:flex-row sm:justify-start"
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
          </div>

          <div
            className="landing-hero-cta-mobile animate-home-intro-in flex w-full flex-col gap-3 opacity-0 sm:hidden"
            style={{ animationDelay: '0.18s' }}
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="landing-hero-cta-primary font-cyber text-xs font-bold uppercase tracking-[0.22em] text-white transition"
            >
              {t('home.introCtaPrimary')}
            </button>
            <Link
              to="/docs"
              className="landing-hero-cta-secondary inline-flex items-center justify-center text-xs font-semibold uppercase tracking-[0.18em] transition"
            >
              {t('home.introCtaSecondary')}
            </Link>
          </div>
        </section>
      </div>

      <WhySlarkScrollSection
        title={t('home.sectionFeatures')}
        brandName={t('brand.name')}
        finaleTagline={t('home.featuresFinaleTagline')}
        scrollHint={t('home.featuresScrollHint')}
        features={features}
      />

      <WhyDefenseSection
        eyebrow={t('home.defenseEyebrow')}
        titleBefore={t('home.defenseTitleBefore')}
        titleHighlight={t('home.defenseTitleHighlight')}
        titleAfter={t('home.defenseTitleAfter')}
        subtitle={t('home.defenseSubtitle')}
        footnotes={defenseFootnotes}
        cards={defenseCards}
      />

      <FlowSection
        eyebrow={t('home.flowEyebrow')}
        title={t('home.sectionFlow')}
        subtitle={t('home.flowSubtitle')}
        stepLabel={t('home.introStepLabel')}
        steps={flowSteps}
      />

      <PricingSection
        eyebrow={t('home.ctaApiPurchase')}
        title={t('home.sectionPricing')}
        subtitle={t('home.pricingSubtitle')}
        footnote={t('home.pricingFootnote')}
      />

      <FaqSection
        eyebrow={t('home.faqEyebrow')}
        title={t('home.faqTitle')}
        subtitle={t('home.faqSubtitle')}
        items={faqItems}
        docsFootnote={t('home.faqDocsFootnote')}
        docsLink={t('home.faqDocsLink')}
      />

      <LandingFooter onGetStarted={onGetStarted} />

      <LandingAiChatFab />
    </div>
  );
}
