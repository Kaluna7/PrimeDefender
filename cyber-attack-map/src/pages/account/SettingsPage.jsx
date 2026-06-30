import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Globe,
  LogOut,
  Lock,
  ShieldCheck,
} from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { LanguageFlag } from '../../components/layout/LanguageFlag.jsx';
import { ChangePasswordModal } from './ChangePasswordModal.jsx';
import { fetchAuthStatus, getGoogleSignInUrl, signOut } from '../../services/auth.js';
import {
  completePasswordChange,
  requestPasswordChangeCode,
  verifyPasswordChangeCode,
} from '../../services/passwordChange.js';

const FEATURES = [
  { icon: ShieldCheck, titleKey: 'settings.featureSecurityTitle', bodyKey: 'settings.featureSecurityBody' },
  { icon: CreditCard, titleKey: 'settings.featurePlanTitle', bodyKey: 'settings.featurePlanBody' },
  { icon: Globe, titleKey: 'settings.featureMapTitle', bodyKey: 'settings.featureMapBody' },
];

const LANGUAGE_OPTIONS = [
  { id: 'en', labelKey: 'profile.languageEnglish' },
  { id: 'id', labelKey: 'profile.languageIndonesian' },
];

function initialsFromUser(user) {
  const name = user?.name?.trim() || user?.email || '?';
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function SectionLabel({ children }) {
  return (
    <h2 className="font-cyber text-[11px] font-bold uppercase tracking-[0.18em] text-slark-primary sm:text-xs sm:tracking-[0.22em]">
      {children}
    </h2>
  );
}

function SettingsPageHeader({ t, variant = 'light', className = '' }) {
  const dark = variant === 'dark';
  return (
    <header className={className}>
      <p className="font-cyber text-[11px] uppercase tracking-[0.28em] text-slark-primary sm:text-xs sm:tracking-[0.35em]">
        {t('settings.eyebrow')}
      </p>
      <h1
        className={`font-cyber mt-2 text-xl font-bold uppercase tracking-[0.08em] sm:mt-3 sm:text-2xl sm:tracking-[0.12em] ${
          dark ? 'text-white' : 'text-slark-text dark:text-white'
        }`}
      >
        {t('settings.title')}
      </h1>
      <p
        className={`mt-2 max-w-none text-[15px] leading-relaxed sm:mt-3 sm:max-w-sm sm:text-base ${
          dark ? 'text-slate-400' : 'text-slark-muted'
        }`}
      >
        {t('settings.subtitle')}
      </p>
    </header>
  );
}

function SignOutLink({ t, onSignOut, className = '' }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      className={`inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-red-400 transition hover:text-red-300 sm:text-xs sm:tracking-[0.16em] ${className}`}
    >
      <LogOut className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
      {t('settings.signOut')}
    </button>
  );
}

function SettingsDarkPanel({ t, user, onSignOut }) {
  return (
    <aside className="relative z-10 hidden w-full shrink-0 flex-col overflow-hidden bg-slark-dark text-white lg:sticky lg:top-0 lg:flex lg:h-full lg:max-h-full lg:w-[min(100%,460px)] xl:w-[480px] 2xl:w-[520px]">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(rgba(198,40,40,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(198,40,40,0.08) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slark-primary/10 via-transparent to-transparent"
        aria-hidden
      />

      <div
        className="relative flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8 lg:min-h-full lg:px-6 lg:py-12"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-white/75 transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
          {t('settings.backDashboard')}
        </Link>

        <header className="mt-6 sm:mt-8 lg:mt-14">
          <SettingsPageHeader t={t} variant="dark" />
        </header>

        <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5 lg:mt-20">
          {FEATURES.map(({ icon: Icon, titleKey, bodyKey }) => (
            <div key={titleKey} className="flex items-start gap-3">
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-slark-primary"
                strokeWidth={2}
                aria-hidden
              />
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold leading-snug text-white sm:text-sm">{t(titleKey)}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-400 sm:mt-1.5 sm:text-xs">{t(bodyKey)}</p>
              </div>
            </div>
          ))}
        </div>

        {user && (
          <div
            className="mt-auto hidden border-t border-white/10 pt-10 text-center lg:block"
            style={{ paddingBottom: 'max(0px, env(safe-area-inset-bottom))' }}
          >
            <SignOutLink t={t} onSignOut={onSignOut} />
          </div>
        )}
      </div>
    </aside>
  );
}

function SettingsSkeleton() {
  return (
    <div className="space-y-6 motion-safe:animate-pulse">
      <div className="h-44 rounded-2xl border border-slark-border/60 bg-slark-card/60 dark:bg-slark-dark/40" />
      <div className="h-28 rounded-2xl border border-slark-border/60 bg-slark-card/60 dark:bg-slark-dark/40" />
      <div className="h-28 rounded-2xl border border-slark-border/60 bg-slark-card/60 dark:bg-slark-dark/40" />
    </div>
  );
}

export function SettingsPage() {
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(
    /** @type {{ email: string, name: string, picture?: string, hasPassword?: boolean } | null} */ (null)
  );
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordChallengeId, setPasswordChallengeId] = useState('');
  const [passwordEmailMasked, setPasswordEmailMasked] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSending, setPasswordSending] = useState(false);

  const passwordErrorMessage = useCallback(
    (code) => {
      const map = {
        invalid_code: t('settings.changePasswordInvalidCode'),
        challenge_expired: t('settings.changePasswordExpired'),
        challenge_mismatch: t('settings.changePasswordExpired'),
        code_not_verified: t('settings.changePasswordExpired'),
        smtp_not_configured: t('settings.changePasswordEmailFailed'),
        email_send_failed: t('settings.changePasswordEmailFailed'),
        password_mismatch: t('settings.changePasswordMismatch'),
        password_too_short: t('settings.changePasswordTooShort'),
        not_authenticated: t('settings.changePasswordNotSignedIn'),
        endpoint_not_found: t('settings.changePasswordServerOutdated'),
        send_failed: t('settings.changePasswordSendFailed'),
        verify_failed: t('settings.changePasswordGeneric'),
        complete_failed: t('settings.changePasswordGeneric'),
        mongo_disabled: t('settings.changePasswordGeneric'),
        user_not_found: t('settings.changePasswordGeneric'),
      };
      return map[code] || t('settings.changePasswordGeneric');
    },
    [t]
  );

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
    navigate('/', { replace: true });
  };

  const openPasswordModal = () => {
    setPasswordError('');
    setPasswordChallengeId('');
    setPasswordEmailMasked('');
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordError('');
    setPasswordChallengeId('');
    setPasswordEmailMasked('');
    setPasswordSending(false);
  };

  const clearPasswordError = () => setPasswordError('');

  const sendPasswordVerificationCode = async () => {
    setPasswordSending(true);
    setPasswordError('');
    try {
      const result = await requestPasswordChangeCode();
      if (!result.ok) {
        setPasswordError(passwordErrorMessage(result.error));
        return { ok: false };
      }
      setPasswordChallengeId(result.challengeId || '');
      setPasswordEmailMasked(result.emailMasked || '');
      return { ok: true, challengeId: result.challengeId, emailMasked: result.emailMasked };
    } finally {
      setPasswordSending(false);
    }
  };

  const handleVerifyPasswordCode = async (code) => {
    setPasswordError('');
    const result = await verifyPasswordChangeCode({ challengeId: passwordChallengeId, code });
    if (!result.ok) {
      setPasswordError(passwordErrorMessage(result.error));
      return { ok: false };
    }
    return { ok: true };
  };

  const handleCompletePasswordChange = async ({ password, confirmPassword }) => {
    setPasswordError('');
    const result = await completePasswordChange({
      challengeId: passwordChallengeId,
      password,
      confirmPassword,
    });
    if (!result.ok) {
      setPasswordError(passwordErrorMessage(result.error));
      return { ok: false };
    }
    setUser((prev) => (prev ? { ...prev, hasPassword: true } : prev));
    return { ok: true };
  };

  return (
    <div className="relative min-h-full w-full min-w-0 overflow-x-hidden lg:h-full lg:min-h-0 lg:overflow-hidden">
      <div className="flex min-h-full w-full flex-col lg:h-full lg:min-h-0 lg:flex-row lg:overflow-hidden">
        <SettingsDarkPanel t={t} user={user} onSignOut={handleSignOut} />

        <main className="relative flex min-w-0 flex-1 flex-col bg-slark-bg lg:h-full lg:min-h-0 lg:overflow-hidden dark:bg-slark-dark">
          <div className="thin-scrollbar-flush relative z-10 flex-1 lg:overflow-y-auto">
            <div
              className="px-4 pb-[max(4rem,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-16 sm:pt-7 lg:px-10 lg:pb-12 lg:pt-8"
              style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}
            >
            <div className="mx-auto w-full max-w-3xl">
            <div className="mb-6 lg:hidden">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-[0.14em] text-slark-muted transition hover:text-slark-primary sm:text-xs sm:tracking-[0.16em]"
              >
                <ArrowLeft className="h-3.5 w-3.5 shrink-0" strokeWidth={2} aria-hidden />
                {t('settings.backDashboard')}
              </Link>
              <SettingsPageHeader t={t} variant="light" className="mt-6" />
            </div>
            {loading ? (
              <SettingsSkeleton />
            ) : (
              <div className="space-y-6 sm:space-y-7">
                <section>
                  <SectionLabel>{t('settings.profileSection')}</SectionLabel>
                  <div className="mt-3 rounded-2xl border border-slark-border/70 bg-slark-card/80 p-4 shadow-sm backdrop-blur-sm dark:border-slark-border/40 dark:bg-slark-dark/75 sm:p-6 lg:p-7">
                    {user ? (
                      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">
                        <span className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-slark-primary to-slark-primary-hover text-xl font-bold text-white ring-4 ring-slark-primary/20 shadow-lg sm:h-24 sm:w-24 sm:text-2xl">
                          {user.picture ? (
                            <img
                              src={user.picture}
                              alt=""
                              className="h-full w-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            initialsFromUser(user)
                          )}
                        </span>
                        <div className="min-w-0 flex-1 text-center sm:text-left">
                          <h2 className="text-lg font-semibold text-slark-text sm:text-xl dark:text-white">
                            {user.name || user.email}
                          </h2>
                          <p className="mt-1 break-all text-[15px] text-slark-primary sm:text-sm">{user.email}</p>
                          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300 sm:text-[10px]">
                            <ShieldCheck className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                            {t('settings.verifiedBadge')}
                          </span>
                          <p className="mt-4 max-w-md text-sm leading-relaxed text-slark-muted">
                            {t('settings.signedInHint')}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="mx-auto max-w-md text-center sm:text-left">
                        <p className="text-[15px] leading-relaxed text-slark-muted sm:text-sm md:text-base">
                          {t('settings.notSignedIn')}
                        </p>
                        <a
                          href={getGoogleSignInUrl()}
                          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slark-border bg-slark-bg px-5 py-3.5 text-[15px] font-semibold text-slark-text shadow-sm transition hover:border-slark-primary/40 hover:bg-slark-card sm:text-sm sm:w-auto"
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
                </section>

                {user && (
                  <section>
                    <SectionLabel>{t('settings.securitySection')}</SectionLabel>
                    <div className="mt-3 rounded-2xl border border-slark-border/70 bg-slark-card/80 p-4 shadow-sm backdrop-blur-sm dark:border-slark-border/40 dark:bg-slark-dark/75 sm:p-6 lg:p-7">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5">
                        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                          <Lock
                            className="mt-0.5 h-4 w-4 shrink-0 text-slark-primary sm:mt-1 sm:h-5 sm:w-5"
                            strokeWidth={2}
                            aria-hidden
                          />
                          <div className="min-w-0">
                            <h3 className="text-[15px] font-semibold text-slark-text sm:text-base dark:text-white">
                              {t('settings.changePasswordButton')}
                            </h3>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-slark-muted sm:text-sm">
                              {t('settings.changePasswordCardHint')}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={openPasswordModal}
                          className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-slark-primary px-5 py-3.5 text-[15px] font-semibold text-white transition hover:bg-slark-primary-hover sm:w-auto sm:min-w-[10.5rem] sm:py-3 sm:text-sm"
                        >
                          <Lock className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                          {t('settings.changePasswordButton')}
                        </button>
                      </div>
                    </div>
                  </section>
                )}

                <section>
                  <SectionLabel>{t('settings.languageSection')}</SectionLabel>
                  <div className="mt-3 rounded-2xl border border-slark-border/70 bg-slark-card/80 p-4 shadow-sm backdrop-blur-sm dark:border-slark-border/40 dark:bg-slark-dark/75 sm:p-6 lg:p-7">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 lg:items-center">
                      <div className="flex min-w-0 items-start gap-3 sm:gap-4">
                        <Globe
                          className="mt-0.5 h-4 w-4 shrink-0 text-slark-primary sm:mt-1 sm:h-5 sm:w-5"
                          strokeWidth={2}
                          aria-hidden
                        />
                        <div className="min-w-0">
                          <h3 className="text-[15px] font-semibold text-slark-text sm:text-base dark:text-white">
                            {t('profile.changeLanguage')}
                          </h3>
                          <p className="mt-1.5 text-[13px] leading-relaxed text-slark-muted sm:text-sm">
                            {t('settings.languageCardHint')}
                          </p>
                        </div>
                      </div>
                      <div
                        className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:min-w-[14rem] sm:grid-cols-1"
                        role="radiogroup"
                        aria-label={t('profile.changeLanguage')}
                      >
                        {LANGUAGE_OPTIONS.map(({ id, labelKey }) => {
                          const selected = locale === id;
                          return (
                            <button
                              key={id}
                              type="button"
                              role="radio"
                              aria-checked={selected}
                              onClick={() => setLocale(id)}
                              className={`inline-flex items-center gap-2 rounded-xl border px-3 py-3 text-[13px] font-medium transition sm:gap-3 sm:px-4 sm:py-3 sm:text-sm ${
                                selected
                                  ? 'border-slark-primary/40 bg-slark-primary/10 text-slark-primary dark:bg-slark-primary/20 dark:text-white'
                                  : 'border-slark-border bg-slark-bg text-slark-text hover:border-slark-primary/30 dark:border-slark-border/50 dark:bg-slark-dark/60 dark:text-white'
                              }`}
                            >
                              <LanguageFlag locale={id} className="shadow-none" />
                              <span className="min-w-0 flex-1 text-left">{t(labelKey)}</span>
                              {selected ? (
                                <Check className="h-4 w-4 shrink-0" strokeWidth={2.5} aria-hidden />
                              ) : (
                                <span className="h-4 w-4 shrink-0" aria-hidden />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </section>

                {user && (
                  <div className="border-t border-slark-border/60 pt-8 text-center lg:hidden dark:border-white/10">
                    <SignOutLink t={t} onSignOut={handleSignOut} />
                  </div>
                )}
              </div>
            )}
            </div>
            </div>
          </div>
        </main>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        emailMasked={passwordEmailMasked}
        sending={passwordSending}
        error={passwordError}
        onClose={closePasswordModal}
        onRequestCode={sendPasswordVerificationCode}
        onVerifyCode={handleVerifyPasswordCode}
        onComplete={handleCompletePasswordChange}
        onResend={sendPasswordVerificationCode}
        onStepChange={clearPasswordError}
      />
    </div>
  );
}
