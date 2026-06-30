import { hasFlag } from 'country-flag-icons';

const LOCAL_FLAG_URLS = import.meta.glob('../../../node_modules/country-flag-icons/3x2/*.svg', {
  eager: true,
  query: '?url',
  import: 'default',
});

const FLAG_CDNS = [
  'https://cdn.jsdelivr.net/npm/country-flag-icons@1.6.19/3x2',
  'https://purecatamphetamine.github.io/country-flag-icons/3x2',
];

/** @param {string} code */
function getLocalFlagUrl(code) {
  return LOCAL_FLAG_URLS[`../../../node_modules/country-flag-icons/3x2/${code}.svg`] ?? null;
}

/**
 * @param {string | null | undefined} code ISO 3166-1 alpha-2
 * @returns {string[]}
 */
export function getCountryFlagSources(code) {
  const upper = typeof code === 'string' ? code.trim().toUpperCase() : '';
  if (!upper || !hasFlag(upper)) return [];

  const sources = [];
  const local = getLocalFlagUrl(upper);
  if (local) sources.push(local);
  for (const base of FLAG_CDNS) {
    sources.push(`${base}/${upper}.svg`);
  }
  return sources;
}

/** @param {string | null | undefined} code */
export function getCountryFlagUrl(code) {
  const sources = getCountryFlagSources(code);
  return sources[0] ?? null;
}
