import fs from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { getUserConfigPath, loadUserConfig } from '../core/config.js';
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

export async function runAndroidShellCommand() {
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

  const interactiveShell = await resolveAndroidInteractiveShell(platformMode);
  const shellSession = await createPromptShellSession({
    interactiveShell,
    platformMode,
    label: getQuickAccessLabel(platformMode),
    aliases: getQuickAccessAliases(platformMode),
    promptTheme: config.ui?.promptTheme || 'ocean',
    contextPosition: config.ui?.promptContextPosition || 'right',
  });

  console.log(getQuickAccessTitle(platformMode));
  console.log('');
  console.log(quickAccessRoot);
  console.log(interactiveShell.shellName + ' interactiva');
  console.log(getQuickAccessModeDescription(platformMode));
  console.log(getQuickAccessShortcutSummary(platformMode));
  console.log('');

  try {
    await new Promise((resolve, reject) => {
      const child = spawn(shellSession.shellPath, shellSession.shellArgs, {
        cwd: quickAccessRoot,
        stdio: 'inherit',
        env: {
          ...process.env,
          ...shellSession.env,
          XZP_CONTEXT: platformMode === 'termux' ? 'android-shell' : 'linux-shell',
          XZP_ANDROID_ROOT: quickAccessRoot,
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
