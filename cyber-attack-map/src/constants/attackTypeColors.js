import { THREAT_CATEGORY } from './threatCategories.js';
import { deriveProtectionBucket } from '../utils/deriveProtectionBucket.js';

/** Map arc line colors by detection / protection bucket (monitoring threat map). */
export const ATTACK_TYPE_LINE_HEX = {
  sqli: '#DC2626',
  xss: '#9333EA',
  bruteForce: '#F59E0B',
  pathTraversal: '#2563EB',
  fileInclusion: '#06B6D4',
  cmdInjection: '#991B1B',
  authBypass: '#EC4899',
  scanner: '#EAB308',
  botActivity: '#16A34A',
  suspiciousRequest: '#64748B',
  suspiciousUa: '#4F46E5',
  ddos: '#EF4444',
};

export const ATTACK_TYPE_LABELS = {
  sqli: 'SQL Injection',
  xss: 'Cross-Site Scripting (XSS)',
  bruteForce: 'Brute Force Login',
  pathTraversal: 'Path Traversal',
  fileInclusion: 'File Inclusion',
  cmdInjection: 'Command Injection',
  authBypass: 'Auth Bypass Probe',
  scanner: 'Scanner Activity',
  botActivity: 'Bot Activity',
  suspiciousRequest: 'Suspicious Request',
  suspiciousUa: 'Suspicious User-Agent',
  ddos: 'DDoS / Flood',
};

function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [
    Number.parseInt(h.slice(0, 2), 16),
    Number.parseInt(h.slice(2, 4), 16),
    Number.parseInt(h.slice(4, 6), 16),
  ];
}

function rgbaFromHex(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

function lightenHex(hex, amount = 0.42) {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c) => Math.round(c + (255 - c) * amount);
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`;
}

/** @returns {keyof typeof ATTACK_TYPE_LINE_HEX} */
export function resolveAttackTypeKey(attack) {
  const bucket = deriveProtectionBucket(attack);
  if (bucket && ATTACK_TYPE_LINE_HEX[bucket]) return bucket;
  if (attack?.category === THREAT_CATEGORY.DDOS) return 'ddos';
  if (attack?.category === THREAT_CATEGORY.BOTNET) return 'botActivity';
  return 'suspiciousRequest';
}

/** ECharts arc / pulse palette for a normalized attack incident. */
export function getAttackArcColors(attack) {
  const key = resolveAttackTypeKey(attack);
  const line = ATTACK_TYPE_LINE_HEX[key] ?? ATTACK_TYPE_LINE_HEX.suspiciousRequest;

  return {
    key,
    line,
    hi: lightenHex(line),
    source: rgbaFromHex(line, 0.55),
    target: line,
    effect: rgbaFromHex(line, 0.75),
    shadow: rgbaFromHex(line, 0.42),
  };
}
