import ID from 'country-flag-icons/react/3x2/ID';
import US from 'country-flag-icons/react/3x2/US';

const FLAGS = {
  en: US,
  id: ID,
};

/**
 * @param {{ locale: 'en' | 'id', className?: string }} props
 */
export function LanguageFlag({ locale, className = '' }) {
  const Flag = FLAGS[locale] || FLAGS.en;

  return (
    <span
      className={`inline-flex h-[18px] w-[26px] shrink-0 overflow-hidden rounded-[3px] border border-slark-border/50 shadow-sm dark:border-slark-border/40 ${className}`}
      aria-hidden
    >
      <Flag title="" className="h-full w-full" />
    </span>
  );
}
