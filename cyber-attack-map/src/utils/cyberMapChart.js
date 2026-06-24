import * as echarts from 'echarts';
import worldGeo from '../assets/world.geo.json';
import { GEO_BOUNDING } from '../config/cyberMapConfig.js';
import { MAX_MAP_ARCS } from '../constants/monitoringLimits.js';
import { getAttackArcColors } from '../constants/attackTypeColors.js';
import { deriveProtectionBucket } from './deriveProtectionBucket.js';

let worldMapRegistered = false;

export function ensureWorldMapRegistered() {
  if (worldMapRegistered) return;
  echarts.registerMap('world', worldGeo);
  worldMapRegistered = true;
}

export function hasValidEndpoints(a) {
  const f = a?.from;
  const t = a?.to;
  return (
    f &&
    t &&
    typeof f.lat === 'number' &&
    typeof f.lon === 'number' &&
    typeof t.lat === 'number' &&
    typeof t.lon === 'number' &&
    Number.isFinite(f.lat) &&
    Number.isFinite(f.lon) &&
    Number.isFinite(t.lat) &&
    Number.isFinite(t.lon)
  );
}

/** Last N valid incidents — each stays on the map as new ones arrive (until cap). */
export function pickDisplayAttacks(attacks, maxArcs = MAX_MAP_ARCS) {
  return attacks.filter(hasValidEndpoints).slice(-maxArcs);
}

function quantizeCoord(n) {
  return Math.round(n * 100) / 100;
}

function routeKeyForAttack(a) {
  return [
    quantizeCoord(a.from.lat),
    quantizeCoord(a.from.lon),
    quantizeCoord(a.to.lat),
    quantizeCoord(a.to.lon),
  ].join('|');
}

function hashString(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function curvenessForRoute(routeKey) {
  const hash = hashString(routeKey);
  const lane = hash % 7;
  const sign = hash % 2 === 0 ? 1 : -1;
  return sign * (0.08 + lane * 0.024);
}

function collapseRoutes(attacks, selectedAttackId) {
  const byRoute = new Map();
  for (const attack of attacks) {
    const key = routeKeyForAttack(attack);
    const current = byRoute.get(key);
    if (!current) {
      byRoute.set(key, { attack, routeKey: key, count: 1 });
      continue;
    }

    current.count += 1;
    const selectedWins = selectedAttackId && attack.id === selectedAttackId;
    if (selectedWins || attack.createdAt >= current.attack.createdAt) {
      current.attack = selectedWins ? attack : attack;
    }
  }
  return Array.from(byRoute.values());
}

/** Per-route hues for defense section background — stable by route key. */
const DEFENSE_ARC_PALETTE = [
  { line: '#EF4444', hi: '#FCA5A5', source: 'rgba(239,68,68,0.52)', target: '#F87171', effect: 'rgba(248,113,113,0.62)', shadow: 'rgba(248,113,113,0.4)' },
  { line: '#F97316', hi: '#FDBA74', source: 'rgba(249,115,22,0.5)', target: '#FB923C', effect: 'rgba(251,146,60,0.62)', shadow: 'rgba(251,146,60,0.4)' },
  { line: '#FF9328', hi: '#FFD180', source: 'rgba(255,147,40,0.5)', target: '#FFB74D', effect: 'rgba(255,183,77,0.62)', shadow: 'rgba(255,183,77,0.4)' },
  { line: '#22D3EE', hi: '#A5F3FC', source: 'rgba(34,211,238,0.48)', target: '#22D3EE', effect: 'rgba(103,232,249,0.58)', shadow: 'rgba(103,232,249,0.38)' },
  { line: '#A855F7', hi: '#D8B4FE', source: 'rgba(168,85,247,0.48)', target: '#C084FC', effect: 'rgba(192,132,252,0.58)', shadow: 'rgba(192,132,252,0.38)' },
  { line: '#EC4899', hi: '#F9A8D4', source: 'rgba(236,72,153,0.48)', target: '#F472B6', effect: 'rgba(244,114,182,0.58)', shadow: 'rgba(244,114,182,0.38)' },
  { line: '#10B981', hi: '#6EE7B7', source: 'rgba(16,185,129,0.48)', target: '#34D399', effect: 'rgba(52,211,153,0.58)', shadow: 'rgba(52,211,153,0.38)' },
  { line: '#3B82F6', hi: '#93C5FD', source: 'rgba(59,130,246,0.48)', target: '#60A5FA', effect: 'rgba(96,165,250,0.58)', shadow: 'rgba(96,165,250,0.38)' },
  { line: '#C62828', hi: '#FF7043', source: 'rgba(198,40,40,0.52)', target: '#FF5722', effect: 'rgba(255,87,34,0.62)', shadow: 'rgba(255,87,34,0.4)' },
  { line: '#14B8A6', hi: '#5EEAD4', source: 'rgba(20,184,166,0.48)', target: '#2DD4BF', effect: 'rgba(45,212,191,0.58)', shadow: 'rgba(45,212,191,0.38)' },
];

function defenseArcColorsForRoute(routeKey) {
  return DEFENSE_ARC_PALETTE[hashString(routeKey) % DEFENSE_ARC_PALETTE.length];
}

function resolveArcHue(attack, routeKey, variant) {
  if (variant === 'monitoring') return getAttackArcColors(attack);
  if (variant === 'defense-bg') {
    if (deriveProtectionBucket(attack)) return getAttackArcColors(attack);
    return defenseArcColorsForRoute(routeKey);
  }
  return null;
}

const PALETTES = {
  monitoring: {
    geoBorder: 'rgba(100, 190, 220, 0.45)',
    landFill: 'rgba(38, 52, 74, 0.96)',
    landDot: 'rgba(150, 200, 230, 0.4)',
    lineColor: '#ff9328',
    lineHi: '#ffb020',
    lineOpacity: [0.62, 0.98],
    effectColor: 'rgba(255,160,70,0.75)',
    pulseSource: 'rgba(255,150,70,0.55)',
    pulseTarget: 'rgba(255,165,65,0.98)',
    showLabels: true,
    zoom: 1.08,
    layoutCenter: ['50%', '50%'],
    layoutSize: '100%',
  },
  'defense-bg': {
    geoBorder: 'rgba(100, 190, 220, 0.38)',
    landFill: 'rgba(30, 42, 64, 0.82)',
    landDot: 'rgba(148, 163, 184, 0.38)',
    lineColor: '#c62828',
    lineHi: '#ff9328',
    lineOpacity: [0.48, 0.88],
    effectColor: 'rgba(255,140,60,0.62)',
    pulseSource: 'rgba(198,40,40,0.62)',
    pulseTarget: 'rgba(255,147,80,0.92)',
    showLabels: false,
    zoom: 1.12,
    layoutCenter: ['50%', '54%'],
    layoutSize: '108%',
  },
};

/**
 * @param {object[]} landDots
 * @param {object[]} attacks
 * @param {{ selectedAttackId?: string | null, variant?: 'monitoring' | 'defense-bg', maxArcs?: number }} [options]
 */
export function buildCyberMapOption(landDots, attacks, options = {}) {
  ensureWorldMapRegistered();

  const {
    selectedAttackId = null,
    variant = 'monitoring',
    maxArcs = MAX_MAP_ARCS,
  } = options;
  const palette = PALETTES[variant] ?? PALETTES.monitoring;

  const landData = landDots.map((d) => ({
    value: d.position,
  }));

  const recent = attacks.slice(-maxArcs);
  const routes = collapseRoutes(recent, selectedAttackId);
  const highlightedIds = new Set(
    selectedAttackId ? [selectedAttackId] : routes.slice(-2).map((r) => r.attack.id).filter(Boolean),
  );

  const lineData = routes.map(({ attack: a, routeKey, count }, index) => {
    const baseW = Math.min(3, 1.1 + (a.ddos?.peakGbps ? Math.min(1.2, a.ddos.peakGbps * 0.04) : 0));
    const hi = highlightedIds.has(a.id);
    const curveness = curvenessForRoute(routeKey);
    const width = variant === 'defense-bg'
      ? hi ? 2.2 : Math.min(1.8, 1.1 + Math.min(0.3, (count - 1) * 0.08))
      : hi ? Math.max(baseW, 3.4) : Math.min(3.1, baseW + Math.min(0.45, (count - 1) * 0.12));

    const arcHue = resolveArcHue(a, routeKey, variant);
    const lineColor = arcHue ? (hi ? arcHue.hi : arcHue.line) : (hi ? palette.lineHi : palette.lineColor);
    const lineOpacity = hi
      ? palette.lineOpacity[1]
      : Math.max(palette.lineOpacity[0], palette.lineOpacity[0] + (index % 4) * 0.04);

    const item = {
      coords: [
        [a.from.lon, a.from.lat],
        [a.to.lon, a.to.lat],
      ],
      attackId: a.id,
      routeKey,
      routeCount: count,
      lineStyle: {
        width,
        curveness,
        opacity: lineOpacity,
        color: lineColor,
      },
    };

    if (arcHue) {
      item.effect = {
        show: true,
        color: hi ? arcHue.hi : arcHue.effect,
      };
    }

    return item;
  });

  const pulseData = [];
  for (const { attack: a, routeKey, count } of routes) {
    const selected = highlightedIds.has(a.id);
    const sourceTitle = a.sourceLabel || a.attackerIp || '';
    const targetTitle = a.targetLabel || a.sourceLabel || '';
    const arcHue = resolveArcHue(a, routeKey, variant);
    const pulseSource = arcHue ? arcHue.source : palette.pulseSource;
    const pulseTarget = arcHue ? (selected ? arcHue.hi : arcHue.target) : palette.pulseTarget;
    const shadowColor = arcHue ? arcHue.shadow : 'rgba(255,120,40,0.35)';

    pulseData.push({
      value: [a.from.lon, a.from.lat],
      attackId: a.id,
      name: sourceTitle,
      symbolSize: variant === 'defense-bg' ? 5 : Math.min(8, 5 + Math.min(3, count - 1)),
      itemStyle: {
        color: pulseSource,
        shadowBlur: variant === 'defense-bg' ? 4 : 8,
        shadowColor,
      },
      label: {
        show: palette.showLabels && Boolean(sourceTitle),
        formatter: '{b}',
        position: 'left',
        distance: 6,
        color: selected ? '#ffffff' : 'rgba(241,245,249,0.92)',
        fontSize: 10,
        fontWeight: selected ? 700 : 500,
        backgroundColor: selected ? 'rgba(8,12,20,0.82)' : 'rgba(8,12,20,0.58)',
        padding: [2, 5],
        borderRadius: 4,
      },
    });
    pulseData.push({
      value: [a.to.lon, a.to.lat],
      attackId: a.id,
      name: targetTitle,
      symbolSize: variant === 'defense-bg' ? (selected ? 8 : 6) : selected ? 12 : Math.min(10, 7 + Math.min(3, count - 1)),
      itemStyle: {
        color: pulseTarget,
        shadowBlur: selected ? (variant === 'defense-bg' ? 10 : 22) : variant === 'defense-bg' ? 6 : 12,
        shadowColor: arcHue ? arcHue.shadow : 'rgba(255,130,40,0.55)',
      },
      label: {
        show: palette.showLabels && Boolean(targetTitle),
        formatter: '{b}',
        color: selected ? '#ffffff' : 'rgba(241,245,249,0.88)',
        fontSize: 11,
        fontWeight: selected ? 700 : 500,
        position: 'right',
        distance: 6,
        backgroundColor: selected ? 'rgba(8,12,20,0.82)' : 'rgba(8,12,20,0.56)',
        padding: [2, 5],
        borderRadius: 4,
      },
    });
  }

  return {
    backgroundColor: 'transparent',
    tooltip: { show: false },
    geo: {
      map: 'world',
      roam: false,
      zoom: palette.zoom,
      center: [0, 14],
      boundingCoords: GEO_BOUNDING,
      aspectScale: 0.72,
      layoutCenter: palette.layoutCenter,
      layoutSize: palette.layoutSize,
      itemStyle: {
        areaColor: palette.landFill,
        borderColor: palette.geoBorder,
        borderWidth: 0.7,
      },
      emphasis: { disabled: true },
      silent: true,
    },
    series: [
      {
        id: 'land',
        type: 'scatter',
        coordinateSystem: 'geo',
        zlevel: 1,
        silent: true,
        data: landData,
        symbolSize: variant === 'defense-bg' ? 1.1 : 1.4,
        itemStyle: {
          color: palette.landDot,
        },
        large: true,
        largeThreshold: 2500,
        progressive: 600,
        animation: false,
      },
      {
        id: 'arcs',
        type: 'lines',
        coordinateSystem: 'geo',
        zlevel: 2,
        data: lineData,
        effect: {
          show: true,
          period: variant === 'defense-bg' ? 5.8 + (routes.length % 5) * 0.35 : 5.5 + (routes.length % 5) * 0.15,
          trailLength: variant === 'defense-bg' ? 0.22 : 0.28,
          symbol: 'arrow',
          symbolSize: variant === 'defense-bg' ? 3 : 4,
          color: palette.effectColor,
        },
      },
      {
        id: 'pulse',
        type: 'effectScatter',
        coordinateSystem: 'geo',
        zlevel: 3,
        rippleEffect: {
          brushType: 'stroke',
          scale: variant === 'defense-bg' ? 2.6 : 3.4,
          period: variant === 'defense-bg' ? 6 : 5,
        },
        symbolSize: variant === 'defense-bg' ? 6 : 8,
        showEffectOn: 'render',
        labelLayout: {
          hideOverlap: false,
        },
        data: pulseData,
      },
    ],
  };
}
