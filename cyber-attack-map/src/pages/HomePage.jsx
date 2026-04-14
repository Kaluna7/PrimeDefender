import { useEffect } from 'react';
import { HomeInteractiveHero } from '../components/home/HomeInteractiveHero.jsx';
import { useI18n } from '../i18n/I18nContext.jsx';

export function HomePage() {
  const { t, locale } = useI18n();

  useEffect(() => {
    document.title = `${t('brand.name')} – Home`;
  }, [t, locale]);

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col bg-[#030508] md:overflow-hidden">
      <HomeInteractiveHero />
    </div>
  );
}
