import { Outlet, useLocation } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu.jsx';

export function AppShell() {
  const location = useLocation();
  const hideFloatingProfile =
    location.pathname === '/monitoring' || location.pathname === '/settings';
  const showFloatingProfile = !hideFloatingProfile;
  const lockShellScroll =
    location.pathname === '/monitoring' ||
    location.pathname === '/settings' ||
    location.pathname === '/purchase';

  const isMonitoring = location.pathname === '/monitoring';
  const shellBg = isMonitoring
    ? 'bg-[#0f172a] text-slate-200'
    : 'bg-slark-bg text-slark-text dark:bg-slark-dark dark:text-white';

  return (
    <div className={`flex h-[100dvh] w-full min-w-0 flex-col overflow-hidden ${shellBg}`}>
      {showFloatingProfile ? (
        <div
          className="pointer-events-none fixed right-6 top-3 z-[60] flex items-center gap-2 sm:right-10 sm:top-4"
          style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
        >
          <div className="pointer-events-auto">
            <ProfileMenu />
          </div>
        </div>
      ) : null}
      <div
        id="app-scroll-root"
        className={`thin-scrollbar${isMonitoring ? '-dark' : ''} flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden ${
          isMonitoring ? 'bg-[#0f172a]' : 'bg-slark-bg dark:bg-slark-dark'
        }${lockShellScroll ? ' shell-scroll-locked' : ''}`}
      >
        <Outlet />
      </div>
    </div>
  );
}
