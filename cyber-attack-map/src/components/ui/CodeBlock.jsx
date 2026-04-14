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
      className={`relative rounded-xl border border-slate-200/95 bg-slate-50/95 shadow-sm dark:border-cyan-900/50 dark:bg-slate-950/90 dark:shadow-none ${className}`}
    >
      {title && (
        <div className="border-b border-slate-200/90 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:border-cyan-900/40 dark:text-cyan-600">
          {title}
        </div>
      )}
      <pre className="thin-scrollbar max-h-[min(70vh,28rem)] overflow-auto px-4 pb-4 pt-10 font-mono text-[11px] leading-relaxed text-slate-800 dark:text-cyan-100/95">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded border border-slate-300/90 bg-white/95 px-2 py-1 text-[10px] uppercase tracking-wide text-slate-600 hover:bg-slate-100 dark:border-cyan-800/60 dark:bg-black/60 dark:text-cyan-400 dark:hover:bg-cyan-950/80"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
