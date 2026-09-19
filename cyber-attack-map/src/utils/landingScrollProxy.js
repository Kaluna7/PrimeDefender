import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** @type {import('lenis').default | null} */
let landingLenis = null;

/** @param {import('lenis').default | null} lenis */
export function setLandingLenis(lenis) {
  landingLenis = lenis;
}

/** GSAP ScrollTrigger proxy for the app’s custom scroll container (+ Lenis when active). */
export function bindLandingScrollProxy(scrollerEl) {
  if (!scrollerEl) return;
  ScrollTrigger.scrollerProxy(scrollerEl, {
    scrollTop(value) {
      if (arguments.length) {
        if (landingLenis) {
          landingLenis.scrollTo(value, { immediate: true });
        } else {
          scrollerEl.scrollTop = value;
        }
      }
      return landingLenis ? landingLenis.scroll : scrollerEl.scrollTop;
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
