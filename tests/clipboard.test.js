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


test('fallback de copy dereferencea symlinks cuando fs.cp falla por permisos', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-clipboard-'));
  const sourceDir = path.join(root, 'android-root');
  const destinationDir = path.join(root, 'destination');
  const realDir = path.join(sourceDir, 'real');
  const realFile = path.join(realDir, 'demo.txt');
  const linkedDir = path.join(sourceDir, 'linked');

  await fs.mkdir(realDir, { recursive: true });
  await fs.mkdir(destinationDir, { recursive: true });
  await fs.writeFile(realFile, 'ok\n', 'utf8');
  await fs.symlink(realDir, linkedDir);

  await saveClipboardEntry({
    sourcePath: sourceDir,
    displayName: 'android-root',
    kind: 'directory',
    mode: 'path',
  });

  const originalCp = fs.cp;
  let firstCall = true;
  fs.cp = async (source, destination, options = {}) => {
    if (firstCall && !options.dereference) {
      firstCall = false;
      const error = new Error('EACCES: permission denied, symlink');
      error.code = 'EACCES';
      throw error;
    }

    return originalCp(source, destination, options);
  };

  try {
    const result = await pasteClipboardEntry({
      destinationDir,
      action: 'copy',
    });

    const copiedFile = path.join(result.destinationPath, 'linked', 'demo.txt');
    assert.equal(await fs.readFile(copiedFile, 'utf8'), 'ok\n');
  } finally {
    fs.cp = originalCp;
  }
});


test('bloquea copiar una carpeta dentro de si misma aunque Android use rutas alias', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-clipboard-'));
  const sourceDir = path.join(root, 'storage', 'emulated', '0');
  const destinationDir = path.join(root, 'sdcard');

  await fs.mkdir(sourceDir, { recursive: true });
  await fs.symlink(sourceDir, destinationDir);

  await saveClipboardEntry({
    sourcePath: destinationDir,
    displayName: 'sdcard',
    kind: 'directory',
    mode: 'path',
  });

  await assert.rejects(
    pasteClipboardEntry({
      destinationDir: sourceDir,
      action: 'copy',
    }),
    /dentro de si misma/,
  );
});

test('resolveWritableDirectory rechaza rutas inexistentes o no-directorio', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-security-'));
  const filePath = path.join(root, 'file.txt');
  await fs.writeFile(filePath, 'ok\n', 'utf8');

  await assert.rejects(resolveWritableDirectory(path.join(root, 'missing')));
  await assert.rejects(resolveWritableDirectory(filePath));
  assert.equal(await resolveWritableDirectory(root), root);
});
