import path from 'node:path';
import {
  canUseAndroidFeatures,
  getAndroidStorageRoot,
  getHomeDirectory,
  getHomeScopeDescription,
  getHomeScopeLabel,
} from '../utils/platform.js';

export function getScopeOptions(platformMode) {
  const options = [
    {
      key: 'actual',
      label: 'Carpeta actual',
      root: process.cwd(),
      description: 'Busca solo dentro de donde estas parado ahora.',
    },
    {
      key: 'home',
      label: getHomeScopeLabel(platformMode),
      root: getHomeDirectory(),
      description: getHomeScopeDescription(platformMode),
    },
  ];

  if (canUseAndroidFeatures(platformMode)) {
    options.push({
      key: 'android',
      label: 'Almacenamiento Android',
      root: getAndroidStorageRoot(platformMode),
      description: 'Busca dentro del almacenamiento compartido accesible.',
    });
  } else {
    const sharedRoot = getAndroidStorageRoot(platformMode);
    if (sharedRoot) {
      options.push({
        key: 'shared',
        label: 'Almacenamiento compartido',
        root: sharedRoot,
        description: 'Busca dentro del almacenamiento compartido montado en Linux.',
      });
    }
  }

  return options;
}

export function resolveScopeRoot(scopeKey, options = []) {
  const found = options.find((option) => option.key === scopeKey);
  return found ? path.resolve(found.root) : '';
}
