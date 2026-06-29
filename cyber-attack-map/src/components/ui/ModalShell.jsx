import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { useModalBodyLock } from '../../hooks/useModalBodyLock.js';

/**
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   children: import('react').ReactNode,
 *   titleId?: string,
 *   closeLabel?: string,
 *   zIndexClass?: string,
 *   panelClassName?: string,
 * }} props
 */
export function ModalShell({
  open,
  onClose,
  children,
  titleId,
  closeLabel = 'Close',
  zIndexClass = 'z-[220]',
  panelClassName = 'max-w-lg',
}) {
  useModalBodyLock(open);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-end justify-center sm:items-center`}
      style={{ padding: 'max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left))' }}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        {...(titleId ? { 'aria-labelledby': titleId } : {})}
        className={`relative z-10 flex max-h-[min(92dvh,720px)] w-full flex-col overflow-hidden rounded-t-2xl border border-slark-primary/30 bg-slark-bg shadow-slark-lg dark:border-slark-primary/40 dark:bg-slark-dark sm:max-h-[min(88dvh,680px)] sm:rounded-2xl ${panelClassName}`}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
