import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LandingPage } from './intro/LandingPage.jsx';
import { GetStartedModal } from './intro/GetStartedModal.jsx';
import { DashboardPage } from './hub/DashboardPage.jsx';
import { ChangePasswordModal } from '../account/ChangePasswordModal.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus, setStoredSessionToken } from '../../services/auth.js';
import {
  completePasswordChange,
  requestPasswordChangeCode,
  verifyPasswordChangeCode,
} from '../../services/passwordChange.js';

/** @typedef {'loading' | 'intro' | 'hub'} HomePhase */

/**
 * Route `/` — memilih tampilan berdasarkan status login:
 * - `intro/` → landing publik (tamu)
 * - `hub/`   → dashboard 3D (user login)
 */
export function HomePage() {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phase, setPhase] = useState(/** @type {HomePhase} */ ('loading'));
  const [getStartedOpen, setGetStartedOpen] = useState(false);
  const [setupPasswordOpen, setSetupPasswordOpen] = useState(false);
  const [passwordChallengeId, setPasswordChallengeId] = useState('');
  const [passwordEmailMasked, setPasswordEmailMasked] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSending, setPasswordSending] = useState(false);

  const setupStartedRef = useRef(false);
  const setupOpenRef = useRef(false);
  const passwordChallengeIdRef = useRef('');

  const authChallenge = searchParams.get('challenge') || '';
  const authEmail = searchParams.get('email') || '';
  const authError = searchParams.get('error') || '';
  const authReturn = searchParams.get('return') || '';
  const needsPasswordSetup = searchParams.get('setPassword') === '1';

  const clearAuthSearchParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('getstarted');
    next.delete('challenge');
    next.delete('email');
    next.delete('error');
    next.delete('return');
    next.delete('setPassword');
    next.delete('hub');
    next.delete('session');
    const q = next.toString();
    navigate({ pathname: '/', search: q ? `?${q}` : '' }, { replace: true });
  };

  const stripSetupParams = useCallback(() => {
    const next = new URLSearchParams(searchParams);
    next.delete('setPassword');
    next.delete('session');
    next.delete('hub');
    const q = next.toString();
    navigate({ pathname: '/', search: q ? `?${q}` : '' }, { replace: true });
  }, [navigate, searchParams]);

  const openPasswordSetup = useCallback(() => {
    if (setupStartedRef.current) return;
    setupStartedRef.current = true;
    setupOpenRef.current = true;
    setPasswordError('');
    setPasswordChallengeId('');
    passwordChallengeIdRef.current = '';
    setPasswordEmailMasked('');
    setSetupPasswordOpen(true);
  }, []);

  const passwordErrorMessage = useCallback(
    (code) => {
      const map = {
        invalid_code: t('settings.forgetPasswordInvalidCode'),
        challenge_expired: t('settings.forgetPasswordExpired'),
        challenge_mismatch: t('settings.forgetPasswordExpired'),
        code_not_verified: t('settings.forgetPasswordExpired'),
        smtp_not_configured: t('settings.forgetPasswordEmailFailed'),
        email_send_failed: t('settings.forgetPasswordEmailFailed'),
        password_mismatch: t('settings.googleSetupMismatch'),
        password_too_short: t('settings.googleSetupTooShort'),
        not_authenticated: t('settings.forgetPasswordNotSignedIn'),
        endpoint_not_found: t('settings.forgetPasswordServerOutdated'),
        send_failed: t('settings.forgetPasswordSendFailed'),
        verify_failed: t('settings.forgetPasswordGeneric'),
        complete_failed: t('settings.forgetPasswordGeneric'),
        mongo_disabled: t('settings.forgetPasswordGeneric'),
        user_not_found: t('settings.forgetPasswordGeneric'),
        network_error: t('settings.forgetPasswordSendFailed'),
      };
      return map[code] || t('settings.forgetPasswordGeneric');
    },
    [t]
  );

  useEffect(() => {
    document.title = `${t('brand.name')} | Home`;
  }, [t, locale]);

  useEffect(() => {
    const scrollRoot = document.getElementById('app-scroll-root');
    const shell = scrollRoot?.parentElement;

    scrollRoot?.classList.remove('landing-page-scroll', 'hub-page-scroll');
    shell?.classList.remove('landing-page-shell', 'hub-page-shell');

    if (phase === 'intro' || phase === 'loading') {
      scrollRoot?.classList.add('landing-page-scroll');
      shell?.classList.add('landing-page-shell');
    } else if (phase === 'hub') {
      scrollRoot?.classList.add('hub-page-scroll');
      shell?.classList.add('hub-page-shell');
    }

    return () => {
      scrollRoot?.classList.remove('landing-page-scroll', 'hub-page-scroll');
      shell?.classList.remove('landing-page-shell', 'hub-page-shell');
    };
  }, [phase]);

  useEffect(() => {
    let cancelled = false;

    const enterHub = (withPasswordSetup = false) => {
      if (cancelled) return;
      setPhase('hub');
      if (withPasswordSetup) openPasswordSetup();
    };

    const sessionFromUrl = searchParams.get('session');
    if (sessionFromUrl) {
      setStoredSessionToken(sessionFromUrl);
      enterHub(needsPasswordSetup);
      const next = new URLSearchParams(searchParams);
      next.delete('session');
      // Consume setup flag now so a follow-up effect does not reset the modal mid-send.
      next.delete('setPassword');
      next.delete('hub');
      const q = next.toString();
      navigate({ pathname: '/', search: q ? `?${q}` : '' }, { replace: true });
      window.dispatchEvent(new Event('slark-auth-change'));
      return () => {
        cancelled = true;
      };
    }

    if (searchParams.get('hub') === '1') {
      enterHub(needsPasswordSetup);
      if (needsPasswordSetup) {
        const next = new URLSearchParams(searchParams);
        next.delete('setPassword');
        next.delete('hub');
        const q = next.toString();
        navigate({ pathname: '/', search: q ? `?${q}` : '' }, { replace: true });
      }
      return () => {
        cancelled = true;
      };
    }

    fetchAuthStatus().then((status) => {
      if (cancelled) return;
      if (status.ok && status.user) {
        enterHub(needsPasswordSetup && !status.user.hasPassword);
        if (needsPasswordSetup) stripSetupParams();
      } else {
        setPhase('intro');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate, needsPasswordSetup, openPasswordSetup, stripSetupParams]);

  useEffect(() => {
    const onAuthChange = async () => {
      const status = await fetchAuthStatus();
      if (status.ok && status.user) {
        setPhase('hub');
        return;
      }
      // Do not kick the user back to landing while Google password setup is open.
      if (setupOpenRef.current) return;
      setPhase('intro');
    };
    window.addEventListener('slark-auth-change', onAuthChange);
    return () => window.removeEventListener('slark-auth-change', onAuthChange);
  }, []);

  useEffect(() => {
    if (phase !== 'intro') return;
    const shouldOpen =
      searchParams.get('getstarted') === '1' || Boolean(authChallenge) || Boolean(authError);
    if (shouldOpen) setGetStartedOpen(true);
  }, [phase, searchParams, authChallenge, authError]);

  const handleGetStarted = () => {
    setGetStartedOpen(true);
  };

  const handleCloseGetStarted = () => {
    setGetStartedOpen(false);
    if (
      searchParams.get('getstarted') === '1' ||
      authChallenge ||
      authError ||
      authReturn
    ) {
      clearAuthSearchParams();
    }
  };

  const handleSignInSuccess = () => {
    setGetStartedOpen(false);
    if (authReturn.startsWith('/') && !authReturn.startsWith('//')) {
      clearAuthSearchParams();
      navigate(authReturn, { replace: true });
      return;
    }
    clearAuthSearchParams();
    setPhase('hub');
  };

  const closeSetupPasswordModal = () => {
    setupOpenRef.current = false;
    setSetupPasswordOpen(false);
    setPasswordError('');
    setPasswordChallengeId('');
    passwordChallengeIdRef.current = '';
    setPasswordEmailMasked('');
    setPasswordSending(false);
    stripSetupParams();
  };

  const sendPasswordVerificationCode = async () => {
    setPasswordSending(true);
    setPasswordError('');
    try {
      const result = await requestPasswordChangeCode({ purpose: 'setup' });
      if (!result.ok) {
        setPasswordError(passwordErrorMessage(result.error));
        return { ok: false };
      }
      const id = result.challengeId || '';
      passwordChallengeIdRef.current = id;
      setPasswordChallengeId(id);
      setPasswordEmailMasked(result.emailMasked || '');
      return { ok: true, challengeId: id, emailMasked: result.emailMasked };
    } finally {
      setPasswordSending(false);
    }
  };

  const handleVerifyPasswordCode = async (code, challengeId) => {
    setPasswordError('');
    try {
      const result = await verifyPasswordChangeCode({
        challengeId: challengeId || passwordChallengeIdRef.current || passwordChallengeId,
        code,
      });
      if (!result?.ok) {
        setPasswordError(passwordErrorMessage(result?.error));
        return { ok: false };
      }
      return { ok: true };
    } catch {
      setPasswordError(passwordErrorMessage('network_error'));
      return { ok: false };
    }
  };

  const handleCompletePasswordSetup = async ({ password, confirmPassword, challengeId }) => {
    setPasswordError('');
    try {
      const result = await completePasswordChange({
        challengeId: challengeId || passwordChallengeIdRef.current || passwordChallengeId,
        password,
        confirmPassword,
      });
      if (!result?.ok) {
        setPasswordError(passwordErrorMessage(result?.error));
        return { ok: false };
      }
      return { ok: true };
    } catch {
      setPasswordError(passwordErrorMessage('network_error'));
      return { ok: false };
    }
  };

  if (phase === 'loading') {
    return (
      <div className="flex min-h-full w-full flex-1 flex-col items-center justify-center bg-[#FFFFFF]">
        <p className="font-cyber text-xs uppercase tracking-[0.35em] text-[#C62828]/90">{t('home.introLoading')}</p>
      </div>
    );
  }

  if (phase === 'intro') {
    return (
      <div className="flex min-h-full w-full flex-1 flex-col bg-[#FFFFFF]">
        <LandingPage onGetStarted={handleGetStarted} />
        <GetStartedModal
          open={getStartedOpen}
          onClose={handleCloseGetStarted}
          onSuccess={handleSignInSuccess}
          defaultMode={authChallenge || authError ? 'login' : 'signup'}
          initialChallengeId={authChallenge}
          initialEmail={authEmail}
          initialError={authError}
        />
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <DashboardPage />
      <ChangePasswordModal
        open={setupPasswordOpen}
        variant="setup"
        autoStart
        emailMasked={passwordEmailMasked}
        sending={passwordSending}
        error={passwordError}
        onClose={closeSetupPasswordModal}
        onRequestCode={sendPasswordVerificationCode}
        onVerifyCode={handleVerifyPasswordCode}
        onComplete={handleCompletePasswordSetup}
        onResend={sendPasswordVerificationCode}
        onStepChange={() => setPasswordError('')}
      />
    </div>
  );
}
