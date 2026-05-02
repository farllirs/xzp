import test from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../src/core/args.js';
import { buildAgentContextMarkdown } from '../src/core/agent-context.js';
import { __testMergeConfig } from '../src/core/config.js';

test('parsea acciones del modo agente', () => {
  assert.equal(parseArgs(['--agent-status']).command, 'agent-mode');
  assert.equal(parseArgs(['--agent-on']).agentAction, 'on');
  assert.equal(parseArgs(['--agent-off']).agentAction, 'off');
  assert.equal(parseArgs(['--agent-context']).agentAction, 'context');
  assert.equal(parseArgs(['--agent-refresh-context']).agentAction, 'refresh-context');
});

test('mergeConfig conserva agentMode en runtime', () => {
  const merged = __testMergeConfig({
    runtime: {
      agentMode: true,
    },
  });

  assert.equal(merged.runtime.agentMode, true);
});

test('genera contexto markdown para agentes', () => {
  const markdown = buildAgentContextMarkdown({ locale: 'co_es' });

  assert.match(markdown, /# Xzp Agent Context/);
  assert.match(markdown, /`context`/);
  assert.match(markdown, /comandos de Xzp/i);
});
