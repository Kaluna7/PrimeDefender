let lockCount = 0;
/** @type {(() => void) | null} */
let releaseLock = null;

const LOCK_ATTR = 'data-slark-scroll-lock';

function scrollbarWidth() {
  return Math.max(0, window.innerWidth - document.documentElement.clientWidth);
}

function lockTargets() {
  const targets = [document.documentElement, document.body];
  const appScroll = document.getElementById('app-scroll-root');
  if (appScroll) targets.push(appScroll);
  return targets;
}

/**
 * Prevent background scroll without layout shift when the scrollbar disappears.
 * @returns {() => void}
 */
export function acquireModalBodyLock() {
  if (lockCount === 0) {
    const width = scrollbarWidth();
    const targets = lockTargets();

    targets.forEach((el) => {
      if (el.hasAttribute(LOCK_ATTR)) return;
      el.setAttribute(
        LOCK_ATTR,
        JSON.stringify({
          overflow: el.style.overflow,
          paddingRight: el.style.paddingRight,
        })
      );
      el.style.overflow = 'hidden';
      if (width > 0) {
        el.style.paddingRight = `${width}px`;
      }
    });

    releaseLock = () => {
      targets.forEach((el) => {
        const raw = el.getAttribute(LOCK_ATTR);
        if (!raw) return;
        const prev = JSON.parse(raw);
        el.style.overflow = prev.overflow;
        el.style.paddingRight = prev.paddingRight;
        el.removeAttribute(LOCK_ATTR);
      });
    };
  }

  lockCount += 1;
  return () => {
    lockCount = Math.max(0, lockCount - 1);
    if (lockCount === 0 && releaseLock) {
      releaseLock();
      releaseLock = null;
    }
  };
}
