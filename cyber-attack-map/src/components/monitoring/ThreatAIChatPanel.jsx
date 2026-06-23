import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { buildThreatAiPrompt } from '../../utils/threatAiPrompt.js';
import { createThreatChatSession, isGeminiConfigured } from '../../services/geminiChat.js';

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const ThreatAIChatPanel = forwardRef(function ThreatAIChatPanel({ className = '' }, ref) {
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
        sessionRef.current = createThreatChatSession();
      } catch {
        return null;
      }
    }
    return sessionRef.current;
  }, []);

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
    void runSend(text);
  }

  function onClear() {
    sessionRef.current = null;
    setMessages([]);
    setError('');
    setInput('');
  }

  const configured = isGeminiConfigured();

  return (
    <section
      className={`overflow-hidden rounded-b-2xl border-x border-b border-slark-border bg-slark-bg shadow-slark ${className}`}
      aria-label={t('aiChat.title')}
    >
      {/* Accent bar */}
      <div className="h-1 w-full bg-slark-primary" />

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slark-border px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slark-primary opacity-40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-slark-primary" />
            </span>
            <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slark-text">
              {t('aiChat.title')}
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slark-muted">
            {t('aiChat.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg border border-slark-border bg-slark-card px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slark-text shadow-sm transition hover:bg-slark-bg"
        >
          {t('aiChat.clear')}
        </button>
      </div>

      {!configured && (
        <p className="border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-950">
          {t('aiChat.missingKeyHint')}
        </p>
      )}

      {error && (
        <p className="border-b border-rose-300/80 bg-rose-50 px-4 py-2.5 font-mono text-xs text-rose-900">
          {error}
        </p>
      )}

      <div className="thin-scrollbar max-h-[min(52vh,28rem)] min-h-[11rem] overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 && !loading && (
          <div className="rounded-xl border-2 border-dashed border-slark-border bg-slark-card px-4 py-8 text-center">
            <p className="text-sm font-medium leading-relaxed text-slark-text">
              {t('aiChat.empty')}
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
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-2 border-t border-slark-border bg-slark-bg px-4 py-4 sm:px-5"
      >
        <div>
          <label htmlFor="threat-ai-question" className="block text-sm font-semibold text-slark-text">
            {t('aiChat.questionTitle')}
          </label>
          <p id="threat-ai-hint" className="mt-0.5 text-xs text-slark-muted">
            {t('aiChat.questionHint')}
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            id="threat-ai-question"
            aria-describedby="threat-ai-hint"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={3}
            placeholder={t('aiChat.placeholder')}
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
      </form>
    </section>
  );
});

ThreatAIChatPanel.displayName = 'ThreatAIChatPanel';
