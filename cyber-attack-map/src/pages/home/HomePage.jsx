import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LandingPage } from './intro/LandingPage.jsx';
import { GetStartedModal } from './intro/GetStartedModal.jsx';
import { DashboardPage } from './hub/DashboardPage.jsx';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus, setStoredSessionToken } from '../../services/auth.js';

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

  const authChallenge = searchParams.get('challenge') || '';
  const authEmail = searchParams.get('email') || '';
  const authError = searchParams.get('error') || '';
  const authReturn = searchParams.get('return') || '';

  const clearAuthSearchParams = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('getstarted');
    next.delete('challenge');
    next.delete('email');
    next.delete('error');
    next.delete('return');
    const q = next.toString();
    navigate({ pathname: '/', search: q ? `?${q}` : '' }, { replace: true });
  };

  useEffect(() => {
    document.title = `${t('brand.name')} – Home`;
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

    const enterHub = () => {
      if (!cancelled) setPhase('hub');
    };

    const sessionFromUrl = searchParams.get('session');
    if (sessionFromUrl) {
      setStoredSessionToken(sessionFromUrl);
      window.dispatchEvent(new Event('slark-auth-change'));
      enterHub();
      const next = new URLSearchParams(searchParams);
      next.delete('session');
      const q = next.toString();
      navigate({ pathname: '/', search: q ? `?${q}` : '' }, { replace: true });
      return () => {
        cancelled = true;
      };
    }

    if (searchParams.get('hub') === '1') {
      enterHub();
      return () => {
        cancelled = true;
      };
    }

    fetchAuthStatus().then((status) => {
      if (cancelled) return;
      if (status.ok && status.user) {
        enterHub();
      } else {
        setPhase('intro');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  useEffect(() => {
    const onAuthChange = async () => {
      const status = await fetchAuthStatus();
      setPhase(status.ok && status.user ? 'hub' : 'intro');
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
    </div>
  );
}
