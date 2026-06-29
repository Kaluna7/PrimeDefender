import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Globe, LogIn, LogOut, Settings, ShieldCheck } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus, signOut } from '../../services/auth.js';
import { LanguageFlag } from './LanguageFlag.jsx';

const MENU_PANEL_CLASS =
  'w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slark-border/80 bg-slark-bg/95 shadow-[0_18px_50px_-12px_rgba(15,23,42,0.28)] backdrop-blur-md dark:border-slark-border/50 dark:bg-slark-dark/95 dark:shadow-[0_18px_50px_-12px_rgba(0,0,0,0.55)]';

const MENU_ITEM_CLASS =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-slark-text transition hover:bg-slark-card/90 dark:text-white dark:hover:bg-white/[0.06]';

function MenuRowIcon({ children, className = '' }) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slark-card text-slark-muted ring-1 ring-slark-border/60 dark:bg-white/[0.06] dark:text-white/70 dark:ring-white/10 ${className}`}
    >
      {children}
    </span>
  );
}

function LanguageFlagSlot({ locale, className = '' }) {
  return (
    <span className={`flex h-8 w-8 shrink-0 items-center justify-center ${className}`}>
      <LanguageFlag locale={locale} className="shadow-none" />
    </span>
  );
}

function initialsFromUser(user) {
  const name = user?.name?.trim() || user?.email || '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * @param {{ variant?: 'default' | 'sidebar'; navDark?: boolean }} props
 */
export function ProfileMenu({ variant = 'default', navDark = false }) {
  const { t, locale, setLocale } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const triggerRef = useRef(/** @type {HTMLButtonElement | null} */ (null));
  const menuRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [open, setOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(/** @type {{ email: string, name: string, picture?: string } | null} */ (null));
  const [menuPos, setMenuPos] = useState(/** @type {{ left: number, bottom: number } | null} */ (null));

  const isSidebar = variant === 'sidebar';

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

  useLayoutEffect(() => {
    if (!open || !isSidebar || !triggerRef.current) {
      setMenuPos(null);
      return;
    }

    const update = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      setMenuPos({
        left: r.right + 8,
        bottom: window.innerHeight - r.bottom,
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open, isSidebar]);

  useEffect(() => {
    if (!open) {
      setLanguageOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (rootRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
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

  const handleLocaleChange = (nextLocale) => {
    setLocale(nextLocale);
    setOpen(false);
  };

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

  const avatarEl = user?.picture ? (
    <img src={user.picture} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    initials
  );

  const languageOptions = [
    { id: 'en', label: t('profile.languageEnglish') },
    { id: 'id', label: t('profile.languageIndonesian') },
  ];

  const languageSection = (
    <>
      <button
        type="button"
        role="menuitem"
        aria-expanded={languageOpen}
        onClick={() => setLanguageOpen((v) => !v)}
        className={`${MENU_ITEM_CLASS} ${languageOpen ? 'bg-slark-card/70 dark:bg-white/[0.05]' : ''}`}
      >
        <MenuRowIcon>
          <Globe className="h-4 w-4" strokeWidth={2} aria-hidden />
        </MenuRowIcon>
        <span className="min-w-0 flex-1 font-medium">{t('profile.changeLanguage')}</span>
        <span className="flex w-11 shrink-0 items-center justify-end gap-1.5">
          <LanguageFlag locale={locale} className="shadow-none" />
          <ChevronDown
            className={`h-4 w-4 text-slark-muted transition-transform motion-safe:duration-200 ${
              languageOpen ? 'rotate-180' : ''
            }`}
            strokeWidth={2}
            aria-hidden
          />
        </span>
      </button>

      {languageOpen && (
        <div
          className="mx-2 mb-1 space-y-0.5 rounded-xl bg-slark-card/60 p-1 ring-1 ring-slark-border/50 dark:bg-white/[0.04] dark:ring-white/10"
          role="group"
          aria-label={t('profile.changeLanguage')}
        >
          {languageOptions.map((option) => {
            const selected = locale === option.id;
            return (
              <button
                key={option.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => handleLocaleChange(option.id)}
                className={`${MENU_ITEM_CLASS} py-2 ${
                  selected
                    ? 'bg-slark-primary/12 font-semibold text-slark-primary shadow-sm dark:bg-slark-primary/20 dark:text-white'
                    : 'text-slark-text hover:bg-slark-bg/80 dark:text-white/90 dark:hover:bg-white/[0.05]'
                }`}
              >
                <LanguageFlagSlot locale={option.id} />
                <span className="min-w-0 flex-1">{option.label}</span>
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {selected ? (
                    <Check className="h-4 w-4 text-slark-primary dark:text-white" strokeWidth={2.5} aria-hidden />
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </>
  );

  const menuPanel = (
    <div
      ref={menuRef}
      role="menu"
      className={isSidebar ? MENU_PANEL_CLASS : `absolute right-0 top-[calc(100%+0.625rem)] z-[70] ${MENU_PANEL_CLASS}`}
      style={
        isSidebar && menuPos
          ? { position: 'fixed', left: menuPos.left, bottom: menuPos.bottom, zIndex: 70 }
          : undefined
      }
    >
      <div className="relative overflow-hidden border-b border-slark-border/70 px-4 py-4 dark:border-white/10">
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-br from-slark-primary/[0.08] via-transparent to-transparent"
          aria-hidden
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/80 bg-slark-card text-xs font-bold text-slark-text shadow-md ring-2 ring-slark-primary/15 dark:border-slark-dark dark:bg-slate-700 dark:text-white">
            {avatarEl}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold leading-snug text-slark-text dark:text-white">{displayName}</p>
            {user?.email && (
              <p className="mt-0.5 truncate text-xs text-slark-muted dark:text-white/55">{user.email}</p>
            )}
            {user && (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700 dark:border-emerald-500/35 dark:bg-emerald-950/50 dark:text-emerald-300">
                <ShieldCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                {t('profile.verified')}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-0.5 p-2">
        {user ? (
          <>
            <Link to="/settings" role="menuitem" className={MENU_ITEM_CLASS} onClick={() => setOpen(false)}>
              <MenuRowIcon>
                <Settings className="h-4 w-4" strokeWidth={2} aria-hidden />
              </MenuRowIcon>
              <span className="min-w-0 flex-1 font-medium">{t('settings.title')}</span>
            </Link>
            {languageSection}
          </>
        ) : (
          <>
            <Link
              to="/signin"
              role="menuitem"
              className={`${MENU_ITEM_CLASS} font-semibold text-slark-primary dark:text-white`}
              onClick={() => setOpen(false)}
            >
              <MenuRowIcon className="bg-slark-primary/10 text-slark-primary ring-slark-primary/20 dark:bg-slark-primary/20 dark:text-white dark:ring-slark-primary/30">
                <LogIn className="h-4 w-4" strokeWidth={2} aria-hidden />
              </MenuRowIcon>
              <span className="min-w-0 flex-1">{t('profile.signIn')}</span>
            </Link>
            {languageSection}
          </>
        )}
      </div>

      {user && (
        <div className="border-t border-slark-border/70 p-2 dark:border-white/10">
          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            className={`${MENU_ITEM_CLASS} text-red-600 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/25`}
          >
            <MenuRowIcon className="bg-red-50 text-red-600 ring-red-200/80 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-500/25">
              <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden />
            </MenuRowIcon>
            <span className="min-w-0 flex-1 font-medium">{t('profile.signOut')}</span>
          </button>
        </div>
      )}
    </div>
  );

  if (isSidebar) {
    return (
      <div
        ref={rootRef}
        className={`mt-auto w-full shrink-0 border-t pt-2 ${navDark ? 'border-slate-600/50' : 'border-slark-border'}`}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={(e) => {
            setOpen((v) => !v);
            e.currentTarget.blur();
          }}
          className={`flex w-full items-center justify-center gap-2 rounded-lg px-2 py-2 outline-none transition focus-visible:ring-2 focus-visible:ring-slark-primary/40 ${
            navDark ? 'hover:bg-white/[0.06]' : 'hover:bg-slark-card'
          }`}
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label={t('profile.menuLabel')}
          title={displayName}
        >
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border text-[11px] font-bold shadow-sm ${
              navDark
                ? 'border-slate-600/50 bg-white/[0.06] text-slate-100'
                : 'border-slark-border bg-slark-card text-slark-text dark:border-slark-border/60 dark:bg-slate-700 dark:text-white'
            }`}
          >
            {avatarEl}
          </span>
          <span
            className={`min-w-0 max-w-0 overflow-hidden whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.12em] opacity-0 transition-all duration-300 ease-out group-hover/nav:max-w-[15rem] group-hover/nav:opacity-100 ${
              navDark ? 'text-slate-200' : 'text-slark-text'
            }`}
          >
            {displayName}
          </span>
        </button>
        {open && menuPos && createPortal(menuPanel, document.body)}
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slark-border bg-slark-card text-[11px] font-bold text-slark-text shadow-sm transition hover:scale-105 active:scale-95 dark:border-slark-border/60 dark:bg-slate-700 dark:text-white sm:h-10 sm:w-10"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('profile.menuLabel')}
      >
        {avatarEl}
      </button>
      {open && menuPanel}
    </div>
  );
}
