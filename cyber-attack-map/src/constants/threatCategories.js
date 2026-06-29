/** Threat taxonomy aligned with enterprise dashboards (e.g. Check Point style categories). */

export const THREAT_CATEGORY = {
  DDOS: 'ddos',
  INTRUSION: 'intrusion',
  BOTNET: 'botnet',
  /** Use when upstream does not set `category` — no fabricated threat type. */
  UNKNOWN: 'unknown',
};

export const DDOS_VECTOR = {
  VOLUMETRIC: 'volumetric',
  PROTOCOL: 'protocol',
  APPLICATION: 'application',
};

/** Human labels + arc colors [srcR, srcG, srcB] → [tgtR, tgtG, tgtB] for map layers */
export const CATEGORY_STYLE = {
  [THREAT_CATEGORY.DDOS]: {
    shortLabel: 'DDoS',
    arcSource: [255, 70, 90],
    arcTarget: [255, 40, 160],
    markerSource: [255, 120, 140],
    markerTarget: [255, 60, 200],
    badgeClass:
      'border-rose-500/50 bg-rose-950/80 text-rose-200 shadow-[0_0_12px_rgba(251,113,133,0.35)]',
  },
  [THREAT_CATEGORY.INTRUSION]: {
    shortLabel: 'Intrusion',
    arcSource: [250, 204, 21],
    arcTarget: [234, 179, 8],
    markerSource: [253, 224, 71],
    markerTarget: [202, 138, 4],
    badgeClass:
      'border-amber-500/50 bg-amber-950/80 text-amber-100 shadow-[0_0_10px_rgba(251,191,36,0.25)]',
  },
  [THREAT_CATEGORY.UNKNOWN]: {
    shortLabel: 'Unspecified',
    arcSource: [148, 163, 184],
    arcTarget: [100, 116, 139],
    markerSource: [186, 199, 214],
    markerTarget: [148, 163, 184],
    badgeClass:
      'border-slark-border bg-slark-card text-slark-muted shadow-[0_0_8px_rgba(198,40,40,0.12)]',
  },
  [THREAT_CATEGORY.BOTNET]: {
    shortLabel: 'Botnet',
    arcSource: [52, 211, 153],
    arcTarget: [16, 185, 129],
    markerSource: [110, 231, 183],
    markerTarget: [5, 150, 105],
    badgeClass:
      'border-emerald-500/50 bg-emerald-950/80 text-emerald-100 shadow-[0_0_10px_rgba(52,211,153,0.28)]',
  },
};

/** @type {Record<string, string>} */
export const THREAT_CATEGORY_I18N = {
  [THREAT_CATEGORY.DDOS]: 'threatCategory.ddos',
  [THREAT_CATEGORY.INTRUSION]: 'threatCategory.intrusion',
  [THREAT_CATEGORY.BOTNET]: 'threatCategory.botnet',
  [THREAT_CATEGORY.UNKNOWN]: 'threatCategory.unknown',
};

/** @param {string | undefined} category */
export function threatCategoryLabelKey(category) {
  return THREAT_CATEGORY_I18N[category] || THREAT_CATEGORY_I18N[THREAT_CATEGORY.UNKNOWN];
}

export const SEVERITY_ORDER = ['low', 'medium', 'high', 'critical'];

export const SEVERITY_STYLE = {
  low: { label: 'Low', className: 'text-slate-400 border-slate-600/40' },
  medium: { label: 'Med', className: 'text-amber-300/90 border-amber-600/40' },
  high: { label: 'High', className: 'text-orange-400 border-orange-600/40' },
  critical: {
    label: 'Critical',
    className: 'text-rose-300 border-rose-500/50 animate-pulse',
  },
};
