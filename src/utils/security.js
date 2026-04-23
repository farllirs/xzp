import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000B-\u001F\u007F]/g;
const ANSI_ESCAPE_REGEX = /\x1B\[[0-9;]*[A-Za-z]/g;
const SECRET_PATTERNS = [
  /(token|apikey|api_key|secret|authorization)\s*[:=]\s*([^\s]+)/gi,
  /(Bearer)\s+([A-Za-z0-9._-]+)/g,
  /(npm_[A-Za-z0-9]+)/g,
  /(ghp_[A-Za-z0-9]+)/g,
  /(gho_[A-Za-z0-9]+)/g,
  /(ghu_[A-Za-z0-9]+)/g,
  /(github_pat_[A-Za-z0-9_]+)/g,
  /(sk-[A-Za-z0-9]+)/g,
];

export function sanitizeTerminalText(value) {
  return String(value || '')
    .replace(ANSI_ESCAPE_REGEX, '')
    .replace(CONTROL_CHARS_REGEX, '')
    .trimEnd();
}

export function redactSensitiveText(value) {
  let result = sanitizeTerminalText(value);

  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, (match, head) => `${head}=[redacted]`);
  }

  return result;
}

export function redactAndClampText(value, maxLength = 4000) {
  const redacted = redactSensitiveText(value);
  if (redacted.length <= maxLength) {
    return redacted;
  }

  return `${redacted.slice(0, maxLength - 12)}[truncated]`;
}

export function sanitizePathForLogs(value) {
  const sanitized = sanitizeTerminalText(value);
  if (!sanitized) {
    return '';
  }

  const homeDir = sanitizeTerminalText(os.homedir());
  if (homeDir && sanitized.startsWith(homeDir)) {
    return `~${sanitized.slice(homeDir.length)}`;
  }

  return sanitized;
}

export async function resolveWritableDirectory(targetPath) {
  const resolved = path.resolve(targetPath || process.cwd());
  let stats;

  try {
    stats = await fs.stat(resolved);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      throw new Error(`La ruta destino no existe: ${resolved}`);
    }
    throw error;
  }

  if (!stats.isDirectory()) {
    throw new Error(`La ruta destino no es una carpeta: ${resolved}`);
  }

  await fs.access(resolved, fs.constants?.W_OK);
  return resolved;
}
