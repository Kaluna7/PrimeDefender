import { useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { searchGuide } from './integrationGuide.js';

/**
 * @param {object} props
 * @param {import('./integrationGuide.js').integrationGuide.en} props.doc
 * @param {import('./integrationGuide.js').IntegrationStack} props.stack
 * @param {boolean} props.menuOpen
 * @param {() => void} props.onMenuToggle
 */
export function IntegrationDocsHeader({ doc, stack, menuOpen, onMenuToggle }) {
  const { t } = useI18n();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  const results = useMemo(() => searchGuide(doc, stack, query), [doc, stack, query]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(/** @type {Node} */ (event.target))) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, []);

  const goTo = (id) => {
    setOpen(false);
    setQuery('');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${id}`);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      setOpen(false);
      return;
    }
    if (event.key === 'Enter' && results.length > 0) {
      event.preventDefault();
      goTo(results[0].id);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slark-border bg-slark-bg/95 pr-16 backdrop-blur-md dark:border-slark-border/50 dark:bg-slark-dark/95 sm:pr-24">
      <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 lg:px-10 lg:py-5">
        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
          <button
            type="button"
            className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slark-border bg-slark-card text-slark-text transition hover:border-slark-primary/40 hover:text-slark-primary dark:border-slark-border/50 dark:bg-slark-dark/80 dark:text-white lg:hidden"
            onClick={onMenuToggle}
            aria-expanded={menuOpen}
            aria-controls="docs-mobile-nav"
            aria-label={doc.menuLabel}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <div className="min-w-0 shrink-0">
            <p className="font-cyber text-[10px] uppercase tracking-[0.28em] text-slark-primary sm:text-[11px]">
              {t('nav.docs')}
            </p>
            <h1 className="font-cyber mt-1 truncate text-lg font-bold leading-tight text-slark-text dark:text-white sm:text-xl md:text-2xl">
              {doc.title}
            </h1>
          </div>
        </div>

        <div ref={rootRef} className="relative w-full sm:max-w-[14rem] lg:max-w-xs xl:max-w-sm">
          <label htmlFor="docs-search" className="sr-only">
            {doc.searchPlaceholder}
          </label>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slark-muted">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden>
              <path
                fillRule="evenodd"
                d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            id="docs-search"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={doc.searchPlaceholder}
            className="w-full rounded-xl border border-slark-border bg-slark-card py-2.5 pl-9 pr-3 text-sm text-slark-text outline-none transition placeholder:text-slark-muted focus:border-slark-primary focus:ring-2 focus:ring-slark-primary/20 dark:border-slark-border/50 dark:bg-slark-dark/80 dark:text-white dark:focus:border-slark-primary"
            autoComplete="off"
          />

          {open && query.trim() ? (
            <ul
              className="absolute left-0 right-0 top-[calc(100%+0.35rem)] z-30 max-h-64 overflow-y-auto rounded-xl border border-slark-border bg-slark-card py-1 shadow-lg dark:border-slark-border/50 dark:bg-slark-dark"
              role="listbox"
            >
              {results.length === 0 ? (
                <li className="px-3 py-2.5 text-sm text-slark-muted">{doc.searchNoResults}</li>
              ) : (
                results.map((item) => (
                  <li key={item.id} role="option">
                    <a
                      href={`#${item.id}`}
                      onClick={() => goTo(item.id)}
                      className="flex w-full flex-col px-3 py-2.5 text-left transition hover:bg-slark-bg dark:hover:bg-slark-dark/60"
                    >
                      <span className="text-sm font-medium text-slark-text dark:text-white">{item.label}</span>
                      {item.parent ? (
                        <span className="mt-0.5 text-xs text-slark-muted">{item.parent}</span>
                      ) : null}
                    </a>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </div>
      </div>
    </header>
  );
}
