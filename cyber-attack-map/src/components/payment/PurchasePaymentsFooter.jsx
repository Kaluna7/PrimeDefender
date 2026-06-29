import { Building2, CreditCard, Lock, QrCode, Store, Wallet } from 'lucide-react';
import { DEFAULT_PAYMENT_METHOD_CATEGORIES } from '../../constants/paymentMethods.js';
import { MIDTRANS_PAYMENT_LOGOS } from '../../constants/midtransPaymentLogos.js';
import { PaymentBrandLogo } from './PaymentBrandLogo.jsx';

const CATEGORY_ICONS = {
  ewallet: Wallet,
  qris: QrCode,
  va: Building2,
  card: CreditCard,
  otc: Store,
};

const CATEGORY_LABELS = {
  ewallet: { en: 'E-Wallet', id: 'E-Wallet' },
  qris: { en: 'QR Payment', id: 'Pembayaran QR' },
  va: { en: 'Virtual Account', id: 'Virtual Account' },
  card: { en: 'Card Payment', id: 'Pembayaran Kartu' },
  otc: { en: 'Over the Counter', id: 'Minimarket' },
};

/**
 * @param {{ methods: import('../../constants/paymentMethods.js').DEFAULT_PAYMENT_METHODS, locale: string }} props
 */
export function PurchasePaymentMethods({ methods, locale }) {
  const lang = locale === 'id' ? 'id' : 'en';

  const categories = DEFAULT_PAYMENT_METHOD_CATEGORIES.filter((cat) =>
    methods.some((m) => m.category === cat.id)
  );

  return (
    <div className="shrink-0 space-y-2.5 sm:space-y-3">
      {categories.map((cat) => {
        const CatIcon = CATEGORY_ICONS[cat.id] || Wallet;
        const catLabel = CATEGORY_LABELS[cat.id]?.[lang] || (lang === 'id' ? cat.labelId : cat.labelEn);
        const items = methods.filter((m) => m.category === cat.id);
        if (!items.length) return null;

        return (
          <div key={cat.id}>
            <div className="flex items-center gap-1.5 text-slate-400">
              <CatIcon className="h-2.5 w-2.5 shrink-0 sm:h-3 sm:w-3" strokeWidth={2} aria-hidden />
              <p className="text-[8px] font-bold uppercase tracking-[0.16em] sm:text-[9px] sm:tracking-[0.18em]">
                {catLabel}
              </p>
            </div>
            <ul className="mt-1.5 flex flex-wrap gap-1 sm:mt-2 sm:gap-1.5">
              {items.flatMap((method) => {
                const label = lang === 'id' ? method.labelId : method.labelEn;
                if (method.icon === 'card') {
                  return [
                    <li key={`${method.id}-visa`}>
                      <PaymentBrandLogo variant="visa" label="Visa" />
                    </li>,
                    <li key={`${method.id}-mc`}>
                      <PaymentBrandLogo variant="mastercard" label="Mastercard" />
                    </li>,
                  ];
                }
                return (
                  <li key={method.id}>
                    <PaymentBrandLogo icon={method.icon} label={label} />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * @param {{ secureTitle: string, secureBody: string, className?: string }} props
 */
export function PurchaseSecurePaymentBar({ secureTitle, secureBody, className = '' }) {
  return (
    <div
      className={`flex shrink-0 flex-col gap-2 rounded-lg bg-slate-800/90 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3 ${className}`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <Lock className="mt-0.5 h-3 w-3 shrink-0 text-white sm:mt-0" strokeWidth={2} aria-hidden />
        <div className="min-w-0">
          <p className="text-[11px] font-semibold leading-snug text-white sm:text-xs">{secureTitle}</p>
          <p className="mt-0.5 text-[9px] leading-snug text-slate-400 sm:text-[10px]">{secureBody}</p>
        </div>
      </div>
      <img
        src={MIDTRANS_PAYMENT_LOGOS.midtransWhite}
        alt="Midtrans"
        className="h-3.5 w-auto shrink-0 self-start object-contain opacity-95 sm:h-4 sm:self-center"
        loading="lazy"
      />
    </div>
  );
}
