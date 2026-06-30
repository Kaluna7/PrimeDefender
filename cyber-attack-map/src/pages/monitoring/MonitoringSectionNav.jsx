import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, History, Home } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ProfileMenu } from '../../components/layout/ProfileMenu.jsx';

/** Keys for left rail — each tab shows a different panel set */
export const MONITORING_TAB = {
  MAP: 'map',
  HISTORY: 'history',
  ATTACKER: 'attacker',
  INTEL: 'intel',
  ASSISTANT: 'assistant',
};

const MONITORING_NAV_ITEMS = [
  {
    id: MONITORING_TAB.MAP,
    labelKey: 'navMonitoring',
    icon: (
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
    ),
  },
  {
    id: MONITORING_TAB.HISTORY,
    labelKey: 'navHistory',
    icon: (
      <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 7 7v2a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
    ),
  },
  {
    id: MONITORING_TAB.ATTACKER,
    labelKey: 'navAttacker',
    icon: (
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
    ),
  },
  {
    id: MONITORING_TAB.INTEL,
    labelKey: 'navIntel',
    icon: (
      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z" />
    ),
  },
  {
    id: MONITORING_TAB.ASSISTANT,
    labelKey: 'navAssistant',
    icon: (
      <path d="M12 2a7 7 0 0 1 6.99 7.5c0 3.04-1.94 5.64-4.64 6.62L14 21h-4l-.35-1.88C6.95 18.14 5 15.54 5 12.5 5 8.36 8.36 5 12.5 5c.17 0 .34.01.5.02A7 7 0 0 1 12 2zm0 2c-2.76 0-5 2.24-5 5 0 2.32 1.58 4.27 3.71 4.84l.29.08.45 2.41h1.1l.45-2.41.29-.08C15.42 13.27 17 11.32 17 9c0-2.76-2.24-5-5-5zm-1 4h2v2h-2V8zm0 3h2v2h-2v-2z" />
    ),
  },
];

/**
 * @param {{
 *   id: string;
 *   icon: import('react').ReactNode;
 *   isActive: boolean;
 *   label: string;
 *   onSelect: (id: string) => void;
 *   showLabel?: boolean;
 *   variant?: 'rail' | 'drawer';
 * }} props
 */
function MonitoringNavItem({ id, icon, isActive, label, onSelect, showLabel = false, variant = 'rail' }) {
  const isDrawer = variant === 'drawer';

  if (isDrawer) {
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        aria-current={isActive ? 'page' : undefined}
        onClick={(e) => {
          onSelect(id);
          e.currentTarget.blur();
        }}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-slark-primary/40 ${
          isActive
            ? 'border-l-2 border-slark-primary bg-slark-primary/10 text-slark-primary'
            : 'border-l-2 border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-slate-100'
        }`}
      >
        <svg className="h-5 w-5 shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          {icon}
        </svg>
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em]">{label}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-current={isActive ? 'page' : undefined}
      onClick={(e) => {
        onSelect(id);
        e.currentTarget.blur();
      }}
      className={`flex w-full items-center gap-2 rounded-r-lg py-2 pl-2 pr-1 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-slark-primary/40 ${
        isActive ? 'text-slark-primary' : 'text-slate-400 hover:bg-white/[0.05] hover:text-slate-200'
      }`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors ${
          isActive
            ? 'border-slark-primary/45 bg-slark-primary/15 text-slark-primary'
            : 'border-slate-600/50 bg-white/[0.04] text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
        }`}
        aria-hidden
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          {icon}
        </svg>
      </span>
      <span
        className={`min-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] ${
          showLabel
            ? 'max-w-[15rem] opacity-100'
            : 'max-w-0 opacity-0 transition-all duration-300 ease-out group-hover/nav:max-w-[15rem] group-hover/nav:opacity-100'
        } ${isActive ? 'text-slark-primary' : 'text-slate-200'}`}
      >
        {label}
      </span>
    </button>
  );
}

/**
 * @param {{
 *   label: string;
 *   onNavigate?: () => void;
 *   variant?: 'rail' | 'drawer';
 * }} props
 */
function MonitoringDashboardLink({ label, onNavigate, variant = 'rail' }) {
  const isDrawer = variant === 'drawer';

  if (isDrawer) {
    return (
      <Link
        to="/"
        onClick={onNavigate}
        className="mt-1 flex w-full items-center gap-3 px-4 py-3 text-left outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-slark-primary/40"
      >
        <Home className="h-5 w-5 shrink-0 text-slate-400" strokeWidth={2} aria-hidden />
        <span className="text-[13px] font-semibold uppercase tracking-[0.1em] text-slate-300">{label}</span>
      </Link>
    );
  }

  return (
    <Link
      to="/"
      onClick={(e) => {
        onNavigate?.();
        e.currentTarget.blur();
      }}
      title={label}
      className="mt-1 flex w-full items-center gap-2 rounded-r-lg py-2 pl-2 pr-1 text-left outline-none transition hover:bg-white/[0.05] focus-visible:ring-2 focus-visible:ring-slark-primary/40"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-600/50 bg-white/[0.04] text-slate-400 transition-colors hover:border-slate-500/60 hover:text-slate-200"
        aria-hidden
      >
        <Home className="h-4 w-4" strokeWidth={2} />
      </span>
      <span className="min-w-0 max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-200 opacity-0 transition-all duration-300 ease-out group-hover/nav:max-w-[15rem] group-hover/nav:opacity-100">
        {label}
      </span>
    </Link>
  );
}

/**
 * @param {{
 *   t: (key: string, vars?: Record<string, string | number>) => string;
 *   activeTab: string;
 *   onSelectTab: (id: string) => void;
 *   bridgeBannerVisible?: boolean;
 *   onAssistantHistory?: () => void;
 *   assistantHistoryOpen?: boolean;
 * }} props
 */
export function MonitoringSectionNav({
  t,
  activeTab,
  onSelectTab,
  bridgeBannerVisible,
  onAssistantHistory,
  assistantHistoryOpen = false,
}) {
  const navRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = useCallback(() => setMenuOpen(false), []);

  const handleSelectTab = useCallback(
    (id) => {
      onSelectTab(id);
      closeMenu();
    },
    [onSelectTab, closeMenu],
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) closeMenu();
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [closeMenu]);

  const handleNavPointerLeave = () => {
    const nav = navRef.current;
    const active = document.activeElement;
    if (nav && active instanceof HTMLElement && nav.contains(active)) {
      active.blur();
    }
  };

  const activeItem = MONITORING_NAV_ITEMS.find((item) => item.id === activeTab);
  const activeLabel = activeItem ? t(`monitoring.${activeItem.labelKey}`) : '';

  const railPosition =
    bridgeBannerVisible === true
      ? 'top-[5.75rem] h-[calc(100dvh-5.75rem)]'
      : 'top-0 h-screen';

  const navItems = (onSelect, showLabel, variant = 'rail') =>
    MONITORING_NAV_ITEMS.map(({ id, labelKey, icon }) => (
      <MonitoringNavItem
        key={id}
        id={id}
        icon={icon}
        isActive={activeTab === id}
        label={t(`monitoring.${labelKey}`)}
        onSelect={onSelect}
        showLabel={showLabel}
        variant={variant}
      />
    ));

  return (
    <>
      <header
        className="sticky top-0 z-30 shrink-0 border-b border-slate-700/60 bg-slark-dark/95 backdrop-blur-md lg:hidden"
        style={{ paddingTop: 'max(0px, env(safe-area-inset-top))' }}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
          <button
            type="button"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-200 transition hover:bg-white/[0.06] hover:text-slark-primary"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="monitoring-mobile-nav"
            aria-label={t('monitoring.menuLabel')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden>
              <path
                fillRule="evenodd"
                d="M3 6.75A.75.75 0 0 1 3.75 6h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 6.75ZM3 12a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 12Zm0 5.25a.75.75 0 0 1 .75-.75h16.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <h1 className="min-w-0 flex-1 truncate font-cyber text-xs font-bold uppercase tracking-[0.12em] text-slate-100">
            {activeLabel}
          </h1>

          {activeTab === MONITORING_TAB.ASSISTANT && onAssistantHistory ? (
            <button
              type="button"
              onClick={onAssistantHistory}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-600/50 bg-white/[0.04] text-slate-300 transition hover:border-slark-primary/40 hover:text-slark-primary"
              aria-label={t('aiChat.historyButton')}
              aria-expanded={assistantHistoryOpen}
            >
              <History className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          ) : null}
        </div>
      </header>

      <button
        type="button"
        className={`monitoring-mobile-nav-backdrop fixed inset-0 z-40 bg-black/50 lg:hidden ${
          menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-label={t('monitoring.menuClose')}
        aria-hidden={!menuOpen}
        tabIndex={menuOpen ? 0 : -1}
        onClick={closeMenu}
      />

      <nav
        id="monitoring-mobile-nav"
        aria-label={t('monitoring.sidebarNav')}
        className={`monitoring-mobile-nav thin-scrollbar-dark fixed inset-y-0 left-0 z-50 flex w-[min(80vw,16rem)] flex-col overflow-visible border-r border-slate-700/60 bg-slark-dark py-2 text-slate-200 shadow-lg lg:hidden ${
          menuOpen ? 'translate-x-0' : 'is-closed pointer-events-none'
        }`}
        aria-hidden={!menuOpen}
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={closeMenu}
          tabIndex={menuOpen ? 0 : -1}
          className="monitoring-mobile-nav-handle absolute -right-3.5 top-1/2 z-[60] flex h-14 w-7 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-slate-600/60 bg-slark-dark/95 text-slate-300 shadow-[3px_0_12px_rgba(0,0,0,0.4)] backdrop-blur-sm hover:border-slark-primary/45 hover:bg-[#1a2332] hover:text-slark-primary"
          aria-label={t('monitoring.menuClose')}
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.25} aria-hidden />
        </button>

        <Link
          to="/"
          onClick={closeMenu}
          className="flex w-full items-center px-4 py-3 outline-none transition hover:bg-white/[0.04] focus-visible:ring-2 focus-visible:ring-slark-primary/40"
          title={t('brand.name')}
        >
          <span className="font-cyber text-[11px] font-bold uppercase tracking-[0.22em] text-slark-primary">
            {t('brand.name')}
          </span>
        </Link>
        <div className="mx-4 mb-1 shrink-0 border-b border-slate-600/50" aria-hidden />
        <div className="thin-scrollbar-dark flex min-h-0 flex-1 flex-col overflow-y-auto py-1">
          {navItems(handleSelectTab, true, 'drawer')}
          <MonitoringDashboardLink
            label={t('settings.backDashboard')}
            onNavigate={closeMenu}
            variant="drawer"
          />
        </div>
        <div className="shrink-0 border-t border-slate-600/50">
          <ProfileMenu variant="sidebar" navDark expanded />
        </div>
      </nav>

      <nav
        ref={navRef}
        aria-label={t('monitoring.sidebarNav')}
        onMouseLeave={handleNavPointerLeave}
        className={`group/nav fixed left-0 z-40 hidden w-16 min-h-0 flex-col gap-0.5 overflow-hidden border-r border-slate-700/60 bg-slark-dark py-2 text-slate-200 shadow-lg ring-1 ring-black/20 transition-[width] duration-300 ease-out hover:w-72 lg:flex ${railPosition}`}
      >
        <Link
          to="/"
          onClick={(e) => e.currentTarget.blur()}
          className="mb-1 flex w-full items-center justify-center px-2 py-2.5 outline-none transition hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-slark-primary/40"
          title={t('brand.name')}
        >
          <span className="font-cyber text-[8px] font-bold uppercase tracking-[0.1em] text-slark-primary transition-all duration-300 ease-out group-hover/nav:text-[11px] group-hover/nav:tracking-[0.22em]">
            {t('brand.name')}
          </span>
        </Link>
        <div className="mx-2 mb-1 shrink-0 border-b border-slate-600/50" aria-hidden />

        <div className="thin-scrollbar-dark flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto overflow-x-hidden">
          {navItems(onSelectTab, false, 'rail')}
          <MonitoringDashboardLink label={t('settings.backDashboard')} variant="rail" />
        </div>

        <ProfileMenu variant="sidebar" navDark />
      </nav>
    </>
  );
}
