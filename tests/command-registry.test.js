import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRegisteredCommand, listRegisteredCommands } from '../src/core/command-registry.js';

describe('command-registry.js', () => {
  describe('getRegisteredCommand', () => {
    it('should find a command by its exact name', () => {
      const cmd = getRegisteredCommand('diagnose');
      assert.ok(cmd);
      assert.equal(cmd.name, 'diagnose');
    });

    it('should return null for an unknown command', () => {
      const cmd = getRegisteredCommand('nonexistent');
      assert.equal(cmd, null);
    });

    it('should be case insensitive', () => {
      const cmd = getRegisteredCommand('DIAGNOSE');
      assert.ok(cmd);
      assert.equal(cmd.name, 'diagnose');
    });

    it('should find a command by alias', () => {
      const cmd = getRegisteredCommand('test');
      assert.ok(cmd);
      assert.equal(cmd.name, 'diagnose');
    });

    it('should find diagnose via health alias', () => {
      const cmd = getRegisteredCommand('health');
      assert.ok(cmd);
      assert.equal(cmd.name, 'diagnose');
    });

    it('should find diagnose via check alias', () => {
      const cmd = getRegisteredCommand('check');
      assert.ok(cmd);
      assert.equal(cmd.name, 'diagnose');
    });

    it('should find android command', () => {
      const cmd = getRegisteredCommand('android');
      assert.ok(cmd);
      assert.equal(cmd.name, 'android');
    });

    it('should find menu command', () => {
      const cmd = getRegisteredCommand('menu');
      assert.ok(cmd);
      assert.equal(cmd.name, 'menu');
    });

    it('should find version command', () => {
      const cmd = getRegisteredCommand('version');
      assert.ok(cmd);
      assert.equal(cmd.name, 'version');
    });
  });

  describe('listRegisteredCommands', () => {
    it('should return a list of all registered commands', () => {
      const commands = listRegisteredCommands();
      assert.ok(Array.isArray(commands));
      assert.ok(commands.length > 10);
    });

    it('should include key commands', () => {
      const commands = listRegisteredCommands();
      const names = commands.map(c => c.name);
      assert.ok(names.includes('diagnose'));
      assert.ok(names.includes('search'));
      assert.ok(names.includes('android'));
      assert.ok(names.includes('menu'));
      assert.ok(names.includes('safe-shell'));
      assert.ok(names.includes('agent-mode'));
    });

    it('should return a copy not a reference', () => {
      const a = listRegisteredCommands();
      const b = listRegisteredCommands();
      assert.notEqual(a, b);
    });
  });
});
