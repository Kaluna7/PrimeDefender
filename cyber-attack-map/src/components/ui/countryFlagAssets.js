import { hasFlag } from 'country-flag-icons';

const FLAG_CDNS = [
  'https://purecatamphetamine.github.io/country-flag-icons/3x2',
  'https://cdn.jsdelivr.net/npm/country-flag-icons@1.6.19/3x2',
];

/**
 * @param {string | null | undefined} code ISO 3166-1 alpha-2
 * @returns {string[]}
 */
export function getCountryFlagSources(code) {
  const upper = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!upper || !hasFlag(upper)) return [];
  return FLAG_CDNS.map((base) => `${base}/${upper}.svg`);
}

/** @param {string | null | undefined} code */
export function getCountryFlagUrl(code) {
  const sources = getCountryFlagSources(code);
  return sources[0] ?? null;
}
