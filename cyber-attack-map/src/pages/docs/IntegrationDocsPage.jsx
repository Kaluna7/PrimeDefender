import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { IntegrationDocsHeader } from './IntegrationDocsHeader.jsx';
import { IntegrationDocsSidebar } from './IntegrationDocsSidebar.jsx';
import { IntegrationGuideSections } from './IntegrationGuideSections.jsx';
import { integrationGuide } from './integrationGuide.js';

/** @param {string | null} value */
function parseDocsStack(value) {
  return value === 'javascript' ? 'javascript' : 'python';
}

export function IntegrationDocsPage() {
  const { locale, t } = useI18n();
  const doc = integrationGuide[locale] || integrationGuide.en;
  const [searchParams, setSearchParams] = useSearchParams();
  const [stack, setStack] = useState(() => parseDocsStack(searchParams.get('stack')));
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const fromUrl = parseDocsStack(searchParams.get('stack'));
    setStack((current) => (current === fromUrl ? current : fromUrl));
  }, [searchParams]);

  const handleStackChange = (next) => {
    setStack(next);
    setSearchParams(
      (prev) => {
        const params = new URLSearchParams(prev);
        if (next === 'python') params.delete('stack');
        else params.set('stack', next);
        return params;
      },
      { replace: true },
    );
  };

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('nav.docs')}`;
  }, [t, locale]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const close = () => {
      if (mq.matches) setMenuOpen(false);
    };
    mq.addEventListener('change', close);
    return () => mq.removeEventListener('change', close);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-slark-bg dark:bg-slark-dark">
      <aside className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:overflow-hidden lg:border-r lg:border-slark-border lg:bg-slark-card/40 lg:px-6 lg:py-10 dark:lg:bg-slark-dark/50 xl:w-64">
        <IntegrationDocsSidebar doc={doc} stack={stack} onStackChange={handleStackChange} className="min-h-0" />
      </aside>

      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slark-text/30 lg:hidden dark:bg-black/50"
          aria-label={doc.menuLabel}
          onClick={closeMenu}
        />
      ) : null}

      <aside
        id="docs-mobile-nav"
        className={`fixed inset-y-0 left-0 z-50 w-[min(85vw,16rem)] overflow-y-auto border-r border-slark-border bg-slark-card/95 px-4 py-8 transition-transform duration-300 dark:border-slark-border/50 dark:bg-slark-dark/95 lg:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
      >
        <IntegrationDocsSidebar
          doc={doc}
          stack={stack}
          onStackChange={handleStackChange}
          onNavigate={closeMenu}
          className="!h-auto"
        />
      </aside>

      <div className="min-w-0 lg:ml-60 xl:ml-64">
        <IntegrationDocsHeader
          doc={doc}
          stack={stack}
          menuOpen={menuOpen}
          onMenuToggle={() => setMenuOpen((open) => !open)}
        />

        <main className="w-full px-4 py-8 pb-20 sm:py-10 sm:pb-24 lg:px-10 lg:pb-24">
          <p className="max-w-4xl text-[15px] leading-relaxed text-slark-muted sm:text-base">{doc.subtitle}</p>

          <Link
            to="/monitoring"
            className="mt-5 inline-flex rounded-xl bg-slark-primary px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-slark-primary-hover sm:mt-6 sm:py-2.5 sm:text-xs"
          >
            {t('nav.monitoring')}
          </Link>

          <article className="mt-8 w-full sm:mt-10">
            <IntegrationGuideSections
              variant="page"
              locale={locale}
              stack={stack}
              onStackChange={handleStackChange}
            />
          </article>
        </main>
      </div>
    </div>
  );
}
