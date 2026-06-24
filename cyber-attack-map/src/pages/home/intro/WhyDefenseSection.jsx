import { forwardRef, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SLARK as C } from '../../../theme/slarkColors.js';
import { DefenseSectionBackground } from './DefenseSectionBackground.jsx';
import { bindLandingScrollProxy } from '../../../utils/landingScrollProxy.js';

gsap.registerPlugin(ScrollTrigger);

const DEFENSE = {
  bg: C.defense.section,
  card: C.defense.card,
  border: C.defense.border,
  text: C.onDark.text,
  textMuted: C.onDark.textMuted,
};

function ShieldMark() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FootnoteIcon({ type }) {
  if (type === 'target') {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'speed') {
    return (
      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3l8 4v6c0 5-3.5 7.5-8 9-4.5-1.5-8-4-8-9V7l8-4z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function HighlightedBody({ body, highlight }) {
  if (!highlight || !body.includes(highlight)) {
    return (
      <p className="text-sm leading-relaxed sm:text-[0.95rem]" style={{ color: DEFENSE.textMuted }}>
        {body}
      </p>
    );
  }

  const [before, after] = body.split(highlight);
  return (
    <p className="text-sm leading-relaxed sm:text-[0.95rem]" style={{ color: DEFENSE.textMuted }}>
      {before}
      <span className="font-medium" style={{ color: C.primary }}>
        {highlight}
      </span>
      {after}
    </p>
  );
}

function VisualPanel({ videoSrc, idSuffix }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {videoSrc ? (
        <>
          <video
            className="defense-card-video absolute inset-0 h-full w-full object-cover object-center"
            src={videoSrc}
            muted
            loop
            playsInline
            preload="none"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'linear-gradient(105deg, rgba(23,32,51,0.72) 0%, rgba(23,32,51,0.18) 42%, rgba(15,23,42,0.28) 100%)',
            }}
          />
        </>
      ) : (
        <>
          <div className="absolute inset-0" style={{ backgroundColor: '#121c2e' }} />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 52% 58%, rgba(198,40,40,0.18) 0%, transparent 52%), radial-gradient(circle at 50% 50%, rgba(96,165,250,0.06) 0%, transparent 45%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage: 'radial-gradient(rgba(148,163,184,0.4) 1.2px, transparent 1.2px)',
              backgroundSize: '12px 12px',
            }}
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 480 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
            <defs>
              <radialGradient id={`defenseGlobe-${idSuffix}`} cx="50%" cy="52%" r="42%">
                <stop offset="0%" stopColor="rgba(148,163,184,0.35)" />
                <stop offset="100%" stopColor="rgba(15,23,42,0)" />
              </radialGradient>
            </defs>
            <circle cx="240" cy="165" r="88" fill={`url(#defenseGlobe-${idSuffix})`} />
            {[...Array(32)].map((_, i) => {
              const a = (i / 32) * Math.PI * 2;
              const r = 70 + (i % 3) * 8;
              const x = 240 + Math.cos(a) * r;
              const y = 165 + Math.sin(a) * r * 0.62;
              return <circle key={i} cx={x} cy={y} r="1.6" fill="rgba(203,213,225,0.55)" />;
            })}
            <path d="M150 170 Q240 95 330 150" fill="none" stroke="rgba(198,40,40,0.75)" strokeWidth="2" />
            <path d="M170 195 Q240 120 310 185" fill="none" stroke="rgba(198,40,40,0.45)" strokeWidth="1.5" />
            <circle cx="150" cy="170" r="3" fill="#C62828" />
            <circle cx="330" cy="150" r="3" fill="#C62828" />
          </svg>
        </>
      )}
    </div>
  );
}

function PanelChevronEdge({ idSuffix }) {
  const gradId = `defense-edge-${idSuffix}`;
  const glowId = `defense-edge-glow-${idSuffix}`;

  return (
    <svg
      className="pointer-events-none absolute left-0 top-0 z-30 hidden h-full w-3 -translate-x-1/2 lg:block"
      viewBox="0 0 100 400"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="rgba(198,40,40,0.05)" />
          <stop offset="22%" stopColor="rgba(198,40,40,0.65)" />
          <stop offset="50%" stopColor="rgba(198,40,40,0.95)" />
          <stop offset="78%" stopColor="rgba(198,40,40,0.65)" />
          <stop offset="100%" stopColor="rgba(198,40,40,0.05)" />
        </linearGradient>
        <filter id={glowId} x="-120%" y="-4%" width="340%" height="108%">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d="M0 0 L10 200 L0 400"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        filter={`url(#${glowId})`}
      />
    </svg>
  );
}

const DefenseCard = forwardRef(function DefenseCard({ card, footnotes, layout = 'scroll' }, ref) {
  const isScrollInner = layout === 'scroll-inner';

  return (
    <article
      ref={isScrollInner ? undefined : ref}
      className="relative w-full"
    >
      <div
        className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl border sm:min-h-[24rem] lg:min-h-[26rem] lg:max-h-[min(38rem,calc(100vh-8rem))]"
        style={{
          borderColor: DEFENSE.border,
          backgroundColor: DEFENSE.card,
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.06), 0 0 0 1px rgba(36,48,65,0.8), 0 16px 48px rgba(0,0,0,0.35)',
        }}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 z-10 h-28 w-40"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.09) 0%, transparent 58%)',
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.03)' }}
          aria-hidden
        />

        <div className="relative flex min-h-[22rem] flex-1 flex-col sm:min-h-[24rem] lg:min-h-[26rem] lg:flex-row lg:items-stretch">
          <div className="relative z-10 flex min-w-0 flex-col justify-between gap-6 px-5 py-6 sm:px-7 sm:py-7 lg:w-[44%] lg:shrink-0 lg:px-8 lg:py-8">
            <div>
              <span
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{
                  borderColor: `${C.primary}55`,
                  backgroundColor: `${C.primary}10`,
                  color: C.primary,
                }}
              >
                <ShieldMark />
                {card.badge}
              </span>

              <h3
                className="font-cyber mt-4 text-xl font-bold leading-tight sm:mt-5 sm:text-2xl"
                style={{ color: DEFENSE.text }}
              >
                {card.title}
              </h3>

              <div className="mt-3 pr-1 lg:max-w-md">
                <HighlightedBody body={card.body} highlight={card.highlight} />
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-2">
              {footnotes.map((note) => (
                <div key={note.text} className="flex min-w-0 items-start gap-2">
                  <span className="mt-0.5 shrink-0" style={{ color: C.primary }}>
                    <FootnoteIcon type={note.icon} />
                  </span>
                  <span
                    className="min-w-0 break-words text-[10px] leading-snug sm:text-[11px]"
                    style={{ color: DEFENSE.textMuted }}
                  >
                    {note.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative flex min-h-[14rem] min-w-0 flex-1 flex-col self-stretch overflow-hidden border-t lg:min-h-full lg:border-t-0"
            style={{ borderColor: DEFENSE.border }}
          >
            <PanelChevronEdge idSuffix={card.type} />
            <div className="defense-panel-right relative min-h-[14rem] w-full flex-1 lg:min-h-full">
              <VisualPanel videoSrc={card.videoSrc} idSuffix={card.type} />
            </div>
          </div>
        </div>
      </div>
    </article>
  );
});

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}

function cardMotion(local, isMobile, cardIndex) {
  const enterEnd = 0.32;
  const holdEnd = 0.52;
  const travel = isMobile ? 24 : 32;

  if (local <= 0) {
    return { y: travel, opacity: 0, zIndex: 10 + cardIndex };
  }

  if (local < enterEnd) {
    const t = easeInOutCubic(local / enterEnd);
    return {
      y: Math.round((1 - t) * travel),
      opacity: t,
      zIndex: 30 + cardIndex,
    };
  }

  if (local < holdEnd) {
    return { y: 0, opacity: 1, zIndex: 30 + cardIndex };
  }

  const t = easeInOutCubic((local - holdEnd) / (1 - holdEnd));
  return {
    y: Math.round(-t * (isMobile ? 32 : 40)),
    opacity: Math.max(0, 1 - t * 1.1),
    zIndex: 20 + cardIndex,
  };
}

function pickPrimaryCard(inIntro, phase, n, isMobile) {
  let primary = -1;
  let primaryOpacity = 0;

  for (let i = 0; i < n; i += 1) {
    const motion = motionForCard(i, inIntro, phase, n, isMobile);
    if (!motion || motion.opacity <= 0.01) continue;
    if (motion.opacity >= primaryOpacity) {
      primaryOpacity = motion.opacity;
      primary = i;
    }
  }

  return primary;
}

function motionForCard(i, inIntro, phase, n, isMobile) {
  const CARD_HOLD_LOCAL = 0.38;
  if (inIntro) {
    return i === 0 ? cardMotion(CARD_HOLD_LOCAL, isMobile, i) : null;
  }
  const local = cardLocal(i, phase, n);
  return local === null ? null : cardMotion(local, isMobile, i);
}

function cardLocal(i, phase, cardCount) {
  const CARD_HOLD_LOCAL = 0.38;
  const seg = 1 / cardCount;
  const segStart = i * seg;
  const segEnd = (i + 1) * seg;

  if (phase < segStart || phase > segEnd) {
    return null;
  }

  let local = clamp01((phase - segStart) / (segEnd - segStart));
  if (i === 0) {
    local = CARD_HOLD_LOCAL + local * (1 - CARD_HOLD_LOCAL);
  }
  return local;
}

function hideCardEl(el) {
  gsap.set(el, { autoAlpha: 0, y: 0, scale: 1 });
}

function SectionHeadingBlock({ eyebrow, titleBefore, titleHighlight, titleAfter, subtitle }) {
  return (
    <div className="relative z-10 shrink-0 px-4 pb-0 pt-6 text-center sm:px-6 sm:pt-8">
      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <span className="hidden h-px w-10 sm:block sm:w-14" style={{ background: 'linear-gradient(90deg, transparent, rgba(198,40,40,0.55))' }} aria-hidden />
        <span className="h-1.5 w-1.5 rotate-45 border border-[#C62828]/60" aria-hidden />
        <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
          {eyebrow}
        </p>
        <span className="h-1.5 w-1.5 rotate-45 border border-[#C62828]/60" aria-hidden />
        <span className="hidden h-px w-10 sm:block sm:w-14" style={{ background: 'linear-gradient(270deg, transparent, rgba(198,40,40,0.55))' }} aria-hidden />
      </div>
      <h2 className="font-cyber mt-3 text-2xl font-bold leading-tight sm:text-4xl lg:text-[2.65rem]">
        <span style={{ color: DEFENSE.text }}>{titleBefore}</span>
        <span style={{ color: C.primary }}>{titleHighlight}</span>
        <span style={{ color: DEFENSE.text }}>{titleAfter}</span>
      </h2>
      {subtitle ? (
        <p
          className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed sm:text-base"
          style={{ color: DEFENSE.textMuted }}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.titleBefore
 * @param {string} props.titleHighlight
 * @param {string} props.titleAfter
 * @param {string} [props.subtitle]
 * @param {{ icon: string, text: string }[]} props.footnotes
 * @param {object[]} props.cards
 */
export function WhyDefenseSection({
  eyebrow,
  titleBefore,
  titleHighlight,
  titleAfter,
  subtitle,
  footnotes,
  cards,
}) {
  const sectionRef = useRef(/** @type {HTMLElement | null} */ (null));
  const stickyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const headingRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const stageRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const cardsRef = useRef(/** @type {(HTMLElement | null)[]} */ ([]));
  const staticGridRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    if (!section || !sticky) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      if (staticGridRef.current) staticGridRef.current.hidden = false;
      sticky.hidden = true;
      return undefined;
    }

    const scrollerEl = document.getElementById('app-scroll-root');
    if (!scrollerEl) {
      if (staticGridRef.current) staticGridRef.current.hidden = false;
      sticky.hidden = true;
      return undefined;
    }

    bindLandingScrollProxy(scrollerEl);
    const isMobile = window.innerWidth < 640;
    const n = cards.length;
    /** @type {HTMLElement[]} */
    let cachedCardEls = [];
    const cardVisible = new Array(n).fill(false);

    function resolveCardEls() {
      const fromRefs = cardsRef.current.filter(Boolean);
      if (fromRefs.length === n) return fromRefs;

      const stage = stageRef.current;
      if (!stage) return fromRefs;

      return Array.from(stage.querySelectorAll('.defense-scroll-card-anim'));
    }

    function syncVideos(primary, cardEls, motion) {
      const shouldPlay =
        primary >= 0 && motion && motion.opacity > 0.9 && Math.abs(motion.y) < 1;

      cardEls.forEach((el, i) => {
        const video = el.querySelector('video.defense-card-video');
        if (!video) return;

        if (i === primary && shouldPlay) {
          if (video.paused) video.play().catch(() => {});
        } else if (!video.paused) {
          video.pause();
        }
      });
    }

    function setCardEl(el, index, motion) {
      const alpha = motion.opacity;

      if (alpha <= 0.01) {
        if (cardVisible[index]) {
          hideCardEl(el);
          cardVisible[index] = false;
        }
        return;
      }

      gsap.set(el, {
        autoAlpha: alpha,
        y: Math.round(motion.y),
        scale: 1,
        zIndex: motion.zIndex,
        visibility: 'visible',
        force3D: true,
      });
      cardVisible[index] = true;
    }

    const INTRO_SHARE = 0.12;
    const CARD_ANIM_END = 0.88;

    function scrollLen() {
      const vh = scrollerEl.clientHeight || window.innerHeight;
      const introPad = vh * 0.4;
      return introPad + (isMobile ? vh * (1.8 + n * 0.85) : vh * (2.1 + n * 0.95));
    }

    function applyFrame(progress) {
      const cardEls = cachedCardEls;
      if (!cardEls.length) return;

      const p = clamp01(Number.isFinite(progress) ? progress : 0);
      const inIntro = p < INTRO_SHARE;
      const phase = inIntro ? 0 : clamp01((p - INTRO_SHARE) / (CARD_ANIM_END - INTRO_SHARE));

      const primaryRaw = inIntro ? 0 : pickPrimaryCard(inIntro, phase, n, isMobile);
      const primary = primaryRaw < 0 ? 0 : primaryRaw;
      const primaryMotion =
        primary >= 0 ? motionForCard(primary, inIntro, phase, n, isMobile) : null;

      cardEls.forEach((el, i) => {
        if (i !== primary) {
          if (cardVisible[i]) {
            hideCardEl(el);
            cardVisible[i] = false;
          }
          return;
        }

        if (!primaryMotion || primaryMotion.opacity <= 0.01) {
          if (cardVisible[i]) {
            hideCardEl(el);
            cardVisible[i] = false;
          }
          return;
        }

        setCardEl(el, i, primaryMotion);
      });

      syncVideos(primary, cardEls, primaryMotion);
    }

    function initCards() {
      const cardEls = resolveCardEls();
      if (cardEls.length < n) return false;

      cachedCardEls = cardEls;
      cardEls.forEach((el, i) => {
        if (i === 0) {
          gsap.set(el, { autoAlpha: 1, y: 0, scale: 1, zIndex: 30, force3D: true });
          cardVisible[0] = true;
        } else {
          hideCardEl(el);
          cardVisible[i] = false;
        }
      });
      return true;
    }

    function layoutSection() {
      const vh = scrollerEl.clientHeight || window.innerHeight;
      section.style.height = `${vh + scrollLen()}px`;
      sticky.style.height = `${vh}px`;
    }

    layoutSection();

    let mainSt;
    try {
      mainSt = ScrollTrigger.create({
        trigger: section,
        scroller: scrollerEl,
        start: 'top top',
        end: 'bottom bottom',
        scrub: false,
        onUpdate: (self) => applyFrame(self.progress),
        onEnter: (self) => applyFrame(self.progress),
        onEnterBack: (self) => applyFrame(self.progress),
      });
    } catch (err) {
      console.error('[WhyDefenseSection] ScrollTrigger failed', err);
      if (staticGridRef.current) staticGridRef.current.hidden = false;
      sticky.hidden = true;
      return undefined;
    }

    const refreshFrame = () => {
      layoutSection();
      ScrollTrigger.refresh();
      applyFrame(mainSt.progress);
    };

    const startup = () => {
      if (!initCards()) {
        requestAnimationFrame(startup);
        return;
      }
      applyFrame(mainSt.progress);
    };

    startup();

    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      applyFrame(mainSt.progress);
    });

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshFrame, 250);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(resizeTimer);
      mainSt?.kill();
      section.style.height = '';
      sticky.style.height = '';
      if (cachedCardEls.length) {
        gsap.set(cachedCardEls, { clearProps: 'opacity,visibility,transform,zIndex' });
      }
    };
  }, [cards.length]);

  return (
    <section
      id="defense"
      ref={sectionRef}
      className="relative border-t"
      style={{ borderColor: DEFENSE.border, backgroundColor: DEFENSE.bg }}
    >
      <div ref={staticGridRef} hidden className="relative z-10 space-y-4 px-4 py-20 sm:px-6">
        <SectionHeadingBlock
          eyebrow={eyebrow}
          titleBefore={titleBefore}
          titleHighlight={titleHighlight}
          titleAfter={titleAfter}
          subtitle={subtitle}
        />
        <div className="mx-auto max-w-6xl space-y-4">
          {cards.map((card) => (
            <DefenseCard key={card.title} card={card} footnotes={footnotes} layout="static" />
          ))}
        </div>
      </div>

      <div
        ref={stickyRef}
        className="sticky top-0 z-20 flex w-full flex-col overflow-hidden bg-[#0F172A] [transform:translateZ(0)]"
      >
        <DefenseSectionBackground />
        <div ref={headingRef} className="relative z-10">
          <SectionHeadingBlock
            eyebrow={eyebrow}
            titleBefore={titleBefore}
            titleHighlight={titleHighlight}
            titleAfter={titleAfter}
            subtitle={subtitle}
          />
        </div>

        <div
          ref={stageRef}
          className="relative z-10 flex min-h-[24rem] flex-1 items-center justify-center px-3 pb-10 pt-0 sm:min-h-[28rem] sm:px-4 sm:pb-12"
        >
          <div className="pointer-events-none w-full min-h-[22rem] shrink-0 opacity-0 sm:min-h-[26rem]" aria-hidden />
          <div className="absolute inset-0 flex -translate-y-3 items-center justify-center overflow-visible px-3 sm:-translate-y-5 sm:px-4">
            {cards.map((card, i) => (
              <div
                key={card.type}
                className="defense-scroll-card-slot pointer-events-none absolute w-[min(96vw,68rem)] max-w-full"
              >
                <div
                  ref={(el) => {
                    cardsRef.current[i] = el;
                  }}
                  data-defense-index={i}
                  className="defense-scroll-card-anim w-full origin-center"
                  style={i === 0 ? { opacity: 1, visibility: 'visible' } : { opacity: 0, visibility: 'hidden' }}
                >
                  <DefenseCard card={card} footnotes={footnotes} layout="scroll-inner" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
