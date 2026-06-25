import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Only test pure functions that don't need fs mocking
const { __testMergeConfig, __testNormalizeOutputFormat, readBooleanEnv } = await import('../src/core/config.js');

describe('config.js - mergeConfig', () => {
  it('should merge partial config with defaults', () => {
    const merged = __testMergeConfig({
      features: { androidShortcut: false },
    });

    assert.equal(merged.schemaVersion, 3);
    assert.equal(merged.features.androidShortcut, false);
    assert.equal(merged.features.projectBadge, true); // default
    assert.equal(merged.features.smartProjectInstall, false); // default
  });

  it('should provide default android config', () => {
    const merged = __testMergeConfig({});
    assert.ok(merged.android);
    assert.ok(Array.isArray(merged.android.enabledQuickAccess));
    assert.equal(merged.android.showFileSizes, true);
    assert.equal(merged.android.persistLastLocation, true);
    assert.equal(merged.android.integrateWithAgent, true);
  });

  it('should migrate smartPythonInstall to smartProjectInstall', () => {
    const merged = __testMergeConfig({
      features: { smartPythonInstall: true },
    });
    assert.equal(merged.features.smartProjectInstall, true);
  });

  it('should normalize outputFormat', () => {
    const merged = __testMergeConfig({
      runtime: { outputFormat: 'json' },
    });
    assert.equal(merged.runtime.outputFormat, 'json');
  });

  it('should reject invalid outputFormat', () => {
    const merged = __testMergeConfig({
      runtime: { outputFormat: 'xml' },
    });
    assert.equal(merged.runtime.outputFormat, 'text');
  });

  it('should normalize platformMode', () => {
    const merged = __testMergeConfig({
      runtime: { platformMode: 'termux' },
    });
    assert.equal(merged.runtime.platformMode, 'termux');
  });

  it('should reject invalid platformMode', () => {
    const merged = __testMergeConfig({
      runtime: { platformMode: 'windows' },
    });
    assert.equal(merged.runtime.platformMode, 'auto');
  });
});

describe('config.js - normalize helpers (via __testNormalizeOutputFormat)', () => {
  it('should normalize outputFormat to text for invalid values', () => {
    assert.equal(__testNormalizeOutputFormat('xml'), 'text');
    assert.equal(__testNormalizeOutputFormat(null), 'text');
    assert.equal(__testNormalizeOutputFormat(''), 'text');
  });

  it('should keep valid outputFormats', () => {
    assert.equal(__testNormalizeOutputFormat('text'), 'text');
    assert.equal(__testNormalizeOutputFormat('json'), 'json');
  });
});

describe('config.js - readBooleanEnv', () => {
  it('should return fallback when env var is not set', () => {
    assert.equal(readBooleanEnv('XZP_NONEXISTENT_CFG', false), false);
    assert.equal(readBooleanEnv('XZP_NONEXISTENT_CFG', true), true);
  });

  it('should return true for truthy values', () => {
    process.env.XZP_TEST_BOOL = 'true';
    assert.equal(readBooleanEnv('XZP_TEST_BOOL', false), true);
    process.env.XZP_TEST_BOOL = '1';
    assert.equal(readBooleanEnv('XZP_TEST_BOOL', false), true);
    process.env.XZP_TEST_BOOL = 'yes';
    assert.equal(readBooleanEnv('XZP_TEST_BOOL', false), true);
    delete process.env.XZP_TEST_BOOL;
  });

  it('should return false for falsy values', () => {
    process.env.XZP_TEST_BOOL = 'false';
    assert.equal(readBooleanEnv('XZP_TEST_BOOL', true), false);
    delete process.env.XZP_TEST_BOOL;
  });
});

describe('config.js - DEFAULT_CONFIG integrity', () => {
  it('should have required top-level keys', () => {
    const merged = __testMergeConfig({});
    const requiredKeys = ['schemaVersion', 'features', 'android', 'shortcuts', 'favorites', 'history', 'search', 'install', 'menu', 'ui', 'runtime', 'projects'];
    for (const key of requiredKeys) {
      assert.ok(key in merged, `Missing required key: ${key}`);
    }
  });

  it('should have android defaults complete', () => {
    const merged = __testMergeConfig({});
    const android = merged.android;
    assert.ok(Array.isArray(android.enabledQuickAccess));
    assert.equal(typeof android.showFileSizes, 'boolean');
    assert.equal(typeof android.showModifiedDate, 'boolean');
    assert.equal(typeof android.showFileType, 'boolean');
    assert.equal(typeof android.persistLastLocation, 'boolean');
    assert.equal(typeof android.integrateWithAgent, 'boolean');
    assert.equal(typeof android.allowExternalVolumes, 'boolean');
    assert.ok(typeof android.navigatorDensity === 'string');
  });
});
