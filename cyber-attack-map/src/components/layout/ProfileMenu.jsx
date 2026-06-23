import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus, signOut } from '../../services/auth.js';

function initialsFromUser(user) {
  const name = user?.name?.trim() || user?.email || '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function ProfileMenu() {
  const { t } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(/** @type {{ email: string, name: string, picture?: string } | null} */ (null));

  const refresh = useCallback(async () => {
    setLoading(true);
    const status = await fetchAuthStatus();
    setUser(status.ok && status.user ? status.user : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onAuth = () => refresh();
    window.addEventListener('slark-auth-change', onAuth);
    return () => window.removeEventListener('slark-auth-change', onAuth);
  }, [refresh]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    setUser(null);
    window.dispatchEvent(new Event('slark-auth-change'));
    navigate('/signin');
  };

  const displayName = user?.name || user?.email || t('profile.guest');
  const initials = initialsFromUser(user);

  const hideOnLanding = location.pathname === '/' && (loading || !user);
  if (hideOnLanding) return null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slark-border bg-slark-bg py-1 pl-1 pr-2.5 shadow-sm transition hover:border-slark-primary/40 hover:bg-slark-card dark:border-slark-border/60 dark:bg-slark-dark dark:text-white dark:hover:border-slark-primary/50 dark:hover:bg-slark-dark/80 sm:pr-3"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('profile.menuLabel')}
      >
        <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slark-primary to-slark-primary-hover text-[11px] font-bold text-white ring-2 ring-slark-bg dark:ring-slark-dark">
          {user?.picture ? (
            <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            initials
          )}
          {user && (
            <span
              className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-slark-bg bg-emerald-500 dark:border-slark-dark"
              title={t('profile.verified')}
              aria-hidden
            />
          )}
        </span>
        <span className="hidden max-w-[8rem] truncate text-left text-[11px] font-semibold text-slark-text dark:text-white sm:block">
          {loading ? t('profile.loading') : displayName}
        </span>
        <svg
          className={`hidden h-3.5 w-3.5 shrink-0 text-slark-muted transition sm:block ${open ? 'rotate-180' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M7 10l5 5 5-5H7z" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-[min(17rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-slark-border bg-slark-bg shadow-slark-lg dark:border-slark-border/50 dark:bg-slark-dark"
        >
          <div className="border-b border-slark-border bg-slark-card px-4 py-3 dark:border-slark-border/40 dark:bg-slark-dark/80">
            <p className="truncate text-sm font-semibold text-slark-text dark:text-white">{displayName}</p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-slark-muted">{user.email}</p>
            )}
            {user && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                {t('profile.verified')}
              </span>
            )}
          </div>
          <div className="p-1.5">
            {user ? (
              <>
                <Link
                  to="/settings"
                  role="menuitem"
                  className="block rounded-lg px-3 py-2 text-sm text-slark-text transition hover:bg-slark-card dark:text-white dark:hover:bg-slark-dark/60"
                  onClick={() => setOpen(false)}
                >
                  {t('settings.title')}
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSignOut}
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-700 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30"
                >
                  {t('profile.signOut')}
                </button>
              </>
            ) : (
              <Link
                to="/signin"
                role="menuitem"
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slark-primary transition hover:bg-slark-card dark:hover:bg-slark-dark/60"
                onClick={() => setOpen(false)}
              >
                {t('profile.signIn')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
