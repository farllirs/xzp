import { clearClipboardEntry, formatClipboardEntryForOutput, loadClipboardEntry } from '../core/clipboard.js';

export async function runClipboardStatusCommand(parsed = {}) {
  const entry = await loadClipboardEntry();
  console.log(formatClipboardEntryForOutput(entry, parsed.outputFormat || 'text'));
}

export async function runClipboardClearCommand() {
  await clearClipboardEntry();
  console.log('Portapapeles de Xzp limpio.');
}
