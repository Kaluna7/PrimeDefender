import { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { SignInPanel } from '../../components/auth/SignInPanel.jsx';
import { fetchAuthStatus } from '../../services/auth.js';

export function SignInPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const challengeId = params.get('challenge') || '';
  const emailHint = params.get('email') || '';
  const authError = params.get('error') || '';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const status = await fetchAuthStatus();
      if (!cancelled && status.ok && status.user) {
        navigate('/?hub=1', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-slark-bg px-4 py-10 text-slark-text">
      <div className="w-full max-w-md rounded-2xl border border-slark-border bg-slark-card p-6 shadow-slark-lg sm:p-8">
        <SignInPanel
          defaultMode="login"
          initialChallengeId={challengeId}
          initialEmail={emailHint}
          initialError={authError}
          onSuccess={() => navigate('/?hub=1', { replace: true })}
        />

        <Link
          to="/"
          className="mt-6 block text-center text-xs text-slark-primary/70 underline-offset-2 hover:text-slark-primary hover:underline"
        >
          {t('auth.backHome')}
        </Link>
      </div>
    </div>
  );
}
