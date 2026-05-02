import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareVersions,
  __testBuildReleasePlan,
  __testBuildRegistryUrl,
  __testDetectReleaseChannel,
  __testRecommendNextBump,
} from '../src/commands/version.js';

test('compareVersions detecta igualdad', () => {
  assert.equal(compareVersions('0.5.0', '0.5.0'), 0);
});

test('compareVersions detecta prerelease', () => {
  assert.equal(compareVersions('0.5.0-beta.1', '0.5.0'), -1);
  assert.equal(compareVersions('0.5.1', '0.5.0'), 1);
});

test('recomienda siguiente bump', () => {
  assert.equal(__testRecommendNextBump('1.0.0', '1.0.0'), '1.0.1');
  assert.equal(__testRecommendNextBump('1.0.0', null), '1.0.1');
});

test('detecta canal de release', () => {
  assert.equal(__testDetectReleaseChannel('1.0.0'), 'stable');
  assert.equal(__testDetectReleaseChannel('1.0.0-beta.2'), 'beta');
  assert.equal(__testDetectReleaseChannel('1.0.0-rc.1'), 'rc');
});

test('buildReleasePlan promueve prerelease alineada', () => {
  const plan = __testBuildReleasePlan('1.2.0-rc.1', '1.2.0-rc.1');
  assert.equal(plan.type, 'promote');
  assert.equal(plan.recommendedVersion, '1.2.0');
});

test('buildReleasePlan detecta npm adelantado', () => {
  const plan = __testBuildReleasePlan('1.0.0', '1.0.1');
  assert.equal(plan.type, 'sync');
  assert.match(plan.criteria, /npm va por delante/);
});

test('construye URL del registry para paquetes scoped', () => {
  assert.equal(
    __testBuildRegistryUrl('@nyxur/xzp'),
    'https://registry.npmjs.org/%40nyxur%2Fxzp/latest',
  );
});
