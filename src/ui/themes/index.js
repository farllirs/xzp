import classic from './presets/classic.js';
import panels from './presets/panels.js';
import minimal from './presets/minimal.js';

const THEME_REGISTRY = {
  classic,
  panels,
  minimal,
};

const THEME_IDS = Object.keys(THEME_REGISTRY);

export function getThemeIds() {
  return [...THEME_IDS];
}

export function getTheme(id) {
  return THEME_REGISTRY[id] || null;
}

export function getThemeOrDefault(id) {
  return THEME_REGISTRY[id] || classic;
}

export function getThemeName(id) {
  const theme = THEME_REGISTRY[id];
  return theme ? theme.name : 'Classic';
}

export function getThemeDescription(id) {
  const theme = THEME_REGISTRY[id];
  return theme ? theme.description : '';
}

export function resolvePalette(themeId, colorMode = 'default', customColors = null) {
  const theme = getThemeOrDefault(themeId);

  if (colorMode === 'system') {
    return createSystemPalette();
  }

  if (colorMode === 'custom' && customColors) {
    return { ...theme.palette, ...customColors };
  }

  return { ...theme.palette };
}

function createSystemPalette() {
  return {
    title: 'white',
    section: 'white',
    accent: 'white',
    info: 'white',
    ok: 'white',
    warn: 'white',
    error: 'white',
    text: 'white',
    muted: 'white',
    selected: 'white',
    card: 'white',
    highlight: 'white',
    surface: '',
  };
}

export function getThemeLayout(themeId) {
  const theme = getThemeOrDefault(themeId);
  return theme.layout;
}

export function getThemeColumns(themeId) {
  const theme = getThemeOrDefault(themeId);
  return theme.columns;
}

export function getThemeCardWidth(themeId) {
  const theme = getThemeOrDefault(themeId);
  return theme.cardWidth;
}

export function getThemeShowStatusBar(themeId) {
  const theme = getThemeOrDefault(themeId);
  return theme.showStatusBar;
}

export function getThemeSelectionStyle(themeId) {
  const theme = getThemeOrDefault(themeId);
  return theme.selectionStyle;
}
