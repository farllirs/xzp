import { gatherDoctorReport, readCommandVersion } from '../utils/system-inspect.js';
import {
  printBanner,
  printKeyValueRows,
  printList,
  printSection,
  statusLabel,
} from '../ui/output.js';

export async function runDoctorCommand(options = {}) {
  const report = await gatherDoctorReport();

  if (options.outputFormat === 'json') {
    const groupedTools = await Promise.all(groupTools(report.tools).map(async (group) => ({
      label: group.label,
      entries: await Promise.all(group.entries.map(async (tool) => ({
        ...tool,
        version: tool.found ? await readCommandVersion(tool.path) : '',
      }))),
    })));

    console.log(JSON.stringify({
      ...report,
      groupedTools,
    }, null, 2));
    return;
  }

  printBanner('Xzp Doctor', [
    'Diagnostico rapido del entorno, configuracion y herramientas visibles para Xzp.',
  ]);

  printSection('Entorno');
  printKeyValueRows([
    ['Host', report.host],
    ['Modo', report.platformMode],
    ['Shell', `${report.shell.shellName} (${report.shell.shellPath})`],
    ['Home', report.home],
    ['Actual', report.cwd],
    ['Config', report.configPath],
    ['Acceso', report.quickAccessRoot],
    ['Storage', report.androidRoot || 'no disponible'],
  ]);

  printSection('Funciones');
  printKeyValueRows(report.features.map((feature) => [
    feature.label,
    feature.enabled ? statusLabel('activo', 'ok') : statusLabel('apagado', 'warn'),
  ]));

  printSection('Salud');
  printKeyValueRows([
    ['Score', `${report.health.score}/100`],
    ['Estado', statusLabel(report.health.status, report.health.score >= 70 ? 'ok' : report.health.score >= 45 ? 'warn' : 'error')],
    ['Criticos', String(report.health.counts.critical)],
    ['Altos', String(report.health.counts.high)],
    ['Medios', String(report.health.counts.medium)],
    ['Bajos', String(report.health.counts.low)],
  ]);

  for (const group of groupTools(report.tools)) {
    printSection(`Herramientas: ${group.label}`);
    const rows = [];

    for (const tool of group.entries) {
      const version = tool.found ? await readCommandVersion(tool.path) : '';
      rows.push([
        tool.name,
        tool.found
          ? `${statusLabel('ok', 'ok')} ${tool.path}${version ? ` :: ${version}` : ''}`
          : statusLabel('faltante', 'error'),
      ]);
    }

    printKeyValueRows(rows);
  }

  if (report.issues.length) {
    printSection('Hallazgos');
    printList(report.issues.map((issue) => {
      const tone = issue.severity === 'critical' || issue.severity === 'high'
        ? 'error'
        : issue.severity === 'medium'
          ? 'warn'
          : 'info';
      return `${statusLabel(issue.severity, tone)} ${issue.label} :: ${issue.recommendation}`;
    }));
  }

  printSection('Siguientes pasos');
  printList([
    'Si una herramienta critica falta, instalala antes de publicar la siguiente update.',
    'Usa `xzp --inspect` dentro de un proyecto para revisar metadatos y archivos clave.',
    'Usa `xzp -v` para verificar si la version local va por delante de npm.',
  ]);
}

function groupTools(entries) {
  const groups = new Map();

  for (const entry of entries) {
    if (!groups.has(entry.group)) {
      groups.set(entry.group, []);
    }

    groups.get(entry.group).push(entry);
  }

  return [...groups.entries()].map(([label, groupedEntries]) => ({
    label,
    entries: groupedEntries,
  }));
}
