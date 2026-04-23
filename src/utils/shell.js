import fs from 'node:fs/promises';
import path from 'node:path';
import { isHostTermux } from './platform.js';

const TERMUX_ZSH = '/data/data/com.termux/files/usr/bin/zsh';
const TERMUX_BASH = '/data/data/com.termux/files/usr/bin/bash';
const TERMUX_SH = '/data/data/com.termux/files/usr/bin/sh';
const LINUX_ZSH = '/bin/zsh';
const LINUX_BASH = '/bin/bash';
const LINUX_SH = '/bin/sh';

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
  const preferredFirst = preferredShell && shellName && shellName !== 'sh'
    ? [preferredShell]
    : [];
  const preferTermuxShells = platformMode ? platformMode !== 'linux' : isHostTermux();

  if (preferTermuxShells) {
    return dedupe([
      ...preferredFirst,
      TERMUX_ZSH,
      TERMUX_BASH,
      LINUX_ZSH,
      LINUX_BASH,
      preferredShell,
      TERMUX_SH,
      LINUX_SH,
    ]);
  }

  return dedupe([
    ...preferredFirst,
    LINUX_ZSH,
    LINUX_BASH,
    preferredShell,
    LINUX_SH,
    TERMUX_ZSH,
    TERMUX_BASH,
    TERMUX_SH,
  ]);
}

async function shellExists(shellPath) {
  try {
    await fs.access(shellPath);
    return true;
  } catch {
    return false;
  }
}

function dedupe(values) {
  return [...new Set(values.filter(Boolean))];
}
