import { useEffect, useState } from 'react';
import { resolveCountryCode } from '../../utils/resolveCountryCode.js';
import { getCountryFlagSources } from './countryFlagAssets.js';

function FlagPlaceholder({ className = '', size = 'sm' }) {
  const box =
    size === 'md'
      ? 'h-[18px] w-[27px] rounded-[3px]'
      : 'h-[14px] w-[21px] rounded-[2px]';

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center border border-slate-600/45 bg-slate-800/80 text-[7px] text-slate-500 ${box} ${className}`}
      aria-hidden
    >
      ·
    </span>
  );
}

/**
 * @param {{ attack?: object; code?: string; className?: string; size?: 'sm' | 'md' }} props
 */
export function CountryFlag({ attack, code, className = '', size = 'sm' }) {
  const resolved = code || resolveCountryCode(attack);
  const sources = getCountryFlagSources(resolved);
  const [sourceIndex, setSourceIndex] = useState(0);

  useEffect(() => {
    setSourceIndex(0);
  }, [resolved]);

  const box =
    size === 'md'
      ? 'h-[18px] w-[27px] rounded-[3px]'
      : 'h-[14px] w-[21px] rounded-[2px]';

  if (!sources.length) return <FlagPlaceholder className={className} size={size} />;

  const src = sources[Math.min(sourceIndex, sources.length - 1)];

  return (
    <span
      className={`inline-flex shrink-0 overflow-hidden border border-slate-600/40 bg-slate-900 shadow-sm ${box} ${className}`}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        className="block h-full w-full object-cover"
        loading="lazy"
        decoding="async"
        onError={() => {
          setSourceIndex((i) => (i + 1 < sources.length ? i + 1 : i));
        }}
      />
    </span>
  );
}
