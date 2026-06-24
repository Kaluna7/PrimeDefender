import { forwardRef, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SLARK as C } from '../../../theme/slarkColors.js';
import { createWhySlarkGlobe } from './whySlarkGlobe.js';
import { bindLandingScrollProxy } from '../../../utils/landingScrollProxy.js';

gsap.registerPlugin(ScrollTrigger);

const ENTRANCE_SHARE = 0.1;

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
  const beltT = clamp01((p - 0.82) / 0.18);
  const beltVisible = p >= 0.82;
  const shardScale = isMobile ? 0.72 : 1;
  const scatterMax = isMobile ? 1.15 : 1.35;

  gsap.set(beltEl, {
    visibility: beltVisible ? 'visible' : 'hidden',
    opacity: beltVisible ? 1 : 0,
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

  const appearT = clamp01(beltT / 0.08);
  const mergeT = clamp01((beltT - 0.08) / 0.5);
  const fuseT = clamp01((beltT - 0.55) / 0.45);
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
      opacity: beltVisible ? shardAlpha : 0,
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
      className={`why-slark-card pointer-events-none absolute z-20 w-[min(18rem,calc(100vw-2.5rem))] rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] p-4 shadow-[0_16px_48px_rgba(17,24,39,0.18)] sm:w-72 sm:p-5 ${
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

    gsap.set(cards, { autoAlpha: 0, x: 0 });
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
    if (finaleBelt) gsap.set(finaleBelt, { opacity: 0, visibility: 'hidden' });
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
        const headAlpha = p < 0.18 ? 1 : Math.max(0, 1 - (p - 0.18) / 0.14);
        gsap.set(heading, { autoAlpha: headAlpha });
      }

      if (finale) {
        const inFinale = p >= 0.7;
        gsap.set(finale, {
          autoAlpha: inFinale ? 1 : 0,
          visibility: inFinale ? 'visible' : 'hidden',
        });
      }

      if (finaleText) {
        const textT = Math.max(0, (p - 0.7) / 0.12);
        const textEased = 1 - (1 - Math.min(1, textT)) ** 3;
        const textVisible = p >= 0.7 && textEased > 0.01;
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
      if (finale) gsap.set(finale, { autoAlpha: 0, visibility: 'hidden' });
      if (finaleText) gsap.set(finaleText, { opacity: 0, visibility: 'hidden', scale: 0.94 });
      if (finaleBelt) applySlarkGlassBelt(finaleBelt, -1, { isMobile, reducedMotion });
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
      section.style.height = '';
      sticky.style.height = '';
      globe.dispose();
    };
  }, [features]);

  return (
    <section id="features" ref={sectionRef} className="relative" style={{ backgroundColor: C.bg }}>
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
              className="rounded-2xl border p-6"
              style={{ borderColor: C.border, backgroundColor: C.bg }}
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
        className="sticky top-0 z-10 flex w-full items-center justify-center overflow-hidden"
        style={{ backgroundColor: C.bg }}
      >
        <div
          ref={headingRef}
          className="pointer-events-none absolute left-0 right-0 top-[8%] z-20 px-4 text-center sm:top-[10%]"
        >
          <p
            className="font-cyber text-[10px] uppercase tracking-[0.4em] sm:text-xs"
            style={{ color: C.primary, textShadow: '0 1px 12px rgba(255,255,255,0.95)' }}
          >
            {eyebrow}
          </p>
          <h2
            className="font-cyber mt-3 text-xl font-bold sm:text-3xl md:text-4xl"
            style={{ color: C.text, textShadow: '0 2px 24px rgba(255,255,255,0.9)' }}
          >
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
          className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center px-4"
        >
          <div className="why-slark-finale-wrap relative inline-block min-w-[min(82vw,22rem)] max-w-[min(92vw,40rem)] text-center sm:min-w-[min(78vw,32rem)] md:min-w-[min(72vw,38rem)]">
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
