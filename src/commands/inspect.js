import { gatherProjectInspectReport } from '../utils/system-inspect.js';
import {
  printBanner,
  printKeyValueRows,
  printList,
  printSection,
  statusLabel,
} from '../ui/output.js';

export async function runInspectCommand(options = {}) {
  const report = await gatherProjectInspectReport();

  if (options.outputFormat === 'json') {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  if (!report.found) {
    printBanner('Xzp Inspect', [
      'No detecte un proyecto compatible en esta ruta.',
    ]);
    printSection('Ubicacion');
    printKeyValueRows([
      ['Ruta', report.cwd],
      ['Estado', statusLabel('sin proyecto', 'warn')],
    ]);
    printSection('Sugerencias');
    printList(report.recommendations);
    return;
  }

  printBanner('Xzp Inspect', [
    'Resumen del proyecto actual para decidir que mejorar antes de la siguiente release.',
  ]);

  printSection('Resumen');
  printKeyValueRows([
    ['Proyecto', report.projectRoot],
    ['Lenguaje', report.context.label],
    ['Version', report.context.version || 'sin detectar'],
    ['Archivos', String(report.topLevel.files)],
    ['Carpetas', String(report.topLevel.directories)],
  ]);

  if (report.metadata.summary?.length) {
    printSection('Metadatos');
    printKeyValueRows(report.metadata.summary.map((item) => [item.key, item.value]));
  }

  if (report.stackProfile?.length) {
    printSection('Perfil');
    printList(report.stackProfile);
  }

  printSection('Archivos clave');
  printList(report.importantFiles.length ? report.importantFiles : ['No vi archivos clave conocidos en el root.']);

  if (report.visibleDebt?.length) {
    printSection('Deuda visible');
    printList(report.visibleDebt);
  }

  printSection('Siguientes pasos');
  printList(report.recommendations);
}
