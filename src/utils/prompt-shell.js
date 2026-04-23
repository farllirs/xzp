import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { getHomeDirectory } from './platform.js';

export async function createPromptShellSession({
  interactiveShell,
  platformMode,
  label,
  aliases = {},
  promptTheme = 'ocean',
  contextPosition = 'right',
}) {
  await ensureShellBackupSnapshot(interactiveShell.shellName);

  const tmpBase = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-shell-'));
  const rcContent = buildShellRc({
    shellName: interactiveShell.shellName,
    platformMode,
    label,
    aliases,
    promptTheme,
    contextPosition,
  });

  if (interactiveShell.shellName === 'bash') {
    const rcPath = path.join(tmpBase, 'xzp-bashrc');
    await fs.writeFile(rcPath, rcContent, 'utf8');
    return {
      shellPath: interactiveShell.shellPath,
      shellArgs: ['--rcfile', rcPath, '-i'],
      env: {},
      cleanup: () => fs.rm(tmpBase, { recursive: true, force: true }),
    };
  }

  if (interactiveShell.shellName === 'zsh') {
    const zdotdir = path.join(tmpBase, 'zsh');
    await fs.mkdir(zdotdir, { recursive: true });
    await fs.writeFile(path.join(zdotdir, '.zshrc'), rcContent, 'utf8');
    return {
      shellPath: interactiveShell.shellPath,
      shellArgs: ['-i'],
      env: { ZDOTDIR: zdotdir },
      cleanup: () => fs.rm(tmpBase, { recursive: true, force: true }),
    };
  }

  const rcPath = path.join(tmpBase, 'xzp-shrc');
  await fs.writeFile(rcPath, rcContent, 'utf8');
  return {
    shellPath: interactiveShell.shellPath,
    shellArgs: ['-i'],
    env: { ENV: rcPath },
    cleanup: () => fs.rm(tmpBase, { recursive: true, force: true }),
  };
}

function buildShellRc({ shellName, platformMode, label, aliases, promptTheme, contextPosition }) {
  const theme = resolvePromptTheme(promptTheme);
  const commonLines = [
    '# xzp shell prompt',
    'export PATH="$HOME/bin:$PATH"',
    `export XZP_PROMPT_LABEL="${escapeForShell(label)}"`,
    `export XZP_PROMPT_MODE="${escapeForShell(platformMode)}"`,
    `export XZP_PROMPT_CONTEXT_POSITION="${escapeForShell(contextPosition)}"`,
    ...Object.entries(aliases).map(([name, target]) => `alias ${name}='cd "${escapeForShell(target)}"'`),
    '_xzp_prompt_badge() {',
    '  local helper context',
    '  helper="$(command -v xzp-project-context 2>/dev/null)"',
    '  [[ -z "$helper" ]] && return',
    '  context="$("$helper" 2>/dev/null)"',
    '  [[ -z "$context" ]] && return',
    '  printf "%s" "$context"',
    '}',
    '_xzp_prompt_path() {',
    '  printf "%s" "${PWD/#$HOME/~}"',
    '}',
  ];

  if (shellName === 'zsh') {
    return [
      ...commonLines,
      '[[ -f "$HOME/.zshrc" ]] && source "$HOME/.zshrc"',
      '_xzp_prompt_render() {',
      '  local badge path_label',
      '  badge="$(_xzp_prompt_badge)"',
      '  path_label="$(_xzp_prompt_path)"',
      '  PROMPT="%F{' + theme.label + '}${XZP_PROMPT_LABEL}%f %F{' + theme.path + '}${path_label}%f"',
      '  if [[ "$XZP_PROMPT_CONTEXT_POSITION" = "inline" && -n "$badge" ]]; then',
      '    PROMPT+=" %F{' + theme.badge + '}[${badge}]%f"',
      '    RPROMPT=""',
      '  elif [[ "$XZP_PROMPT_CONTEXT_POSITION" = "off" ]]; then',
      '    RPROMPT=""',
      '  elif [[ -n "$badge" ]]; then',
      '    RPROMPT="%F{' + theme.badge + '}[${badge}]%f"',
      '  else',
      '    RPROMPT=""',
      '  fi',
      `  PROMPT+="\\n%F{${theme.accent}}> %f"`,
      '}',
      'autoload -Uz add-zsh-hook 2>/dev/null || true',
      'add-zsh-hook precmd _xzp_prompt_render 2>/dev/null || true',
      '_xzp_prompt_render',
      'printf "Xzp: prompt cargado en %s\\n" "$PWD"',
    ].join('\n') + '\n';
  }

  if (shellName === 'bash') {
    return [
      ...commonLines,
      '[[ -f "$HOME/.bashrc" ]] && source "$HOME/.bashrc"',
      '_xzp_prompt_render() {',
      '  local badge path_label',
      '  badge="$(_xzp_prompt_badge)"',
      '  path_label="$(_xzp_prompt_path)"',
      '  PS1="\\[\\e[38;5;' + theme.label + 'm\\]${XZP_PROMPT_LABEL}\\[\\e[0m\\] \\[\\e[38;5;' + theme.path + 'm\\]${path_label}\\[\\e[0m\\]"',
      '  if [[ "$XZP_PROMPT_CONTEXT_POSITION" != "off" && -n "$badge" ]]; then',
      '    PS1+=" \\[\\e[38;5;' + theme.badge + 'm\\][${badge}]\\[\\e[0m\\]"',
      '  fi',
      `  PS1+="\\n\\[\\e[38;5;${theme.accent}m\\]>\\[\\e[0m\\] "`,
      '}',
      'PROMPT_COMMAND=_xzp_prompt_render',
      '_xzp_prompt_render',
      'printf "Xzp: prompt cargado en %s\\n" "$PWD"',
    ].join('\n') + '\n';
  }

  return [
    ...commonLines,
    '[[ -f "$HOME/.profile" ]] && . "$HOME/.profile"',
    'badge="$(_xzp_prompt_badge)"',
    'path_label="${PWD/#$HOME/~}"',
    'if [ "$XZP_PROMPT_CONTEXT_POSITION" != "off" ] && [ -n "$badge" ]; then',
    '  PS1="${XZP_PROMPT_LABEL} ${path_label} [${badge}]> "',
    'else',
    '  PS1="${XZP_PROMPT_LABEL} ${path_label}> "',
    'fi',
    'printf "Xzp: prompt cargado en %s\\n" "$PWD"',
  ].join('\n') + '\n';
}

function resolvePromptTheme(themeName) {
  if (themeName === 'forest') {
    return { label: 78, path: 114, badge: 150, accent: 72 };
  }

  if (themeName === 'ember') {
    return { label: 208, path: 223, badge: 214, accent: 203 };
  }

  if (themeName === 'mono') {
    return { label: 250, path: 255, badge: 245, accent: 252 };
  }

  return { label: 45, path: 117, badge: 82, accent: 39 };
}

function escapeForShell(value) {
  return String(value).replace(/"/g, '\\"');
}

async function ensureShellBackupSnapshot(shellName) {
  const home = getHomeDirectory();
  const sourcePath = getShellProfilePath(shellName, home);

  try {
    await fs.access(sourcePath);
  } catch {
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(home, '.config', 'xzp', 'backups', 'shell', shellName, timestamp);
  const backupPath = path.join(backupDir, path.basename(sourcePath));

  await fs.mkdir(backupDir, { recursive: true });
  await fs.copyFile(sourcePath, backupPath);
  return backupPath;
}

function getShellProfilePath(shellName, home) {
  if (shellName === 'zsh') {
    return path.join(home, '.zshrc');
  }

  if (shellName === 'bash') {
    return path.join(home, '.bashrc');
  }

  return path.join(home, '.profile');
}
