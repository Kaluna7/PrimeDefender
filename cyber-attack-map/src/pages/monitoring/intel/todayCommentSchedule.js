const CACHE_KEY = 'slark_intel_today_comment';
export const TODAY_COMMENT_INTERVAL_MS = 2 * 60 * 60 * 1000;

/** @param {number} [now] */
export function getTodayCommentSlot(now = Date.now()) {
  return Math.floor(now / TODAY_COMMENT_INTERVAL_MS);
}

/**
 * @param {string} dateKey
 * @param {number} slot
 * @param {string} fingerprint
 */
export function loadCachedTodayComment(dateKey, slot, fingerprint) {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (
      cached?.dateKey === dateKey &&
      cached?.slot === slot &&
      cached?.fingerprint === fingerprint &&
      typeof cached.comment === 'string'
    ) {
      return cached.comment;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * @param {string} dateKey
 * @param {number} slot
 * @param {string} fingerprint
 * @param {string} comment
 */
export function saveCachedTodayComment(dateKey, slot, fingerprint, comment) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        dateKey,
        slot,
        fingerprint,
        comment,
        updatedAt: Date.now(),
      }),
    );
  } catch {
    /* quota / private mode */
  }
}
