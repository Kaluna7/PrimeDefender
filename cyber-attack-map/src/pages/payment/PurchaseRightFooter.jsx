import { Link } from 'react-router-dom';
import siteIcon from '../../assets/images/icon.webp';
import { useI18n } from '../../i18n/I18nContext.jsx';

export function PurchaseRightFooter() {
  const { t } = useI18n();

  return (
    <footer className="flex shrink-0 items-center justify-center border-t border-slark-border bg-slark-bg px-4 py-3 dark:bg-slark-dark lg:px-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2.5 transition hover:opacity-80"
      >
        <img
          src={siteIcon}
          alt=""
          width={22}
          height={22}
          className="h-[1.375rem] w-[1.375rem] rounded-md object-cover"
          aria-hidden
        />
        <span className="font-cyber text-xs font-bold uppercase tracking-[0.12em] text-slark-primary">
          {t('brand.name')}
        </span>
      </Link>
    </footer>
  );
}
