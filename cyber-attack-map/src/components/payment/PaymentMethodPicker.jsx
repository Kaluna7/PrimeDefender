import { useMemo, useState } from 'react';
import { Building2, ChevronDown, CreditCard, QrCode, Store, Wallet } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { PaymentBrandLogo } from './PaymentBrandLogo.jsx';

const CATEGORY_ICONS = {
  ewallet: Wallet,
  qris: QrCode,
  va: Building2,
  card: CreditCard,
  otc: Store,
};

function methodLabel(locale, method) {
  return locale === 'id' ? method.labelId : method.labelEn;
}

function categoryLabel(locale, category) {
  return locale === 'id' ? category.labelId : category.labelEn;
}

function MethodBrandLogo({ method, locale }) {
  const label = methodLabel(locale, method);

  if (method.icon === 'card') {
    return (
      <span className="flex shrink-0 gap-1.5">
        <PaymentBrandLogo variant="visa" label="Visa" />
        <PaymentBrandLogo variant="mastercard" label="Mastercard" />
      </span>
    );
  }

  return <PaymentBrandLogo icon={method.icon} label={label} />;
}

export function PaymentMethodPicker({
  methods,
  categories,
  locale,
  selectedId,
  onSelect,
  disabled,
  loading,
}) {
  const { t } = useI18n();
  const [openCategoryId, setOpenCategoryId] = useState(null);

  const grouped = useMemo(() => {
    if (categories?.length && methods.some((m) => m.category)) {
      return categories
        .map((cat) => ({
          ...cat,
          methods: methods.filter((m) => m.category === cat.id),
        }))
        .filter((g) => g.methods.length > 0);
    }
    return [
      {
        id: 'all',
        labelEn: 'Payment methods',
        labelId: 'Metode pembayaran',
        methods,
      },
    ];
  }, [categories, methods]);

  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="h-14 animate-pulse rounded-xl border border-slark-border bg-slark-card dark:bg-slark-dark/60"
          />
        ))}
      </div>
    );
  }

  const toggleCategory = (categoryId) => {
    setOpenCategoryId((current) => (current === categoryId ? null : categoryId));
  };

  const handleSelect = (methodId) => {
    onSelect(methodId);
    setOpenCategoryId(null);
  };

  return (
    <div className="mt-4 space-y-3" role="radiogroup">
      {grouped.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
          No payment methods available. Restart the bridge server and refresh.
        </p>
      )}

      {grouped.map((group) => {
        const CatIcon = CATEGORY_ICONS[group.id] || Wallet;
        const selectedInGroup = group.methods.find((m) => m.id === selectedId) || null;
        const isOpen = openCategoryId === group.id;
        const groupLabel = categoryLabel(locale, group);

        return (
          <div
            key={group.id}
            className={`overflow-hidden rounded-xl border transition ${
              selectedInGroup
                ? 'border-slark-primary/40 bg-slark-primary/[0.04] dark:bg-slark-primary/[0.08]'
                : 'border-slark-border bg-slark-bg dark:bg-slark-dark/60'
            }`}
          >
            <button
              type="button"
              disabled={disabled}
              onClick={() => toggleCategory(group.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition disabled:opacity-50"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slark-card text-slark-primary dark:bg-slark-dark/80">
                <CatIcon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slark-muted">
                  {groupLabel}
                </span>
                <span
                  className={`mt-0.5 block truncate text-sm font-semibold ${
                    selectedInGroup ? 'text-slark-text dark:text-white' : 'text-slark-muted'
                  }`}
                >
                  {selectedInGroup
                    ? methodLabel(locale, selectedInGroup)
                    : t('purchase.checkoutCategoryPlaceholder')}
                </span>
              </span>

              {selectedInGroup && <MethodBrandLogo method={selectedInGroup} locale={locale} />}

              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slark-muted transition-transform motion-safe:duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
                strokeWidth={2}
                aria-hidden
              />
            </button>

            {isOpen && (
              <ul className="border-t border-slark-border">
                {group.methods.map((method) => {
                  const selected = selectedId === method.id;
                  return (
                    <li key={method.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={disabled}
                        onClick={() => handleSelect(method.id)}
                        className={`flex w-full items-center gap-3 border-b border-slark-border/60 px-4 py-3 text-left transition last:border-b-0 disabled:opacity-50 ${
                          selected
                            ? 'bg-slark-primary/10 dark:bg-slark-primary/15'
                            : 'hover:bg-slark-primary/5 dark:hover:bg-slark-primary/10'
                        }`}
                      >
                        <MethodBrandLogo method={method} locale={locale} />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-slark-text dark:text-white">
                          {methodLabel(locale, method)}
                        </span>
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${
                            selected
                              ? 'border-slark-primary bg-slark-primary'
                              : 'border-slark-border bg-transparent'
                          }`}
                          aria-hidden
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
