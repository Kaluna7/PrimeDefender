import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SLARK as C } from '../../../theme/slarkColors.js';
import siteIcon from '../../../assets/images/icon.webp';

const EXPLORE_LINKS = [
  { href: '#features', labelKey: 'home.sectionFeatures' },
  { href: '#flow', labelKey: 'home.sectionFlow' },
  { href: '#pricing', labelKey: 'home.sectionPricing' },
  { href: '#faq', labelKey: 'home.sectionFaq' },
];

const RESOURCE_LINKS = [
  { to: '/docs', labelKey: 'home.introCtaSecondary' },
  { to: '/purchase', labelKey: 'home.ctaApiPurchase' },
  { to: '/about', labelKey: 'nav.about' },
];

function FooterColumn({ title, children, className = '' }) {
  return (
    <div className={className}>
      <h3
        className="font-cyber text-[10px] font-bold uppercase tracking-[0.22em]"
        style={{ color: C.textMuted }}
      >
        {title}
      </h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function FooterLinkColumn({ title, children, className = '' }) {
  return (
    <FooterColumn title={title} className={className}>
      <ul className="space-y-2.5">{children}</ul>
    </FooterColumn>
  );
}

/** @param {{ visible: boolean; delay: string; className?: string; children: import('react').ReactNode }} props */
function CtaReveal({ visible, delay, className = '', children }) {
  return (
    <div
      className={`translate-y-5 opacity-0 motion-reduce:translate-y-0 ${
        visible ? 'motion-safe:animate-home-intro-in motion-reduce:animate-none motion-reduce:opacity-100' : ''
      } ${className}`.trim()}
      style={visible ? { animationDelay: delay, animationFillMode: 'forwards' } : undefined}
    >
      {children}
    </div>
  );
}

export function LandingFooter({ onGetStarted }) {
  const { t } = useI18n();
  const year = new Date().getFullYear();
  const ctaRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [ctaVisible, setCtaVisible] = useState(false);

  useEffect(() => {
    const el = ctaRef.current;
    if (!el) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setCtaVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="border-t" style={{ backgroundColor: C.bg, borderColor: C.border }}>
      {/* CTA band */}
      <section
        ref={ctaRef}
        className="relative overflow-hidden border-b px-4 py-16 sm:px-6 sm:py-20 lg:px-8 xl:px-10"
        style={{ borderColor: C.onDark.border, backgroundColor: C.darkNavy }}
      >
        <div className="landing-cta-bg pointer-events-none absolute inset-0" aria-hidden>
          <div className="landing-cta-bg-grid-fine absolute inset-0" />
          <div className="landing-cta-bg-grid-major absolute inset-0" />
          <div className="landing-cta-bg-gradient absolute inset-0" />
          <div className="landing-cta-bg-shimmer absolute inset-0" />
          <div
            className="landing-cta-orb absolute -left-24 top-1/2 h-72 w-72 rounded-full blur-[100px]"
            style={{ backgroundColor: 'rgba(198,40,40,0.28)' }}
          />
          <div
            className="landing-cta-orb landing-cta-orb-delayed absolute -right-20 top-0 h-64 w-64 rounded-full blur-[90px]"
            style={{ backgroundColor: 'rgba(148,163,184,0.16)' }}
          />
          <div className="landing-cta-bg-vignette absolute inset-0" />
          <div
            className="landing-cta-bg-line absolute bottom-0 left-1/2 h-px w-[min(100%,42rem)] -translate-x-1/2"
            style={{
              background:
                'linear-gradient(90deg, transparent, rgba(198,40,40,0.5), transparent)',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl text-center">
          <CtaReveal visible={ctaVisible} delay="0.05s">
            <h2 className="font-cyber text-2xl font-bold sm:text-3xl" style={{ color: C.onDark.text }}>
              {t('home.introFinalTitle')}
            </h2>
          </CtaReveal>
          <CtaReveal visible={ctaVisible} delay="0.2s">
            <p
              className="mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base"
              style={{ color: C.onDark.textMuted }}
            >
              {t('home.introFinalSubtitle')}
            </p>
          </CtaReveal>
          <CtaReveal visible={ctaVisible} delay="0.35s" className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={onGetStarted}
              className="font-cyber rounded-xl border border-[#C62828] bg-[#C62828] px-8 py-3.5 text-xs font-bold uppercase tracking-[0.24em] text-white shadow-[0_4px_14px_rgba(198,40,40,0.25)] transition hover:border-[#B71C1C] hover:bg-[#B71C1C] hover:shadow-[0_6px_22px_rgba(198,40,40,0.35)] motion-safe:hover:scale-[1.02] active:scale-[0.98] sm:text-sm"
            >
              {t('home.introCtaPrimary')}
            </button>
          </CtaReveal>
        </div>
      </section>

      {/* Main footer */}
      <div className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8 xl:px-10">
        <div className="mx-auto max-w-6xl">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-start lg:gap-10 xl:gap-14">
            <div className="lg:col-span-4 lg:max-w-sm xl:max-w-md">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <img
                  src={siteIcon}
                  alt=""
                  width={36}
                  height={36}
                  className="h-9 w-9 rounded-lg object-cover"
                  aria-hidden
                />
                <span className="font-cyber text-base font-bold uppercase tracking-[0.12em] text-[#C62828]">
                  {t('brand.name')}
                </span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed" style={{ color: C.textMuted }}>
                {t('home.footerTagline')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:gap-x-12 lg:col-span-8 lg:grid-cols-3 lg:gap-x-8 xl:gap-x-12">
              <FooterLinkColumn title={t('home.footerExploreTitle')} className="min-w-0">
                {EXPLORE_LINKS.map((item) => (
                  <li key={item.href}>
                    <a
                      href={item.href}
                      className="inline-block text-sm leading-snug transition hover:text-[#C62828]"
                      style={{ color: C.dark }}
                    >
                      {t(item.labelKey)}
                    </a>
                  </li>
                ))}
              </FooterLinkColumn>

              <FooterLinkColumn title={t('home.footerResourcesTitle')} className="min-w-0">
                {RESOURCE_LINKS.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="inline-block text-sm leading-snug transition hover:text-[#C62828]"
                      style={{ color: C.dark }}
                    >
                      {t(item.labelKey)}
                    </Link>
                  </li>
                ))}
              </FooterLinkColumn>

              <FooterColumn
                title={t('home.footerOfficeTitle')}
                className="col-span-2 min-w-0 sm:col-span-1 lg:max-w-[15rem] xl:max-w-[17rem]"
              >
                <address className="flex gap-2.5 not-italic">
                  <MapPin
                    className="mt-0.5 h-4 w-4 shrink-0 text-[#C62828]"
                    strokeWidth={2}
                    aria-hidden
                  />
                  <div className="min-w-0 text-sm leading-[1.55]" style={{ color: C.dark }}>
                    <p>{t('home.footerAddressLine1')}</p>
                    <p className="mt-1">{t('home.footerAddressLine2')}</p>
                    <p className="mt-1 text-[13px]" style={{ color: C.textMuted }}>
                      {t('home.footerAddressLine3')}
                    </p>
                  </div>
                </address>
              </FooterColumn>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t px-4 py-5 sm:px-6 lg:px-8 xl:px-10" style={{ borderColor: C.border }}>
        <p
          className="mx-auto max-w-6xl text-center text-xs"
          style={{ color: C.textMuted }}
        >
          © {year} {t('brand.name')}. {t('home.footerRights')}
        </p>
      </div>
    </footer>
  );
}
