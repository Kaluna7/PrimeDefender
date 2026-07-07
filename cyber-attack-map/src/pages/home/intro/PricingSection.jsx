import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { fetchPaymentConfig, formatIdr } from '../../../services/payment.js';
import { planTitle } from '../../payment/planTitle.js';
import { SLARK as C } from '../../../theme/slarkColors.js';

/** @type {{ id: string; months: number; amount: number }[]} */
const FALLBACK_PLANS = [
  { id: 'sub_6m', months: 6, amount: 349000 },
  { id: 'sub_1y', months: 12, amount: 599000 },
  { id: 'sub_2y', months: 24, amount: 1199000 },
];

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {string} props.footnote
 */
export function PricingSection({ eyebrow, title, subtitle, footnote }) {
  const { t } = useI18n();
  const [plans, setPlans] = useState(/** @type {{ id: string; months: number; amount: number }[] | null} */ (null));

  useEffect(() => {
    let cancelled = false;
    void fetchPaymentConfig().then((cfg) => {
      if (cancelled) return;
      const list = Array.isArray(cfg?.plans) && cfg.plans.length ? cfg.plans : FALLBACK_PLANS;
      setPlans(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayPlans = plans ?? FALLBACK_PLANS;
  const loading = plans === null;

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

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
            {eyebrow}
          </p>
          <h2 className="font-cyber mt-3 text-2xl font-bold sm:text-3xl" style={{ color: C.text }}>
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: C.textMuted }}>
            {subtitle}
          </p>
        </div>

        <div className="mt-12 grid items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:gap-8">
          {loading
            ? [1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-[22rem] animate-pulse rounded-2xl border"
                  style={{ borderColor: C.border, backgroundColor: C.bg }}
                />
              ))
            : displayPlans.map((plan) => {
                const popular = plan.id === 'sub_1y';
                const features = [
                  t('purchase.featureIngest'),
                  t('purchase.featureMap'),
                  t('purchase.featureKeys'),
                ];

                return (
                  <article
                    key={plan.id}
                    className={`relative flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 motion-safe:hover:-translate-y-0.5 ${
                      popular
                        ? 'z-10 border-2 border-[#C62828] bg-[#FFFFFF] shadow-[0_16px_48px_rgba(198,40,40,0.16)] lg:scale-[1.03]'
                        : 'border-[#E2E8F0] bg-[#FFFFFF] shadow-sm hover:border-[#C62828]/30 hover:shadow-[0_10px_32px_rgba(17,24,39,0.08)]'
                    }`}
                  >
                    {popular ? (
                      <div
                        className="relative flex items-center justify-center border-b border-[#C62828]/25 px-4 py-3"
                        style={{
                          background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryHover} 100%)`,
                        }}
                      >
                        <span className="font-cyber text-[10px] font-bold uppercase tracking-[0.28em] text-white sm:text-[11px]">
                          {t('purchase.popular')}
                        </span>
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/20"
                          aria-hidden
                        />
                      </div>
                    ) : null}

                    <div className="flex flex-1 flex-col p-6 sm:p-7 lg:p-6 xl:p-8">
                      <h3
                        className="font-cyber text-lg font-bold uppercase tracking-[0.08em]"
                        style={{ color: popular ? C.primary : C.text }}
                      >
                        {planTitle(t, plan)}
                      </h3>

                      <p className="font-cyber mt-4 text-3xl font-bold tabular-nums leading-none sm:text-4xl" style={{ color: C.text }}>
                        {formatIdr(plan.amount)}
                      </p>
                      <p className="mt-2 text-xs font-medium sm:text-sm" style={{ color: C.textMuted }}>
                        {t('purchase.perPackage')}
                      </p>

                      <ul className="mt-5 flex-1 space-y-2 text-sm leading-relaxed" style={{ color: C.textMuted }}>
                        {features.map((item) => (
                          <li key={item} className="flex gap-2">
                            <span style={{ color: C.primary }} aria-hidden>
                              •
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>

                      <div className="mt-7 border-t pt-6" style={{ borderColor: C.border }}>
                        <Link
                          to={`/purchase/checkout/${plan.id}`}
                          className={`inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] transition sm:text-[13px] ${
                            popular
                              ? 'border-[#C62828] bg-[#C62828] text-white shadow-[0_4px_14px_rgba(198,40,40,0.22)] hover:border-[#B71C1C] hover:bg-[#B71C1C]'
                              : 'border-[#E2E8F0] bg-[#FFFFFF] text-[#1F2937] hover:border-[#C62828] hover:text-[#C62828]'
                          }`}
                        >
                          {t('purchase.buyNow')}
                          <ArrowRight className="h-4 w-4" strokeWidth={2} aria-hidden />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
        </div>

        <p className="mt-10 text-center text-xs leading-relaxed sm:text-sm" style={{ color: C.textMuted }}>
          {footnote}
        </p>
      </div>
    </section>
  );
}
