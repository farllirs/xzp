import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __testMergeConfig,
  getCurrentConfigSchemaVersion,
  getDefaultSearchExcludes,
} from '../src/core/config.js';

test('mergeConfig migra schema legado y conserva defaults utiles', () => {
  const merged = __testMergeConfig({
    features: {
      smartPythonInstall: true,
    },
    search: {
      savedExcludes: ['dist'],
    },
  });

  assert.equal(merged.schemaVersion, getCurrentConfigSchemaVersion());
  assert.equal(merged.features.smartProjectInstall, true);
  assert.ok(merged.search.savedExcludes.includes('dist'));
});

test('getDefaultSearchExcludes devuelve exclusiones base conocidas', () => {
  const defaults = getDefaultSearchExcludes();
  assert.ok(defaults.includes('.git'));
  assert.ok(defaults.includes('node_modules'));
});
