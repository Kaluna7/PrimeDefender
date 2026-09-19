import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import {
  getGoogleSignInUrl,
  loginWithEmail,
  registerWithEmail,
  verifyEmailCode,
} from '../../services/auth.js';
import {
  completeForgotPassword,
  requestForgotPasswordCode,
  verifyForgotPasswordCode,
} from '../../services/passwordChange.js';

/** @typedef {'signup' | 'login' | 'verify' | 'forgot-email' | 'forgot-code' | 'forgot-password' | 'forgot-done'} AuthMode */

const PASSWORD_MIN_LEN = 8;

function OrDivider({ label }) {
  return (
    <div className="auth-divider">
      <div className="auth-divider-line" />
      <span className="auth-divider-label">{label}</span>
      <div className="auth-divider-line" />
    </div>
  );
}

function GoogleButton({ href, label }) {
  return (
    <a href={href} className="auth-btn-google">
      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
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

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="auth-field-label">{label}</span>
      {children}
    </label>
  );
}

/**
 * @param {{
 *   label: string,
 *   value: string,
 *   onChange: (value: string) => void,
 *   placeholder?: string,
 *   autoComplete?: string,
 *   disabled?: boolean,
 *   required?: boolean,
 *   showLabel: string,
 *   hideLabel: string,
 * }} props
 */
function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  disabled = false,
  required = false,
  showLabel,
  hideLabel,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="auth-input auth-input--password"
          placeholder={placeholder}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? hideLabel : showLabel}
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
        </button>
      </div>
    </Field>
  );
}

function FormInlineFeedback({ error, message }) {
  if (!error && !message) return null;

  return (
    <div aria-live="polite">
      {error ? (
        <p className="auth-inline-error" role="alert">
          {error}
        </p>
      ) : null}
      {!error && message ? <p className="auth-inline-success">{message}</p> : null}
    </div>
  );
}

/**
 * @param {object} props
 * @param {'signup' | 'login'} [props.defaultMode]
 * @param {string} [props.initialChallengeId]
 * @param {string} [props.initialEmail]
 * @param {string} [props.initialError]
 * @param {() => void} [props.onSuccess]
 * @param {string} [props.className]
 */
export function SignInPanel({
  defaultMode = 'signup',
  initialChallengeId = '',
  initialEmail = '',
  initialError = '',
  onSuccess,
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
  const [forgotEmailMasked, setForgotEmailMasked] = useState('');
  const forgotChallengeRef = useRef('');

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
      network_error: t('auth.errNetwork'),
      google_account: t('auth.errGoogleAccount'),
    };
    setError(map[initialError] || t('auth.errGeneric'));
    setMode(defaultMode);
  }, [initialError, t, defaultMode]);

  const mapApiError = (errCode) => {
    const map = {
      email_taken: t('auth.errEmailTaken'),
      invalid_credentials: t('auth.errInvalidCredentials'),
      google_account: t('auth.errGoogleAccount'),
      network_error: t('auth.errNetwork'),
      password_too_short: t('auth.errPasswordTooShort'),
      password_mismatch: t('auth.errPasswordMismatch'),
      invalid_email: t('auth.errInvalidEmail'),
      user_not_found: t('auth.errUserNotFound'),
      smtp_not_configured: t('auth.errSmtpNotConfigured'),
      email_send_failed: t('auth.errEmailSend'),
      mongo_disabled: t('auth.errGeneric'),
      invalid_code: t('auth.errInvalidCode'),
      challenge_expired: t('auth.errChallengeExpired'),
      challenge_mismatch: t('auth.errChallengeExpired'),
      code_not_verified: t('auth.errChallengeExpired'),
      send_failed: t('auth.errEmailSend'),
      verify_failed: t('auth.errGeneric'),
      complete_failed: t('auth.errGeneric'),
    };
    return map[errCode] || t('auth.errGeneric');
  };

  const goToVerify = (nextChallengeId, nextEmail) => {
    setChallengeId(nextChallengeId);
    setVerifyEmail(nextEmail);
    setMode('verify');
    setError('');
    setMessage(t('auth.verifyEmailSent'));
  };

  const resetForgotFields = () => {
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setForgotEmailMasked('');
    forgotChallengeRef.current = '';
  };

  const switchMode = (next) => {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
    if (!String(next).startsWith('forgot')) {
      setCode('');
    }
  };

  const openForgot = () => {
    setError('');
    setMessage('');
    setCode('');
    setPassword('');
    setConfirmPassword('');
    setForgotEmailMasked('');
    forgotChallengeRef.current = '';
    setMode('forgot-email');
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < PASSWORD_MIN_LEN) {
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

  const handleForgotSend = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const normalized = email.trim().toLowerCase();
    if (!normalized.includes('@')) {
      setError(t('auth.errInvalidEmail'));
      return;
    }
    setBusy(true);
    const result = await requestForgotPasswordCode({ email: normalized });
    setBusy(false);
    if (!result.ok) {
      setError(mapApiError(result.error));
      return;
    }
    forgotChallengeRef.current = result.challengeId || '';
    setForgotEmailMasked(result.emailMasked || normalized);
    setCode('');
    setMode('forgot-code');
  };

  const handleForgotResend = async () => {
    setError('');
    setBusy(true);
    const result = await requestForgotPasswordCode({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (!result.ok) {
      setError(mapApiError(result.error));
      return;
    }
    forgotChallengeRef.current = result.challengeId || '';
    setForgotEmailMasked(result.emailMasked || email.trim());
    setMessage(t('auth.verifyEmailSent'));
  };

  const handleForgotVerify = async (e) => {
    e.preventDefault();
    if (code.trim().length < 6 || !forgotChallengeRef.current) return;
    setBusy(true);
    setError('');
    setMessage('');
    const result = await verifyForgotPasswordCode({
      email: email.trim().toLowerCase(),
      challengeId: forgotChallengeRef.current,
      code: code.trim(),
    });
    setBusy(false);
    if (!result.ok) {
      setError(mapApiError(result.error));
      return;
    }
    setPassword('');
    setConfirmPassword('');
    setMode('forgot-password');
  };

  const handleForgotComplete = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < PASSWORD_MIN_LEN) {
      setError(t('auth.errPasswordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('auth.errPasswordMismatch'));
      return;
    }
    setBusy(true);
    const result = await completeForgotPassword({
      email: email.trim().toLowerCase(),
      challengeId: forgotChallengeRef.current,
      password,
      confirmPassword,
    });
    setBusy(false);
    if (!result.ok) {
      setError(mapApiError(result.error));
      return;
    }
    setMode('forgot-done');
  };

  const title =
    mode === 'verify'
      ? t('auth.verifyTitle')
      : mode === 'forgot-email'
        ? t('auth.forgotTitle')
        : mode === 'forgot-code'
          ? t('auth.forgotCodeTitle')
          : mode === 'forgot-password'
            ? t('auth.forgotPasswordTitle')
            : mode === 'forgot-done'
              ? t('auth.forgotDoneTitle')
              : mode === 'login'
                ? t('auth.loginTitle')
                : t('auth.signUpTitle');

  const subtitle =
    mode === 'verify'
      ? t('auth.verifySubtitle')
      : mode === 'forgot-email'
        ? t('auth.forgotSubtitle')
        : mode === 'forgot-code'
          ? t('auth.forgotCodeSubtitle')
          : mode === 'forgot-password'
            ? t('auth.forgotPasswordSubtitle')
            : mode === 'forgot-done'
              ? t('auth.forgotDoneBody')
              : mode === 'login'
                ? t('auth.loginSubtitle')
                : t('auth.signUpSubtitle');

  return (
    <div className={className}>
      <p className="auth-panel-brand">{t('brand.name')}</p>
      <h2 id="get-started-title" className="auth-panel-title">
        {title}
      </h2>
      <p className="auth-panel-subtitle">{subtitle}</p>

      {mode === 'verify' ? (
        <form className="auth-form motion-safe:animate-[verifyStepIn_240ms_ease-out]" onSubmit={handleVerify}>
          {verifyEmail ? (
            <p className="auth-verify-hint">
              {t('auth.codeSentTo')}{' '}
              <span className="auth-verify-email">{decodeURIComponent(verifyEmail)}</span>
            </p>
          ) : null}
          <Field label={t('auth.codeLabel')}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              disabled={!challengeId || busy}
              className="auth-input auth-input--code"
              placeholder="000000"
            />
          </Field>
          <FormInlineFeedback error={error} message={message} />
          <button
            type="submit"
            disabled={!challengeId || code.length < 6 || busy}
            className="auth-btn-primary"
          >
            {busy ? t('auth.verifying') : t('auth.verifyButton')}
          </button>
          <p className="auth-back-link">
            <button type="button" className="auth-link" onClick={() => switchMode(defaultMode)}>
              {t('auth.backToAuth')}
            </button>
          </p>
        </form>
      ) : mode === 'forgot-email' ? (
        <form className="auth-form motion-safe:animate-[verifyStepIn_240ms_ease-out]" onSubmit={handleForgotSend}>
          <Field label={t('auth.emailLabel')}>
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError('');
              }}
              disabled={busy}
              className="auth-input"
              placeholder="you@gmail.com"
            />
          </Field>
          <FormInlineFeedback error={error} message={message} />
          <button type="submit" disabled={busy || !email.trim()} className="auth-btn-primary">
            {busy ? t('auth.forgotSending') : t('auth.forgotContinue')}
          </button>
          <p className="auth-back-link">
            <button
              type="button"
              className="auth-link"
              onClick={() => {
                resetForgotFields();
                switchMode('login');
              }}
            >
              {t('auth.forgotBackToLogin')}
            </button>
          </p>
        </form>
      ) : mode === 'forgot-code' ? (
        <form className="auth-form motion-safe:animate-[verifyStepIn_240ms_ease-out]" onSubmit={handleForgotVerify}>
          <p className="auth-verify-hint">
            {t('auth.forgotCodeSentTo')}{' '}
            <span className="auth-verify-email">{forgotEmailMasked || email}</span>
          </p>
          <Field label={t('auth.codeLabel')}>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                if (error) setError('');
              }}
              disabled={busy}
              className="auth-input auth-input--code"
              placeholder="000000"
            />
          </Field>
          <FormInlineFeedback error={error} message={message} />
          <button type="submit" disabled={code.length < 6 || busy} className="auth-btn-primary">
            {busy ? t('auth.forgotVerifying') : t('auth.forgotVerifyButton')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={handleForgotResend}
            className="auth-link mt-3 text-left text-xs font-semibold"
          >
            {t('auth.forgotResend')}
          </button>
          <p className="auth-back-link">
            <button type="button" className="auth-link" onClick={() => switchMode('forgot-email')}>
              {t('auth.backToAuth')}
            </button>
          </p>
        </form>
      ) : mode === 'forgot-password' ? (
        <form className="auth-form motion-safe:animate-[verifyStepIn_240ms_ease-out]" onSubmit={handleForgotComplete}>
          <PasswordField
            label={t('auth.passwordLabel')}
            value={password}
            onChange={(value) => {
              setPassword(value);
              if (error) setError('');
            }}
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="new-password"
            disabled={busy}
            required
            showLabel={t('auth.showPassword')}
            hideLabel={t('auth.hidePassword')}
          />
          <PasswordField
            label={t('auth.confirmPasswordLabel')}
            value={confirmPassword}
            onChange={(value) => {
              setConfirmPassword(value);
              if (error) setError('');
            }}
            placeholder={t('auth.confirmPasswordPlaceholder')}
            autoComplete="new-password"
            disabled={busy}
            required
            showLabel={t('auth.showPassword')}
            hideLabel={t('auth.hidePassword')}
          />
          <FormInlineFeedback error={error} message={message} />
          <button
            type="submit"
            disabled={
              busy ||
              password.length < PASSWORD_MIN_LEN ||
              confirmPassword.length < PASSWORD_MIN_LEN ||
              password !== confirmPassword
            }
            className="auth-btn-primary"
          >
            {busy ? t('auth.forgotSaving') : t('auth.forgotSave')}
          </button>
        </form>
      ) : mode === 'forgot-done' ? (
        <div className="auth-form motion-safe:animate-[verifyStepIn_240ms_ease-out]">
          <p className="auth-inline-success">{t('auth.forgotDoneBody')}</p>
          <button
            type="button"
            className="auth-btn-primary"
            onClick={() => {
              resetForgotFields();
              switchMode('login');
            }}
          >
            {t('auth.forgotBackToLogin')}
          </button>
        </div>
      ) : mode === 'signup' ? (
        <>
          <form className="auth-form" onSubmit={handleSignUp}>
            <Field label={t('auth.emailLabel')}>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                disabled={busy}
                className="auth-input"
                placeholder="you@gmail.com"
              />
            </Field>
            <PasswordField
              label={t('auth.passwordLabel')}
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (error) setError('');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="new-password"
              disabled={busy}
              required
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
            />
            <PasswordField
              label={t('auth.confirmPasswordLabel')}
              value={confirmPassword}
              onChange={(value) => {
                setConfirmPassword(value);
                if (error) setError('');
              }}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              disabled={busy}
              required
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
            />
            <FormInlineFeedback error={error} message={message} />
            <button type="submit" disabled={busy} className="auth-btn-primary">
              {busy ? t('auth.signingUp') : t('auth.signUpButton')}
            </button>
          </form>

          <OrDivider label={t('auth.orDivider')} />
          <GoogleButton href={googleUrl} label={t('auth.continueGoogle')} />

          <p className="auth-footer">
            {t('auth.alreadyHaveAccount')}{' '}
            <button type="button" onClick={() => switchMode('login')} className="auth-link">
              {t('auth.loginLink')}
            </button>
          </p>
        </>
      ) : (
        <>
          <form className="auth-form" onSubmit={handleLogin}>
            <Field label={t('auth.emailLabel')}>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                disabled={busy}
                className="auth-input"
                placeholder="you@gmail.com"
              />
            </Field>
            <PasswordField
              label={t('auth.passwordLabel')}
              value={password}
              onChange={(value) => {
                setPassword(value);
                if (error) setError('');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              autoComplete="current-password"
              disabled={busy}
              required
              showLabel={t('auth.showPassword')}
              hideLabel={t('auth.hidePassword')}
            />
            <div className="auth-forgot-row">
              <button type="button" className="auth-link" onClick={openForgot}>
                {t('auth.forgotLink')}
              </button>
            </div>
            <FormInlineFeedback error={error} message={message} />
            <button type="submit" disabled={busy} className="auth-btn-primary">
              {busy ? t('auth.loggingIn') : t('auth.loginButton')}
            </button>
          </form>

          <OrDivider label={t('auth.orDivider')} />
          <GoogleButton href={googleUrl} label={t('auth.continueGoogle')} />

          <p className="auth-footer">
            {t('auth.noAccount')}{' '}
            <button type="button" onClick={() => switchMode('signup')} className="auth-link">
              {t('auth.signUpLink')}
            </button>
          </p>
        </>
      )}
    </div>
  );
}
