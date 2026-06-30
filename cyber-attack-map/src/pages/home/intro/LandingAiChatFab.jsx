import { useEffect, useState } from 'react';
import { Headphones, X } from 'lucide-react';
import { ThreatAIChatPanel } from '../../../components/monitoring/ThreatAIChatPanel.jsx';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SLARK as C } from '../../../theme/slarkColors.js';

export function LandingAiChatFab() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="fixed bottom-5 right-4 z-[90] sm:bottom-6 sm:right-6">
      {open ? (
        <div
          id="landing-ai-chat-panel"
          className="flex h-[min(90vh,40rem)] max-h-[92vh] w-[min(calc(100vw-2rem),24rem)] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:w-[26rem]"
          style={{
            borderColor: C.border,
            backgroundColor: C.bg,
            boxShadow: '0 20px 50px rgba(17,24,39,0.18)',
          }}
          role="dialog"
          aria-modal="true"
          aria-label={t('home.landingAiChat.fab')}
        >
          <div
            className="flex shrink-0 items-center justify-between border-b px-3 py-2.5"
            style={{ borderColor: C.border, backgroundColor: C.card }}
          >
            <span className="font-cyber text-sm font-bold tracking-wide" style={{ color: C.primary }}>
              {t('home.landingAiChat.header')}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-black/5"
              style={{ color: C.textMuted }}
              aria-label={t('home.landingAiChat.close')}
            >
              <X className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
          <ThreatAIChatPanel
            variant="landing"
            className="rounded-none border-0 shadow-none"
            onIntegrationGuideClick={() => setOpen(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full border shadow-lg transition hover:scale-[1.05] hover:shadow-xl active:scale-[0.98]"
          style={{
            borderColor: `${C.primary}40`,
            backgroundColor: C.primary,
            color: '#FFFFFF',
            boxShadow: '0 8px 28px rgba(198,40,40,0.35)',
          }}
          aria-expanded={false}
          aria-controls="landing-ai-chat-panel"
          aria-label={t('home.landingAiChat.fab')}
        >
          <Headphones className="h-6 w-6" strokeWidth={2} aria-hidden />
        </button>
      )}
    </div>
  );
}
