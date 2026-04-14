import { DDOS_VECTOR, THREAT_CATEGORY } from '../constants/threatCategories.js';

/**
 * Realistic country / region pairs (approximate metro coordinates) for showroom demos
 * similar to enterprise threat-map feeds (source → target labels on the map).
 */
export const DEMO_THREAT_ROUTES = [
  {
    from: { lat: 52.23, lon: 21.01 },
    to: { lat: 52.37, lon: 4.9 },
    sourceLabel: 'Poland',
    targetLabel: 'Netherlands',
    category: THREAT_CATEGORY.INTRUSION,
    severity: 'high',
    detection: 'sqli:union_select',
  },
  {
    from: { lat: 60.17, lon: 24.94 },
    to: { lat: 52.52, lon: 13.41 },
    sourceLabel: 'Finland',
    targetLabel: 'Germany',
    category: THREAT_CATEGORY.MALWARE,
    severity: 'critical',
    detection: 'malware:dropper',
  },
  {
    from: { lat: 38.72, lon: -9.14 },
    to: { lat: 51.51, lon: -0.13 },
    sourceLabel: 'Portugal',
    targetLabel: 'United Kingdom',
    category: THREAT_CATEGORY.INTRUSION,
    severity: 'medium',
    path: '/admin/login',
  },
  {
    from: { lat: 40.71, lon: -74.01 },
    to: { lat: 50.11, lon: 8.68 },
    sourceLabel: 'United States',
    targetLabel: 'Germany',
    category: THREAT_CATEGORY.DDOS,
    severity: 'high',
    ddos: { vector: DDOS_VECTOR.VOLUMETRIC, peakGbps: 12.4 },
  },
  {
    from: { lat: 37.77, lon: -122.42 },
    to: { lat: 48.86, lon: 2.35 },
    sourceLabel: 'United States (West)',
    targetLabel: 'France',
    category: THREAT_CATEGORY.DDOS,
    severity: 'high',
    ddos: { vector: DDOS_VECTOR.APPLICATION, peakGbps: 3.2 },
  },
  {
    from: { lat: 39.9, lon: 116.4 },
    to: { lat: 35.68, lon: 139.69 },
    sourceLabel: 'China',
    targetLabel: 'Japan',
    category: THREAT_CATEGORY.INTRUSION,
    severity: 'medium',
    detection: 'brute_force:login',
  },
  {
    from: { lat: 19.08, lon: 72.88 },
    to: { lat: 1.35, lon: 103.82 },
    sourceLabel: 'India',
    targetLabel: 'Singapore',
    category: THREAT_CATEGORY.BOTNET,
    severity: 'high',
  },
  {
    from: { lat: -23.55, lon: -46.63 },
    to: { lat: -33.87, lon: 151.21 },
    sourceLabel: 'Brazil',
    targetLabel: 'Australia',
    category: THREAT_CATEGORY.MALWARE,
    severity: 'medium',
  },
  {
    from: { lat: 10.82, lon: 106.63 },
    to: { lat: 35.68, lon: 139.69 },
    sourceLabel: 'Vietnam',
    targetLabel: 'Japan',
    category: THREAT_CATEGORY.DDOS,
    severity: 'critical',
    ddos: { vector: DDOS_VECTOR.VOLUMETRIC, peakGbps: 22.1 },
  },
  {
    from: { lat: 51.51, lon: -0.13 },
    to: { lat: 40.71, lon: -74.01 },
    sourceLabel: 'United Kingdom',
    targetLabel: 'United States',
    category: THREAT_CATEGORY.INTRUSION,
    severity: 'high',
    path: '/api/v1/billing',
  },
];

function randomDemoIp() {
  return `203.0.113.${10 + Math.floor(Math.random() * 240)}`;
}

/**
 * @returns {Record<string, unknown>} raw payload for `normalizeAttackPayload`
 */
export function buildRandomDemoPayload() {
  const base = DEMO_THREAT_ROUTES[Math.floor(Math.random() * DEMO_THREAT_ROUTES.length)];
  const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  return {
    ...base,
    id,
    createdAt: Date.now(),
    blocked: Math.random() > 0.25,
    action: 'blocked',
    attackerIp: randomDemoIp(),
    userAgent: 'Mozilla/5.0 (compatible; demo-feed/1.0)',
  };
}
