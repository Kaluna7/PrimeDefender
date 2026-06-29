import { hasFlag } from 'country-flag-icons';
import { COUNTRY_NAME_TO_CODE, COUNTRY_NAME_KEYS_LONGEST_FIRST } from '../constants/countryNameToCode.js';

function cleanName(value) {
  return String(value)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\)/g, '')
    .trim()
    .toLowerCase();
}

function splitSegments(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);
}

function lookupName(name) {
  const clean = cleanName(name);
  if (!clean) return null;
  if (clean.length === 2 && hasFlag(clean.toUpperCase())) return clean.toUpperCase();
  if (COUNTRY_NAME_TO_CODE[clean]) return COUNTRY_NAME_TO_CODE[clean];
  for (const key of COUNTRY_NAME_KEYS_LONGEST_FIRST) {
    if (clean.includes(key)) return COUNTRY_NAME_TO_CODE[key];
  }
  return null;
}

function findInText(text) {
  const clean = cleanName(text).replace(/,/g, ' ');
  if (!clean) return null;
  for (const key of COUNTRY_NAME_KEYS_LONGEST_FIRST) {
    if (clean.includes(key)) return COUNTRY_NAME_TO_CODE[key];
  }
  return null;
}

function codeFromRaw(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim();
  if (trimmed.length === 2) {
    const upper = trimmed.toUpperCase();
    if (hasFlag(upper)) return upper;
  }
  return lookupName(trimmed) || findInText(trimmed);
}

/**
 * Resolve ISO country code from a normalized attack payload.
 * @param {Record<string, unknown> | null | undefined} attack
 * @returns {string | null}
 */
export function resolveCountryCode(attack) {
  if (!attack) return null;

  const meta = attack.geoMeta;
  const location = typeof meta?.location === 'string' ? meta.location : '';
  const sourceLabel = typeof attack.sourceLabel === 'string' ? attack.sourceLabel : '';

  const directCodes = [meta?.countryCode, meta?.country_code, attack.from?.countryCode];
  for (const raw of directCodes) {
    const code = codeFromRaw(raw);
    if (code) return code;
  }

  const namedCandidates = [
    meta?.country,
    attack.from?.country,
    ...splitSegments(location),
    ...splitSegments(sourceLabel),
    location,
    sourceLabel,
  ];

  for (const candidate of namedCandidates) {
    const code = codeFromRaw(candidate);
    if (code) return code;
  }

  return null;
}
