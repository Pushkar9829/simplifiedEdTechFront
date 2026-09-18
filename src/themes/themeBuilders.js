const LIGHT = 'classic-light';
const DARK = 'classic-dark';

export const THEME_PRESETS = {
  [LIGHT]: { mode: 'light' },
  [DARK]: { mode: 'dark' },
};

const LEGACY_TO_CLASSIC = {
  'classic-light': LIGHT,
  'classic-dark': DARK,
  'aurora-light': LIGHT,
  'slate-light': LIGHT,
  'neu-peach': LIGHT,
  'sky-immersive': DARK,
  'slate-immersive': DARK,
  'slate-neon': DARK,
  'neu-slate-glass': DARK,
};

/** Remap legacy / immersive ids to classic light or dark */
export function remapLegacyTheme(themeId) {
  return LEGACY_TO_CLASSIC[themeId] || LIGHT;
}

export function buildVars(themeId) {
  const id = remapLegacyTheme(themeId);
  const preset = THEME_PRESETS[id] || THEME_PRESETS[LIGHT];
  return { themeId: id, mode: preset.mode };
}

export const LIGHT_THEME = LIGHT;
export const DARK_THEME = DARK;
