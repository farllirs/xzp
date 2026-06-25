import fs from 'node:fs/promises';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { isHostTermux } from './platform.js';

const TERMUX_ZSH = '/data/data/com.termux/files/usr/bin/zsh';
const TERMUX_BASH = '/data/data/com.termux/files/usr/bin/bash';
const TERMUX_SH = '/data/data/com.termux/files/usr/bin/sh';
const LINUX_ZSH = '/bin/zsh';
const LINUX_BASH = '/bin/bash';
const LINUX_SH = '/bin/sh';
const ALLOWED_SHELLS = new Set([
  TERMUX_ZSH,
  TERMUX_BASH,
  TERMUX_SH,
  LINUX_ZSH,
  LINUX_BASH,
  LINUX_SH,
]);

export async function resolveInteractiveShell(platformMode = '') {
  const preferredShell = process.env.XZP_PREFERRED_SHELL || process.env.SHELL || '';
  const candidates = buildShellCandidates(preferredShell, platformMode);

  for (const shellPath of candidates) {
    if (!shellPath) {
      continue;
    }

    if (await shellExists(shellPath)) {
      return {
        shellPath,
        shellArgs: ['-i'],
        shellName: path.basename(shellPath),
      };
    }
  }

  return {
    shellPath: LINUX_SH,
    shellArgs: ['-i'],
    shellName: 'sh',
  };
}

function buildShellCandidates(preferredShell, platformMode = '') {
  const shellName = path.basename(preferredShell || '');
  const safePreferredShell = ALLOWED_SHELLS.has(preferredShell) ? preferredShell : '';
  const preferredFirst = safePreferredShell && shellName && shellName !== 'sh'
    ? [safePreferredShell]
    : [];
  const preferTermuxShells = platformMode ? platformMode !== 'linux' : isHostTermux();

  if (preferTermuxShells) {
    return dedupe([
      ...preferredFirst,
      TERMUX_ZSH,
      TERMUX_BASH,
      LINUX_ZSH,
      LINUX_BASH,
      safePreferredShell,
      TERMUX_SH,
      LINUX_SH,
    ]);
  }

  return dedupe([
    ...preferredFirst,
    LINUX_ZSH,
    LINUX_BASH,
    safePreferredShell,
    LINUX_SH,
    TERMUX_ZSH,
    TERMUX_BASH,
    TERMUX_SH,
  ]);
}

export function __testBuildShellCandidates(preferredShell, platformMode = '') {
  return buildShellCandidates(preferredShell, platformMode);
}

async function shellExists(shellPath) {
  if (!ALLOWED_SHELLS.has(shellPath)) {
    return false;
  }

  try {
    await fs.access(shellPath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}
