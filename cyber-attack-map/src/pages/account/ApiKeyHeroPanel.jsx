import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';

/**
 * @param {{ title: string, subtitle: string, backLink?: import('react').ReactNode }} props
 */
export function ApiKeyHeroPanel({ title, subtitle, backLink }) {
  const { t } = useI18n();

  return (
    <aside className="relative flex w-full shrink-0 flex-col bg-slark-dark text-white lg:sticky lg:top-0 lg:h-screen lg:max-h-screen lg:overflow-hidden lg:w-[min(100%,420px)] xl:w-[440px]">
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

      <div className="relative flex flex-1 flex-col justify-start px-5 pb-6 pt-12 sm:px-6 sm:pb-8 sm:pt-14 lg:min-h-0 lg:px-8 lg:pb-8 lg:pt-14">
        <div>
          {backLink}
          <h1 className="font-cyber mt-6 text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-[2.5rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-slate-300 sm:text-[15px] lg:text-base">
            {subtitle}
          </p>
        </div>

        <div className="mt-auto border-t border-white/10 pt-5">
          <Link to="/" className="inline-flex transition hover:opacity-80">
            <span className="font-cyber text-xs font-bold uppercase tracking-[0.12em] text-white">
              {t('brand.name')}
            </span>
          </Link>
        </div>
      </div>
    </aside>
  );
}
