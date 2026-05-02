import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMailtoUrl, writeErrorReportFile } from '../src/core/error-reports.js';

test('crea reporte de error con snapshot previo', async () => {
  const report = await writeErrorReportFile({
    source: 'test',
    title: 'Fallo de prueba',
    summary: 'Algo se rompio',
    details: 'Detalle minimo',
    lastError: {
      snapshotId: 'snap1234',
      message: 'boom',
      cwd: `${process.env.HOME || '/data/data/com.termux/files/home'}/demo`,
      argv: ['-x', '--token=abc123'],
      node: 'v24',
      platform: 'linux',
      release: '1.0',
      stack: 'Error: boom token=abc123',
    },
  });

  assert.match(report.subject, /Fallo de prueba/);
  assert.match(report.body, /## Ultimo Error Capturado/);
  assert.match(report.body, /### Stack/);
  assert.match(report.body, /Ruta actual: ~\//);
  assert.match(report.body, /token=\[redacted\]/);
  assert.match(report.mailBody, /Reporte de Error Xzp/);
  assert.match(report.mailBody, /Ultimo Error Capturado:/);
  assert.equal(report.preview.snapshotId, 'snap1234');
});

test('buildMailtoUrl usa encoding legible para Gmail y conserva saltos de linea', () => {
  const mailto = buildMailtoUrl('Fallo grave', 'Linea uno\nLinea dos con espacios');

  assert.match(mailto, /^mailto:farllirs@gmail.com\?/);
  assert.ok(!mailto.includes('+'));
  assert.ok(mailto.includes('Fallo%20grave'));
  assert.ok(mailto.includes('Linea%20uno%0D%0ALinea%20dos%20con%20espacios'));
});
