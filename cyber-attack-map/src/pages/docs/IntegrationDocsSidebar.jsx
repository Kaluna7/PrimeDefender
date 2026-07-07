import { useI18n } from '../../i18n/I18nContext.jsx';
import siteIcon from '../../assets/images/icon.webp';
import { INTEGRATION_STACKS, getGuideNavItems } from './integrationGuide.js';

/**
 * @param {object} props
 * @param {import('./integrationGuide.js').integrationGuide.en} props.doc
 * @param {import('./integrationGuide.js').IntegrationStack} props.stack
 * @param {(stack: import('./integrationGuide.js').IntegrationStack) => void} props.onStackChange
 * @param {() => void} [props.onNavigate]
 * @param {string} [props.className]
 */
export function IntegrationDocsSidebar({ doc, stack, onStackChange, onNavigate, className = '' }) {
  const { t } = useI18n();
  const navItems = getGuideNavItems(doc, stack);

  const sectionLink =
    'block rounded-lg px-3 py-2 text-[13px] leading-snug text-slark-muted transition hover:bg-slark-card hover:text-slark-text dark:hover:bg-slark-dark/50 dark:hover:text-white';
  const childLink =
    'block rounded-md py-1.5 pl-3 pr-2 text-xs text-slark-muted transition hover:text-slark-primary dark:hover:text-slark-primary';
  const stackLink =
    'block rounded-lg px-3 py-2 text-sm font-semibold transition hover:bg-slark-card dark:hover:bg-slark-dark/50';
  const stackLinkActive = 'bg-slark-primary text-white shadow-sm hover:bg-slark-primary-hover hover:text-white';
  const stackLinkIdle =
    'text-slark-muted hover:text-slark-text dark:hover:text-white';

  const closeNav = () => onNavigate?.();

  return (
    <nav className={`flex h-full min-h-0 flex-col ${className}`} aria-label={doc.title}>
      <div className="shrink-0">
        <a href="/" className="mb-8 flex items-center gap-2.5">
          <img
            src={siteIcon}
            alt=""
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg object-cover"
            aria-hidden
          />
          <span className="font-cyber text-sm font-bold uppercase tracking-[0.12em] text-slark-primary sm:text-base">
            {t('brand.name')}
          </span>
        </a>

        <p className="text-xs font-semibold uppercase tracking-wider text-slark-muted">
          {doc.stackPickerLabel}
        </p>
        <ul className="mt-2 space-y-1">
          {INTEGRATION_STACKS.map((key) => {
            const active = stack === key;
            return (
              <li key={key}>
                <a
                  href={`#${key === 'javascript' ? 'step-js-package' : 'step-middleware'}`}
                  onClick={() => {
                    onStackChange(key);
                    closeNav();
                  }}
                  className={`${stackLink} ${active ? stackLinkActive : stackLinkIdle}`}
                  aria-current={active ? 'true' : undefined}
                >
                  {doc.stacks[key].label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="thin-scrollbar mt-8 border-t border-slark-border pt-6 dark:border-slark-border/50 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-y-contain lg:pr-1">
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <a href={`#${item.id}`} className={sectionLink} onClick={closeNav}>
                {item.label}
              </a>
              {item.children.length > 0 ? (
                <ul className="ml-2 mt-0.5 space-y-0.5 border-l border-slark-border pl-2 dark:border-slark-border/50">
                  {item.children.map((child) => (
                    <li key={child.id}>
                      <a href={`#${child.id}`} className={childLink} onClick={closeNav}>
                        {child.label}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      <a
        href="/"
        onClick={closeNav}
        className="mt-6 inline-flex shrink-0 items-center gap-1.5 pt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slark-muted transition hover:text-slark-primary"
      >
        <span aria-hidden>←</span>
        {t('settings.backDashboard')}
      </a>
    </nav>
  );
}
