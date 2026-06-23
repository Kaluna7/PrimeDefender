import { Outlet } from 'react-router-dom';
import { ProfileMenu } from './ProfileMenu.jsx';

export function AppShell() {
  return (
    <div className="flex h-screen min-h-0 flex-col bg-slark-bg text-slark-text dark:bg-slark-dark dark:text-white">
      <div
        className="pointer-events-none fixed right-3 top-3 z-[60] flex items-center gap-2 sm:right-4 sm:top-4"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="pointer-events-auto">
          <ProfileMenu />
        </div>
      </div>
      <div
        id="app-scroll-root"
        className="thin-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden bg-slark-bg dark:bg-slark-dark"
      >
        <Outlet />
      </div>
    </div>
  );
}
