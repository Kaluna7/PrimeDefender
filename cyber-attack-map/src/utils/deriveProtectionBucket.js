/**
 * Map ingest event to MVP protection bucket (middleware sets `detection` or labels in targetLabel).
 * @returns {string | null} bucket id or null if tidak masuk kategori perlindungan
 */
export function deriveProtectionBucket(attack) {
  const d = attack.detection;
  if (typeof d === 'string' && d.length) {
    const low = d.toLowerCase();
    if (low.startsWith('sqli')) return 'sqli';
    if (low.startsWith('xss')) return 'xss';
    if (low.startsWith('path_traversal')) return 'pathTraversal';
    if (low.startsWith('cmd_injection')) return 'cmdInjection';
    if (low === 'brute_force' || low.startsWith('brute')) return 'bruteForce';
    if (low.startsWith('bad_ua')) return 'suspiciousUa';
    if (low === 'ddos_flood' || low.startsWith('ddos')) return 'ddos';
  }

  const tl = String(attack.targetLabel || '');
  if (tl.includes('SQLi:')) return 'sqli';
  if (tl.includes('XSS:')) return 'xss';
  if (tl.includes('PathTrav:')) return 'pathTraversal';
  if (tl.includes('Cmd:')) return 'cmdInjection';
  if (tl.includes('BruteForce')) return 'bruteForce';
  if (tl.includes('UA:')) return 'suspiciousUa';
  if (tl.includes('flood')) return 'ddos';

  if (attack.category === 'ddos') return 'ddos';

  return null;
}

export const PROTECTION_ORDER = [
  'sqli',
  'xss',
  'bruteForce',
  'pathTraversal',
  'cmdInjection',
  'suspiciousUa',
  'ddos',
];
