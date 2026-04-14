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
    if (low.startsWith('file_inclusion')) return 'fileInclusion';
    if (low.startsWith('cmd_injection')) return 'cmdInjection';
    if (low.startsWith('auth_bypass')) return 'authBypass';
    if (low === 'brute_force' || low.startsWith('brute')) return 'bruteForce';
    if (low.startsWith('scanner')) return 'scanner';
    if (low.startsWith('bot_activity')) return 'botActivity';
    if (low.startsWith('suspicious_request')) return 'suspiciousRequest';
    if (low.startsWith('bad_ua')) return 'suspiciousUa';
    if (low === 'ddos_flood' || low.startsWith('ddos')) return 'ddos';
  }

  const tl = String(attack.targetLabel || '');
  if (tl.includes('SQLi:')) return 'sqli';
  if (tl.includes('XSS:')) return 'xss';
  if (tl.includes('PathTrav:')) return 'pathTraversal';
  if (tl.includes('FileInclude:')) return 'fileInclusion';
  if (tl.includes('Cmd:')) return 'cmdInjection';
  if (tl.includes('AuthBypass:')) return 'authBypass';
  if (tl.includes('BruteForce')) return 'bruteForce';
  if (tl.includes('Scanner:')) return 'scanner';
  if (tl.includes('Bot:')) return 'botActivity';
  if (tl.includes('Suspicious:')) return 'suspiciousRequest';
  if (tl.includes('UA:')) return 'suspiciousUa';
  if (tl.includes('flood')) return 'ddos';

  if (attack.category === 'ddos') return 'ddos';
  if (attack.category === 'botnet') return 'botActivity';

  return null;
}

export const PROTECTION_ORDER = [
  'sqli',
  'xss',
  'bruteForce',
  'pathTraversal',
  'fileInclusion',
  'cmdInjection',
  'authBypass',
  'scanner',
  'botActivity',
  'suspiciousRequest',
  'suspiciousUa',
  'ddos',
];
