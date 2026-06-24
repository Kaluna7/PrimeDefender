import { ArrowRight, Send } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { buildThreatAiPrompt } from '../../utils/threatAiPrompt.js';
import { createThreatChatSession, createLandingChatSession, isGeminiConfigured } from '../../services/geminiChat.js';

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const ThreatAIChatPanel = forwardRef(function ThreatAIChatPanel(
  { className = '', variant = 'threat' },
  ref
) {
  const { t } = useI18n();
  const isLanding = variant === 'landing';
  const title = isLanding ? t('home.landingAiChat.fab') : t('aiChat.title');
  const subtitle = isLanding ? '' : t('aiChat.subtitle');
  const emptyText = isLanding ? '' : t('aiChat.empty');
  const placeholder = isLanding ? t('home.landingAiChat.placeholder') : t('aiChat.placeholder');
  const questionTitle = t('aiChat.questionTitle');
  const questionHint = t('aiChat.questionHint');

  const landingShortcuts = useMemo(
    () =>
      isLanding
        ? [
            {
              id: 'what',
              label: t('home.landingAiChat.shortcut1'),
              question: t('home.landingAiChat.shortcut1q'),
            },
            {
              id: 'connect',
              label: t('home.landingAiChat.shortcut2'),
              question: t('home.landingAiChat.shortcut2q'),
            },
            {
              id: 'pricing',
              label: t('home.landingAiChat.shortcut3'),
              question: t('home.landingAiChat.shortcut3q'),
            },
          ]
        : [],
    [isLanding, t]
  );

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [shortcutsVisible, setShortcutsVisible] = useState(true);
  const sessionRef = useRef(null);
  const sendingRef = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const ensureSession = useCallback(() => {
    if (!isGeminiConfigured()) return null;
    if (!sessionRef.current) {
      try {
        sessionRef.current = isLanding ? createLandingChatSession() : createThreatChatSession();
      } catch {
        return null;
      }
    }
    return sessionRef.current;
  }, [isLanding]);

  const runSend = useCallback(
    async (userText) => {
      const trimmed = userText.trim();
      if (!trimmed || sendingRef.current) return;

      if (!isGeminiConfigured()) {
        setError(t('aiChat.missingKey'));
        return;
      }

      sendingRef.current = true;
      setError('');
      setLoading(true);
      setMessages((m) => [...m, { id: msgId(), role: 'user', content: trimmed }]);

      try {
        const chat = ensureSession();
        if (!chat) {
          throw new Error(t('aiChat.missingKey'));
        }
        const result = await chat.sendMessage(trimmed);
        const reply = result.response.text();
        setMessages((m) => [...m, { id: msgId(), role: 'assistant', content: reply }]);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setLoading(false);
        sendingRef.current = false;
      }
    },
    [ensureSession, t]
  );

  useImperativeHandle(
    ref,
    () => ({
      explainAttack(attack) {
        if (!attack) return;
        void runSend(buildThreatAiPrompt(attack));
      },
    }),
    [runSend]
  );

  function onSubmit(e) {
    e.preventDefault();
    const text = input;
    setInput('');
    if (isLanding) setShortcutsVisible(false);
    void runSend(text);
  }

  function onClear() {
    sessionRef.current = null;
    setMessages([]);
    setError('');
    setInput('');
    if (isLanding) setShortcutsVisible(true);
  }

  const showLandingShortcuts = isLanding && shortcutsVisible && messages.length === 0;

  const handleShortcut = (question) => {
    setShortcutsVisible(false);
    void runSend(question);
  };

  const configured = isGeminiConfigured();

  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden bg-slark-bg ${
        isLanding ? 'flex-1 rounded-none border-0 shadow-none' : `rounded-b-2xl border-x border-b border-slark-border shadow-slark ${className}`
      }`}
      aria-label={title}
    >
      {/* Accent bar */}
      {!isLanding && <div className="h-1 w-full shrink-0 bg-slark-primary" />}

      {!isLanding && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slark-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slark-primary opacity-40" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slark-primary" />
              </span>
              <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-text">
                {title}
              </h2>
            </div>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slark-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 rounded-lg border border-slark-border bg-slark-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slark-text shadow-sm transition hover:bg-slark-bg"
          >
            {t('aiChat.clear')}
          </button>
        </div>
      )}

      {!configured && (
        <p className="shrink-0 border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-950">
          {t('aiChat.missingKeyHint')}
        </p>
      )}

      {error && (
        <p className="shrink-0 border-b border-rose-300/80 bg-rose-50 px-4 py-2.5 font-mono text-xs text-rose-900">
          {error}
        </p>
      )}

      <div
        className={`thin-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto ${
          isLanding ? 'px-3 py-4' : 'max-h-[min(52vh,28rem)] min-h-[11rem] px-4 py-4 sm:px-5'
        }`}
      >
        {messages.length === 0 && !loading && emptyText && (
          <div className="rounded-xl border-2 border-dashed border-slark-border bg-slark-card px-4 py-8 text-center">
            <p className="text-sm font-medium leading-relaxed text-slark-text">
              {emptyText}
            </p>
          </div>
        )}
        <ul className="flex flex-col gap-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border px-3.5 py-3 text-sm leading-relaxed shadow-sm ${
                m.role === 'user'
                  ? 'border-slark-primary/30 bg-slark-card text-slark-text'
                  : 'border-slark-border bg-slark-bg text-slark-text'
              }`}
            >
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slark-muted">
                {m.role === 'user' ? t('aiChat.roleUser') : t('aiChat.roleAssistant')}
              </span>
              <pre className="whitespace-pre-wrap break-words font-sans text-[13px]">{m.content}</pre>
            </li>
          ))}
        </ul>
        {loading && (
          <p className="mt-4 flex items-center gap-2 font-mono text-sm font-medium text-slark-primary">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slark-primary border-t-transparent" />
            {t('aiChat.thinking')}
          </p>
        )}
        {showLandingShortcuts && (
          <div className="mt-auto space-y-2 pt-4">
            {landingShortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                onClick={() => handleShortcut(item.question)}
                className="flex w-full items-center justify-between gap-3 rounded-none border border-slark-border bg-slark-card px-3 py-3 text-left transition hover:border-slark-primary/40 hover:bg-slark-primary/5 disabled:opacity-50"
              >
                <span className="text-sm leading-snug text-slark-text">{item.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0 text-slark-primary" strokeWidth={2} aria-hidden />
              </button>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className={`shrink-0 border-t border-slark-border bg-slark-bg ${isLanding ? 'px-3 py-3' : 'space-y-2 px-4 py-4 sm:px-5'}`}
      >
        {isLanding ? (
          <div className="flex items-center gap-2">
            <input
              id="threat-ai-question"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              aria-label={t('home.landingAiChat.fab')}
              className="h-10 min-w-0 flex-1 rounded-xl border border-slark-border bg-slark-bg px-3 text-sm text-slark-text placeholder:text-slark-muted focus:border-slark-primary focus:outline-none focus:ring-2 focus:ring-slark-primary/20"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              aria-label={t('aiChat.send')}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slark-primary text-white transition hover:bg-slark-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : (
          <>
            <div>
              <label htmlFor="threat-ai-question" className="block text-sm font-semibold text-slark-text">
                {questionTitle}
              </label>
              <p id="threat-ai-hint" className="mt-0.5 text-xs text-slark-muted">
                {questionHint}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <textarea
                id="threat-ai-question"
                aria-describedby="threat-ai-hint"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                rows={3}
                placeholder={placeholder}
                className="min-h-[5.5rem] w-full resize-y rounded-xl border-2 border-slark-border bg-slark-bg px-4 py-3 font-sans text-sm text-slark-text shadow-inner placeholder:text-slark-muted focus:border-slark-primary focus:outline-none focus:ring-2 focus:ring-slark-primary/25"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="shrink-0 rounded-xl bg-slark-primary px-6 py-3 font-cyber text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:bg-slark-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
              >
                {t('aiChat.send')}
              </button>
            </div>
          </>
        )}
      </form>
    </section>
  );
});

ThreatAIChatPanel.displayName = 'ThreatAIChatPanel';
