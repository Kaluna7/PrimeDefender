import { ScrollTrigger } from 'gsap/ScrollTrigger';

/** GSAP ScrollTrigger proxy for the app’s custom scroll container. */
export function bindLandingScrollProxy(scrollerEl) {
  if (!scrollerEl) return;
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
