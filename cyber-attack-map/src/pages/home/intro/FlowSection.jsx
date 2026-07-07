import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { useI18n } from '../../../i18n/I18nContext.jsx';
import { SLARK as C } from '../../../theme/slarkColors.js';

const HELP_COMMAND = 'slark --help';
const COPY_INTRO_MS = 1100;
const TERMINAL_FADE_MS = 450;
const TYPE_MS = 92;
const POST_TYPE_PAUSE_MS = 700;

/** @type {Record<string, string>} */
const STEP_COMMANDS = {
  deploy: 'slark auth login --google',
  shield: 'slark purchase activate && slark keys show',
  ingest: 'npm install primedefender-client',
  map: 'slark monitor --live --map',
};

/** @param {{ visible: boolean; delay?: string; className?: string; children: import('react').ReactNode }} props */
function FlowReveal({ visible, delay = '0s', className = '', children }) {
  return (
    <div
      className={`translate-y-3 opacity-0 motion-reduce:translate-y-0 ${
        visible ? 'motion-safe:animate-home-intro-in motion-reduce:animate-none motion-reduce:opacity-100' : ''
      } ${className}`.trim()}
      style={visible ? { animationDelay: delay, animationFillMode: 'forwards' } : undefined}
    >
      {children}
    </div>
  );
}

function FlowTerminalPrompt() {
  return (
    <p className="flow-terminal-prompt-line" aria-hidden>
      <span className="flow-terminal-prompt-bracket">┌──(</span>
      <span className="flow-terminal-prompt-user">slark</span>
      <span className="flow-terminal-prompt-at">㉿</span>
      <span className="flow-terminal-prompt-host">kali</span>
      <span className="flow-terminal-prompt-bracket">)-[</span>
      <span className="flow-terminal-prompt-path">~</span>
      <span className="flow-terminal-prompt-bracket">]</span>
    </p>
  );
}

/**
 * @param {object} props
 * @param {number} props.index
 * @param {string} props.command
 * @param {string} props.title
 * @param {string} props.body
 * @param {boolean} props.visible
 * @param {boolean} props.isLast
 */
function FlowTerminalStep({ index, command, title, body, visible, isLast }) {
  const stepNum = String(index + 1).padStart(2, '0');

  return (
    <li className="flow-terminal-step">
      <FlowReveal visible={visible} delay={`${0.08 + index * 0.12}s`}>
        <p className="flow-terminal-comment" aria-hidden>
          {'# '}
          [{stepNum}] {title}
        </p>
        <div className="flow-terminal-prompt-block">
          <FlowTerminalPrompt />
          <p className="flow-terminal-command-line">
            <span className="flow-terminal-prompt-arrow" aria-hidden>
              └─$
            </span>{' '}
            <span className="flow-terminal-command">{command}</span>
          </p>
        </div>
        <p className="flow-terminal-output">
          <span className="flow-terminal-output-prefix" aria-hidden>
            →
          </span>{' '}
          {body}
        </p>
        {!isLast ? <div className="flow-terminal-divider" aria-hidden /> : null}
      </FlowReveal>
    </li>
  );
}

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.subtitle
 * @param {{ type: string; title: string; body: string }[]} props.steps
 */
export function FlowSection({ eyebrow, title, subtitle, steps }) {
  const { t } = useI18n();
  const sectionRef = useRef(/** @type {HTMLElement | null} */ (null));
  const [inView, setInView] = useState(false);
  const [terminalVisible, setTerminalVisible] = useState(false);
  const [typedLength, setTypedLength] = useState(0);
  const [contentReady, setContentReady] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return undefined;

    const scrollRoot = document.getElementById('app-scroll-root');
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -6% 0px',
        root: scrollRoot ?? null,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!inView) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setTerminalVisible(true);
      setTypedLength(HELP_COMMAND.length);
      setContentReady(true);
      return undefined;
    }

    const showTerminalTimer = window.setTimeout(() => setTerminalVisible(true), COPY_INTRO_MS);
    return () => window.clearTimeout(showTerminalTimer);
  }, [inView]);

  useEffect(() => {
    if (!terminalVisible) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;

    setTypedLength(0);
    setContentReady(false);

    let typeTimer = 0;
    let pauseTimer = 0;
    const startTimer = window.setTimeout(() => {
      let index = 0;
      typeTimer = window.setInterval(() => {
        index += 1;
        setTypedLength(index);
        if (index >= HELP_COMMAND.length) {
          window.clearInterval(typeTimer);
          pauseTimer = window.setTimeout(() => setContentReady(true), POST_TYPE_PAUSE_MS);
        }
      }, TYPE_MS);
    }, TERMINAL_FADE_MS);

    return () => {
      window.clearTimeout(startTimer);
      window.clearInterval(typeTimer);
      window.clearTimeout(pauseTimer);
    };
  }, [terminalVisible]);

  const typedCommand = HELP_COMMAND.slice(0, typedLength);
  const typing = terminalVisible && !contentReady;

  return (
    <section
      id="flow"
      ref={sectionRef}
      className="flow-terminal-section relative overflow-hidden border-t px-4 py-20 sm:px-6 sm:py-24 lg:px-8"
      style={{ borderColor: C.border, backgroundColor: C.bg }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="flow-terminal-bg-grid absolute inset-0" />
        <div
          className="absolute left-1/2 top-0 h-80 w-[min(100%,48rem)] -translate-x-1/2 rounded-full blur-[120px]"
          style={{ backgroundColor: 'rgba(198,40,40,0.05)' }}
        />
        <div
          className="absolute -right-24 bottom-0 h-72 w-72 rounded-full blur-[100px]"
          style={{ backgroundColor: 'rgba(38,162,105,0.06)' }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-12 xl:gap-14">
          <FlowReveal visible={inView} delay="0.05s" className="lg:pr-2">
            <div className="max-w-xl text-center lg:text-left">
              <p className="font-mono text-[10px] uppercase tracking-[0.35em]" style={{ color: C.primary }}>
                {eyebrow}
              </p>
              <h2 className="font-cyber mt-3 text-2xl font-bold sm:text-3xl lg:text-[2rem] xl:text-4xl" style={{ color: C.text }}>
                {title}
              </h2>
              <p
                className="mx-auto mt-4 max-w-lg font-mono text-sm leading-relaxed sm:text-base lg:mx-0 lg:max-w-none"
                style={{ color: C.textMuted }}
              >
                {subtitle}
              </p>
              <p className="mx-auto mt-6 max-w-lg text-sm leading-relaxed sm:text-base lg:mx-0 lg:max-w-none" style={{ color: C.textMuted }}>
                {t('home.flowDocsHint')}{' '}
                <Link
                  to="/docs"
                  className="font-semibold underline decoration-[#C62828]/35 underline-offset-2 transition hover:decoration-[#C62828]"
                  style={{ color: C.primary }}
                >
                  {t('home.flowDocsLink')}
                </Link>
                .
              </p>
            </div>
          </FlowReveal>

          <FlowReveal visible={terminalVisible} delay="0.1s">
            <div
              className="flow-terminal-window overflow-hidden rounded-lg border border-[#30363d] shadow-[0_20px_60px_rgba(17,24,39,0.14)]"
              role="region"
              aria-label={title}
              aria-busy={typing}
            >
              <div className="flow-terminal-titlebar flex items-center gap-3 border-b border-[#30363d] bg-[#161b22] px-3 py-2.5 sm:px-4">
                <div className="flex shrink-0 items-center gap-1.5" aria-hidden>
                  <span className="flow-terminal-dot flow-terminal-dot--close" />
                  <span className="flow-terminal-dot flow-terminal-dot--min" />
                  <span className="flow-terminal-dot flow-terminal-dot--max" />
                </div>
                <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <Terminal className="h-3.5 w-3.5 shrink-0 text-[#8B949E]" strokeWidth={2} aria-hidden />
                  <span className="truncate font-mono text-[11px] text-[#C9D1D9] sm:text-xs">
                    slark@kali: ~/quickstart
                  </span>
                </div>
                <div className="w-[52px] shrink-0" aria-hidden />
              </div>

              <div
                className="flow-terminal-body thin-scrollbar-dark max-h-[min(70vh,36rem)] overflow-y-auto px-4 py-4 font-mono text-[12px] leading-relaxed sm:px-5 sm:py-5 sm:text-[13px]"
              >
                {typing ? (
                  <div className="flow-terminal-intro-type" aria-live="polite">
                    <FlowTerminalPrompt />
                    <p className="flow-terminal-command-line">
                      <span className="flow-terminal-prompt-arrow" aria-hidden>
                        └─$
                      </span>{' '}
                      <span className="flow-terminal-command">{typedCommand}</span>
                      <span className="flow-terminal-cursor" aria-hidden />
                    </p>
                  </div>
                ) : null}

                {contentReady ? (
                  <>
                    <FlowReveal visible={contentReady} delay="0.04s">
                      <pre className="mb-4 whitespace-pre-wrap text-[#6E7681] sm:mb-5" aria-hidden>
                        {`Linux slark-kali 6.6.15-amd64 #1 SMP PREEMPT_DYNAMIC
slark quickstart wizard — ${steps.length} steps`}
                      </pre>
                    </FlowReveal>

                    <ol className="space-y-0">
                      {steps.map((step, index) => (
                        <FlowTerminalStep
                          key={step.title}
                          index={index}
                          command={STEP_COMMANDS[step.type] || 'slark help'}
                          title={step.title}
                          body={step.body}
                          visible={contentReady}
                          isLast={index === steps.length - 1}
                        />
                      ))}
                    </ol>

                    <FlowReveal visible={contentReady} delay={`${0.2 + steps.length * 0.12}s`}>
                      <div className="mt-4 border-t border-[#21262d] pt-4 sm:mt-5 sm:pt-5">
                        <FlowTerminalPrompt />
                        <p className="flow-terminal-command-line">
                          <span className="flow-terminal-prompt-arrow" aria-hidden>
                            └─$
                          </span>{' '}
                          <span className="flow-terminal-cursor" aria-hidden />
                        </p>
                      </div>
                    </FlowReveal>
                  </>
                ) : null}
              </div>
            </div>
          </FlowReveal>
        </div>
      </div>
    </section>
  );
}
