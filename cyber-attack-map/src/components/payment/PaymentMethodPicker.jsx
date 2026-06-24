import { CardBrandBadges, PaymentMethodIcon } from './PaymentMethodIcon.jsx';

function methodLabel(locale, method) {
  return locale === 'id' ? method.labelId : method.labelEn;
}

function categoryLabel(locale, category) {
  return locale === 'id' ? category.labelId : category.labelEn;
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
  if (loading) {
    return (
      <div className="mt-4 space-y-3">
        {[1, 2, 3, 4, 5].map((n) => (
          <div
            key={n}
            className="h-16 animate-pulse rounded-xl border border-slark-border bg-slark-card dark:bg-slark-dark/60"
          />
        ))}
      </div>
    );
  }

  const grouped = (() => {
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
  })();

  return (
    <div className="mt-4 space-y-5" role="radiogroup">
      {grouped.length === 0 && (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-300">
          No payment methods available. Restart the bridge server and refresh.
        </p>
      )}
      {grouped.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slark-muted">
            {categoryLabel(locale, group)}
          </p>
          <ul className="space-y-2">
            {group.methods.map((method) => {
              const selected = selectedId === method.id;
              return (
                <li key={method.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    disabled={disabled}
                    onClick={() => onSelect(method.id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left transition disabled:opacity-50 ${
                      selected
                        ? 'border-slark-primary bg-slark-primary/10 ring-2 ring-slark-primary/25 dark:bg-slark-primary/15'
                        : 'border-slark-border bg-slark-bg hover:border-slark-primary/40 hover:bg-slark-primary/5 dark:bg-slark-dark/60 dark:hover:bg-slark-primary/10'
                    }`}
                  >
                    <PaymentMethodIcon icon={method.icon} brandColor={method.brandColor} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slark-text dark:text-white">
                        {methodLabel(locale, method)}
                      </span>
                      {method.badges?.length > 0 && <CardBrandBadges badges={method.badges} />}
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
        </div>
      ))}
    </div>
  );
}
