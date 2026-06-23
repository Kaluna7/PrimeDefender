import { useState } from 'react';

export function CodeBlock({ title, code, className = '' }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={`relative rounded-xl border border-slark-border bg-slark-card shadow-sm dark:border-slark-border/50 dark:bg-slark-dark/80 dark:shadow-none ${className}`}
    >
      {title && (
        <div className="border-b border-slark-border px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slark-muted dark:border-slark-border/40">
          {title}
        </div>
      )}
      <pre className="thin-scrollbar max-h-[min(70vh,28rem)] overflow-auto px-4 pb-4 pt-10 font-mono text-[11px] leading-relaxed text-slark-text dark:text-white/95">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded border border-slark-border bg-slark-bg px-2 py-1 text-[10px] uppercase tracking-wide text-slark-muted transition hover:bg-slark-card dark:border-slark-border/60 dark:bg-slark-dark dark:text-slark-muted dark:hover:bg-slark-dark/60"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
