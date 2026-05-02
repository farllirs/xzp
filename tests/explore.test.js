import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { searchEntries } from '../src/utils/fs-search.js';
import { buildTreeComparison, buildTreeReport } from '../src/utils/fs-tree.js';
import { __testSummarizeDoctorHealth } from '../src/utils/system-inspect.js';

test('searchEntries prioriza coincidencias mas cercanas y filtra por tipo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-search-'));
  const nestedDir = path.join(root, 'src');
  await fs.mkdir(nestedDir, { recursive: true });
  await fs.writeFile(path.join(root, 'demo.txt'), 'root\n', 'utf8');
  await fs.writeFile(path.join(nestedDir, 'demo-helper.txt'), 'nested\n', 'utf8');

  const results = await searchEntries({
    root,
    pattern: 'demo',
    type: 'file',
    limit: 10,
  });

  assert.equal(results[0].relativePath, 'demo.txt');
  assert.equal(results[0].type, 'file');
});

test('buildTreeReport respeta profundidad y limite', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-tree-'));
  const nestedA = path.join(root, 'a');
  const nestedB = path.join(nestedA, 'b');
  await fs.mkdir(nestedB, { recursive: true });
  await fs.writeFile(path.join(root, 'root.txt'), 'ok\n', 'utf8');
  await fs.writeFile(path.join(nestedA, 'a.txt'), 'ok\n', 'utf8');
  await fs.writeFile(path.join(nestedB, 'b.txt'), 'ok\n', 'utf8');

  const report = await buildTreeReport({
    root,
    label: '.',
    maxDepth: 2,
    limit: 3,
  });

  assert.equal(report.truncatedByDepth, true);
  assert.equal(report.truncatedByLimit, true);
});

test('doctor resume score y severidad', () => {
  const health = __testSummarizeDoctorHealth([
    { severity: 'critical' },
    { severity: 'medium' },
    { severity: 'low' },
  ]);

  assert.equal(health.counts.critical, 1);
  assert.equal(health.counts.medium, 1);
  assert.equal(health.counts.low, 1);
  assert.equal(health.status, 'fragil');
});

test('searchEntries soporta semantica y exclusiones persistibles', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-search-sem-'));
  await fs.mkdir(path.join(root, 'dist'), { recursive: true });
  await fs.writeFile(path.join(root, 'api-client.ts'), 'ok\n', 'utf8');
  await fs.writeFile(path.join(root, 'dist', 'api-client.bundle.js'), 'ok\n', 'utf8');

  const results = await searchEntries({
    root,
    pattern: 'api client',
    semantic: true,
    excludePatterns: ['dist'],
    limit: 10,
  });

  assert.equal(results.length, 1);
  assert.equal(results[0].relativePath, 'api-client.ts');
});

test('buildTreeComparison resume diferencias entre dos rutas', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-tree-compare-'));
  const left = path.join(root, 'left');
  const right = path.join(root, 'right');
  await fs.mkdir(left, { recursive: true });
  await fs.mkdir(path.join(right, 'nested'), { recursive: true });
  await fs.writeFile(path.join(left, 'a.txt'), 'ok\n', 'utf8');
  await fs.writeFile(path.join(right, 'a.txt'), 'ok\n', 'utf8');
  await fs.writeFile(path.join(right, 'nested', 'b.txt'), 'ok\n', 'utf8');

  const leftReport = await buildTreeReport({ root: left, label: 'left', maxDepth: 3, limit: 20 });
  const rightReport = await buildTreeReport({ root: right, label: 'right', maxDepth: 3, limit: 20 });
  const comparison = buildTreeComparison(leftReport, rightReport);

  assert.equal(comparison.delta.directories, 1);
  assert.equal(comparison.delta.files, 1);
});
