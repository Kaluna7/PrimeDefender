const STORAGE_KEY = 'slark_threat_ai_sessions';
const ACTIVE_KEY = 'slark_threat_ai_active';

/** @typedef {{ id: string; createdAt: number; updatedAt: number; messages: { id: string; role: string; content: string }[] }} ThreatAiChatSession */

export function chatSessionId() {
  return `chat-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** @returns {ThreatAiChatSession[]} */
export function loadChatSessions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** @param {ThreatAiChatSession[]} sessions */
export function saveChatSessions(sessions) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    /* quota / private mode */
  }
}

export function getActiveChatSessionId() {
  try {
    return sessionStorage.getItem(ACTIVE_KEY) || '';
  } catch {
    return '';
  }
}

/** @param {string | null} id */
export function setActiveChatSessionId(id) {
  try {
    if (id) sessionStorage.setItem(ACTIVE_KEY, id);
    else sessionStorage.removeItem(ACTIVE_KEY);
  } catch {
    /* ignore */
  }
}

/** @param {'today' | 'yesterday' | 'month'} period @param {number} [now] */
export function getPeriodBounds(period, now = Date.now()) {
  const d = new Date(now);
  const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayStart = startOfDay(d);
  const yesterdayStart = todayStart - 86400000;
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1).getTime();

  if (period === 'today') return { from: todayStart, to: Number.POSITIVE_INFINITY };
  if (period === 'yesterday') return { from: yesterdayStart, to: todayStart };
  return { from: monthStart, to: Number.POSITIVE_INFINITY };
}

/** @param {ThreatAiChatSession[]} sessions @param {'today' | 'yesterday' | 'month'} period */
export function filterSessionsByPeriod(sessions, period) {
  const { from, to } = getPeriodBounds(period);
  return sessions
    .filter((s) => s.updatedAt >= from && s.updatedAt < to)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

/** @param {ThreatAiChatSession} session */
export function sessionPreview(session) {
  const firstUser = session.messages?.find((m) => m.role === 'user' && m.content?.trim());
  if (firstUser) {
    const text = firstUser.content.trim().replace(/\s+/g, ' ');
    return text.length > 72 ? `${text.slice(0, 72)}…` : text;
  }
  return '';
}

/** @param {ThreatAiChatSession[]} sessions @param {string} id @param {{ id: string; role: string; content: string }[]} messages */
export function upsertChatSession(sessions, id, messages) {
  const now = Date.now();
  const idx = sessions.findIndex((s) => s.id === id);
  if (idx === -1) {
    return [{ id, createdAt: now, updatedAt: now, messages }, ...sessions];
  }
  const next = [...sessions];
  next[idx] = { ...next[idx], messages, updatedAt: now };
  next.sort((a, b) => b.updatedAt - a.updatedAt);
  return next;
}

/** @param {ThreatAiChatSession[]} sessions @param {string} id */
export function removeChatSession(sessions, id) {
  return sessions.filter((s) => s.id !== id);
}
