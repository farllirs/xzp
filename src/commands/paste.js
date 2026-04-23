import path from 'node:path';
import { loadClipboardEntry, pasteClipboardEntry } from '../core/clipboard.js';
import { choosePasteAction } from '../ui/prompt.js';
import { resolveWritableDirectory, sanitizeTerminalText } from '../utils/security.js';

export async function runPasteCommand(parsed = {}) {
  const clipboard = await loadClipboardEntry();

  if (!clipboard) {
    throw new Error('No hay nada en el portapapeles de Xzp. Primero usa xzp -c.');
  }

  let action = parsed.pasteAction || '';

  if (!action) {
    action = parsed.agentMode ? 'copy' : await choosePasteAction();
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
