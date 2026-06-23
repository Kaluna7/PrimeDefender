import { HomeInteractiveHero } from '../../../components/home/HomeInteractiveHero.jsx';
import { HUB_THEME } from './hubTheme.js';

/**
 * Dashboard 3D untuk user yang sudah login — command center interaktif.
 */
export function DashboardPage() {
  return (
    <div
      className="flex min-h-[100dvh] w-full flex-1 flex-col overflow-hidden"
      style={{ backgroundColor: HUB_THEME.bg, color: HUB_THEME.text }}
    >
      <HomeInteractiveHero initialView="command" theme={HUB_THEME} />
    </div>
  );
}
