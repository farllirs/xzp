import test from 'node:test';
import assert from 'node:assert/strict';
import {
  redactAndClampText,
  redactSensitiveText,
  sanitizePathForLogs,
  sanitizeTerminalText,
} from '../src/utils/security.js';

test('sanitizeTerminalText elimina secuencias de control y ansi', () => {
  const value = '\x1b[31mHola\x1b[0m\u0007 mundo';
  assert.equal(sanitizeTerminalText(value), 'Hola mundo');
});

test('redactSensitiveText oculta secretos comunes', () => {
  const value = 'token=abc123 Authorization=Bearer npm_super_secret';
  const sanitized = redactSensitiveText(value);
  assert.match(sanitized, /\[redacted\]/);
  assert.ok(!sanitized.includes('abc123'));
  assert.ok(!sanitized.includes('npm_super_secret'));
});

test('sanitizePathForLogs oculta HOME y redactAndClampText recorta', () => {
  const home = process.env.HOME || '/data/data/com.termux/files/home';
  assert.match(sanitizePathForLogs(`${home}/demo/project`), /^~\//);
  assert.match(redactAndClampText('token=abc123 ' + 'a'.repeat(5000), 80), /\[truncated\]$/);
});
