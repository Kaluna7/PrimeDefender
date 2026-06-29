import alfamart from '../assets/payment-logos/alfamart.png';
import bca from '../assets/payment-logos/bca.png';
import bni from '../assets/payment-logos/bni.png';
import bri from '../assets/payment-logos/bri.png';
import cimb from '../assets/payment-logos/cimb.png';
import gopay from '../assets/payment-logos/gopay.png';
import indomaret from '../assets/payment-logos/indomaret.png';
import mandiri from '../assets/payment-logos/mandiri.png';
import mastercard from '../assets/payment-logos/mastercard.png';
import midtransWhite from '../assets/payment-logos/midtrans-white.png';
import permata from '../assets/payment-logos/permata.png';
import qris from '../assets/payment-logos/qris.png';
import shopeepay from '../assets/payment-logos/shopeepay.svg';
import visa from '../assets/payment-logos/visa.png';

/** Logo metode pembayaran — bundled lokal agar tajam di semua DPI. */
export const MIDTRANS_PAYMENT_LOGOS = {
  gopay,
  shopeepay,
  qris,
  bca,
  bni,
  bri,
  mandiri,
  permata,
  cimb,
  indomaret,
  alfamart,
  visa,
  mastercard,
  midtransWhite,
};

const SQUARE_ICONS = new Set(['gopay', 'shopeepay']);

/**
 * @param {string} icon
 * @returns {string | null}
 */
export function getMidtransPaymentLogo(icon) {
  return MIDTRANS_PAYMENT_LOGOS[icon] || null;
}

/**
 * @param {string} icon
 */
export function isSquarePaymentIcon(icon) {
  return SQUARE_ICONS.has(icon);
}
