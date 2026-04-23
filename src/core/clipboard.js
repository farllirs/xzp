import fs from 'node:fs/promises';
import path from 'node:path';
import { getHomeDirectory } from '../utils/platform.js';

const CLIPBOARD_FILENAME = 'clipboard.json';

export function getClipboardPath() {
  return path.join(getHomeDirectory(), '.config', 'xzp', CLIPBOARD_FILENAME);
}

export async function saveClipboardEntry(entry) {
  const clipboardPath = getClipboardPath();
  const normalized = {
    ...entry,
    copiedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(clipboardPath), { recursive: true });
  await fs.writeFile(clipboardPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');

  return normalized;
}

export async function loadClipboardEntry() {
  const clipboardPath = getClipboardPath();

  try {
    const raw = await fs.readFile(clipboardPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!parsed || !parsed.sourcePath) {
      return null;
    }

    return parsed;
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }

    throw new Error(`No pude leer el portapapeles de Xzp: ${error.message}`);
  }
}

export async function clearClipboardEntry() {
  const clipboardPath = getClipboardPath();

  try {
    await fs.unlink(clipboardPath);
  } catch (error) {
    if (!error || error.code !== 'ENOENT') {
      throw new Error(`No pude limpiar el portapapeles de Xzp: ${error.message}`);
    }
  }
}

export function formatClipboardEntry(entry) {
  if (!entry) {
    return 'Portapapeles Xzp: vacio';
  }

  return formatClipboardEntryForOutput(entry, 'text');
}

export function formatClipboardEntryForOutput(entry, outputFormat = 'text') {
  if (!entry) {
    return outputFormat === 'json'
      ? JSON.stringify({ empty: true }, null, 2)
      : 'Portapapeles Xzp: vacio';
  }

  const name = entry.displayName || path.basename(entry.sourcePath);
  const type = entry.kind === 'directory' ? 'carpeta' : 'archivo';
  const normalized = {
    sourcePath: entry.sourcePath,
    displayName: name,
    kind: entry.kind,
    type,
    mode: entry.mode || 'path',
    copiedValue: entry.copiedValue || entry.sourcePath,
    basePath: entry.basePath || '',
    copiedAt: entry.copiedAt || '',
  };

  if (outputFormat === 'json') {
    return JSON.stringify(normalized, null, 2);
  }

  return [
    'Portapapeles Xzp',
    `Origen : ${normalized.sourcePath}`,
    `Nombre : ${normalized.displayName}`,
    `Tipo   : ${normalized.type}`,
    `Modo   : ${normalized.mode}`,
    `Valor  : ${normalized.copiedValue}`,
    `Base   : ${normalized.basePath || 'sin base'}`,
    `Fecha  : ${normalized.copiedAt || 'sin fecha'}`,
  ].join('\n');
}

export async function resolveClipboardSource(sourcePath, mode = 'path', options = {}) {
  const resolved = path.resolve(sourcePath || process.cwd());
  const stats = await fs.stat(resolved);
  const kind = stats.isDirectory() ? 'directory' : 'file';
  const basePath = options.basePath ? path.resolve(options.basePath) : '';
  const displayName = path.basename(resolved) || resolved;

  return {
    sourcePath: resolved,
    displayName,
    kind,
    mode,
    basePath,
    copiedValue: buildCopiedValue({
      resolved,
      mode,
      basePath,
      displayName,
      kind,
    }),
  };
}

export async function pasteClipboardEntry({
  destinationDir,
  action = 'ask',
  preview = false,
}) {
  const clipboard = await loadClipboardEntry();

  if (!clipboard) {
    throw new Error('No hay nada copiado en el portapapeles de Xzp.');
  }

  const sourcePath = clipboard.sourcePath;
  const sourceName = clipboard.displayName || path.basename(sourcePath);
  const destinationPath = await resolvePasteDestinationPath({
    sourcePath,
    destinationDir,
    sourceName,
    action,
  });

  if (action === 'ask') {
    throw new Error('Debes elegir una accion antes de pegar.');
  }

  if (preview) {
    return {
      preview: true,
      action,
      sourcePath,
      destinationPath,
      clipboard,
    };
  }

  if (action === 'copy') {
    await copyEntry(sourcePath, destinationPath);
    return {
      action,
      sourcePath,
      destinationPath,
      clipboard,
    };
  }

  if (action === 'move') {
    await moveEntry(sourcePath, destinationPath);
    await clearClipboardEntry();
    return {
      action,
      sourcePath,
      destinationPath,
      clipboard,
    };
  }

  throw new Error(`Accion no valida: ${action}`);
}

async function copyEntry(sourcePath, destinationPath) {
  const stats = await fs.stat(sourcePath);

  if (stats.isDirectory()) {
    await fs.cp(sourcePath, destinationPath, {
      recursive: true,
      errorOnExist: true,
      force: false,
    });
    return;
  }

  await fs.copyFile(sourcePath, destinationPath);
}

async function moveEntry(sourcePath, destinationPath) {
  try {
    await fs.rename(sourcePath, destinationPath);
  } catch (error) {
    if (!error || error.code !== 'EXDEV') {
      throw error;
    }

    await copyEntry(sourcePath, destinationPath);
    await removeEntry(sourcePath);
  }
}

async function removeEntry(targetPath) {
  const stats = await fs.stat(targetPath);

  if (stats.isDirectory()) {
    await fs.rm(targetPath, { recursive: true, force: true });
    return;
  }

  await fs.unlink(targetPath);
}

async function ensureDestinationAvailable(destinationPath) {
  try {
    await fs.access(destinationPath);
    throw new Error(`Ya existe un elemento en: ${destinationPath}`);
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return;
    }

    if (error && error.message && error.message.startsWith('Ya existe')) {
      throw error;
    }

    if (!error || error.code !== 'ENOENT') {
      throw error;
    }
  }
}

async function resolvePasteDestinationPath({
  sourcePath,
  destinationDir,
  sourceName,
  action,
}) {
  const baseDestinationPath = path.join(destinationDir, sourceName);
  const normalizedSource = path.resolve(sourcePath);
  const normalizedBaseDestination = path.resolve(baseDestinationPath);

  if (action === 'move' && normalizedSource === normalizedBaseDestination) {
    throw new Error('El origen y el destino son la misma ruta. Cambia de carpeta antes de mover.');
  }

  if (!(await pathExists(baseDestinationPath))) {
    return baseDestinationPath;
  }

  if (action === 'move') {
    return await resolveUniqueDestinationPath(baseDestinationPath);
  }

  return await resolveUniqueDestinationPath(baseDestinationPath);
}

async function resolveUniqueDestinationPath(destinationPath) {
  const parsed = path.parse(destinationPath);
  const baseName = parsed.ext ? parsed.name : parsed.base;
  const extension = parsed.ext || '';

  for (let index = 1; index <= 999; index += 1) {
    const suffix = index === 1 ? '-copy' : `-copy-${index}`;
    const candidateName = `${baseName}${suffix}${extension}`;
    const candidatePath = path.join(parsed.dir, candidateName);

    if (!(await pathExists(candidatePath))) {
      return candidatePath;
    }
  }

  throw new Error(`No pude encontrar un nombre libre para pegar en: ${parsed.dir}`);
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function buildCopiedValue({ resolved, mode, basePath, displayName, kind }) {
  if (mode === 'name') {
    return displayName;
  }

  if (mode === 'relative') {
    return path.relative(basePath || process.cwd(), resolved) || '.';
  }

  if (mode === 'ext') {
    return path.extname(resolved) || '(sin extension)';
  }

  if (mode === 'json') {
    return JSON.stringify({
      path: resolved,
      name: displayName,
      kind,
      extension: path.extname(resolved) || '',
      parent: path.dirname(resolved),
    }, null, 2);
  }

  if (mode === 'shell') {
    return quoteForShell(resolved);
  }

  return resolved;
}

function quoteForShell(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}
