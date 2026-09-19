import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../../i18n/I18nContext.jsx';

const TICKER_KEYS = [
  'monitoring.mapTicker1',
  'monitoring.mapTicker2',
  'monitoring.mapTicker3',
  'monitoring.mapTicker5',
];

const SLIDE_IN_MS = 1400;
const SLIDE_OUT_MS = 1100;
const DISPLAY_DELAY_MS = 6000;
const HOLD_MS = SLIDE_IN_MS + DISPLAY_DELAY_MS;
const EXIT_MS = SLIDE_OUT_MS;

export function MapTickerBanner() {
  const { t } = useI18n();

  const phrases = useMemo(() => TICKER_KEYS.map((key) => t(key)), [t]);
  const [index, setIndex] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (phrases.length === 0) return undefined;

    const holdTimer = window.setTimeout(() => {
      setExiting(true);
    }, HOLD_MS);

    return () => window.clearTimeout(holdTimer);
  }, [index, phrases.length]);

  useEffect(() => {
    if (!exiting || phrases.length === 0) return undefined;

    const exitTimer = window.setTimeout(() => {
      setIndex((i) => (i + 1) % phrases.length);
      setExiting(false);
    }, EXIT_MS);

    return () => window.clearTimeout(exitTimer);
  }, [exiting, phrases.length]);

  if (phrases.length === 0) return null;

  return (
    <div
      className="map-ticker pointer-events-none absolute inset-x-0 top-4 z-30 overflow-hidden sm:top-5"
      aria-live="polite"
    >
      <div className="map-ticker-fade-left pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#0c1018] to-transparent sm:w-14" />
      <div className="map-ticker-fade-right pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#0c1018] to-transparent sm:w-14" />

      <div className="map-ticker-viewport py-2 sm:py-2.5">
        <p
          key={index}
          className={`map-ticker-text ${exiting ? 'map-ticker-text--exit' : 'map-ticker-text--enter'}`}
        >
          {phrases[index]}
        </p>
      </div>
    </div>
  );
}
