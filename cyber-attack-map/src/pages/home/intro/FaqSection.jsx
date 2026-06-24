import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { SLARK as C } from '../../../theme/slarkColors.js';

function ChevronIcon({ open }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {{ id: string, question: string, answer: string }[]} props.items
 * @param {string} props.docsFootnote
 * @param {string} props.docsLink
 */
export function FaqSection({ eyebrow, title, subtitle, items, docsFootnote, docsLink }) {
  const baseId = useId();
  const [openId, setOpenId] = useState(items[0]?.id ?? null);

  return (
    <section
      id="faq"
      className="relative border-t px-4 py-20 sm:px-6 sm:py-24"
      style={{ borderColor: C.border, backgroundColor: C.bg }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute -right-20 top-10 h-72 w-72 rounded-full blur-[100px]"
          style={{ backgroundColor: 'rgba(198,40,40,0.05)' }}
        />
        <div
          className="absolute -left-16 bottom-0 h-64 w-64 rounded-full blur-[90px]"
          style={{ backgroundColor: 'rgba(31,41,55,0.04)' }}
        />
      </div>

      <div className="relative mx-auto max-w-3xl">
        <div className="text-center">
          <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
            {eyebrow}
          </p>
          <h2 className="font-cyber mt-3 text-2xl font-bold sm:text-3xl" style={{ color: C.text }}>
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: C.textMuted }}>
            {subtitle}
          </p>
        </div>

        <div className="mt-12 space-y-3">
          {items.map((item) => {
            const open = openId === item.id;
            const panelId = `${baseId}-${item.id}-panel`;
            const btnId = `${baseId}-${item.id}-btn`;

            return (
              <article
                key={item.id}
                className="overflow-hidden rounded-2xl border transition-shadow duration-300"
                style={{
                  borderColor: open ? 'rgba(198,40,40,0.35)' : C.border,
                  backgroundColor: open ? C.bg : C.card,
                  boxShadow: open ? '0 8px 32px rgba(198,40,40,0.08)' : 'none',
                }}
              >
                <h3>
                  <button
                    id={btnId}
                    type="button"
                    className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left sm:px-6 sm:py-5"
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => setOpenId(open ? null : item.id)}
                  >
                    <span
                      className="font-cyber text-sm font-semibold leading-snug sm:text-[0.95rem]"
                      style={{ color: open ? C.primary : C.text }}
                    >
                      {item.question}
                    </span>
                    <span style={{ color: open ? C.primary : C.textMuted }}>
                      <ChevronIcon open={open} />
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={btnId}
                  className="grid transition-[grid-template-rows] duration-300 ease-out"
                  style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                >
                  <div className="overflow-hidden">
                    <p
                      className="border-t px-5 pb-5 pt-3 text-sm leading-relaxed sm:px-6 sm:pb-6 sm:pt-4"
                      style={{ borderColor: C.border, color: C.textMuted }}
                    >
                      {item.answer}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <p className="mt-10 text-center text-sm" style={{ color: C.textMuted }}>
          {docsFootnote}{' '}
          <Link
            to="/docs"
            className="font-semibold underline-offset-4 transition hover:underline"
            style={{ color: C.primary }}
          >
            {docsLink}
          </Link>
        </p>
      </div>
    </section>
  );
}
