import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pasteClipboardEntry, resolveClipboardSource, saveClipboardEntry } from '../src/core/clipboard.js';
import { resolveWritableDirectory } from '../src/utils/security.js';

test('pegar copia con nombre repetido genera sufijo copy', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-clipboard-'));
  const sourceDir = path.join(root, 'source');
  const destinationDir = path.join(root, 'destination');
  const sourceFile = path.join(sourceDir, 'demo.txt');
  const existingFile = path.join(destinationDir, 'demo.txt');

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.writeFile(sourceFile, 'origen\n', 'utf8');
  await fs.writeFile(existingFile, 'destino\n', 'utf8');

  await saveClipboardEntry({
    sourcePath: sourceFile,
    displayName: 'demo.txt',
    kind: 'file',
    mode: 'path',
  });

  const result = await pasteClipboardEntry({
    destinationDir,
    action: 'copy',
  });

  assert.match(result.destinationPath, /demo-copy\.txt$/);
});

test('copy relativo usa base del proyecto y paste preview no modifica archivos', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-clipboard-'));
  const projectRoot = path.join(root, 'project');
  const nestedDir = path.join(projectRoot, 'src');
  const sourceFile = path.join(nestedDir, 'demo.js');
  const destinationDir = path.join(root, 'destination');

  await fs.mkdir(nestedDir, { recursive: true });
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.writeFile(sourceFile, 'console.log("ok")\n', 'utf8');

  const entry = await resolveClipboardSource(sourceFile, 'relative', {
    basePath: projectRoot,
  });

  assert.equal(entry.copiedValue, path.join('src', 'demo.js'));

  await saveClipboardEntry(entry);

  const result = await pasteClipboardEntry({
    destinationDir,
    action: 'copy',
    preview: true,
  });

  assert.equal(result.preview, true);
  await assert.rejects(fs.access(path.join(destinationDir, 'demo.js')));
});

test('resolveWritableDirectory rechaza rutas inexistentes o no-directorio', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-security-'));
  const filePath = path.join(root, 'file.txt');
  await fs.writeFile(filePath, 'ok\n', 'utf8');

  await assert.rejects(resolveWritableDirectory(path.join(root, 'missing')));
  await assert.rejects(resolveWritableDirectory(filePath));
  assert.equal(await resolveWritableDirectory(root), root);
});
