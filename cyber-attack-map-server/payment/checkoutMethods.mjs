/**
 * Metode pembayaran — hanya yang didukung Midtrans Core API / Snap.
 * @see https://docs.midtrans.com/docs/which-payment-methods-do-midtrans-currently-support
 */
export const CHECKOUT_PAYMENT_METHODS = [
  // —— E-Wallet ——
  {
    id: 'gopay',
    paymentType: 'gopay',
    category: 'ewallet',
    brandColor: '#00AED6',
    icon: 'gopay',
    labelEn: 'GoPay',
    labelId: 'GoPay',
    descriptionEn: 'GoPay / Gojek app',
    descriptionId: 'Aplikasi GoPay / Gojek',
  },
  {
    id: 'shopeepay',
    paymentType: 'shopeepay',
    category: 'ewallet',
    brandColor: '#EE4D2D',
    icon: 'shopeepay',
    labelEn: 'ShopeePay',
    labelId: 'ShopeePay',
    descriptionEn: 'Shopee app e-wallet (Midtrans supported)',
    descriptionId: 'E-wallet Shopee (didukung Midtrans)',
  },
  // —— QRIS ——
  {
    id: 'qris',
    paymentType: 'qris',
    category: 'qris',
    brandColor: '#E31E24',
    icon: 'qris',
    labelEn: 'QRIS',
    labelId: 'QRIS',
    descriptionEn: 'Scan with any QRIS-compatible app',
    descriptionId: 'Scan dengan aplikasi QRIS',
  },
  // —— Bank transfer / VA ——
  {
    id: 'bca_va',
    paymentType: 'bank_transfer',
    bank: 'bca',
    category: 'va',
    brandColor: '#00529C',
    icon: 'bca',
    labelEn: 'BCA Virtual Account',
    labelId: 'Virtual Account BCA',
    descriptionEn: 'BCA VA (Prima / Alto / Bersama)',
    descriptionId: 'VA BCA (Prima / Alto / Bersama)',
  },
  {
    id: 'bni_va',
    paymentType: 'bank_transfer',
    bank: 'bni',
    category: 'va',
    brandColor: '#F15A22',
    icon: 'bni',
    labelEn: 'BNI Virtual Account',
    labelId: 'Virtual Account BNI',
    descriptionEn: 'Inter-bank transfer supported',
    descriptionId: 'Mendukung transfer antarbank',
  },
  {
    id: 'bri_va',
    paymentType: 'bank_transfer',
    bank: 'bri',
    category: 'va',
    brandColor: '#00529C',
    icon: 'bri',
    labelEn: 'BRI Virtual Account',
    labelId: 'Virtual Account BRI',
    descriptionEn: 'Inter-bank transfer supported',
    descriptionId: 'Mendukung transfer antarbank',
  },
  {
    id: 'permata_va',
    paymentType: 'bank_transfer',
    bank: 'permata',
    category: 'va',
    brandColor: '#00A651',
    icon: 'permata',
    labelEn: 'Permata Virtual Account',
    labelId: 'Virtual Account Permata',
    descriptionEn: 'Inter-bank transfer supported',
    descriptionId: 'Mendukung transfer antarbank',
  },
  {
    id: 'mandiri_va',
    paymentType: 'echannel',
    category: 'va',
    brandColor: '#003D79',
    icon: 'mandiri',
    labelEn: 'Mandiri Bill Payment',
    labelId: 'Mandiri Bill Payment',
    descriptionEn: 'Livin / ATM Mandiri',
    descriptionId: 'Livin / ATM Mandiri',
  },
  {
    id: 'cimb_va',
    paymentType: 'bank_transfer',
    bank: 'cimb',
    category: 'va',
    brandColor: '#790008',
    icon: 'cimb',
    labelEn: 'CIMB Niaga Virtual Account',
    labelId: 'Virtual Account CIMB Niaga',
    descriptionEn: 'CIMB VA transfer',
    descriptionId: 'Transfer VA CIMB',
  },
  // —— Over the counter ——
  {
    id: 'indomaret',
    paymentType: 'cstore',
    store: 'indomaret',
    category: 'otc',
    brandColor: '#0054A6',
    icon: 'indomaret',
    labelEn: 'Indomaret',
    labelId: 'Indomaret',
    descriptionEn: 'Pay at Indomaret cashier',
    descriptionId: 'Bayar di kasir Indomaret',
  },
  {
    id: 'alfamart',
    paymentType: 'cstore',
    store: 'alfamart',
    category: 'otc',
    brandColor: '#ED1C24',
    icon: 'alfamart',
    labelEn: 'Alfamart',
    labelId: 'Alfamart',
    descriptionEn: 'Pay at Alfamart cashier',
    descriptionId: 'Bayar di kasir Alfamart',
  },
  // —— Cards (Snap redirect) ——
  {
    id: 'credit_card',
    paymentType: 'credit_card',
    category: 'card',
    brandColor: '#1A1F71',
    icon: 'card',
    labelEn: 'Credit / Debit Card',
    labelId: 'Kartu Kredit / Debit',
    descriptionEn: 'Visa, Mastercard, JCB, Amex',
    descriptionId: 'Visa, Mastercard, JCB, Amex',
    badges: ['visa', 'mastercard', 'jcb', 'amex'],
  },
];

export const PAYMENT_METHOD_CATEGORIES = [
  { id: 'ewallet', labelEn: 'E-Wallet', labelId: 'E-Wallet' },
  { id: 'qris', labelEn: 'QRIS', labelId: 'QRIS' },
  { id: 'va', labelEn: 'Bank Transfer', labelId: 'Transfer Bank' },
  { id: 'otc', labelEn: 'Over the Counter', labelId: 'Minimarket' },
  { id: 'card', labelEn: 'Credit / Debit Card', labelId: 'Kartu Kredit / Debit' },
];

export function resolveCheckoutMethod(methodId) {
  if (!methodId) return null;
  return CHECKOUT_PAYMENT_METHODS.find((m) => m.id === methodId) || null;
}

/**
 * @param {{ orderId: string, plan: object, email: string, name: string, method: object, frontendUrl?: string }} input
 */
export function buildCoreChargeBody(input) {
  const { orderId, plan, email, name, method, frontendUrl } = input;
  if (!method || method.paymentType === 'credit_card') return null;

  const base = {
    payment_type: method.paymentType,
    transaction_details: {
      order_id: orderId,
      gross_amount: plan.amount,
    },
    customer_details: {
      email,
      first_name: (name || email).slice(0, 40),
    },
    item_details: [
      {
        id: plan.id,
        price: plan.amount,
        quantity: 1,
        name: plan.nameId.slice(0, 50),
      },
    ],
    custom_expiry: {
      expiry_duration: 24,
      unit: 'hour',
    },
  };

  if (method.paymentType === 'bank_transfer' && method.bank) {
    base.bank_transfer = { bank: method.bank };
  }

  if (method.paymentType === 'gopay') {
    base.gopay = { enable_callback: true };
  }

  if (method.paymentType === 'shopeepay') {
    const finishUrl = frontendUrl
      ? `${frontendUrl}/purchase?status=finish&order_id=${orderId}`
      : undefined;
    base.shopeepay = { callback_url: finishUrl || 'https://midtrans.com/' };
  }

  if (method.paymentType === 'echannel') {
    base.echannel = {
      bill_info1: 'Payment:',
      bill_info2: 'Slark subscription',
    };
  }

  if (method.paymentType === 'cstore' && method.store) {
    base.cstore = {
      store: method.store,
      message: 'Slark API subscription',
    };
  }

  return base;
}

/**
 * @param {ReturnType<typeof resolveCheckoutMethod>} method
 * @param {Record<string, unknown>} data
 */
export function parseChargeDisplay(method, data) {
  if (data.redirect_url) {
    return {
      type: 'redirect',
      redirectUrl: String(data.redirect_url),
      expiryTime: data.expiry_time || null,
    };
  }

  if (data.payment_code) {
    return {
      type: 'cstore',
      paymentCode: String(data.payment_code),
      store: method?.store || method?.id || 'store',
      expiryTime: data.expiry_time || null,
    };
  }

  if (Array.isArray(data.va_numbers) && data.va_numbers.length) {
    return {
      type: 'va',
      vaNumbers: data.va_numbers.map((v) => ({
        bank: String(v.bank || method?.bank || ''),
        vaNumber: String(v.va_number || ''),
      })),
      expiryTime: data.expiry_time || null,
    };
  }

  if (data.bill_key && data.biller_code) {
    return {
      type: 'mandiri',
      billKey: String(data.bill_key),
      billerCode: String(data.biller_code),
      expiryTime: data.expiry_time || null,
    };
  }

  if (data.qr_string) {
    return {
      type: 'qris',
      qrString: String(data.qr_string),
      expiryTime: data.expiry_time || null,
    };
  }

  const actions = Array.isArray(data.actions) ? data.actions : [];
  const deeplink = actions.find(
    (a) => a.name === 'deeplink-redirect' || a.name === 'mobile-deeplink' || a.name === 'activation-deeplink'
  );
  if (deeplink?.url) {
    return {
      type: 'deeplink',
      deeplinkUrl: String(deeplink.url),
      appName: method?.id || 'ewallet',
      expiryTime: data.expiry_time || null,
    };
  }

  const qrAction = actions.find((a) => a.name === 'generate-qr-code');
  if (qrAction?.url) {
    return {
      type: 'qris',
      qrUrl: String(qrAction.url),
      expiryTime: data.expiry_time || null,
    };
  }

  return {
    type: 'pending',
    expiryTime: data.expiry_time || null,
    transactionStatus: data.transaction_status || null,
  };
}
