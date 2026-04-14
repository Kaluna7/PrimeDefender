import { useI18n } from '../../i18n/I18nContext.jsx';
import { useTheme } from '../../theme/ThemeContext.jsx';

export function ThemeToggle() {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group flex items-center gap-2 rounded-full border border-slate-300/80 bg-white/80 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-700 shadow-sm transition hover:border-cyan-500/40 hover:bg-cyan-50/90 dark:border-cyan-800/60 dark:bg-cyan-950/40 dark:text-cyan-200 dark:shadow-[0_0_16px_rgba(34,211,238,0.12)] dark:hover:border-cyan-600/50 dark:hover:bg-cyan-950/70"
      title={isDark ? t('theme.useLight') : t('theme.useDark')}
      aria-label={isDark ? t('theme.useLight') : t('theme.useDark')}
      aria-pressed={isDark}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-600 transition group-hover:scale-105 dark:bg-slate-800 dark:text-amber-300"
        aria-hidden
      >
        {isDark ? (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 3a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V4a1 1 0 0 1 1-1zm5.657 2.343a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0zM18 11a1 1 0 1 1 0 2h-1a1 1 0 1 1 0-2h1zm-2.343 6.657a1 1 0 0 1-1.414 0l-.707-.707a1 1 0 0 1 1.414-1.414l.707.707a1 1 0 0 1 0 1.414zM12 20a1 1 0 0 1-1-1v-1a1 1 0 1 1 2 0v1a1 1 0 0 1-1 1zm-6.657-2.343a1 1 0 0 1 0-1.414l.707-.707a1 1 0 0 1 1.414 1.414l-.707.707a1 1 0 0 1-1.414 0zM6 13a1 1 0 1 1 0-2H5a1 1 0 1 1 0 2h1zm2.343-6.657a1 1 0 0 1 1.414 0l.707.707a1 1 0 0 1-1.414 1.414l-.707-.707a1 1 0 0 1 0-1.414zM12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M21.64 13.65A9 9 0 1 1 10.36 2.36a9 9 0 0 0 11.28 11.29zM12 4a7.5 7.5 0 1 0 7.46 8.26 7.5 7.5 0 0 0-7.46-8.26z" />
          </svg>
        )}
      </span>
      <span className="hidden pr-0.5 sm:inline">{isDark ? t('theme.dark') : t('theme.light')}</span>
    </button>
  );
}
