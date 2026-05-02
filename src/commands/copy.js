import path from 'node:path';
import { detectProjectContext } from '../utils/project-context.js';
import { formatClipboardEntry, formatClipboardEntryForOutput, resolveClipboardSource, saveClipboardEntry } from '../core/clipboard.js';

export async function runCopyCommand(parsed = {}) {
  const context = await detectProjectContext();
  const projectRoot = context?.projectRoot || process.cwd();
  const explicitTarget = (parsed.copyTarget || '').trim();
  const resolvedSource = explicitTarget
    ? await resolveClipboardSource(explicitTarget, parsed.copyMode, {
      basePath: projectRoot,
    })
    : await resolveCopySourceFromContext(parsed.copyMode, projectRoot);

  const entry = await saveClipboardEntry({
    ...resolvedSource,
    mode: parsed.copyMode || 'path',
  });

  if (parsed.outputFormat === 'json') {
    console.log(formatClipboardEntryForOutput(entry, 'json'));
    return;
  }

  console.log('Xzp copio al portapapeles:');
  console.log(formatClipboardEntry(entry));
}

async function resolveCopySourceFromContext(mode = 'path', projectRoot = process.cwd()) {
  const sourcePath = mode === 'project-root' ? projectRoot : projectRoot;
  const resolved = await resolveClipboardSource(sourcePath, mode, {
    basePath: projectRoot,
  });

  if (mode === 'name') {
    resolved.displayName = path.basename(resolved.sourcePath);
  }

  return resolved;
}
