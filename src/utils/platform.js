import fs from 'node:fs';
import path from 'node:path';

const TERMUX_HOME = '/data/data/com.termux/files/home';
const ANDROID_STORAGE = '/sdcard';
const SHARED_STORAGE_CANDIDATES = [
  '/storage/emulated/0',
  '/sdcard',
];

export function getHomeDirectory() {
  return process.env.HOME || TERMUX_HOME;
}

export function getSharedStorageRoot() {
  for (const candidate of SHARED_STORAGE_CANDIDATES) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
    }
  }

  return '';
}

export function getTermuxSharedStorageRoot() {
  const home = getHomeDirectory();
  const termuxCandidates = [
    path.join(home, 'storage', 'shared'),
    path.join(home, 'storage', 'downloads'),
    path.join(home, 'storage', 'dcim'),
    path.join(home, 'storage', 'pictures'),
    path.join(home, 'storage', 'music'),
    path.join(home, 'storage', 'movies'),
    path.join(home, 'storage', 'documents'),
  ];

  for (const candidate of termuxCandidates) {
    try {
      if (fs.existsSync(candidate)) {
        return path.join(home, 'storage', 'shared');
      }
    } catch {
    }
  }

  return '';
}

export function isHostTermux() {
  const home = getHomeDirectory();
  return Boolean(process.env.TERMUX_VERSION) || home === TERMUX_HOME || home.startsWith(TERMUX_HOME + path.sep);
}

export function normalizePlatformMode(mode) {
  return ['auto', 'termux', 'linux'].includes(mode) ? mode : 'auto';
}

export function resolvePlatformMode(config) {
  const configured = normalizePlatformMode(config?.runtime?.platformMode || 'auto');

  if (configured !== 'auto') {
    return configured;
  }

  return isHostTermux() ? 'termux' : 'linux';
}

export function formatPlatformMode(mode) {
  if (mode === 'linux') {
    return 'linux';
  }

  if (mode === 'termux') {
    return 'termux';
  }

  return 'auto';
}

export function getHomeScopeLabel(platformMode) {
  return platformMode === 'linux' ? 'Home de Linux' : 'Home de Termux';
}

export function getHomeScopeDescription(platformMode) {
  return platformMode === 'linux'
    ? 'Busca dentro de tu entorno principal de Linux.'
    : 'Busca dentro de tu entorno principal de Termux.';
}

export function canUseAndroidFeatures(platformMode) {
  return platformMode === 'termux';
}

export function getAndroidStorageRoot(platformMode) {
  if (canUseAndroidFeatures(platformMode)) {
    return getTermuxSharedStorageRoot() || ANDROID_STORAGE;
  }

  return getSharedStorageRoot();
}

export function getQuickAccessRoot(platformMode) {
  if (platformMode === 'termux') {
    return getTermuxSharedStorageRoot() || ANDROID_STORAGE;
  }

  const sharedStorage = getSharedStorageRoot();
  return sharedStorage || getHomeDirectory();
}

export function getQuickAccessTitle(platformMode) {
  return platformMode === 'termux' ? 'Xzp Android' : 'Xzp Linux';
}

export function getQuickAccessModeDescription(platformMode) {
  return platformMode === 'termux'
    ? 'interfaz Android redisenada'
    : 'interfaz Linux redisenada';
}

export function getQuickAccessLabel(platformMode) {
  if (platformMode === 'termux') {
    return getTermuxSharedStorageRoot() ? 'TERMUX STORAGE' : 'ANDROID STORAGE';
  }

  return getSharedStorageRoot() ? 'SHARED STORAGE' : 'LINUX HOME';
}

export function getQuickAccessShortcutSummary(platformMode) {
  return platformMode === 'termux'
    ? 'shared, downloads, dcim, pictures, music, movies, documents, Ctrl+G nav'
    : 'shared, home, dl, docs, desk, pics, music, vids, tmp, Ctrl+G nav';
}

export function getQuickAccessAliases(platformMode) {
  if (platformMode === 'termux') {
    const home = getHomeDirectory();
    const shared = getTermuxSharedStorageRoot() || ANDROID_STORAGE;
    return {
      shared,
      dl: path.join(home, 'storage', 'downloads'),
      docs: path.join(home, 'storage', 'documents'),
      dcim: path.join(home, 'storage', 'dcim'),
      pics: path.join(home, 'storage', 'pictures'),
      music: path.join(home, 'storage', 'music'),
      movies: path.join(home, 'storage', 'movies'),
    };
  }

  const home = getHomeDirectory();
  const shared = getSharedStorageRoot() || home;
  return {
    home,
    shared,
    dl: path.join(shared, 'Download'),
    docs: path.join(shared, 'Documents'),
    desk: path.join(home, 'Desktop'),
    pics: path.join(shared, 'Pictures'),
    music: path.join(shared, 'Music'),
    vids: path.join(shared, 'Movies'),
    tmp: '/tmp',
  };
}

export function shouldRestrictProjectToAndroidStorage(platformMode) {
  return platformMode === 'termux';
}

export function getBridgeDirectory() {
  const shared = getSharedStorageRoot();
  if (shared) {
    return path.join(shared, '.xzp', 'bridge');
  }
  return '';
}

export async function getLinuxDistroRoots() {
  const prefix = '/data/data/com.termux/files/usr';
  const prootPath = path.join(prefix, 'var', 'lib', 'proot-distro', 'installed-rootfs');
  
  try {
    const entries = await fs.promises.readdir(prootPath, { withFileTypes: true });
    return entries
      .filter(e => e.isDirectory())
      .map(e => ({
        name: e.name,
        path: path.join(prootPath, e.name)
      }));
  } catch {
    return [];
  }
}

export function getTermuxHomeForGuest() {
  return TERMUX_HOME;
}

export function isAndroidStoragePath(targetPath) {
  const normalized = path.resolve(targetPath);
  const home = getHomeDirectory();
  const termuxStorage = path.join(home, 'storage');

  return normalized.startsWith('/sdcard')
    || normalized.startsWith('/storage/emulated/0')
    || (isHostTermux() && normalized.startsWith(termuxStorage + path.sep))
    || (isHostTermux() && normalized === path.join(home, 'storage', 'shared'));
}
