import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { bindLandingScrollProxy, setLandingLenis } from './landingScrollProxy.js';

gsap.registerPlugin(ScrollTrigger);

/** @type {Lenis | null} */
let activeLenis = null;
/** @type {((time: number) => void) | null} */
let tickerFn = null;

/**
 * Smooth scroll for the landing page (`#app-scroll-root`).
 * Integrates with GSAP ScrollTrigger used by the 3D scroll sections.
 */
export function startLandingSmoothScroll() {
  if (typeof window === 'undefined') return () => {};

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) return () => {};

  const wrapper = document.getElementById('app-scroll-root');
  if (!wrapper) return () => {};

  const content = /** @type {HTMLElement | null} */ (wrapper.firstElementChild);
  if (!content) return () => {};

  stopLandingSmoothScroll();

  const lenis = new Lenis({
    wrapper,
    content,
    lerp: 0.075,
    wheelMultiplier: 0.62,
    touchMultiplier: 0.85,
    smoothWheel: true,
    syncTouch: false,
    autoRaf: false,
  });

  activeLenis = lenis;
  setLandingLenis(lenis);
  bindLandingScrollProxy(wrapper);

  lenis.on('scroll', ScrollTrigger.update);

  tickerFn = (time) => {
    lenis.raf(time * 1000);
  };
  gsap.ticker.add(tickerFn);
  gsap.ticker.lagSmoothing(0);

  requestAnimationFrame(() => ScrollTrigger.refresh());

  return () => {
    stopLandingSmoothScroll();
  };
}

export function stopLandingSmoothScroll() {
  if (tickerFn) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  if (activeLenis) {
    activeLenis.destroy();
    activeLenis = null;
  }
  setLandingLenis(null);
  gsap.ticker.lagSmoothing(500);
}
