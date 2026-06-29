import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import {
  getMidtransPaymentLogo,
  isSquarePaymentIcon,
  MIDTRANS_PAYMENT_LOGOS,
} from '../../constants/midtransPaymentLogos.js';

const LOGO_TILE =
  'flex h-9 w-[3.65rem] shrink-0 items-center justify-center overflow-hidden rounded-md bg-white p-0.5';

const ICON_IMAGE_CLASS = {
  gopay: 'h-8 w-8 object-contain object-center',
  qris: 'h-6 w-full max-w-[3.1rem] object-contain object-center',
  shopeepay: 'h-7 w-7 object-contain object-center',
  default: 'h-6 w-auto max-w-[3.1rem] object-contain object-center',
};

/**
 * @param {{ src: string, alt: string, iconKey?: string, onError?: () => void }} props
 */
function BrandImage({ src, alt, iconKey = 'default', onError }) {
  const imageClass = ICON_IMAGE_CLASS[iconKey] || ICON_IMAGE_CLASS.default;
  const square = isSquarePaymentIcon(iconKey);

  return (
    <img
      src={src}
      alt={alt}
      width={square ? 40 : iconKey === 'qris' ? 60 : 60}
      height={iconKey === 'qris' ? 28 : 40}
      className={imageClass}
      draggable={false}
      onError={onError}
    />
  );
}

/**
 * Logo brand pembayaran di tile putih (gaya Midtrans checkout).
 * @param {{ icon: string, label?: string, className?: string, variant?: 'single' | 'visa' | 'mastercard' }} props
 */
export function PaymentBrandLogo({ icon, label = '', className = '', variant = 'single' }) {
  const [failed, setFailed] = useState(false);

  if (variant === 'visa' || icon === 'visa') {
    return (
      <span className={`${LOGO_TILE} ${className}`}>
        <BrandImage src={MIDTRANS_PAYMENT_LOGOS.visa} alt="Visa" />
      </span>
    );
  }

  if (variant === 'mastercard' || icon === 'mastercard') {
    return (
      <span className={`${LOGO_TILE} ${className}`}>
        <BrandImage src={MIDTRANS_PAYMENT_LOGOS.mastercard} alt="Mastercard" />
      </span>
    );
  }

  const src = getMidtransPaymentLogo(icon);

  if (!src || failed) {
    return (
      <span className={`${LOGO_TILE} text-slate-400 ${className}`} title={label}>
        <CreditCard className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
    );
  }

  return (
    <span className={`${LOGO_TILE} ${className}`}>
      <BrandImage
        src={src}
        alt={label}
        iconKey={icon}
        onError={() => setFailed(true)}
      />
    </span>
  );
}
