import { useEffect } from 'react';
import { acquireModalBodyLock } from '../utils/modalBodyLock.js';

/**
 * @param {boolean} active
 */
export function useModalBodyLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    return acquireModalBodyLock();
  }, [active]);
}
