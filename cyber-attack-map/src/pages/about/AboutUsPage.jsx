import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { SLARK as C } from '../../theme/slarkColors.js';
import { AboutPageBackground } from './AboutPageBackground.jsx';

const CREATORS = [
  { id: 'kaluna', nameKey: 'about.creator1Name', roleKey: 'about.creator1Role', bioKey: 'about.creator1Bio' },
  { id: 'dahesa', nameKey: 'about.creator2Name', roleKey: 'about.creator2Role', bioKey: 'about.creator2Bio' },
];

function SectionLabel({ children }) {
  return (
    <h2 className="font-cyber text-xs font-bold uppercase tracking-[0.22em] text-slark-primary">{children}</h2>
  );
}

function creatorInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('');
}

export function AboutUsPage() {
  const { t, locale } = useI18n();

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.about')}`;
  }, [t, locale]);

  return (
    <div className="relative">
      <AboutPageBackground />
      <div className="relative z-10 px-4 pb-14 pt-16 sm:px-6 sm:pb-16">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-slark-muted transition hover:text-slark-primary"
          >
            <span aria-hidden>←</span>
            {t('about.back')}
          </Link>

          <header className="mt-10 max-w-2xl">
            <p className="font-cyber text-[10px] uppercase tracking-[0.4em] text-slark-primary sm:text-xs">
              {t('about.eyebrow')}
            </p>
            <h1 className="font-cyber mt-4 text-3xl font-bold leading-tight text-slark-text dark:text-white sm:text-4xl">
              {t('about.title')}
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-slark-muted md:text-base">{t('about.intro')}</p>
          </header>

          <div className="my-12 h-px bg-gradient-to-r from-transparent via-slark-primary/25 to-transparent sm:my-14" />

          <section>
            <SectionLabel>{t('about.missionTitle')}</SectionLabel>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slark-muted md:text-base">
              {t('about.missionBody')}
            </p>
          </section>

          <div className="my-12 h-px bg-gradient-to-r from-transparent via-slark-border to-transparent sm:my-14" />

          <section>
            <SectionLabel>{t('about.teamTitle')}</SectionLabel>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slark-muted">{t('about.teamSubtitle')}</p>

            <div className="mt-10 space-y-10 sm:grid sm:grid-cols-2 sm:gap-x-10 sm:space-y-0">
              {CREATORS.map((creator) => {
                const name = t(creator.nameKey);
                return (
                  <div key={creator.id} className="flex gap-4">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-cyber text-sm font-bold text-white"
                      style={{ backgroundColor: C.primary }}
                      aria-hidden
                    >
                      {creatorInitials(name)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-cyber text-base font-bold leading-snug text-slark-text dark:text-white">
                        {name}
                      </h3>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slark-primary">
                        {t(creator.roleKey)}
                      </p>
                      <p className="mt-3 text-sm leading-relaxed text-slark-muted">{t(creator.bioKey)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <div className="my-12 h-px bg-gradient-to-r from-transparent via-slark-border to-transparent sm:my-14" />

          <section className="max-w-2xl">
            <SectionLabel>{t('about.visionTitle')}</SectionLabel>
            <p className="mt-4 text-sm leading-relaxed text-slark-muted md:text-base">{t('about.visionBody')}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
