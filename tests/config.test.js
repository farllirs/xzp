import test from 'node:test';
import assert from 'node:assert/strict';
import {
  __testMergeConfig,
  __testNormalizeOutputFormat,
  getCurrentConfigSchemaVersion,
  getDefaultSearchExcludes,
  readBooleanEnv,
  readStringEnv,
} from '../src/core/config.js';
import { t } from '../src/core/i18n.js';

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
  assert.equal(merged.ui.locale, 'co_es');
  assert.ok(merged.search.savedExcludes.includes('dist'));
});

test('normaliza locale soportado en config', () => {
  const merged = __testMergeConfig({
    ui: {
      locale: 'en-US',
    },
  });

  assert.equal(merged.ui.locale, 'en');
});

test('getDefaultSearchExcludes devuelve exclusiones base conocidas', () => {
  const defaults = getDefaultSearchExcludes();
  assert.ok(defaults.includes('.git'));
  assert.ok(defaults.includes('node_modules'));
});

test('normaliza variables runtime y formatos de salida', () => {
  process.env.XZP_BOOL_TEST = 'ON';
  process.env.XZP_STR_TEST = '  OCEAN\u0007  ';

  assert.equal(readBooleanEnv('XZP_BOOL_TEST', false), true);
  assert.equal(readStringEnv('XZP_STR_TEST'), 'OCEAN');
  assert.equal(__testNormalizeOutputFormat(' JSON '), 'json');
  assert.equal(__testNormalizeOutputFormat(' raro '), 'text');

  delete process.env.XZP_BOOL_TEST;
  delete process.env.XZP_STR_TEST;
});

test('carga locales ingles y ruso', () => {
  assert.equal(t('en', 'agentMode.title'), 'Xzp Agent Mode');
  assert.equal(t('ru', 'output.help.labels.usage'), 'Использование');
});
