import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

const SNAPSHOT_DIR = path.resolve('/data/data/com.termux/files/home/xzp/snapshots');

test('snapshots base del CLI existen y contienen cabeceras esperadas', async () => {
  const files = ['help.txt', 'context-profile.txt', 'tree-summary.txt'];

  for (const file of files) {
    const content = await fs.readFile(path.join(SNAPSHOT_DIR, file), 'utf8');
    assert.ok(content.length > 10);
  }

  const help = await fs.readFile(path.join(SNAPSHOT_DIR, 'help.txt'), 'utf8');
  const context = await fs.readFile(path.join(SNAPSHOT_DIR, 'context-profile.txt'), 'utf8');
  const tree = await fs.readFile(path.join(SNAPSHOT_DIR, 'tree-summary.txt'), 'utf8');

  assert.match(help, /Xzp CLI/);
  assert.match(context, /Contexto: xzp \[NODE\]/);
  assert.match(tree, /Resumen/);
});
