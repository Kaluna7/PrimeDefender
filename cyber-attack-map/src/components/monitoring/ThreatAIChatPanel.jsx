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
      className={`overflow-hidden rounded-b-2xl border-x border-b border-slate-200/90 bg-gradient-to-b from-white via-slate-50/95 to-slate-100/90 shadow-[0_8px_32px_-12px_rgba(15,23,42,0.15)] dark:border-cyan-900/40 dark:from-slate-950 dark:via-slate-950 dark:to-[#0a0f18] dark:shadow-[0_-4px_48px_rgba(0,0,0,0.45)] ${className}`}
      aria-label={t('aiChat.title')}
    >
      {/* Accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-cyan-500 via-violet-500 to-emerald-500 opacity-90 dark:opacity-100" />

      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200/80 px-4 py-3 sm:px-5 dark:border-slate-700/80">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-40 dark:bg-emerald-300" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            </span>
            <h2 className="font-cyber text-sm font-bold uppercase tracking-[0.2em] text-slate-900 dark:text-cyan-100">
              {t('aiChat.title')}
            </h2>
          </div>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600 dark:text-cyan-200/85">
            {t('aiChat.subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-cyan-200 dark:hover:bg-slate-800"
        >
          {t('aiChat.clear')}
        </button>
      </div>

      {!configured && (
        <p className="border-b border-amber-300/80 bg-amber-50 px-4 py-2.5 text-xs leading-relaxed text-amber-950 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-100">
          {t('aiChat.missingKeyHint')}
        </p>
      )}

      {error && (
        <p className="border-b border-rose-300/80 bg-rose-50 px-4 py-2.5 font-mono text-xs text-rose-900 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-100">
          {error}
        </p>
      )}

      <div className="thin-scrollbar max-h-[min(52vh,28rem)] min-h-[11rem] overflow-y-auto px-4 py-4 sm:px-5">
        {messages.length === 0 && !loading && (
          <div className="rounded-xl border-2 border-dashed border-slate-300/90 bg-slate-50/80 px-4 py-8 text-center dark:border-cyan-800/50 dark:bg-slate-900/40">
            <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-cyan-100">
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
                  ? 'border-cyan-300/80 bg-gradient-to-br from-cyan-50 to-white text-slate-900 dark:border-cyan-600/50 dark:from-cyan-950/60 dark:to-slate-950 dark:text-cyan-50'
                  : 'border-violet-200/90 bg-gradient-to-br from-violet-50 to-white text-slate-900 dark:border-violet-800/40 dark:from-violet-950/50 dark:to-slate-950 dark:text-slate-100'
              }`}
            >
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-cyan-300/90">
                {m.role === 'user' ? t('aiChat.roleUser') : t('aiChat.roleAssistant')}
              </span>
              <pre className="whitespace-pre-wrap break-words font-sans text-[13px]">{m.content}</pre>
            </li>
          ))}
        </ul>
        {loading && (
          <p className="mt-4 flex items-center gap-2 font-mono text-sm font-medium text-cyan-700 dark:text-cyan-300">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent dark:border-cyan-400" />
            {t('aiChat.thinking')}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="space-y-2 border-t border-slate-200/90 bg-white/95 px-4 py-4 dark:border-slate-700/80 dark:bg-slate-950/95 sm:px-5"
      >
        <div>
          <label htmlFor="threat-ai-question" className="block text-sm font-semibold text-slate-900 dark:text-cyan-100">
            {t('aiChat.questionTitle')}
          </label>
          <p id="threat-ai-hint" className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
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
            className="min-h-[5.5rem] w-full resize-y rounded-xl border-2 border-slate-300 bg-white px-4 py-3 font-sans text-sm text-slate-900 shadow-inner placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/25 dark:border-slate-600 dark:bg-slate-900 dark:text-cyan-50 dark:placeholder:text-cyan-300/90 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="shrink-0 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-3 font-cyber text-sm font-bold uppercase tracking-wider text-white shadow-md transition hover:from-emerald-500 hover:to-teal-500 disabled:cursor-not-allowed disabled:opacity-40 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-400 dark:hover:to-teal-400"
          >
            {t('aiChat.send')}
          </button>
        </div>
      </form>
    </section>
  );
});

ThreatAIChatPanel.displayName = 'ThreatAIChatPanel';
