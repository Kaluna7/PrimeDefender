import { Link } from 'react-router-dom';
import { SLARK as C } from '../../../theme/slarkColors.js';

function FlowIcon({ type }) {
  if (type === 'deploy') {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h6v6H4zM14 7h6v6h-6zM9 17h6v4H9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === 'shield') {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'ingest') {
    return (
      <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M7 8l5-5 5 5M12 3v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 21h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {{ type: string, title: string, body: string, link?: { href: string, label: string } }[]} props.steps
 */
export function FlowSection({ eyebrow, title, subtitle, steps }) {
  return (
    <section
      id="flow"
      className="relative overflow-hidden border-t px-4 py-20 sm:px-6 sm:py-24"
      style={{ borderColor: C.border, backgroundColor: C.bg }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div
          className="absolute -left-24 top-0 h-80 w-80 rounded-full blur-[110px]"
          style={{ backgroundColor: 'rgba(198,40,40,0.05)' }}
        />
        <div
          className="absolute -right-16 bottom-0 h-72 w-72 rounded-full blur-[100px]"
          style={{ backgroundColor: 'rgba(31,41,55,0.04)' }}
        />
      </div>

      <div className="relative mx-auto max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
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

        <ol className="relative mt-14 space-y-0">
          <span
            className="pointer-events-none absolute left-[1.65rem] top-8 hidden h-[calc(100%-4rem)] w-px sm:block"
            style={{ background: `linear-gradient(180deg, ${C.primary}55 0%, ${C.border} 100%)` }}
            aria-hidden
          />

          {steps.map((step, index) => (
            <li key={step.title} className="relative flex gap-5 sm:gap-7">
              <div className="relative z-10 flex shrink-0 flex-col items-center pt-1">
                <span
                  className="font-cyber flex h-12 w-12 items-center justify-center rounded-2xl border text-sm font-bold shadow-sm"
                  style={{
                    borderColor: `${C.primary}35`,
                    backgroundColor: '#FFFFFF',
                    color: C.primary,
                    boxShadow: '0 4px 16px rgba(17,24,39,0.06)',
                  }}
                >
                  {index + 1}
                </span>
              </div>

              <article
                className="mb-6 flex-1 rounded-2xl border p-5 shadow-sm transition hover:shadow-md sm:mb-8 sm:p-6"
                style={{
                  borderColor: C.border,
                  backgroundColor: C.card,
                  boxShadow: '0 4px 20px rgba(17,24,39,0.04)',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="hidden shrink-0 rounded-xl border p-3 sm:inline-flex"
                    style={{
                      borderColor: `${C.primary}22`,
                      backgroundColor: `${C.primary}0a`,
                      color: C.primary,
                    }}
                  >
                    <FlowIcon type={step.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-cyber text-base font-bold sm:text-lg" style={{ color: C.text }}>
                      {step.title}
                    </h3>
                    <p className="mt-2.5 text-sm leading-relaxed sm:text-[0.95rem]" style={{ color: C.textMuted }}>
                      {step.body}
                      {step.link && (
                        <>
                          {' '}
                          <Link
                            to={step.link.href}
                            className="font-semibold underline decoration-slark-primary/40 underline-offset-2 transition hover:decoration-slark-primary"
                            style={{ color: C.primary }}
                          >
                            {step.link.label}
                          </Link>
                          .
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
