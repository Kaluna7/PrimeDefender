import { useEffect, useMemo, useRef, useState } from 'react';

const TYPE_MS = 24;
const HOLD_MS = 3000;
const SLIDE_MS = 520;
const LINE_STAGGER_MS = 140;

/** @param {HTMLElement} element */
function splitTextIntoVisualLines(element) {
  const text = element.textContent?.replace(/\s+$/, '') ?? '';
  if (!text) return [''];

  const textNode = element.firstChild;
  if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
    return [text];
  }

  const range = document.createRange();
  const lines = [];
  let lineStart = 0;
  let prevTop = null;

  for (let i = 0; i < text.length; i += 1) {
    range.setStart(textNode, lineStart);
    range.setEnd(textNode, i + 1);
    const rects = range.getClientRects();
    if (!rects.length) continue;

    const top = rects[rects.length - 1].top;
    if (prevTop !== null && top > prevTop + 2) {
      lines.push(text.slice(lineStart, i).trimEnd());
      lineStart = i;
      if (text[i] === ' ') lineStart = i + 1;
    }
    prevTop = top;
  }

  lines.push(text.slice(lineStart).trimEnd());
  return lines.filter(Boolean);
}

/**
 * @param {object} props
 * @param {string[]} props.lines
 * @param {string} [props.className]
 */
export function LandingHeroTypingTitle({ lines, className = '' }) {
  const phrases = useMemo(() => lines.filter((line) => line?.trim()), [lines]);
  const contentRef = useRef(/** @type {HTMLSpanElement | null} */ (null));
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [display, setDisplay] = useState('');
  const [phase, setPhase] = useState(/** @type {'typing' | 'hold' | 'exit'} */ ('typing'));
  const [slideOut, setSlideOut] = useState(false);
  const [exitLines, setExitLines] = useState(/** @type {string[] | null} */ (null));

  useEffect(() => {
    setPhraseIndex(0);
    setDisplay('');
    setPhase('typing');
    setSlideOut(false);
    setExitLines(null);
  }, [phrases]);

  useEffect(() => {
    if (phrases.length === 0) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setDisplay(phrases[0]);
      return undefined;
    }

    const target = phrases[phraseIndex % phrases.length];
    let timer = 0;

    if (phase === 'typing') {
      if (display.length < target.length) {
        timer = window.setTimeout(() => {
          setDisplay(target.slice(0, display.length + 1));
        }, TYPE_MS);
      } else {
        timer = window.setTimeout(() => setPhase('hold'), 0);
      }
    } else if (phase === 'hold') {
      timer = window.setTimeout(() => {
        const measured = contentRef.current
          ? splitTextIntoVisualLines(contentRef.current)
          : [display];
        setExitLines(measured.length ? measured : [display]);
        setPhase('exit');
      }, HOLD_MS);
    }

    return () => window.clearTimeout(timer);
  }, [display, phase, phraseIndex, phrases]);

  useEffect(() => {
    if (phase !== 'exit' || !exitLines) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setSlideOut(true);
      return undefined;
    }

    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => setSlideOut(true));
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [phase, exitLines]);

  useEffect(() => {
    if (phase !== 'exit' || !exitLines || !slideOut) return undefined;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delay = reducedMotion
      ? 0
      : SLIDE_MS + Math.max(0, exitLines.length - 1) * LINE_STAGGER_MS;

    const timer = window.setTimeout(() => {
      setDisplay('');
      setSlideOut(false);
      setExitLines(null);
      setPhraseIndex((i) => (i + 1) % phrases.length);
      setPhase('typing');
    }, delay);

    return () => window.clearTimeout(timer);
  }, [phase, slideOut, exitLines, phrases.length]);

  const showCursor = phase === 'typing';
  const isExiting = phase === 'exit' && exitLines;

  return (
    <div className="landing-hero-typing-stage">
      <h1 className={className} aria-live="polite">
        {isExiting ? (
          <span className="landing-hero-typing-lines" aria-hidden>
            {exitLines.map((line, index) => (
              <span
                key={`${phraseIndex}-${index}`}
                className={`landing-hero-typing-line landing-hero-typing-line--stacked${
                  slideOut ? ' landing-hero-typing-line--exit' : ''
                }`}
                style={{
                  transitionDelay: slideOut ? `${index * LINE_STAGGER_MS}ms` : '0ms',
                }}
              >
                {line}
              </span>
            ))}
          </span>
        ) : (
          <span ref={contentRef} className="landing-hero-typing-line">
            {display}
            {showCursor ? <span className="landing-hero-cursor" aria-hidden /> : null}
          </span>
        )}
      </h1>
    </div>
  );
}
