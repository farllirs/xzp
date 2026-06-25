import path from 'node:path';
import { loadClipboardEntry, pasteClipboardEntry } from '../core/clipboard.js';
import { loadUserConfig } from '../core/config.js';
import { chooseLinuxDistro, choosePasteAction } from '../ui/prompt.js';
import { resolveWritableDirectory, sanitizeTerminalText } from '../utils/security.js';
import { getHomeDirectory, getLinuxDistroRoots, getTermuxHomeForGuest, isHostTermux } from '../utils/platform.js';

export async function runPasteCommand(parsed = {}) {
  const clipboard = await loadClipboardEntry();

  if (!clipboard) {
    throw new Error('No hay nada en el portapapeles de Xzp. Primero usa xzp -c.');
  }

  const config = await loadUserConfig();
  const targetDir = await resolvePasteTargetDirectory(parsed, config);

  let action = parsed.pasteAction || '';

  if (!action) {
    action = parsed.agentMode ? 'copy' : await choosePasteAction(config.ui?.locale || 'co_es');
  }

  const result = await pasteClipboardEntry({
    destinationDir: await resolveWritableDirectory(targetDir),
    action,
    preview: Boolean(parsed.pastePreview),
  });

  if (parsed.outputFormat === 'json') {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.preview) {
    console.log('Xzp preview de pegado:');
    console.log(`Accion  : ${sanitizeTerminalText(result.action)}`);
    console.log(`Origen  : ${sanitizeTerminalText(result.sourcePath)}`);
    console.log(`Destino : ${sanitizeTerminalText(result.destinationPath)}`);
    return;
  }

  console.log(`Xzp pego como ${sanitizeTerminalText(result.action)}: ${sanitizeTerminalText(result.destinationPath)}`);
}

export async function resolvePasteTargetDirectory(parsed = {}, config = {}) {
  const requestedTarget = parsed.pasteTarget || process.cwd();

  if (requestedTarget === 'linux') {
    if (!isHostTermux()) {
      throw new Error('Ya estas en un entorno Linux. Usa una ruta normal o "termux" para volver.');
    }

    const distros = await getLinuxDistroRoots();
    if (distros.length === 0) {
      throw new Error('No detecte ninguna distribucion de Linux instalada via proot-distro.');
    }

    const selected = await resolveLinuxDistroSelection(distros, parsed, config);
    console.log(`Xzp Bridge: Apuntando a Linux (${selected.name}) -> ${selected.path}`);
    return selected.path;
  }

  if (requestedTarget === 'termux') {
    if (isTermuxHomeSession()) {
      throw new Error('Ya estas en Termux. Usa una ruta normal o "linux" para enviar al entorno Linux.');
    }

    const termuxHome = getTermuxHomeForGuest();
    console.log(`Xzp Bridge: Apuntando a Termux -> ${termuxHome}`);
    return termuxHome;
  }

  return requestedTarget;
}

function isTermuxHomeSession() {
  const home = getHomeDirectory();
  return home === getTermuxHomeForGuest() || home.startsWith(getTermuxHomeForGuest() + path.sep);
}

async function resolveLinuxDistroSelection(distros, parsed = {}, config = {}) {
  if (distros.length === 1 || parsed.agentMode) {
    return distros[0];
  }

  const locale = config.ui?.locale || 'co_es';
  const selectedName = await chooseLinuxDistro(distros, locale);
  return distros.find((distro) => distro.name === selectedName) || distros[0];
}
