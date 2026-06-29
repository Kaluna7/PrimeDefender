import { DEFAULT_PAYMENT_METHODS } from '../../constants/paymentMethods.js';
import {
  PurchasePaymentMethods,
  PurchaseSecurePaymentBar,
} from '../../components/payment/PurchasePaymentsFooter.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';

/**
 * Panel kiri halaman langganan — muat satu layar tanpa scroll.
 * @param {{ title: string, subtitle: string, methods?: typeof DEFAULT_PAYMENT_METHODS, backLink?: import('react').ReactNode }} props
 */
export function PurchaseHeroPanel({
  title,
  subtitle,
  methods = DEFAULT_PAYMENT_METHODS,
  backLink,
}) {
  const { t, locale } = useI18n();

  return (
    <aside className="relative flex w-full shrink-0 flex-col bg-slark-dark text-white lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:w-[min(100%,460px)] xl:w-[480px] 2xl:w-[520px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(198,40,40,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(198,40,40,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slark-primary/10 via-transparent to-transparent"
        aria-hidden
      />

      <div className="relative flex flex-col px-4 pb-4 pt-12 sm:px-5 sm:pb-5 sm:pt-14 lg:h-full lg:min-h-0 lg:px-6 lg:pb-6 lg:pt-14">
        <div className="shrink-0">
          {backLink}
          <h1 className="font-cyber mt-3 text-xl font-bold leading-tight tracking-tight text-white sm:text-2xl lg:text-[1.65rem]">
            {title}
          </h1>
          <p className="mt-2 max-w-sm text-[11px] leading-relaxed text-slate-300 sm:text-xs lg:text-[13px]">
            {subtitle}
          </p>
        </div>

        <div className="mt-4 py-3 sm:py-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:py-10">
          <PurchasePaymentMethods methods={methods} locale={locale} />
        </div>

        <PurchaseSecurePaymentBar
          className="mt-3 lg:mt-0"
          secureTitle={t('purchase.securePaymentTitle')}
          secureBody={t('purchase.securePaymentBody')}
        />
      </div>
    </aside>
  );
}
