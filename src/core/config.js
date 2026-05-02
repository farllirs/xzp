import fs from 'node:fs/promises';
import path from 'node:path';
import { getHomeDirectory, normalizePlatformMode } from '../utils/platform.js';
import { getDefaultLocale, normalizeLocale } from './i18n.js';

const CONFIG_SCHEMA_VERSION = 2;
const DEFAULT_SEARCH_EXCLUDES = [
  '.git',
  'node_modules',
  '.venv',
  'venv',
  '__pycache__',
  'dist',
  'build',
  'coverage',
  'vendor',
  'target',
];

const DEFAULT_CONFIG = {
  schemaVersion: CONFIG_SCHEMA_VERSION,
  features: {
    androidShortcut: true,
    projectBadge: true,
    smartProjectInstall: false,
  },
  shortcuts: {
    safe: {},
  },
  favorites: {
    paths: {},
  },
  history: {
    recentContexts: [],
  },
  search: {
    savedExcludes: [...DEFAULT_SEARCH_EXCLUDES],
  },
  install: {
    reports: {},
  },
  menu: {
    visualMode: 'cards',
    lastAction: '',
  },
  ui: {
    theme: 'ocean',
    density: 'comfortable',
    locale: getDefaultLocale(),
    promptContextPosition: 'right',
    promptTheme: 'ocean',
  },
  runtime: {
    platformMode: 'auto',
    outputFormat: 'text',
    debug: false,
    experimental: false,
    agentMode: false,
  },
  projects: {},
};

export function getUserConfigPath() {
  return path.join(getHomeDirectory(), '.config', 'xzp', 'config.json');
}

export function getCurrentConfigSchemaVersion() {
  return CONFIG_SCHEMA_VERSION;
}

export function getDefaultSearchExcludes() {
  return [...DEFAULT_SEARCH_EXCLUDES];
}

export async function loadUserConfig() {
  const configPath = getUserConfigPath();

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    const parsed = JSON.parse(raw);
    const merged = mergeConfig(parsed);

    if (needsConfigRewrite(parsed, merged)) {
      await saveUserConfig(merged);
    }

    return merged;
  } catch (error) {
    if (error && error.code !== 'ENOENT') {
      throw new Error(`No pude leer la configuracion de Xzp: ${error.message}`);
    }

    await ensureUserConfigExists(configPath);
    return cloneDefaultConfig();
  }
}

export async function saveUserConfig(config) {
  const configPath = getUserConfigPath();
  const merged = mergeConfig(config);

  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  return merged;
}

export async function setFeatureEnabled(featureKey, enabled) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    features: {
      ...config.features,
      [featureKey]: enabled,
    },
  });
}

export async function setPromptContextPosition(position) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    ui: {
      ...config.ui,
      locale: normalizeLocale(config.ui?.locale),
      promptContextPosition: normalizePromptContextPosition(position),
    },
  });
}

export async function setPromptTheme(theme) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    ui: {
      ...config.ui,
      promptTheme: normalizePromptTheme(theme),
    },
  });
}

export async function setLocale(locale) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    ui: {
      ...config.ui,
      locale: normalizeLocale(locale),
    },
  });
}

export async function setMenuVisualMode(mode) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    menu: {
      ...(config.menu || {}),
      visualMode: normalizeMenuVisualMode(mode),
    },
  });
}

export async function setMenuLastAction(action) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    menu: {
      ...(config.menu || {}),
      lastAction: String(action || '').trim().slice(0, 48),
    },
  });
}

export async function setPlatformMode(platformMode) {
  const config = await loadUserConfig();
  const normalized = normalizePlatformMode(platformMode);
  const nextFeatures = {
    ...config.features,
  };

  if (normalized === 'linux') {
    nextFeatures.androidShortcut = true;
    nextFeatures.projectBadge = true;
    nextFeatures.smartProjectInstall = true;
  }

  if (normalized === 'termux') {
    nextFeatures.androidShortcut = true;
    nextFeatures.projectBadge = true;
  }

  return saveUserConfig({
    ...config,
    features: nextFeatures,
    runtime: {
      ...config.runtime,
      platformMode: normalized,
    },
  });
}

export async function setAgentMode(enabled) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    runtime: {
      ...config.runtime,
      agentMode: Boolean(enabled),
    },
  });
}

export async function saveProjectState(projectKey, projectState) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    projects: {
      ...(config.projects || {}),
      [projectKey]: {
        ...((config.projects || {})[projectKey] || {}),
        ...projectState,
      },
    },
  });
}

export async function clearProjectState(projectKey) {
  const config = await loadUserConfig();
  const nextProjects = { ...(config.projects || {}) };
  delete nextProjects[projectKey];

  return saveUserConfig({
    ...config,
    projects: nextProjects,
  });
}

export async function saveInstallReport(projectKey, report) {
  const config = await loadUserConfig();
  return saveUserConfig({
    ...config,
    install: {
      ...(config.install || {}),
      reports: {
        ...((config.install || {}).reports || {}),
        [projectKey]: {
          ...(((config.install || {}).reports || {})[projectKey] || {}),
          ...report,
          updatedAt: new Date().toISOString(),
        },
      },
    },
  });
}

export async function getInstallReport(projectKey) {
  const config = await loadUserConfig();
  return ((config.install || {}).reports || {})[projectKey] || null;
}

export async function saveSafeShortcut(shortcutName, shortcutState) {
  const config = await loadUserConfig();
  const normalizedName = normalizeShortcutName(shortcutName);

  if (!normalizedName) {
    throw new Error('El nombre del acceso seguro no es valido.');
  }

  return saveUserConfig({
    ...config,
    shortcuts: {
      ...(config.shortcuts || {}),
      safe: {
        ...((config.shortcuts || {}).safe || {}),
        [normalizedName]: {
          ...(((config.shortcuts || {}).safe || {})[normalizedName] || {}),
          ...shortcutState,
          name: normalizedName,
        },
      },
    },
  });
}

export async function getSafeShortcut(shortcutName) {
  const config = await loadUserConfig();
  const normalizedName = normalizeShortcutName(shortcutName);
  return ((config.shortcuts || {}).safe || {})[normalizedName] || null;
}

export async function listSafeShortcuts() {
  const config = await loadUserConfig();
  return Object.values((config.shortcuts || {}).safe || {})
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'es', { sensitivity: 'base' }));
}

export async function removeSafeShortcut(shortcutName) {
  const config = await loadUserConfig();
  const normalizedName = normalizeShortcutName(shortcutName);
  const nextSafeShortcuts = { ...((config.shortcuts || {}).safe || {}) };
  delete nextSafeShortcuts[normalizedName];

  return saveUserConfig({
    ...config,
    shortcuts: {
      ...(config.shortcuts || {}),
      safe: nextSafeShortcuts,
    },
  });
}

export async function saveFavoritePath(name, targetPath, metadata = {}) {
  const config = await loadUserConfig();
  const normalizedName = normalizeShortcutName(name);
  if (!normalizedName) {
    throw new Error('El nombre del favorito no es valido.');
  }

  return saveUserConfig({
    ...config,
    favorites: {
      ...(config.favorites || {}),
      paths: {
        ...((config.favorites || {}).paths || {}),
        [normalizedName]: {
          ...(((config.favorites || {}).paths || {})[normalizedName] || {}),
          name: normalizedName,
          path: String(targetPath || ''),
          updatedAt: new Date().toISOString(),
          ...metadata,
        },
      },
    },
  });
}

export async function listFavoritePaths() {
  const config = await loadUserConfig();
  return Object.values((config.favorites || {}).paths || {})
    .sort((left, right) => String(left.name || '').localeCompare(String(right.name || ''), 'es', { sensitivity: 'base' }));
}

export async function removeFavoritePath(name) {
  const config = await loadUserConfig();
  const normalizedName = normalizeShortcutName(name);
  const nextPaths = { ...((config.favorites || {}).paths || {}) };
  delete nextPaths[normalizedName];

  return saveUserConfig({
    ...config,
    favorites: {
      ...(config.favorites || {}),
      paths: nextPaths,
    },
  });
}

export async function recordContextVisit(context) {
  if (!context?.projectRoot) {
    return null;
  }

  const config = await loadUserConfig();
  const current = (config.history || {}).recentContexts || [];
  const nextEntry = {
    type: context.type,
    label: context.label,
    projectRoot: context.projectRoot,
    version: context.version || '',
    updatedAt: new Date().toISOString(),
  };
  const deduped = current.filter((entry) => entry.projectRoot !== context.projectRoot);
  const nextContexts = [nextEntry, ...deduped].slice(0, 8);

  return saveUserConfig({
    ...config,
    history: {
      ...(config.history || {}),
      recentContexts: nextContexts,
    },
  });
}

export async function getRecentContexts() {
  const config = await loadUserConfig();
  return [...(((config.history || {}).recentContexts) || [])];
}

export async function addSearchExcludePatterns(patterns = []) {
  const config = await loadUserConfig();
  const normalizedPatterns = normalizeExcludePatterns([
    ...(((config.search || {}).savedExcludes) || []),
    ...patterns,
  ]);

  return saveUserConfig({
    ...config,
    search: {
      ...(config.search || {}),
      savedExcludes: normalizedPatterns,
    },
  });
}

export async function removeSearchExcludePattern(pattern) {
  const config = await loadUserConfig();
  const cleanPattern = normalizeExcludePatterns([pattern])[0];
  const nextPatterns = normalizeExcludePatterns(
    ((((config.search || {}).savedExcludes) || []).filter((item) => item !== cleanPattern)),
  );

  return saveUserConfig({
    ...config,
    search: {
      ...(config.search || {}),
      savedExcludes: nextPatterns,
    },
  });
}

export async function listSearchExcludePatterns() {
  const config = await loadUserConfig();
  return normalizeExcludePatterns(((config.search || {}).savedExcludes) || []);
}

export function resolveRuntimePreferences(config = {}) {
  const agentMode = readBooleanEnv('XZP_AGENT_MODE', Boolean(config.runtime?.agentMode));
  const requestedOutputFormat = readStringEnv('XZP_OUTPUT_FORMAT');
  return {
    theme: normalizeUiTheme(readStringEnv('XZP_THEME') || config.ui?.theme),
    density: normalizeUiDensity(readStringEnv('XZP_UI_DENSITY') || config.ui?.density),
    locale: normalizeLocale(readStringEnv('XZP_LOCALE') || config.ui?.locale),
    noColor: readBooleanEnv('XZP_NO_COLOR', false),
    outputFormat: normalizeOutputFormat(
      requestedOutputFormat || (agentMode ? 'json' : config.runtime?.outputFormat || DEFAULT_CONFIG.runtime.outputFormat),
    ),
    debug: readBooleanEnv('XZP_DEBUG', Boolean(config.runtime?.debug)),
    experimental: readBooleanEnv('XZP_EXPERIMENTAL', Boolean(config.runtime?.experimental)),
    agentMode,
  };
}

async function ensureUserConfigExists(configPath) {
  await fs.mkdir(path.dirname(configPath), { recursive: true });
  await fs.writeFile(configPath, `${JSON.stringify(DEFAULT_CONFIG, null, 2)}\n`, { flag: 'wx' }).catch((error) => {
    if (!error || error.code !== 'EEXIST') {
      throw error;
    }
  });
}

function mergeConfig(config) {
  const migrated = migrateRawConfig(config || {});
  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    features: {
      ...DEFAULT_CONFIG.features,
      ...(migrated.features || {}),
    },
    shortcuts: {
      ...DEFAULT_CONFIG.shortcuts,
      ...(migrated.shortcuts || {}),
      safe: {
        ...DEFAULT_CONFIG.shortcuts.safe,
        ...((migrated.shortcuts || {}).safe || {}),
      },
    },
    favorites: {
      ...DEFAULT_CONFIG.favorites,
      ...(migrated.favorites || {}),
      paths: {
        ...DEFAULT_CONFIG.favorites.paths,
        ...((migrated.favorites || {}).paths || {}),
      },
    },
    history: {
      ...DEFAULT_CONFIG.history,
      ...(migrated.history || {}),
      recentContexts: normalizeRecentContexts((migrated.history || {}).recentContexts || []),
    },
    search: {
      ...DEFAULT_CONFIG.search,
      ...(migrated.search || {}),
      savedExcludes: normalizeExcludePatterns((migrated.search || {}).savedExcludes || DEFAULT_SEARCH_EXCLUDES),
    },
    install: {
      ...DEFAULT_CONFIG.install,
      ...(migrated.install || {}),
      reports: {
        ...DEFAULT_CONFIG.install.reports,
        ...((migrated.install || {}).reports || {}),
      },
    },
    menu: {
      ...DEFAULT_CONFIG.menu,
      ...(migrated.menu || {}),
      visualMode: normalizeMenuVisualMode(migrated.menu?.visualMode),
      lastAction: String(migrated.menu?.lastAction || '').trim().slice(0, 48),
    },
    ui: {
      ...DEFAULT_CONFIG.ui,
      ...(migrated.ui || {}),
      theme: normalizeUiTheme(migrated.ui?.theme),
      density: normalizeUiDensity(migrated.ui?.density),
      locale: normalizeLocale(migrated.ui?.locale),
      promptContextPosition: normalizePromptContextPosition(migrated.ui?.promptContextPosition),
      promptTheme: normalizePromptTheme(migrated.ui?.promptTheme),
    },
    runtime: {
      ...DEFAULT_CONFIG.runtime,
      ...(migrated.runtime || {}),
      platformMode: normalizePlatformMode(migrated.runtime?.platformMode),
      outputFormat: normalizeOutputFormat(migrated.runtime?.outputFormat),
      debug: typeof migrated.runtime?.debug === 'boolean' ? migrated.runtime.debug : DEFAULT_CONFIG.runtime.debug,
      experimental: typeof migrated.runtime?.experimental === 'boolean'
        ? migrated.runtime.experimental
        : DEFAULT_CONFIG.runtime.experimental,
      agentMode: typeof migrated.runtime?.agentMode === 'boolean'
        ? migrated.runtime.agentMode
        : DEFAULT_CONFIG.runtime.agentMode,
    },
    projects: {
      ...DEFAULT_CONFIG.projects,
      ...(migrated.projects || {}),
    },
  };
}

function migrateRawConfig(rawConfig = {}) {
  const next = structuredCloneCompat(rawConfig);

  if (typeof next?.features?.smartPythonInstall === 'boolean' && typeof next?.features?.smartProjectInstall !== 'boolean') {
    next.features.smartProjectInstall = next.features.smartPythonInstall;
  }

  if (!next.favorites || typeof next.favorites !== 'object') {
    next.favorites = { paths: {} };
  }

  if (!next.history || typeof next.history !== 'object') {
    next.history = { recentContexts: [] };
  }

  if (!next.search || typeof next.search !== 'object') {
    next.search = { savedExcludes: [...DEFAULT_SEARCH_EXCLUDES] };
  }

  if (!next.install || typeof next.install !== 'object') {
    next.install = { reports: {} };
  }

  if (!next.menu || typeof next.menu !== 'object') {
    next.menu = { visualMode: 'cards', lastAction: '' };
  }

  next.schemaVersion = CONFIG_SCHEMA_VERSION;
  return next;
}

function cloneDefaultConfig() {
  return mergeConfig(DEFAULT_CONFIG);
}

function needsConfigRewrite(originalConfig, mergedConfig) {
  return JSON.stringify(originalConfig || {}) !== JSON.stringify(mergedConfig);
}

function normalizePromptContextPosition(position) {
  return ['right', 'inline', 'off'].includes(position) ? position : DEFAULT_CONFIG.ui.promptContextPosition;
}

function normalizeUiTheme(theme) {
  const normalized = String(theme || '').trim().toLowerCase();
  return ['ocean', 'forest', 'ember', 'mono', 'paper', 'contrast'].includes(normalized) ? normalized : DEFAULT_CONFIG.ui.theme;
}

function normalizeUiDensity(density) {
  const normalized = String(density || '').trim().toLowerCase();
  return ['compact', 'comfortable'].includes(normalized) ? normalized : DEFAULT_CONFIG.ui.density;
}

function normalizePromptTheme(theme) {
  const normalized = String(theme || '').trim().toLowerCase();
  return ['ocean', 'forest', 'ember', 'mono'].includes(normalized) ? normalized : DEFAULT_CONFIG.ui.promptTheme;
}

function normalizeMenuVisualMode(mode) {
  const normalized = String(mode || '').trim().toLowerCase();
  return ['cards', 'compact'].includes(normalized) ? normalized : DEFAULT_CONFIG.menu.visualMode;
}

function normalizeOutputFormat(outputFormat) {
  const normalized = String(outputFormat || '').trim().toLowerCase();
  return ['text', 'json'].includes(normalized) ? normalized : DEFAULT_CONFIG.runtime.outputFormat;
}

function normalizeRecentContexts(entries) {
  return (entries || [])
    .filter((entry) => entry && typeof entry === 'object' && entry.projectRoot)
    .map((entry) => ({
      type: String(entry.type || '').trim(),
      label: String(entry.label || '').trim(),
      projectRoot: String(entry.projectRoot || '').trim(),
      version: String(entry.version || '').trim(),
      updatedAt: String(entry.updatedAt || '').trim(),
    }))
    .slice(0, 8);
}

function normalizeExcludePatterns(patterns) {
  return [...new Set(
    (patterns || [])
      .map((item) => String(item || '').trim())
      .filter(Boolean)
      .slice(0, 40),
  )];
}

export function readBooleanEnv(name, fallback = false) {
  const raw = process.env[name];

  if (raw === undefined || raw === null || raw === '') {
    return fallback;
  }

  const normalized = String(raw).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

export function readStringEnv(name, fallback = '', maxLength = 120) {
  const raw = process.env[name];

  if (raw === undefined || raw === null) {
    return fallback;
  }

  const normalized = String(raw)
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .trim();

  if (!normalized) {
    return fallback;
  }

  return normalized.slice(0, maxLength);
}

function normalizeShortcutName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 48);
}

function structuredCloneCompat(value) {
  return JSON.parse(JSON.stringify(value || {}));
}

export function __testMergeConfig(config = {}) {
  return mergeConfig(config);
}

export function __testNormalizeOutputFormat(value) {
  return normalizeOutputFormat(value);
}
