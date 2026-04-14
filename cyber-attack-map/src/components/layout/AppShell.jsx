import { Outlet } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeContext.jsx';

export function AppShell() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <div
      className={`flex h-screen min-h-0 flex-col text-slate-900 ${
        isDark
          ? 'dark bg-gradient-to-b from-[#020408] via-slate-950 to-black text-cyan-100'
          : 'bg-gradient-to-b from-slate-100 via-white to-slate-100'
      }`}
    >
      <div
        id="app-scroll-root"
        className="thin-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
      >
        <Outlet />
      </div>
    </div>
  );
}
