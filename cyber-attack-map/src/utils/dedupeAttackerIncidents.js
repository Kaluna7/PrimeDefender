import { deriveProtectionBucket } from './deriveProtectionBucket.js';

/** Attack type only (no path/method) — used to merge rows per IP. */
export function incidentAttackTypeKey(incident) {
  const bucket = deriveProtectionBucket(incident);
  const detection = String(incident.detection || '').trim().toLowerCase();
  return bucket || detection || incident.category || 'unknown';
}

/** @deprecated Use incidentAttackTypeKey */
export function incidentActivityKey(incident) {
  return incidentAttackTypeKey(incident);
}

function incidentIpKey(incident) {
  const ip = incident.attackerIp?.trim();
  return ip || `unknown:${incident.id}`;
}

/**
 * One row per unique IP + attack type. Keeps latest incident and repeat count.
 * @param {object[]} incidents
 */
export function dedupeAttackerIncidents(incidents) {
  const groups = new Map();

  for (const incident of incidents) {
    const key = `${incidentIpKey(incident)}|${incidentAttackTypeKey(incident)}`;
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        incident,
        count: 1,
        latestAt: incident.createdAt,
        firstAt: incident.createdAt,
      });
      continue;
    }

    existing.count += 1;
    if (incident.createdAt > existing.latestAt) {
      existing.latestAt = incident.createdAt;
      existing.incident = incident;
    }
    if (incident.createdAt < existing.firstAt) {
      existing.firstAt = incident.createdAt;
    }
  }

  return [...groups.values()].sort((a, b) => b.latestAt - a.latestAt);
}
