import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gatherDoctorReport, gatherProjectInspectReport } from '../src/utils/system-inspect.js';

test('doctor devuelve salud y grupos base', async () => {
  const report = await gatherDoctorReport();
  assert.ok(report.health.score >= 0);
  assert.ok(Array.isArray(report.tools));
  assert.ok(Array.isArray(report.issues));
});

test('inspect detecta metadata de proyecto node con deuda visible', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-inspect-'));
  const previousCwd = process.cwd();
  await fs.writeFile(path.join(root, 'package.json'), JSON.stringify({
    name: 'demo',
    version: '1.0.0',
    scripts: { dev: 'node index.js' },
  }, null, 2));

  process.chdir(root);
  const report = await gatherProjectInspectReport();
  process.chdir(previousCwd);

  assert.equal(report.found, true);
  assert.equal(report.context.type, 'node');
  assert.ok(report.stackProfile.includes('runtime: node'));
});
