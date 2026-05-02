import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { getUserConfigPath, loadUserConfig } from '../core/config.js';
import { resolveClipboardSource, saveClipboardEntry } from '../core/clipboard.js';
import { chooseDirectoryNavigator } from '../ui/prompt.js';
import { createPromptShellSession } from '../utils/prompt-shell.js';
import { resolveInteractiveShell } from '../utils/shell.js';
import {
  getQuickAccessAliases,
  getQuickAccessLabel,
  getQuickAccessModeDescription,
  getQuickAccessRoot,
  getQuickAccessShortcutSummary,
  getQuickAccessTitle,
  resolvePlatformMode,
} from '../utils/platform.js';

const ANDROID_BASH_CANDIDATES = [
  '/data/data/com.termux/files/usr/bin/bash',
  '/bin/bash',
];

export async function runAndroidShellCommand(parsed = {}) {
  const config = await loadUserConfig();

  if (!config.features.androidShortcut) {
    throw new Error(
      `El acceso rapido esta desactivado. Activa features.androidShortcut en ${getUserConfigPath()}`,
    );
  }

  const platformMode = resolvePlatformMode(config);
  const quickAccessRoot = getQuickAccessRoot(platformMode);

  try {
    await fs.access(quickAccessRoot);
  } catch {
    throw new Error(`No se puede acceder a la ruta base de acceso rapido: ${quickAccessRoot}`);
  }

  const navigatorRoot = await resolveNavigatorStartPath(quickAccessRoot, parsed.androidStartPath);
  const selectedPath = await chooseDirectoryNavigator({
    root: navigatorRoot,
    title: getQuickAccessTitle(platformMode),
    emptyMessage: 'No hay carpetas visibles en esta ruta. Usa Ctrl+G para usar esta ruta.',
    locale: config.ui?.locale || 'co_es',
  });

  if (parsed.androidPickOnly) {
    console.log(selectedPath);
    return;
  }

  const clipboardEntry = await resolveClipboardSource(selectedPath, 'path', {
    basePath: quickAccessRoot,
  });
  await saveClipboardEntry(clipboardEntry);

  const interactiveShell = await resolveAndroidInteractiveShell(platformMode);
  const shellSession = await createPromptShellSession({
    interactiveShell,
    platformMode,
    label: getQuickAccessLabel(platformMode),
    aliases: getQuickAccessAliases(platformMode),
    promptTheme: config.ui?.promptTheme || 'ocean',
    contextPosition: config.ui?.promptContextPosition || 'right',
    androidNavigator: {
      enabled: true,
      root: quickAccessRoot,
    },
  });

  console.log(getQuickAccessTitle(platformMode));
  console.log('');
  console.log(selectedPath);
  console.log(interactiveShell.shellName + ' interactiva');
  console.log(getQuickAccessModeDescription(platformMode));
  console.log(getQuickAccessShortcutSummary(platformMode));
  console.log('Atajo nav : Ctrl+G abre el navegador visual desde la ruta actual');
  console.log('Ruta copiada a Xzp clipboard');
  console.log('');

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(shellSession.shellPath, shellSession.shellArgs, {
        cwd: selectedPath,
        stdio: 'inherit',
        env: {
          ...process.env,
          ...shellSession.env,
          XZP_CONTEXT: platformMode === 'termux' ? 'android-shell' : 'linux-shell',
          XZP_ANDROID_ROOT: quickAccessRoot,
          XZP_ANDROID_SELECTED_PATH: selectedPath,
          XZP_ANDROID_LABEL: getQuickAccessLabel(platformMode),
          XZP_ANDROID_SHELL: interactiveShell.shellName,
        },
      });

      child.on('error', reject);
      child.on('exit', (code, signal) => {
        if (signal) {
          reject(new Error(`La shell de acceso rapido termino por senal: ${signal}`));
          return;
        }

        if (code && code !== 0) {
          reject(new Error(`La shell de acceso rapido termino con codigo ${code}`));
          return;
        }

        resolve();
      });
    });
  } finally {
    await shellSession.cleanup();
  }
}

async function resolveNavigatorStartPath(quickAccessRoot, requestedPath = '') {
  const fallbackPath = quickAccessRoot;
  const normalizedRequestedPath = String(requestedPath || '').trim();

  if (!normalizedRequestedPath) {
    return fallbackPath;
  }

  try {
    const stats = await fs.stat(normalizedRequestedPath);
    if (stats.isDirectory()) {
      return normalizedRequestedPath;
    }
  } catch {
  }

  return fallbackPath;
}

async function resolveAndroidInteractiveShell(platformMode) {
  const interactiveShell = await resolveInteractiveShell(platformMode);

  if (interactiveShell.shellName !== 'sh') {
    return interactiveShell;
  }

  for (const shellPath of ANDROID_BASH_CANDIDATES) {
    try {
      await fs.access(shellPath);
      return {
        shellPath,
        shellArgs: ['-i'],
        shellName: 'bash',
      };
    } catch {
      continue;
    }
  }

  return interactiveShell;
}
