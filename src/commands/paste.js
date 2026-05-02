import path from 'node:path';
import { loadClipboardEntry, pasteClipboardEntry } from '../core/clipboard.js';
import { loadUserConfig } from '../core/config.js';
import { choosePasteAction } from '../ui/prompt.js';
import { resolveWritableDirectory, sanitizeTerminalText } from '../utils/security.js';
import { getLinuxDistroRoots, getTermuxHomeForGuest, isHostTermux } from '../utils/platform.js';

export async function runPasteCommand(parsed = {}) {
  const clipboard = await loadClipboardEntry();

  if (!clipboard) {
    throw new Error('No hay nada en el portapapeles de Xzp. Primero usa xzp -c.');
  }

  let targetDir = parsed.pasteTarget || process.cwd();

  // Especial: Mapeo de entornos
  if (targetDir === 'linux') {
    if (!isHostTermux()) {
      throw new Error('Ya estas en un entorno Linux. Usa una ruta normal o "termux" para volver.');
    }
    const distros = await getLinuxDistroRoots();
    if (distros.length === 0) {
      throw new Error('No detecte ninguna distribucion de Linux instalada via proot-distro.');
    }
    // Por ahora tomamos la primera, o podriamos preguntar si hay varias
    targetDir = distros[0].path;
    console.log(`Xzp Bridge: Apuntando a la raiz de Linux (${distros[0].name})`);
  } else if (targetDir === 'termux') {
    if (isHostTermux()) {
      throw new Error('Ya estas en Termux. Usa una ruta normal o "linux" para enviar al entorno Linux.');
    }
    targetDir = getTermuxHomeForGuest();
    console.log('Xzp Bridge: Apuntando a la raiz de Termux');
  }

  let action = parsed.pasteAction || '';

  if (!action) {
    const config = await loadUserConfig();
    action = parsed.agentMode ? 'copy' : await choosePasteAction(config.ui?.locale || 'co_es');
  }

  const result = await pasteClipboardEntry({
    destinationDir: await resolveWritableDirectory(parsed.pasteTarget || process.cwd()),
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
