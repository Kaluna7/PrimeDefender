/** @param {(key: string) => string} t @param {{ id: string }} plan */
export function planTitle(t, plan) {
  if (plan.id === 'sub_6m') return t('purchase.plan6m');
  if (plan.id === 'sub_1y') return t('purchase.plan1y');
  return t('purchase.plan2y');
}
