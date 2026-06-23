import { SLARK } from '../../theme/slarkColors.js';

/** Tema terang default untuk hero 3D (selaras dengan slark global). */
export const HERO_THEME_LIGHT = {
  bg: SLARK.bg,
  card: SLARK.card,
  border: SLARK.border,
  primary: SLARK.primary,
  primaryHover: SLARK.primaryHover,
  text: SLARK.text,
  muted: SLARK.textMuted,
};

/** @param {Partial<typeof HERO_THEME_LIGHT> | undefined} theme */
export function resolveHeroTheme(theme) {
  return theme ? { ...HERO_THEME_LIGHT, ...theme } : HERO_THEME_LIGHT;
}

/** @param {typeof HERO_THEME_LIGHT} palette */
export function heroThemeCssVars(palette) {
  return {
    '--hero-bg': palette.bg,
    '--hero-card': palette.card,
    '--hero-border': palette.border,
    '--hero-primary': palette.primary,
    '--hero-primary-hover': palette.primaryHover,
    '--hero-text': palette.text,
    '--hero-muted': palette.muted,
  };
}

/** @param {typeof HERO_THEME_LIGHT} palette */
export function heroThemeClearHex(palette) {
  return parseInt(palette.bg.replace('#', ''), 16);
}
