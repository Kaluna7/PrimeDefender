import { forwardRef, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SLARK as C } from '../../../theme/slarkColors.js';
import { createWhySlarkGlobe } from './whySlarkGlobe.js';

gsap.registerPlugin(ScrollTrigger);

const ENTRANCE_SHARE = 0.1;

function FeatureIcon({ type }) {
  if (type === 'map') {
    return (
      <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }
  if (type === 'middleware') {
    return (
      <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 7h6v6H4zM14 7h6v6h-6zM9 17h6v4H9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    );
  }
  return (
    <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3v2M5.5 6.5l1.4 1.4M18.5 6.5l-1.4 1.4M4 12h2M18 12h2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 14.5a3.5 3.5 0 0 0 7 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const FeatureCard = forwardRef(function FeatureCard({ feature, side }, ref) {
  return (
    <article
      ref={ref}
      className={`why-slark-card pointer-events-none absolute z-20 w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF]/95 p-4 shadow-[0_12px_40px_rgba(17,24,39,0.12)] backdrop-blur-sm sm:w-72 sm:p-5 ${
        side === 'left'
          ? 'left-3 top-[52%] -translate-y-1/2 sm:left-[8%] md:left-[10%]'
          : 'right-3 top-[52%] -translate-y-1/2 sm:right-[8%] md:right-[10%]'
      } max-sm:left-3 max-sm:right-3 max-sm:top-auto max-sm:bottom-4 max-sm:translate-y-0`}
      style={{ opacity: 0, visibility: 'hidden' }}
    >
      <div
        className="inline-flex rounded-xl border p-2.5 sm:p-3"
        style={{
          borderColor: `${feature.accent}22`,
          backgroundColor: `${feature.accent}0d`,
          color: feature.accent,
        }}
      >
        <FeatureIcon type={feature.type} />
      </div>
      <h3 className="font-cyber mt-3 text-sm font-bold sm:mt-4 sm:text-base" style={{ color: C.text }}>
        {feature.title}
      </h3>
      <p className="mt-2 text-xs leading-relaxed sm:text-sm" style={{ color: C.textMuted }}>
        {feature.body}
      </p>
    </article>
  );
});

/**
 * @param {object} props
 * @param {string} props.eyebrow
 * @param {string} props.title
 * @param {string} props.brandName
 * @param {string} [props.finaleTagline]
 * @param {string} [props.scrollHint]
 * @param {{ type: string, title: string, body: string, accent: string }[]} props.features
 */
export function WhySlarkScrollSection({ eyebrow, title, brandName, finaleTagline, scrollHint, features }) {
  const sectionRef = useRef(/** @type {HTMLElement | null} */ (null));
  const stickyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const headingRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const sceneWrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const finaleRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const scrollHintRef = useRef(/** @type {HTMLParagraphElement | null} */ (null));
  const cardsRef = useRef(/** @type {(HTMLElement | null)[]} */ ([]));
  const staticGridRef = useRef(/** @type {HTMLDivElement | null} */ (null));

  useEffect(() => {
    const section = sectionRef.current;
    const sticky = stickyRef.current;
    const canvas = canvasRef.current;
    if (!section || !sticky || !canvas) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      if (staticGridRef.current) staticGridRef.current.hidden = false;
      sticky.hidden = true;
      return undefined;
    }

    const scrollerEl = document.getElementById('app-scroll-root');
    const isMobile = window.innerWidth < 640;
    const globe = createWhySlarkGlobe(canvas, { isMobile });

    if (scrollerEl) {
      ScrollTrigger.scrollerProxy(scrollerEl, {
        scrollTop(value) {
          if (arguments.length) {
            scrollerEl.scrollTop = value;
          }
          return scrollerEl.scrollTop;
        },
        getBoundingClientRect() {
          return {
            top: 0,
            left: 0,
            width: scrollerEl.clientWidth,
            height: scrollerEl.clientHeight,
          };
        },
      });
    }

    const cards = cardsRef.current.filter(Boolean);
    const finale = finaleRef.current;
    const heading = headingRef.current;
    const sceneWrap = sceneWrapRef.current;
    const scrollHintEl = scrollHintRef.current;

    gsap.set(cards, { autoAlpha: 0, x: 0 });
    if (finale) gsap.set(finale, { autoAlpha: 0, scale: 0.88, y: 20 });
    if (heading) gsap.set(heading, { autoAlpha: 0 });
    if (sceneWrap) gsap.set(sceneWrap, { autoAlpha: 0 });

    const cardWindows = [
      { in: 0.06, out: 0.28, fromX: isMobile ? 0 : -72 },
      { in: 0.3, out: 0.52, fromX: isMobile ? 0 : 72 },
      { in: 0.54, out: 0.76, fromX: isMobile ? 0 : 72 },
    ];

    function cardAlpha(p, win) {
      const fade = 0.05;
      if (p < win.in) return 0;
      if (p < win.in + fade) return (p - win.in) / fade;
      if (p < win.out - fade) return 1;
      if (p < win.out) return (win.out - p) / fade;
      return 0;
    }

    function showScene(p) {
      globe.setEntrance(1);
      globe.setProgress(p);
      if (sceneWrap) gsap.set(sceneWrap, { autoAlpha: 1 });

      cards.forEach((card, i) => {
        const win = cardWindows[i];
        if (!card || !win) return;
        const alpha = cardAlpha(p, win);
        const enterT = Math.min(1, Math.max(0, (p - win.in) / 0.08));
        gsap.set(card, { autoAlpha: alpha, x: win.fromX * (1 - enterT) });
      });

      if (heading) {
        const headAlpha = p < 0.12 ? 1 : Math.max(0, 1 - (p - 0.12) / 0.1);
        gsap.set(heading, { autoAlpha: headAlpha });
      }

      if (finale) {
        const finaleIn = Math.max(0, (p - 0.8) / 0.12);
        const eased = 1 - (1 - Math.min(1, finaleIn)) ** 3;
        gsap.set(finale, {
          autoAlpha: eased,
          scale: 0.88 + eased * 0.12,
          y: 20 * (1 - eased),
        });
      }

      if (scrollHintEl) {
        const hintAlpha = p < 0.08 ? 1 : Math.max(0, 1 - (p - 0.08) / 0.06);
        gsap.set(scrollHintEl, { autoAlpha: hintAlpha });
      }
    }

    function applyEntrance(t) {
      const eased = 1 - (1 - t) ** 2.2;
      globe.setEntrance(eased);
      globe.setProgress(0);
      if (sceneWrap) gsap.set(sceneWrap, { autoAlpha: eased });
      if (heading) gsap.set(heading, { autoAlpha: eased });
    }

    function scrollLen() {
      const vh = scrollerEl?.clientHeight ?? window.innerHeight;
      return isMobile ? vh * 3.6 : vh * 4.5;
    }

    function layoutSection() {
      const vh = scrollerEl?.clientHeight ?? window.innerHeight;
      section.style.height = `${vh + scrollLen()}px`;
      sticky.style.height = `${vh}px`;
    }

    layoutSection();

    function handleScrollProgress(raw) {
      if (raw < ENTRANCE_SHARE) {
        applyEntrance(raw / ENTRANCE_SHARE);
      } else {
        showScene((raw - ENTRANCE_SHARE) / (1 - ENTRANCE_SHARE));
      }
    }

    const mainSt = ScrollTrigger.create({
      trigger: section,
      scroller: scrollerEl || undefined,
      start: 'top bottom',
      end: 'bottom bottom',
      scrub: false,
      onUpdate: (self) => handleScrollProgress(self.progress),
    });

    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        layoutSection();
        globe.resize();
        ScrollTrigger.refresh();
        handleScrollProgress(mainSt.progress);
      }, 250);
    };
    window.addEventListener('resize', onResize);

    requestAnimationFrame(() => {
      layoutSection();
      globe.resize();
      ScrollTrigger.refresh();
      handleScrollProgress(mainSt.progress);
    });

    return () => {
      window.removeEventListener('resize', onResize);
      window.clearTimeout(resizeTimer);
      mainSt.kill();
      if (scrollerEl) ScrollTrigger.scrollerProxy(scrollerEl, null);
      section.style.height = '';
      sticky.style.height = '';
      globe.dispose();
    };
  }, [features]);

  return (
    <section id="features" ref={sectionRef} className="relative">
      <div ref={staticGridRef} hidden className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
            {eyebrow}
          </p>
          <h2 className="font-cyber mt-3 text-2xl font-bold sm:text-3xl" style={{ color: C.text }}>
            {title}
          </h2>
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6"
            >
              <div
                className="inline-flex rounded-xl border p-3"
                style={{
                  borderColor: `${feature.accent}22`,
                  backgroundColor: `${feature.accent}0d`,
                  color: feature.accent,
                }}
              >
                <FeatureIcon type={feature.type} />
              </div>
              <h3 className="font-cyber mt-5 text-base font-bold" style={{ color: C.text }}>
                {feature.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: C.textMuted }}>
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div
        ref={stickyRef}
        className="sticky top-0 z-10 flex w-full items-center justify-center overflow-hidden bg-[#FFFFFF]"
      >
        <div
          ref={headingRef}
          className="pointer-events-none absolute left-0 right-0 top-[10%] z-10 px-4 text-center sm:top-[12%]"
        >
          <p className="font-cyber text-[10px] uppercase tracking-[0.4em]" style={{ color: C.primary }}>
            {eyebrow}
          </p>
          <h2 className="font-cyber mt-3 text-xl font-bold sm:text-3xl" style={{ color: C.text }}>
            {title}
          </h2>
        </div>

        <div ref={sceneWrapRef} className="absolute inset-0 z-0">
          <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
        </div>

        {features.map((feature, i) => (
          <FeatureCard
            key={feature.title}
            feature={feature}
            side={i === 0 ? 'left' : 'right'}
            ref={(el) => {
              cardsRef.current[i] = el;
            }}
          />
        ))}

        <div
          ref={finaleRef}
          className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center px-4 text-center"
          style={{ opacity: 0, visibility: 'hidden' }}
        >
          <p className="font-cyber text-[10px] uppercase tracking-[0.55em] text-[#C62828]/80">
            {eyebrow}
          </p>
          <p
            className="font-cyber mt-3 text-5xl font-bold tracking-[0.2em] text-[#111827] sm:text-7xl"
            style={{ textShadow: '0 0 48px rgba(198,40,40,0.25)' }}
          >
            {brandName}
          </p>
          {finaleTagline && (
            <p className="mt-4 max-w-md text-sm leading-relaxed text-[#6B7280] sm:text-base">
              {finaleTagline}
            </p>
          )}
        </div>

        <p
          ref={scrollHintRef}
          className="pointer-events-none absolute bottom-6 left-0 right-0 z-10 text-center text-[10px] uppercase tracking-[0.3em] text-[#9CA3AF]"
          aria-hidden
        >
          {scrollHint || 'Scroll'}
        </p>
      </div>
    </section>
  );
}
