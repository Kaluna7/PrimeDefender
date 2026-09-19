import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SLARK as C } from '../../../theme/slarkColors.js';

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {string} props.footnote
 */
export function PricingSection({ eyebrow, title, subtitle, footnote }) {
  const { t } = useI18n();

  return (
    <section
      id="pricing"
      className="relative border-t px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      style={{ borderColor: C.border, backgroundColor: C.card }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute left-1/2 top-0 h-80 w-[min(100%,48rem)] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ backgroundColor: 'rgba(198,40,40,0.06)' }}
        />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(148,163,184,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.06) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl text-center">
        <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
          {eyebrow}
        </p>
        <h2 className="font-cyber mt-3 text-2xl font-bold sm:text-3xl" style={{ color: C.text }}>
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: C.textMuted }}>
          {subtitle}
        </p>

        <ul className="mx-auto mt-8 max-w-md space-y-2 text-left text-sm leading-relaxed" style={{ color: C.textMuted }}>
          {[t('purchase.featureIngest'), t('purchase.featureMap'), t('purchase.featureKeys')].map((item) => (
            <li key={item} className="flex gap-2">
              <span style={{ color: C.primary }} aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Link
            to="/api-key"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#C62828] bg-[#C62828] px-6 py-3.5 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-[0_4px_14px_rgba(198,40,40,0.22)] transition hover:border-[#B71C1C] hover:bg-[#B71C1C] sm:text-[13px]"
          >
            {t('home.ctaApiPurchase')}
            <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
          </Link>
        </div>

        <p className="mt-10 text-xs leading-relaxed sm:text-sm" style={{ color: C.textMuted }}>
          {footnote}
        </p>
      </div>
    </section>
  );
}
