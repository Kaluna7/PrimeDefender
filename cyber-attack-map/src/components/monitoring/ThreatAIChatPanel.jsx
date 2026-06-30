import { ArrowRight, BookOpen, History, Plus, Send, Trash2, X } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n/I18nContext.jsx';
import { fetchAuthStatus } from '../../services/auth.js';
import { fetchAiConfigured, sendAiChat } from '../../services/aiBridge.js';
import {
  chatSessionId,
  filterSessionsByPeriod,
  getActiveChatSessionId,
  loadChatSessions,
  removeChatSession,
  saveChatSessions,
  sessionPreview,
  setActiveChatSessionId,
  upsertChatSession,
} from '../../services/threatAiChatSessions.js';
import { buildThreatAiPrompt, buildThreatAiUserMessage } from '../../utils/threatAiPrompt.js';
import { shouldShowIntegrationGuideCta } from '../../utils/landingIntegrationGuideCta.js';
import { AiMessageMarkdown } from '../ui/AiMessageMarkdown.jsx';

const HISTORY_PERIODS = ['today', 'yesterday', 'month'];

function chatErrorMessage(err, t) {
  if (!(err instanceof Error)) return String(err);
  switch (err.message) {
    case 'AI_NOT_AUTHENTICATED':
      return t('aiChat.signInRequired');
    case 'AI_NOT_CONFIGURED':
      return t('aiChat.missingKey');
    case 'AI_RATE_LIMITED':
      return t('aiChat.rateLimited');
    case 'AI_INVALID_KEY':
      return t('aiChat.invalidKey');
    case 'AI_MODEL_NOT_FOUND':
      return t('aiChat.modelNotFound');
    case 'messages_required':
    case 'last_message_must_be_user':
    case 'ai_chat_failed':
      return t('aiChat.chatFailed');
    default:
      return err.message;
  }
}

function msgId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

export const ThreatAIChatPanel = forwardRef(function ThreatAIChatPanel(
  {
    className = '',
    variant = 'threat',
    theme = 'light',
    pendingExplainAttack = null,
    onPendingExplainHandled,
    historyOpen: historyOpenProp,
    onHistoryOpenChange,
    onIntegrationGuideClick,
  },
  ref,
) {
  const { t, locale } = useI18n();
  const isLanding = variant === 'landing';
  const isDark = theme === 'dark' && !isLanding;
  const title = isLanding ? t('home.landingAiChat.header') : t('aiChat.title');
  const emptyText = isLanding ? '' : t('aiChat.empty');
  const placeholder = isLanding ? t('home.landingAiChat.placeholder') : t('aiChat.placeholder');

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
    [isLanding, t],
  );

  const [sessions, setSessions] = useState(() => loadChatSessions());
  const [activeSessionId, setActiveSessionId] = useState(() => getActiveChatSessionId());
  const [historyOpenInternal, setHistoryOpenInternal] = useState(false);
  const historyControlled = typeof onHistoryOpenChange === 'function';
  const historyOpen = historyControlled ? Boolean(historyOpenProp) : historyOpenInternal;
  const setHistoryOpen = useCallback(
    (next) => {
      const value = typeof next === 'function' ? next(historyOpen) : next;
      if (historyControlled) onHistoryOpenChange(value);
      else setHistoryOpenInternal(value);
    },
    [historyControlled, historyOpen, onHistoryOpenChange],
  );
  const [historyPeriod, setHistoryPeriod] = useState('today');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiReady, setAiReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(!isLanding);
  const [shortcutsVisible, setShortcutsVisible] = useState(true);
  const activeSessionIdRef = useRef(activeSessionId);
  const sendingRef = useRef(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(/** @type {HTMLTextAreaElement | null} */ (null));

  activeSessionIdRef.current = activeSessionId;

  const periodLabel = useMemo(
    () => ({
      today: t('aiChat.periodToday'),
      yesterday: t('aiChat.periodYesterday'),
      month: t('aiChat.periodMonth'),
    }),
    [t],
  );

  const filteredSessions = useMemo(
    () => filterSessionsByPeriod(sessions, historyPeriod),
    [sessions, historyPeriod],
  );

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === 'id' ? 'id-ID' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    [locale],
  );

  useEffect(() => {
    void fetchAiConfigured().then(setAiReady);
  }, []);

  const refreshAuth = useCallback(async () => {
    if (isLanding) {
      setSignedIn(true);
      setAuthLoading(false);
      return;
    }
    setAuthLoading(true);
    const status = await fetchAuthStatus();
    setSignedIn(Boolean(status.ok && status.user));
    setAuthLoading(false);
  }, [isLanding]);

  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  useEffect(() => {
    if (isLanding) return undefined;
    const onAuth = () => void refreshAuth();
    window.addEventListener('slark-auth-change', onAuth);
    return () => window.removeEventListener('slark-auth-change', onAuth);
  }, [isLanding, refreshAuth]);

  useEffect(() => {
    if (isLanding) return;
    const storedId = getActiveChatSessionId();
    if (!storedId) return;
    const found = loadChatSessions().find((s) => s.id === storedId);
    if (found?.messages?.length) {
      setMessages(found.messages);
      setActiveSessionId(storedId);
    }
  }, [isLanding]);

  useEffect(() => {
    if (!historyOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setHistoryOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [historyOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const resizeInput = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  useEffect(() => {
    resizeInput();
  }, [input, resizeInput]);

  const persistMessages = useCallback((sessionId, msgs) => {
    if (isLanding) return;
    setSessions((prev) => {
      const next = upsertChatSession(prev, sessionId, msgs);
      saveChatSessions(next);
      return next;
    });
  }, [isLanding]);

  const ensureActiveSession = useCallback(() => {
    if (activeSessionIdRef.current) return activeSessionIdRef.current;
    const id = chatSessionId();
    activeSessionIdRef.current = id;
    setActiveSessionId(id);
    setActiveChatSessionId(id);
    return id;
  }, []);

  const runSend = useCallback(
    async (userText, options = {}) => {
      const trimmed = userText.trim();
      const apiText = (options.apiContent ?? userText).trim();
      if (!trimmed || sendingRef.current) return;

      if (!isLanding && !signedIn) {
        setError(t('aiChat.signInRequired'));
        return;
      }

      if (!aiReady) {
        setError(t('aiChat.missingKey'));
        return;
      }

      sendingRef.current = true;
      setError('');
      setLoading(true);

      const userMsg = { id: msgId(), role: 'user', content: trimmed };
      const priorMessages = options.freshSession ? [] : messages;
      const priorForApi = priorMessages.map(({ role, content }) => ({ role, content }));
      const historyForApi = [...priorForApi, { role: 'user', content: apiText }];
      setMessages([...priorMessages, userMsg]);

      const sessionId = options.freshSession ? chatSessionId() : ensureActiveSession();
      if (options.freshSession) {
        activeSessionIdRef.current = sessionId;
        setActiveSessionId(sessionId);
        setActiveChatSessionId(sessionId);
      }

      try {
        const reply = await sendAiChat({
          variant: isLanding ? 'landing' : 'threat',
          messages: historyForApi,
          locale,
        });
        const showGuideCta =
          isLanding &&
          shouldShowIntegrationGuideCta(trimmed, reply, {
            force: Boolean(options.showIntegrationGuideCta),
          });
        setMessages((m) => {
          const next = [
            ...m,
            {
              id: msgId(),
              role: 'assistant',
              content: reply,
              ...(showGuideCta ? { cta: 'integration-guide' } : {}),
            },
          ];
          persistMessages(
            sessionId,
            next.map(({ id, role, content }) => ({ id, role, content })),
          );
          return next;
        });
      } catch (e) {
        setError(chatErrorMessage(e, t));
        persistMessages(sessionId, [...priorMessages, userMsg].map(({ id, role, content }) => ({ id, role, content })));
      } finally {
        setLoading(false);
        sendingRef.current = false;
      }
    },
    [aiReady, ensureActiveSession, isLanding, locale, messages, persistMessages, signedIn, t],
  );

  const runIncidentExplain = useCallback(
    (attack) => {
      if (!attack) return;
      const display = buildThreatAiUserMessage(attack, t);
      const apiContent = buildThreatAiPrompt(attack, locale);
      void runSend(display, { apiContent, freshSession: true });
    },
    [locale, runSend, t],
  );

  useEffect(() => {
    if (!pendingExplainAttack || isLanding || authLoading) return;
    if (!signedIn) {
      onPendingExplainHandled?.();
      setError(t('aiChat.signInRequired'));
      return;
    }
    if (!aiReady) return;

    const attack = pendingExplainAttack;
    onPendingExplainHandled?.();
    setInput('');
    setError('');
    runIncidentExplain(attack);
  }, [
    aiReady,
    authLoading,
    isLanding,
    onPendingExplainHandled,
    pendingExplainAttack,
    runIncidentExplain,
    signedIn,
    t,
  ]);

  useImperativeHandle(
    ref,
    () => ({
      explainAttack(attack) {
        if (!attack) return;
        runIncidentExplain(attack);
      },
      openHistory() {
        setHistoryOpen(true);
      },
      closeHistory() {
        setHistoryOpen(false);
      },
    }),
    [runIncidentExplain],
  );

  function onSubmit(e) {
    e.preventDefault();
    const text = input;
    setInput('');
    if (isLanding) setShortcutsVisible(false);
    void runSend(text);
  }

  function onComposerKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  function selectSession(session) {
    setActiveSessionId(session.id);
    activeSessionIdRef.current = session.id;
    setActiveChatSessionId(session.id);
    setMessages(session.messages || []);
    setError('');
    setHistoryOpen(false);
  }

  function deleteSession(sessionId) {
    const next = removeChatSession(sessions, sessionId);
    setSessions(next);
    saveChatSessions(next);
    if (activeSessionId === sessionId) {
      setActiveSessionId('');
      activeSessionIdRef.current = '';
      setActiveChatSessionId(null);
      setMessages([]);
      setError('');
    }
  }

  function startNewChat() {
    setActiveSessionId('');
    activeSessionIdRef.current = '';
    setActiveChatSessionId(null);
    setMessages([]);
    setInput('');
    setError('');
    setHistoryOpen(false);
  }

  const chatLocked = !isLanding && (authLoading || !signedIn);

  const showLandingShortcuts = isLanding && shortcutsVisible && messages.length === 0;

  const handleShortcut = (question, shortcutId) => {
    setShortcutsVisible(false);
    void runSend(question, {
      showIntegrationGuideCta: shortcutId === 'connect',
    });
  };

  return (
    <section
      className={`relative flex h-full min-h-0 flex-col overflow-hidden ${
        isLanding
          ? 'flex-1 rounded-none border-0 bg-slark-bg shadow-none'
          : isDark
            ? `bg-slark-dark text-slate-200 max-lg:rounded-none max-lg:border-0 ${className}`
            : `rounded-b-2xl border-x border-b border-slark-border bg-slark-bg shadow-slark ${className}`
      }`}
      aria-label={title}
    >
      {!isLanding && (
        <div
          className={`hidden shrink-0 items-center border-b px-3 py-2 lg:flex lg:justify-between lg:px-5 lg:py-3 ${isDark ? 'border-slate-600/50' : 'border-slark-border'}`}
        >
          <h2
            className={`min-w-0 font-cyber text-sm font-bold uppercase tracking-[0.2em] ${isDark ? 'text-slate-100' : 'text-slark-text'}`}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
              isDark
                ? 'border-slate-600/50 bg-white/[0.04] text-slate-300 hover:border-slark-primary/40 hover:text-slark-primary'
                : 'border-slark-border bg-slark-card text-slark-muted hover:border-slark-primary/30 hover:text-slark-primary'
            }`}
            aria-label={t('aiChat.historyButton')}
            aria-expanded={historyOpen}
          >
            <History className="h-4 w-4" strokeWidth={2} aria-hidden />
          </button>
        </div>
      )}

      {historyOpen && !isLanding && (
        <>
          <button
            type="button"
            className="ai-chat-history-backdrop absolute inset-0 z-20 bg-[#020617]/75 max-lg:bg-[#020617]/90"
            aria-label={t('aiChat.historyClose')}
            onClick={() => setHistoryOpen(false)}
          />
          <aside
            className={`ai-chat-history-drawer absolute z-30 flex flex-col border-l shadow-2xl ring-1 ring-black/30 max-lg:inset-0 max-lg:w-full max-lg:border-0 max-lg:ring-0 lg:inset-y-0 lg:right-0 lg:w-[min(100%,18rem)] ${
              isDark ? 'border-slate-600/60 bg-[#0f172a]' : 'border-slark-border bg-white'
            }`}
            aria-label={t('aiChat.historyTitle')}
          >
            <div className={`shrink-0 border-b px-3 py-3 ${isDark ? 'border-slate-600/60 bg-[#0f172a]' : 'border-slark-border bg-white'}`}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p
                  className={`font-cyber text-[10px] font-bold uppercase tracking-[0.28em] ${isDark ? 'text-slate-100' : 'text-slark-text'}`}
                >
                  {t('aiChat.historyTitle')}
                </p>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition ${
                    isDark
                      ? 'border-slate-600/50 text-slate-400 hover:border-slate-500/60 hover:text-slate-100'
                      : 'border-slark-border text-slark-muted hover:text-slark-text'
                  }`}
                  aria-label={t('aiChat.historyClose')}
                >
                  <X className="h-4 w-4" strokeWidth={2} aria-hidden />
                </button>
              </div>
              <button
                type="button"
                onClick={startNewChat}
                className={`mb-3 flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-semibold uppercase tracking-wide transition ${
                  isDark
                    ? 'border-slark-primary/40 bg-slark-primary/10 text-slark-primary hover:border-slark-primary/60 hover:bg-slark-primary/15'
                    : 'border-slark-primary/30 bg-slark-primary/5 text-slark-primary hover:border-slark-primary/45 hover:bg-slark-primary/10'
                }`}
              >
                <Plus className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                {t('aiChat.newChat')}
              </button>
              <div className="thin-scrollbar-dark flex gap-1 overflow-x-auto pb-0.5">
                {HISTORY_PERIODS.map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setHistoryPeriod(period)}
                    className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide transition ${
                      historyPeriod === period
                        ? 'border-slark-primary/50 bg-slark-primary/15 text-slark-primary'
                        : isDark
                          ? 'border-slate-600/50 text-slate-400 hover:border-slate-500/60 hover:text-slate-200'
                          : 'border-slark-border text-slark-muted hover:text-slark-text'
                    }`}
                  >
                    {periodLabel[period]}
                  </button>
                ))}
              </div>
            </div>

            <ul
              className={`thin-scrollbar-dark min-h-0 flex-1 overflow-y-auto px-2 py-2 ${isDark ? 'bg-[#0f172a]' : 'bg-white thin-scrollbar'}`}
            >
              {filteredSessions.length === 0 ? (
                <li className={`px-2 py-8 text-center text-[11px] ${isDark ? 'text-slate-500' : 'text-slark-muted'}`}>
                  {t('aiChat.historyEmpty')}
                </li>
              ) : (
                filteredSessions.map((session) => {
                  const preview = sessionPreview(session) || t('aiChat.historyTitle');
                  const isActive = session.id === activeSessionId;
                  return (
                    <li key={session.id} className="mb-1">
                      <div
                        className={`flex items-stretch gap-0.5 overflow-hidden rounded-lg border transition ${
                          isActive
                            ? 'border-slark-primary/45 bg-slark-primary/10'
                            : isDark
                              ? 'border-slate-600/50 bg-[#1a2332] hover:border-slate-500/60'
                              : 'border-slark-border bg-slate-50 hover:border-slark-primary/25'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => selectSession(session)}
                          className="min-w-0 flex-1 px-2.5 py-2 text-left"
                        >
                          <p
                            className={`line-clamp-2 text-[11px] leading-snug ${isDark ? 'text-slate-200' : 'text-slark-text'}`}
                          >
                            {preview}
                          </p>
                          <p
                            className={`mt-1 font-mono text-[9px] tabular-nums ${isDark ? 'text-slate-500' : 'text-slark-muted'}`}
                          >
                            {timeFormatter.format(session.updatedAt)}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSession(session.id)}
                          className={`inline-flex w-9 shrink-0 items-center justify-center border-l transition ${
                            isDark
                              ? 'border-slate-600/40 text-slate-500 hover:bg-rose-500/10 hover:text-rose-300'
                              : 'border-slark-border text-slark-muted hover:bg-rose-50 hover:text-rose-600'
                          }`}
                          aria-label={t('aiChat.deleteChat')}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </aside>
        </>
      )}

      {error && (
        <p
          className={`shrink-0 border-b px-4 py-2.5 font-mono text-xs ${
            isDark ? 'border-rose-500/30 bg-rose-950/40 text-rose-200' : 'border-rose-300/80 bg-rose-50 text-rose-900'
          }`}
        >
          {error}
        </p>
      )}

      {!isLanding && !authLoading && !signedIn && (
        <div
          className={`shrink-0 border-b px-4 py-3 text-sm ${
            isDark ? 'border-amber-500/30 bg-amber-950/30 text-amber-100' : 'border-amber-200 bg-amber-50 text-amber-950'
          }`}
        >
          {t('aiChat.signInRequired')}{' '}
          <Link
            to="/?getstarted=1&return=%2Fmonitoring"
            className="font-semibold text-slark-primary underline underline-offset-2 hover:text-slark-primary-hover"
          >
            {t('aiChat.signInLink')}
          </Link>
        </div>
      )}

      <div
        className={`${isDark ? 'thin-scrollbar-dark' : 'thin-scrollbar'} min-h-0 flex-1 overflow-y-auto overscroll-contain ${
          isLanding ? 'flex shrink-0 flex-col px-3 py-4' : 'flex flex-col px-3 py-3 sm:px-4'
        }`}
      >
        {isLanding && messages.length === 0 && !loading && (
          <p className="text-sm leading-relaxed text-slark-muted">{t('home.landingAiChat.welcome')}</p>
        )}
        {messages.length === 0 && !loading && emptyText && (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-5 text-center sm:py-6">
            <p
              className={`font-cyber text-2xl font-bold uppercase tracking-[0.42em] ${
                isDark ? 'text-slate-500/90' : 'text-slark-muted/80'
              }`}
            >
              {t('aiChat.emptyBrand')}
            </p>
            <p
              className={`mt-3 max-w-xs text-[11px] leading-relaxed sm:max-w-sm sm:text-xs ${
                isDark ? 'text-slate-500' : 'text-slark-muted/75'
              }`}
            >
              {emptyText}
            </p>
          </div>
        )}
        {messages.length > 0 && (
          <ul className="flex flex-col gap-2.5">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <li key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[min(100%,88%)] sm:max-w-[min(100%,78%)] ${
                      isUser
                        ? isDark
                          ? 'rounded-2xl rounded-br-md bg-slark-primary px-3.5 py-2.5 text-white shadow-md shadow-slark-primary/20'
                          : 'rounded-2xl rounded-br-md bg-slark-primary px-3.5 py-2.5 text-white shadow-md shadow-slark-primary/15'
                        : isDark
                          ? 'rounded-2xl rounded-bl-md border border-slate-600/45 bg-[#1a2332] px-3.5 py-2.5 text-slate-100 shadow-sm'
                          : 'rounded-2xl rounded-bl-md border border-slark-border bg-slark-card px-3.5 py-2.5 text-slark-text shadow-sm'
                    }`}
                  >
                    {!isUser && (
                      <span
                        className={`mb-1 block text-[9px] font-bold uppercase tracking-wider ${isDark ? 'text-slark-primary' : 'text-slark-primary'}`}
                      >
                        {isLanding ? t('home.landingAiChat.roleSupport') : t('aiChat.roleAssistant')}
                      </span>
                    )}
                    {isUser ? (
                      <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed">{m.content}</pre>
                    ) : (
                      <div className="font-sans text-[13px] text-inherit">
                        <AiMessageMarkdown content={m.content} />
                        {isLanding && m.cta === 'integration-guide' ? (
                          <Link
                            to="/docs"
                            onClick={() => onIntegrationGuideClick?.()}
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slark-primary/35 bg-slark-primary/8 px-3 py-2 text-[12px] font-semibold text-slark-primary transition hover:border-slark-primary hover:bg-slark-primary hover:text-white"
                          >
                            <BookOpen className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
                            {t('home.landingAiChat.integrationGuideCta')}
                          </Link>
                        ) : null}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {loading && (
          <div className="mt-2 flex justify-start">
            <div
              className={`inline-flex items-center gap-2 rounded-2xl rounded-bl-md px-3.5 py-2.5 ${
                isDark ? 'border border-slate-600/45 bg-[#1a2332]' : 'border border-slark-border bg-slark-card'
              }`}
            >
              <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slark-primary border-t-transparent" />
              <span className={`font-mono text-[11px] ${isDark ? 'text-slate-400' : 'text-slark-muted'}`}>
                {t('aiChat.thinking')}
              </span>
            </div>
          </div>
        )}
        {showLandingShortcuts && (
          <div className="mt-auto space-y-2 pt-4">
            {landingShortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={loading}
                onClick={() => handleShortcut(item.question, item.id)}
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
        className={`shrink-0 border-t ${
          isLanding
            ? 'border-slark-border bg-slark-bg px-3 py-3'
            : isDark
              ? 'border-slate-600/50 bg-[#0f172a]/95 px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4'
              : 'border-slark-border bg-slark-bg px-3 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:px-4'
        }`}
      >
        {isLanding ? (
          <div className="flex items-center gap-2">
            <input
              id="threat-ai-question"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              aria-label={t('home.landingAiChat.placeholder')}
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
          <div
            className={`flex items-end gap-2 rounded-xl border px-2 py-1.5 transition ${
              isDark
                ? 'border-slate-600/45 bg-[#1a2332]/80 focus-within:border-slark-primary/40'
                : 'border-slark-border bg-white focus-within:border-slark-primary/35'
            }`}
          >
            <textarea
              ref={inputRef}
              id="threat-ai-question"
              aria-label={t('aiChat.inputLabel')}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onComposerKeyDown}
              rows={1}
              placeholder={placeholder}
              className={`max-h-[7.5rem] min-h-[2.25rem] w-full flex-1 resize-none border-0 bg-transparent px-2 py-1.5 font-sans text-sm leading-relaxed focus:outline-none focus:ring-0 ${
                isDark
                  ? 'text-slate-100 placeholder:text-slate-500'
                  : 'text-slark-text placeholder:text-slark-muted'
              }`}
              disabled={loading || chatLocked}
            />
            <button
              type="submit"
              disabled={loading || chatLocked || !input.trim()}
              aria-label={t('aiChat.send')}
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slark-primary text-white transition hover:bg-slark-primary-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-4 w-4" strokeWidth={2} aria-hidden />
            </button>
          </div>
        )}
      </form>
    </section>
  );
});

ThreatAIChatPanel.displayName = 'ThreatAIChatPanel';
