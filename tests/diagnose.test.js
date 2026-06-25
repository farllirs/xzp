import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { __testSummarizeDoctorHealth } from '../src/utils/system-inspect.js';

describe('system-inspect.js - summarizeDoctorHealth', () => {
  it('should return perfect score with no issues', () => {
    const result = __testSummarizeDoctorHealth([]);
    assert.equal(result.score, 100);
    assert.equal(result.status, 'solido');
    assert.deepEqual(result.counts, { critical: 0, high: 0, medium: 0, low: 0 });
  });

  it('should penalize critical issues heavily', () => {
    const result = __testSummarizeDoctorHealth([
      { severity: 'critical' },
    ]);
    assert.equal(result.score, 65);
    assert.equal(result.counts.critical, 1);
  });

  it('should penalize high issues moderately', () => {
    const result = __testSummarizeDoctorHealth([
      { severity: 'high' },
    ]);
    assert.equal(result.score, 80);
  });

  it('should handle mixed severities', () => {
    const result = __testSummarizeDoctorHealth([
      { severity: 'critical' },
      { severity: 'high' },
      { severity: 'medium' },
      { severity: 'low' },
    ]);
    // 100 - 35 - 20 - 10 - 4 = 31
    assert.equal(result.score, 31);
    assert.equal(result.status, 'critico');
  });

  it('should set status based on score thresholds', () => {
    assert.equal(__testSummarizeDoctorHealth([]).status, 'solido');
    assert.equal(__testSummarizeDoctorHealth([{ severity: 'medium' }]).status, 'solido'); // 100-10=90
    assert.equal(__testSummarizeDoctorHealth([{ severity: 'high' }]).status, 'usable'); // 100-20=80
    const mediumIssues = [
      { severity: 'medium' },
      { severity: 'medium' },
      { severity: 'medium' },
    ];
    assert.equal(__testSummarizeDoctorHealth(mediumIssues).status, 'usable'); // 100-30=70
    const manyIssues = [
      { severity: 'critical' },
      { severity: 'high' },
      { severity: 'medium' },
    ];
    assert.equal(__testSummarizeDoctorHealth(manyIssues).status, 'critico'); // 100-35-20-10=35
    const criticalIssues = [
      { severity: 'critical' },
      { severity: 'critical' },
    ];
    assert.equal(__testSummarizeDoctorHealth(criticalIssues).status, 'critico'); // 100-70=30
  });

  it('should ignore unknown severity levels', () => {
    const result = __testSummarizeDoctorHealth([
      { severity: 'unknown' },
      { severity: 'info' },
    ]);
    assert.equal(result.score, 100); // unknown severities don't count
    assert.equal(result.counts.critical, 0);
    assert.equal(result.counts.high, 0);
    assert.equal(result.counts.medium, 0);
    assert.equal(result.counts.low, 0);
  });

  it('should not go below 0', () => {
    const result = __testSummarizeDoctorHealth([
      { severity: 'critical' },
      { severity: 'critical' },
      { severity: 'critical' },
    ]);
    // 100 - 105 = 0 (clamped)
    assert.equal(result.score, 0);
  });
});
