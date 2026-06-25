import { createInstallationSummary, ProgressBar } from '../ui/progress.js';
import { printBanner, printKeyValueRows, printSection, statusLabel } from '../ui/output.js';

const DEMO_STEPS = [
  'resolviendo proyecto',
  'leyendo lockfile',
  'preparando entorno seguro',
  'descargando dependencias',
  'verificando instalacion',
];

export async function runVisualTestCommand(options = {}) {
  const delayMs = options.agentMode ? 0 : 140;

  printBanner('Xzp Visual Test', [
    'Simulacion local para revisar pantallas que normalmente solo aparecen durante instalaciones.',
  ]);

  printSection('Preflight');
  printKeyValueRows([
    ['Proyecto', process.cwd()],
    ['Modo', 'simulado'],
    ['Red', 'no usada'],
    ['Estado', statusLabel('preview visual', 'accent')],
  ]);

  const bar = new ProgressBar({
    total: DEMO_STEPS.length,
    title: 'Instalacion simulada',
  });

  for (const step of DEMO_STEPS) {
    bar.setPackage(step);
    await delay(delayMs);
    bar.increment(1, step);
  }

  bar.finish();

  createInstallationSummary(DEMO_STEPS.map((step, index) => ({
    name: step,
    status: index === DEMO_STEPS.length - 1 ? 'ok' : 'ok',
    elapsed: index + 1,
  })));

  printSection('Estados');
  printKeyValueRows([
    ['Carga', statusLabel('ok', 'ok')],
    ['Animacion', statusLabel('ok', 'ok')],
    ['Resumen', statusLabel('ok', 'ok')],
  ]);
}

function delay(ms) {
  if (!ms) {
    return Promise.resolve();
  }

  return new Promise((resolve) => setTimeout(resolve, ms));
}
