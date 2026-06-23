/** Subscription plans (IDR, Midtrans). */
export const SUBSCRIPTION_PLANS = {
  sub_6m: {
    id: 'sub_6m',
    months: 6,
    amount: 349000,
    nameEn: 'API access — 6 months',
    nameId: 'Akses API — 6 bulan',
    labelEn: '6 months',
    labelId: '6 bulan',
  },
  sub_1y: {
    id: 'sub_1y',
    months: 12,
    amount: 599000,
    nameEn: 'API access — 1 year',
    nameId: 'Akses API — 1 tahun',
    labelEn: '1 year',
    labelId: '1 tahun',
  },
  sub_2y: {
    id: 'sub_2y',
    months: 24,
    amount: 1199000,
    nameEn: 'API access — 2 years',
    nameId: 'Akses API — 2 tahun',
    labelEn: '2 years',
    labelId: '2 tahun',
  },
};

export function getPlan(planId) {
  return SUBSCRIPTION_PLANS[planId] || null;
}

export function listPlans() {
  return Object.values(SUBSCRIPTION_PLANS);
}
