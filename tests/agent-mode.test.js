import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/core/args.js';
import { __testMergeConfig } from '../src/core/config.js';

test('parsea acciones del modo agente', () => {
  assert.equal(parseArgs(['--agent-status']).command, 'agent-mode');
  assert.equal(parseArgs(['--agent-on']).agentAction, 'on');
  assert.equal(parseArgs(['--agent-off']).agentAction, 'off');
});

test('mergeConfig conserva agentMode en runtime', () => {
  const merged = __testMergeConfig({
    runtime: {
      agentMode: true,
    },
  });

  assert.equal(merged.runtime.agentMode, true);
});
