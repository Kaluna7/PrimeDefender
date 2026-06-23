import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { SubscriptionBillingCard } from '../../components/account/SubscriptionBillingCard.jsx';
import { fetchAuthStatus, getGoogleSignInUrl, signOut } from '../../services/auth.js';

function initialsFromUser(user) {
  const name = user?.name?.trim() || user?.email || '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function SettingsPage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(/** @type {{ email: string, name: string, picture?: string } | null} */ (null));

  const refresh = useCallback(async () => {
    setLoading(true);
    const status = await fetchAuthStatus();
    setUser(status.ok && status.user ? status.user : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = `${t('brand.name')} – ${t('settings.title')}`;
  }, [t, locale]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onAuth = () => refresh();
    window.addEventListener('slark-auth-change', onAuth);
    return () => window.removeEventListener('slark-auth-change', onAuth);
  }, [refresh]);

  const handleSignOut = async () => {
    await signOut();
    setUser(null);
    navigate('/signin');
  };

  return (
    <div className="thin-scrollbar h-full overflow-y-auto bg-slark-bg px-5 py-10 pt-16 dark:bg-slark-dark">
      <div className="mx-auto max-w-lg">
        <h1 className="font-cyber text-xl font-bold uppercase tracking-[0.25em] text-slark-text dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-sm text-slark-muted">{t('settings.subtitle')}</p>

        <div className="mt-10 rounded-xl border border-slark-border bg-slark-card p-6 shadow-sm dark:border-slark-border/40 dark:bg-slark-dark/80">
          {loading ? (
            <p className="text-sm text-slark-muted">{t('settings.loading')}</p>
          ) : user ? (
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left">
              <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slark-primary to-slark-primary-hover text-xl font-bold text-white ring-4 ring-slark-primary/20">
                {user.picture ? (
                  <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  initialsFromUser(user)
                )}
              </span>
              <div className="mt-4 sm:mt-0 sm:ml-6 sm:flex-1">
                <h2 className="text-lg font-semibold text-slark-text dark:text-white">{user.name || user.email}</h2>
                <p className="mt-1 break-all text-sm text-slark-primary">{user.email}</p>
                <span className="mt-3 inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {t('settings.verifiedBadge')}
                </span>
                <p className="mt-4 text-xs leading-relaxed text-slark-muted">{t('settings.signedInHint')}</p>
              </div>
            </div>
          ) : (
            <div className="text-center sm:text-left">
              <p className="text-sm leading-relaxed text-slark-muted">{t('settings.notSignedIn')}</p>
              <a
                href={getGoogleSignInUrl()}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slark-border bg-slark-bg px-4 py-3 text-sm font-semibold text-slark-text shadow-sm transition hover:bg-slark-card sm:w-auto"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                {t('settings.signInGoogle')}
              </a>
            </div>
          )}
        </div>

        {user && (
          <div className="mt-8">
            <SubscriptionBillingCard user={user} />
          </div>
        )}

        {user && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleSignOut}
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800/40 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
            >
              {t('settings.signOut')}
            </button>
            <Link
              to="/"
              className="rounded-xl border border-slark-border px-4 py-3 text-center text-sm font-semibold text-slark-dark transition hover:bg-slark-card dark:text-slark-muted dark:hover:bg-slark-dark/60"
            >
              {t('settings.backHome')}
            </Link>
          </div>
        )}

        {!user && !loading && (
          <Link
            to="/"
            className="mt-6 inline-block text-sm text-slark-primary underline-offset-2 hover:underline"
          >
            {t('settings.backHome')}
          </Link>
        )}
      </div>
    </div>
  );
}
