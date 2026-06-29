import googleMapIcon from '../../assets/google_map.webp';
import { googleMapsSearchUrl } from '../../utils/googleMaps.js';

/**
 * @param {{
 *   point?: { lat?: number; lon?: number } | null;
 *   href?: string | null;
 *   label?: string;
 *   className?: string;
 * }} props
 */
export function GoogleMapsLink({ point, href, label = 'Open in Google Maps', className = '' }) {
  const url = href ?? googleMapsSearchUrl(point);
  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex shrink-0 items-center justify-center transition hover:opacity-80 ${className}`}
      aria-label={label}
      title={label}
    >
      <img src={googleMapIcon} alt="" className="h-5 w-5 object-contain" loading="lazy" decoding="async" />
    </a>
  );
}
