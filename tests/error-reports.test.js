import test from 'node:test';
import assert from 'node:assert/strict';
import { writeErrorReportFile } from '../src/core/error-reports.js';

test('crea reporte de error con snapshot previo', async () => {
  const report = await writeErrorReportFile({
    source: 'test',
    title: 'Fallo de prueba',
    summary: 'Algo se rompio',
    details: 'Detalle minimo',
    lastError: {
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
  assert.match(report.body, /Ultimo Error Capturado/);
  assert.match(report.body, /Error: boom/);
  assert.match(report.body, /Ruta actual: ~/);
  assert.match(report.body, /token=\[redacted\]/);
});
