import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { __testBuildSafeStatus, resolveSafePresetEnv, resolveSafeShortcutExecution } from '../src/commands/safe-shell.js';

test('resuelve accesos seguros para python y node', () => {
  assert.deepEqual(resolveSafeShortcutExecution('python', 'main.py'), {
    command: 'python',
    args: ['main.py'],
  });

  assert.deepEqual(resolveSafeShortcutExecution('python', 'python bot.py'), {
    command: 'python',
    args: ['bot.py'],
  });

  assert.deepEqual(resolveSafeShortcutExecution('node', 'src/index.js'), {
    command: 'node',
    args: ['src/index.js'],
  });

  assert.deepEqual(resolveSafeShortcutExecution('node', 'node "src/index.js"'), {
    command: 'node',
    args: ['src/index.js'],
  });
});

test('resuelve accesos seguros para go, rust y java', () => {
  assert.deepEqual(resolveSafeShortcutExecution('go', 'main.go'), {
    command: 'go',
    args: ['run', 'main.go'],
  });

  assert.deepEqual(resolveSafeShortcutExecution('rust', 'api'), {
    command: 'cargo',
    args: ['run', '--bin', 'api'],
  });

  assert.deepEqual(resolveSafeShortcutExecution('java', 'app.jar'), {
    command: 'java',
    args: ['-jar', 'app.jar'],
  });
});

test('resuelve variables por preset seguro', () => {
  assert.deepEqual(resolveSafePresetEnv('node', 'dev'), {
    XZP_SAFE_PRESET: 'dev',
    NODE_ENV: 'development',
  });

  assert.deepEqual(resolveSafePresetEnv('python', 'debug'), {
    XZP_SAFE_PRESET: 'debug',
    NODE_ENV: 'development',
    XZP_DEBUG: '1',
    PYTHONUNBUFFERED: '1',
  });
});

test('launcher usa preset guardado', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-safe-launcher-'));
  const home = path.join(root, 'home');
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  const module = await import('../src/commands/safe-shell.js');
  const launcherPath = await module.__testWriteSafeShortcutLauncher('demo', 'release');
  const content = await fs.readFile(launcherPath, 'utf8');

  assert.match(content, /--preset "release"/);

  process.env.HOME = previousHome;
});

test('safe status detecta workspace por tipo', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'xzp-safe-status-'));
  const home = path.join(root, 'home');
  const project = path.join(root, 'project');
  const previousHome = process.env.HOME;
  process.env.HOME = home;

  const digest = createHash('sha1').update(project).digest('hex').slice(0, 8);
  await fs.mkdir(path.join(home, '.xzp', 'projects', 'node', `project-${digest}`, 'node_modules'), { recursive: true });

  const status = await __testBuildSafeStatus({
    projectRoot: project,
    projectType: 'node',
    platformMode: 'linux',
    preset: 'default',
  });

  assert.equal(status.projectType, 'node');
  assert.equal(Array.isArray(status.checks), true);

  process.env.HOME = previousHome;
});
