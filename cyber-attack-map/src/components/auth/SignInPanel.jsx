import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import {
  getGoogleSignInUrl,
  loginWithEmail,
  registerWithEmail,
  verifyEmailCode,
} from '../../services/auth.js';

/** @typedef {'signup' | 'login' | 'verify'} AuthMode */

function OrDivider({ label, compact }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2 py-0' : 'gap-3 py-1'}`}>
      <div className="h-px flex-1 bg-slark-border" />
      <span className={`shrink-0 font-medium uppercase tracking-wider text-slark-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {label}
      </span>
      <div className="h-px flex-1 bg-slark-border" />
    </div>
  );
}

function GoogleButton({ href, label, compact }) {
  return (
    <a
      href={href}
      className={`flex w-full items-center justify-center rounded-xl border border-slark-border bg-slark-bg font-semibold text-slark-text shadow-sm transition hover:bg-slark-card ${
        compact ? 'gap-2 px-3 py-2 text-xs' : 'gap-3 px-4 py-3 text-sm'
      }`}
    >
      <svg className={compact ? 'h-4 w-4' : 'h-5 w-5'} viewBox="0 0 24 24" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      {label}
    </a>
  );
}

function Field({ label, children, compact }) {
  return (
    <label className="block">
      <span className={`font-medium uppercase tracking-wider text-slark-primary/70 ${compact ? 'text-[10px]' : 'text-xs'}`}>
        {label}
      </span>
      <div className={compact ? 'mt-1' : 'mt-2'}>{children}</div>
    </label>
  );
}

const inputClass =
  'w-full rounded-xl border border-slark-border bg-slark-bg text-slark-text outline-none ring-slark-primary/30 focus:ring-2 disabled:opacity-50';

function inputSizeClass(compact) {
  return compact
    ? 'px-3 py-2 text-xs sm:px-4 sm:py-2.5 sm:text-sm'
    : 'px-4 py-3 text-sm';
}

function primaryBtnClass(compact) {
  return `w-full rounded-xl bg-slark-primary font-bold uppercase tracking-widest text-white transition hover:bg-slark-primary-hover disabled:opacity-50 ${
    compact ? 'px-3 py-2 text-[11px] sm:py-2.5 sm:text-xs' : 'px-4 py-3 text-sm'
  }`;
}

/**
 * @param {object} props
 * @param {'signup' | 'login'} [props.defaultMode]
 * @param {string} [props.initialChallengeId]
 * @param {string} [props.initialEmail]
 * @param {string} [props.initialError]
 * @param {() => void} [props.onSuccess]
 * @param {boolean} [props.compact]
 * @param {string} [props.className]
 */
export function SignInPanel({
  defaultMode = 'signup',
  initialChallengeId = '',
  initialEmail = '',
  initialError = '',
  onSuccess,
  compact = false,
  className = '',
}) {
  const { t } = useI18n();
  const [mode, setMode] = useState(/** @type {AuthMode} */ (initialChallengeId ? 'verify' : defaultMode));
  const [challengeId, setChallengeId] = useState(initialChallengeId);
  const [verifyEmail, setVerifyEmail] = useState(initialEmail);
  const [email, setEmail] = useState(initialEmail ? decodeURIComponent(initialEmail) : '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const googleUrl = useMemo(() => getGoogleSignInUrl(), []);

  useEffect(() => {
    if (initialChallengeId) {
      setMode('verify');
      setChallengeId(initialChallengeId);
    }
  }, [initialChallengeId]);

  useEffect(() => {
    if (initialEmail) setVerifyEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    if (!initialError) return;
    const map = {
      google_not_configured: t('auth.errGoogleNotConfigured'),
      smtp_not_configured: t('auth.errSmtpNotConfigured'),
      email_send_failed: t('auth.errEmailSend'),
      google_exchange_failed: t('auth.errGoogleExchange'),
      invalid_state: t('auth.errInvalidState'),
    };
    setError(map[initialError] || t('auth.errGeneric'));
    setMode(defaultMode);
  }, [initialError, t, defaultMode]);

  const mapApiError = (code) => {
    const map = {
      email_taken: t('auth.errEmailTaken'),
      invalid_credentials: t('auth.errInvalidCredentials'),
      password_too_short: t('auth.errPasswordTooShort'),
      invalid_email: t('auth.errInvalidEmail'),
      smtp_not_configured: t('auth.errSmtpNotConfigured'),
      email_send_failed: t('auth.errEmailSend'),
      mongo_disabled: t('auth.errGeneric'),
      invalid_code: t('auth.errInvalidCode'),
      challenge_expired: t('auth.errChallengeExpired'),
    };
    return map[code] || t('auth.errGeneric');
  };

  const goToVerify = (nextChallengeId, nextEmail) => {
    setChallengeId(nextChallengeId);
    setVerifyEmail(nextEmail);
    setMode('verify');
    setError('');
    setMessage(t('auth.verifyEmailSent'));
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError(t('auth.errPasswordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.errPasswordMismatch'));
      return;
    }
    setBusy(true);
    const result = await registerWithEmail({ email: email.trim(), password });
    setBusy(false);
    if (!result.ok) {
      setError(mapApiError(result.error));
      return;
    }
    if (result.needsVerification && result.challengeId) {
      goToVerify(result.challengeId, result.email);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    const result = await loginWithEmail({ email: email.trim(), password });
    setBusy(false);
    if (!result.ok) {
      if (result.error === 'verification_required' && result.challengeId) {
        goToVerify(result.challengeId, result.email);
        return;
      }
      setError(mapApiError(result.error));
      return;
    }
    onSuccess?.();
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!challengeId || code.trim().length < 6) return;
    setBusy(true);
    setError('');
    setMessage('');
    const result = await verifyEmailCode({ challengeId, code: code.trim() });
    setBusy(false);
    if (!result.ok) {
      setError(mapApiError(result.error));
      return;
    }
    setMessage(t('auth.verifySuccess'));
    setTimeout(() => onSuccess?.(), 600);
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const title =
    mode === 'verify'
      ? t('auth.verifyTitle')
      : mode === 'login'
        ? t('auth.loginTitle')
        : t('auth.signUpTitle');

  const subtitle =
    mode === 'verify'
      ? t('auth.verifySubtitle')
      : mode === 'login'
        ? t('auth.loginSubtitle')
        : t('auth.signUpSubtitle');

  const formSpace = compact ? 'mt-4 space-y-3' : 'mt-6 space-y-4';
  const alertClass = compact
    ? 'mt-3 rounded-lg border px-2.5 py-1.5 text-xs'
    : 'mt-4 rounded-lg border px-3 py-2 text-sm';
  const footerClass = compact
    ? 'mt-3 text-center text-[11px] text-slark-muted sm:text-xs'
    : 'mt-5 text-center text-sm text-slark-muted';

  return (
    <div className={className}>
      <p className={`font-cyber uppercase tracking-[0.35em] text-slark-primary/80 ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        {t('brand.name')}
      </p>
      <h2
        id="get-started-title"
        className={`font-cyber font-bold tracking-wide text-slark-text ${
          compact ? 'mt-1 text-lg sm:text-2xl' : 'mt-2 text-xl sm:text-2xl'
        }`}
      >
        {title}
      </h2>
      <p className={`leading-relaxed text-slark-muted ${compact ? 'mt-1 line-clamp-2 text-[11px] sm:text-sm' : 'mt-2 text-sm'}`}>
        {subtitle}
      </p>

      {error && (
        <p className={`${alertClass} border-red-200 bg-red-50 text-red-700`}>
          {error}
        </p>
      )}
      {message && (
        <p className={`${alertClass} border-emerald-200 bg-emerald-50 text-emerald-800`}>
          {message}
        </p>
      )}

      {mode === 'verify' ? (
        <form className={formSpace} onSubmit={handleVerify}>
          {verifyEmail && (
            <p className={`text-slark-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
              {t('auth.codeSentTo')}{' '}
              <span className="font-medium text-slark-text">
                {decodeURIComponent(verifyEmail)}
              </span>
            </p>
          )}
          <Field label={t('auth.codeLabel')} compact={compact}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              disabled={!challengeId || busy}
              className={`${inputClass} ${inputSizeClass(compact)} text-center font-mono tracking-[0.35em] ${
                compact ? 'text-xl' : 'text-2xl tracking-[0.4em]'
              }`}
              placeholder="000000"
            />
          </Field>
          <button
            type="submit"
            disabled={!challengeId || code.length < 6 || busy}
            className={primaryBtnClass(compact)}
          >
            {busy ? t('auth.verifying') : t('auth.verifyButton')}
          </button>
          <p className={`text-center text-slark-muted ${compact ? 'text-[10px]' : 'text-xs'}`}>
            <button
              type="button"
              className="font-semibold text-slark-primary hover:underline"
              onClick={() => switchMode(defaultMode)}
            >
              {t('auth.backToAuth')}
            </button>
          </p>
        </form>
      ) : mode === 'signup' ? (
        <>
          <form className={formSpace} onSubmit={handleSignUp}>
            <Field label={t('auth.emailLabel')} compact={compact}>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className={`${inputClass} ${inputSizeClass(compact)}`}
                placeholder="you@company.com"
              />
            </Field>
            <Field label={t('auth.passwordLabel')} compact={compact}>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className={`${inputClass} ${inputSizeClass(compact)}`}
              />
            </Field>
            <Field label={t('auth.confirmPasswordLabel')} compact={compact}>
              <input
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={busy}
                className={`${inputClass} ${inputSizeClass(compact)}`}
              />
            </Field>
            <button type="submit" disabled={busy} className={primaryBtnClass(compact)}>
              {busy ? t('auth.signingUp') : t('auth.signUpButton')}
            </button>
          </form>

          <OrDivider label={t('auth.orDivider')} compact={compact} />
          <GoogleButton href={googleUrl} label={t('auth.continueGoogle')} compact={compact} />

          <p className={footerClass}>
            {t('auth.alreadyHaveAccount')}{' '}
            <button
              type="button"
              onClick={() => switchMode('login')}
              className="font-semibold text-slark-primary hover:underline"
            >
              {t('auth.loginLink')}
            </button>
          </p>
        </>
      ) : (
        <>
          <form className={formSpace} onSubmit={handleLogin}>
            <Field label={t('auth.emailLabel')} compact={compact}>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
                className={`${inputClass} ${inputSizeClass(compact)}`}
                placeholder="you@company.com"
              />
            </Field>
            <Field label={t('auth.passwordLabel')} compact={compact}>
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={busy}
                className={`${inputClass} ${inputSizeClass(compact)}`}
              />
            </Field>
            <button type="submit" disabled={busy} className={primaryBtnClass(compact)}>
              {busy ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          <OrDivider label={t('auth.orDivider')} compact={compact} />
          <GoogleButton href={googleUrl} label={t('auth.continueGoogle')} compact={compact} />

          <p className={footerClass}>
            {t('auth.noAccount')}{' '}
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className="font-semibold text-slark-primary hover:underline"
            >
              {t('auth.signUpLink')}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
