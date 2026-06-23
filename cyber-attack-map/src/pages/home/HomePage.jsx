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

  useEffect(() => {
    document.title = `${t('brand.name')} – Home`;
  }, [t, locale]);

  useEffect(() => {
    if (phase !== 'intro' && phase !== 'loading') return undefined;

    const scrollRoot = document.getElementById('app-scroll-root');
    const shell = scrollRoot?.parentElement;
    scrollRoot?.classList.add('landing-page-scroll');
    shell?.classList.add('landing-page-shell');

    return () => {
      scrollRoot?.classList.remove('landing-page-scroll');
      shell?.classList.remove('landing-page-shell');
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

  const handleGetStarted = () => {
    setGetStartedOpen(true);
  };

  const handleSignInSuccess = () => {
    setGetStartedOpen(false);
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
          onClose={() => setGetStartedOpen(false)}
          onSuccess={handleSignInSuccess}
        />
      </div>
    );
  }

  return <DashboardPage />;
}
