import { NavLink, Outlet } from 'react-router-dom';
import { useI18n } from '../i18n/I18nContext.jsx';

const linkClass =
  'rounded px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors';
const activeClass = 'bg-cyan-950/80 text-cyan-100 border border-cyan-600/40';
const idleClass = 'text-cyan-600 hover:text-cyan-200 hover:bg-cyan-950/40';

export function AppShell() {
  const { t } = useI18n();

  return (
    <div className="flex h-screen min-h-0 flex-col bg-black text-cyan-100">
      <nav className="z-50 flex flex-shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-900/50 bg-black/90 px-4 py-3 backdrop-blur-md">
        <NavLink to="/" className="group flex items-center gap-2">
          <span className="font-cyber text-base font-bold tracking-[0.2em] text-cyan-100 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)] group-hover:text-cyan-50">
            {t('brand.name')}
          </span>
          <span className="hidden text-[10px] text-cyan-700 sm:inline">{t('brand.tagline')}</span>
        </NavLink>

        <div className="flex flex-wrap items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : idleClass}`}
          >
            {t('nav.home')}
          </NavLink>
          <NavLink
            to="/monitoring"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : idleClass}`}
          >
            {t('nav.monitoring')}
          </NavLink>
          <NavLink
            to="/docs"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : idleClass}`}
          >
            {t('nav.docs')}
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `${linkClass} ${isActive ? activeClass : idleClass}`}
          >
            {t('nav.settings')}
          </NavLink>
        </div>
      </nav>

      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}
