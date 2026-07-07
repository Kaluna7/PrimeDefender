import { forwardRef, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SLARK as C } from '../../../theme/slarkColors.js';
import { createWhySlarkGlobe } from './whySlarkGlobe.js';
import { bindLandingScrollProxy } from '../../../utils/landingScrollProxy.js';

gsap.registerPlugin(ScrollTrigger);

const ENTRANCE_SHARE = 0.07;
const PAUSE_SHARE = 0.18;
const ANIM_SHARE = 1 - ENTRANCE_SHARE - PAUSE_SHARE;

/** Glass shards — each flies in from a corner/edge, then merges into unified blur. */
const SLARK_GLASS_SHARDS = [
  { clip: 'polygon(0% 0%, 44% 0%, 26% 46%, 0% 58%)', ox: 78, oy: -56, rot: 28, delay: 0 },
  { clip: 'polygon(44% 0%, 100% 0%, 100% 36%, 64% 40%, 26% 46%)', ox: 64, oy: -44, rot: 18, delay: 0.05 },
  { clip: 'polygon(26% 46%, 64% 40%, 56% 66%, 38% 56%, 0% 58%, 0% 100%, 20% 100%)', ox: -72, oy: -50, rot: -24, delay: 0.08 },
  { clip: 'polygon(64% 40%, 100% 36%, 100% 70%, 76% 62%, 56% 66%)', ox: 82, oy: 38, rot: 22, delay: 0.03 },
  { clip: 'polygon(38% 56%, 56% 66%, 76% 62%, 50% 100%, 20% 100%)', ox: -68, oy: 54, rot: -16, delay: 0.12 },
  { clip: 'polygon(56% 66%, 76% 62%, 100% 70%, 100% 100%, 50% 100%)', ox: 74, oy: 58, rot: 20, delay: 0.07 },
  { clip: 'polygon(26% 46%, 38% 56%, 50% 100%, 20% 100%, 0% 58%)', ox: -76, oy: 22, rot: -20, delay: 0.14 },
  { clip: 'polygon(64% 40%, 56% 66%, 38% 56%, 26% 46%)', ox: 12, oy: -62, rot: 10, delay: 0.1 },
];

function clamp01(v) {
  return Math.min(1, Math.max(0, v));
}

function easeOut(t) {
  return 1 - (1 - clamp01(t)) ** 2.2;
}

/**
 * Belt scroll: shards start scattered from corners → fly inward → fuse into blur.
 * @param {HTMLElement} beltEl
 * @param {number} p scene progress 0–1
 * @param {{ isMobile: boolean, reducedMotion: boolean }} opts
 */
function applySlarkGlassBelt(beltEl, p, { isMobile, reducedMotion }) {
  const beltT = clamp01((p - 0.78) / 0.22);
  const beltVisible = p >= 0.78;
  const shardScale = isMobile ? 0.85 : 1;
  const scatterMax = isMobile ? 1.45 : 1.65;

  gsap.set(beltEl, {
    visibility: beltVisible ? 'visible' : 'hidden',
    opacity: 1,
    zIndex: 0,
  });

  const solid = beltEl.querySelector('[data-belt-solid]');
  const cracks = beltEl.querySelector('.why-slark-finale-cracks');
  const frame = beltEl.querySelector('.why-slark-finale-belt-frame');
  const shards = beltEl.querySelectorAll('[data-glass-shard]');

  if (reducedMotion) {
    const on = beltVisible && beltT > 0.35;
    shards.forEach((el) => {
      gsap.set(el, { opacity: 0, visibility: 'hidden', x: 0, y: 0, rotation: 0, scale: 1 });
    });
    if (cracks) gsap.set(cracks, { opacity: 0 });
    if (solid) gsap.set(solid, { opacity: on ? 1 : 0, visibility: on ? 'visible' : 'hidden' });
    if (frame) gsap.set(frame, { opacity: on ? 1 : 0 });
    return;
  }

  const appearT = clamp01(beltT / 0.12);
  const mergeT = clamp01((beltT - 0.12) / 0.48);
  const fuseT = clamp01((beltT - 0.58) / 0.42);
  const fuseEased = easeOut(fuseT);

  const shardShow = easeOut(appearT);
  const shardAlpha = shardShow * (1 - fuseEased);
  const solidAlpha = fuseEased * clamp01((mergeT - 0.38) / 0.62);
  let crackAlpha = 0;

  shards.forEach((el) => {
    const delay = Number.parseFloat(el.dataset.shardDelay || '0');
    const ox = Number.parseFloat(el.dataset.shardOx || '0') * shardScale;
    const oy = Number.parseFloat(el.dataset.shardOy || '0') * shardScale;
    const rot = Number.parseFloat(el.dataset.shardRot || '0');

    const localMergeT = clamp01((mergeT - delay * 0.22) / Math.max(0.001, 1 - delay * 0.22));
    const localMergeEased = easeOut(localMergeT);
    const scatter = scatterMax * (1 - localMergeEased);

    crackAlpha = Math.max(crackAlpha, shardShow * (1 - localMergeEased * 0.9));

    gsap.set(el, {
      opacity: beltVisible ? Math.max(0.08, shardAlpha) : 0,
      visibility: beltVisible && shardAlpha > 0.02 ? 'visible' : 'hidden',
      x: ox * scatter,
      y: oy * scatter,
      rotation: rot * scatter,
      scale: 0.78 + (1 - scatter) * 0.22,
      transformOrigin: 'center center',
      force3D: true,
    });
  });

  crackAlpha *= 1 - fuseEased;

  if (cracks) gsap.set(cracks, { opacity: beltVisible ? crackAlpha * 0.95 : 0 });
  if (solid) {
    gsap.set(solid, {
      opacity: beltVisible ? solidAlpha : 0,
      visibility: beltVisible && solidAlpha > 0.02 ? 'visible' : 'hidden',
      scale: 0.97 + solidAlpha * 0.03,
      transformOrigin: 'center center',
    });
  }
  if (frame) gsap.set(frame, { opacity: beltVisible ? solidAlpha : 0 });
}

function SlarkFinaleGlassBelt({ beltRef }) {
  return (
    <div ref={beltRef} className="why-slark-finale-belt-wrap" aria-hidden>
      <div className="why-slark-finale-belt-blur" data-belt-solid />
      {SLARK_GLASS_SHARDS.map((shard, i) => (
        <div
          key={i}
          data-glass-shard
          data-shard-delay={shard.delay}
          data-shard-ox={shard.ox}
          data-shard-oy={shard.oy}
          data-shard-rot={shard.rot}
          className="why-slark-finale-shard"
          style={{ clipPath: shard.clip }}
        />
      ))}
      <svg
        className="why-slark-finale-cracks"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden
      >
        <line x1="44" y1="0" x2="26" y2="46" />
        <line x1="44" y1="0" x2="64" y2="40" />
        <line x1="26" y1="46" x2="64" y2="40" />
        <line x1="64" y1="40" x2="100" y2="36" />
        <line x1="26" y1="46" x2="0" y2="58" />
        <line x1="26" y1="46" x2="38" y2="56" />
        <line x1="38" y1="56" x2="56" y2="66" />
        <line x1="56" y1="66" x2="76" y2="62" />
        <line x1="76" y1="62" x2="100" y2="70" />
        <line x1="38" y1="56" x2="20" y2="100" />
        <line x1="56" y1="66" x2="50" y2="100" />
        <line x1="76" y1="62" x2="100" y2="100" />
      </svg>
      <div className="why-slark-finale-belt-frame" />
    </div>
  );
}

function WhySlarkFeatureCardContent({ feature, index, className = '' }) {
  const step = String(index + 1).padStart(2, '0');
  const accent = feature.accent || C.primary;

  return (
    <article className={`why-slark-feature-card ${className}`.trim()}>
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-end">
          <span
            className="font-cyber text-[10px] font-bold tracking-[0.28em]"
            style={{ color: C.textMuted }}
          >
            {step}
          </span>
        </div>

        {feature.tag ? (
          <p
            className="mt-4 font-cyber text-[10px] font-bold uppercase tracking-[0.22em]"
            style={{ color: accent }}
          >
            {feature.tag}
          </p>
        ) : null}

        <h3
          className={`font-cyber font-bold leading-snug ${feature.tag ? 'mt-2' : 'mt-4'} text-base sm:text-lg`}
          style={{ color: C.text }}
        >
          {feature.title}
        </h3>
        <p className="mt-2.5 text-sm leading-relaxed" style={{ color: C.textMuted }}>
          {feature.body}
        </p>
      </div>
    </article>
  );
}

function WhySlarkTitle({ title, className = '' }) {
  const parts = title.split(/(Slark)/i);
  return (
    <div className="why-slark-feature-card why-slark-title-card inline-block px-6 py-4 sm:px-10 sm:py-5">
      <h2 className={`font-cyber font-bold ${className}`} style={{ color: C.text }}>
        {parts.map((part, i) =>
          /^slark$/i.test(part) ? (
            <span key={i} style={{ color: C.primary }}>
              {part}
            </span>
          ) : (
            part
          ),
        )}
      </h2>
    </div>
  );
}

const FeatureCard = forwardRef(function FeatureCard({ feature, index }, ref) {
  return (
    <div
      ref={ref}
      className="why-slark-card pointer-events-none absolute inset-0"
      style={{
        opacity: 0,
        visibility: 'hidden',
        transformOrigin: 'center center',
      }}
    >
      <WhySlarkFeatureCardContent feature={feature} index={index} />
    </div>
  );
});

/**
 * @param {object} props
 * @param {string} props.title
 * @param {string} props.brandName
 * @param {string} [props.finaleTagline]
 * @param {string} [props.scrollHint]
 * @param {{ type: string; tag?: string; title: string; body: string; accent: string }[]} props.features
 */
export function WhySlarkScrollSection({ title, brandName, finaleTagline, scrollHint, features }) {
  const sectionRef = useRef(/** @type {HTMLElement | null} */ (null));
  const stickyRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const canvasRef = useRef(/** @type {HTMLCanvasElement | null} */ (null));
  const headingRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const sceneWrapRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const finaleRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const finaleTextRef = useRef(/** @type {HTMLDivElement | null} */ (null));
  const finaleBeltRef = useRef(/** @type {HTMLDivElement | null} */ (null));
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

    bindLandingScrollProxy(scrollerEl);

    const cards = cardsRef.current.filter(Boolean);
    const finale = finaleRef.current;
    const finaleText = finaleTextRef.current;
    const finaleBelt = finaleBeltRef.current;
    const heading = headingRef.current;
    const sceneWrap = sceneWrapRef.current;
    const scrollHintEl = scrollHintRef.current;

    gsap.set(cards, { autoAlpha: 0, scale: 0.55, transformOrigin: 'center center' });
    if (finale) gsap.set(finale, { autoAlpha: 0, visibility: 'hidden' });
    if (finaleText) gsap.set(finaleText, { opacity: 0, visibility: 'hidden', scale: 0.94, y: 0, zIndex: 20 });
    if (finaleBelt) {
      finaleBelt.querySelectorAll('[data-glass-shard]').forEach((el) => {
        gsap.set(el, { opacity: 0, visibility: 'hidden', x: 0, y: 0, rotation: 0, scale: 1 });
      });
      const solid = finaleBelt.querySelector('[data-belt-solid]');
      if (solid) gsap.set(solid, { opacity: 0, visibility: 'hidden', scale: 0.97 });
      const cracks = finaleBelt.querySelector('.why-slark-finale-cracks');
      if (cracks) gsap.set(cracks, { opacity: 0 });
      const frame = finaleBelt.querySelector('.why-slark-finale-belt-frame');
      if (frame) gsap.set(frame, { opacity: 0 });
    }
    if (finaleBelt) gsap.set(finaleBelt, { visibility: 'hidden', opacity: 1 });
    if (heading) gsap.set(heading, { autoAlpha: 0 });
    if (sceneWrap) gsap.set(sceneWrap, { autoAlpha: 0 });

    const cardWindows = [
      { in: 0.14, out: 0.34 },
      { in: 0.36, out: 0.56 },
      { in: 0.58, out: 0.78 },
    ];

    const TITLE_HOLD_END = 0.06;
    const TITLE_FADE_END = 0.14;

    /** Globe assembles while cards 2–3 play. */
    function mapGlobeProgress(p) {
      return clamp01((p - 0.36) / 0.48);
    }

    function headingAlpha(p) {
      if (p < TITLE_HOLD_END) return 1;
      if (p < TITLE_FADE_END) return 1 - (p - TITLE_HOLD_END) / (TITLE_FADE_END - TITLE_HOLD_END);
      return 0;
    }

    function sceneAlpha(p) {
      if (p < TITLE_FADE_END) return 0;
      return Math.min(1, (p - TITLE_FADE_END) / 0.06);
    }

    function scaleFromSmall(t) {
      if (t <= 0) return 0.55;
      if (t >= 1) return 1;
      const eased = 1 - (1 - t) ** 3;
      return 0.55 + eased * 0.45;
    }

    function setCardMotion(card, alpha, { enterT = 1, exitT = 1 } = {}) {
      let scale = 0.55;
      if (alpha > 0) {
        if (exitT < 1) scale = scaleFromSmall(exitT);
        else if (enterT < 1) scale = scaleFromSmall(enterT);
        else scale = 1;
      }
      gsap.set(card, {
        autoAlpha: alpha,
        scale,
        transformOrigin: 'center center',
      });
    }

    function cardAlpha(p, win) {
      const fade = 0.05;
      if (p < win.in) return 0;
      if (win.in > 0 && p < win.in + fade) return (p - win.in) / fade;
      if (p < win.out - fade) return 1;
      if (p < win.out) return (win.out - p) / fade;
      return 0;
    }

    function showScene(p) {
      globe.setEntrance(1);
      globe.setProgress(mapGlobeProgress(p));
      if (sceneWrap) gsap.set(sceneWrap, { autoAlpha: sceneAlpha(p) });

      cards.forEach((card, i) => {
        const win = cardWindows[i];
        if (!card || !win) return;
        const alpha = cardAlpha(p, win);
        let enterT = Math.min(1, Math.max(0, (p - win.in) / 0.08));
        const exitT = Math.min(1, Math.max(0, (win.out - p) / 0.08));
        setCardMotion(card, alpha, { enterT, exitT });
      });

      if (heading) {
        gsap.set(heading, { autoAlpha: headingAlpha(p) });
      }

      if (finale) {
        const inFinale = p >= 0.78;
        gsap.set(finale, {
          autoAlpha: inFinale ? 1 : 0,
          visibility: inFinale ? 'visible' : 'hidden',
        });
      }

      if (finaleText) {
        const textT = Math.max(0, (p - 0.82) / 0.12);
        const textEased = 1 - (1 - Math.min(1, textT)) ** 3;
        const textVisible = p >= 0.82 && textEased > 0.01;
        gsap.set(finaleText, {
          opacity: textVisible ? textEased : 0,
          visibility: textVisible ? 'visible' : 'hidden',
          scale: 0.94 + textEased * 0.06,
          y: 0,
          zIndex: 20,
          force3D: true,
        });
      }

      if (finaleBelt) {
        applySlarkGlassBelt(finaleBelt, p, { isMobile, reducedMotion });
      }

      if (scrollHintEl) {
        const hintAlpha = p < 0.04 ? 1 : Math.max(0, 1 - (p - 0.04) / 0.06);
        gsap.set(scrollHintEl, { autoAlpha: hintAlpha });
      }
    }

    function applyEntrance(t) {
      const eased = 1 - (1 - t) ** 2.2;
      globe.setEntrance(eased);
      globe.setProgress(0);
      if (sceneWrap) gsap.set(sceneWrap, { autoAlpha: 0 });
      if (heading) gsap.set(heading, { autoAlpha: eased });
      cards.forEach((card) => {
        if (!card) return;
        gsap.set(card, { autoAlpha: 0, scale: 0.55, transformOrigin: 'center center' });
      });
      if (scrollHintEl) gsap.set(scrollHintEl, { autoAlpha: eased });
      if (finale) gsap.set(finale, { autoAlpha: 0, visibility: 'hidden' });
      if (finaleText) gsap.set(finaleText, { opacity: 0, visibility: 'hidden', scale: 0.94 });
      if (finaleBelt) applySlarkGlassBelt(finaleBelt, -1, { isMobile, reducedMotion });
    }

    function scrollLen() {
      const vh = scrollerEl?.clientHeight ?? window.innerHeight;
      return isMobile ? vh * 4.4 : vh * 5.4;
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
      } else if (raw < ENTRANCE_SHARE + PAUSE_SHARE) {
        showScene(0);
      } else {
        showScene((raw - ENTRANCE_SHARE - PAUSE_SHARE) / ANIM_SHARE);
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
      section.style.height = '';
      sticky.style.height = '';
      globe.dispose();
    };
  }, [features, title]);

  return (
    <section id="features" ref={sectionRef} className="relative" style={{ backgroundColor: C.bg }}>
      <div ref={staticGridRef} hidden className="px-4 py-20 sm:px-6">
        <div className="mx-auto max-w-6xl text-center">
          <WhySlarkTitle title={title} className="text-3xl sm:text-5xl md:text-6xl" />
        </div>
        <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
          {features.map((feature, index) => (
            <WhySlarkFeatureCardContent key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>

      <div
        ref={stickyRef}
        className="sticky top-0 z-10 flex w-full items-center justify-center overflow-x-hidden overflow-y-visible"
        style={{ backgroundColor: C.bg }}
      >
        <div
          ref={headingRef}
          className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-full max-w-3xl -translate-x-1/2 -translate-y-1/2 px-4 text-center"
        >
          <WhySlarkTitle title={title} className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl" />
        </div>

        <div ref={sceneWrapRef} className="why-slark-globe-layer absolute inset-0 z-0">
          <canvas ref={canvasRef} className="block h-full w-full" aria-hidden />
        </div>

        <div className="pointer-events-none absolute left-1/2 top-1/2 z-20 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 sm:w-[22rem]">
          <div className="relative min-h-[12.5rem] sm:min-h-[13.5rem]">
            {features.map((feature, i) => (
              <FeatureCard
                key={feature.title}
                feature={feature}
                index={i}
                ref={(el) => {
                  cardsRef.current[i] = el;
                }}
              />
            ))}
          </div>
        </div>

        <div
          ref={finaleRef}
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center overflow-visible px-4"
        >
          <div className="why-slark-finale-wrap relative inline-block min-h-[5.5rem] min-w-[min(82vw,22rem)] max-w-[min(92vw,40rem)] text-center sm:min-h-[6.5rem] sm:min-w-[min(78vw,32rem)] md:min-w-[min(72vw,38rem)]">
            <SlarkFinaleGlassBelt beltRef={finaleBeltRef} />
            <div ref={finaleTextRef} className="relative z-20 px-6 py-3 sm:px-10 sm:py-4">
              <h3
                className="font-cyber text-4xl font-bold tracking-[0.18em] sm:text-6xl md:text-7xl"
                style={{
                  color: '#C62828',
                  textShadow:
                    '0 0 20px rgba(255,255,255,0.95), 0 2px 16px rgba(198,40,40,0.35)',
                }}
              >
                {brandName}
              </h3>
              {finaleTagline ? (
                <p
                  className="mt-2.5 text-xs font-medium leading-relaxed sm:mt-3 sm:text-sm"
                  style={{
                    color: '#1F2937',
                    textShadow: '0 0 12px rgba(255,255,255,0.9)',
                  }}
                >
                  {finaleTagline}
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <p
          ref={scrollHintRef}
          className="pointer-events-none absolute bottom-6 left-0 right-0 z-20 text-center text-[10px] font-medium uppercase tracking-[0.3em] text-[#4B5563] sm:text-xs"
          style={{ textShadow: '0 1px 8px rgba(255,255,255,0.9)' }}
          aria-hidden
        >
          {scrollHint || 'Scroll'}
        </p>
      </div>
    </section>
  );
}
