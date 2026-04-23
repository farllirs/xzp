import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadLastErrorSnapshot, tryOpenEmailDraft, writeErrorReportFile } from '../core/error-reports.js';
import { sanitizeTerminalText } from '../utils/security.js';

export async function runReportErrorCommand(options = {}) {
  const lastError = await loadLastErrorSnapshot();
  const answers = options.agentMode
    ? buildAgentErrorAnswers(lastError)
    : await collectManualErrorAnswers(lastError);
  const report = await writeErrorReportFile({
    source: 'manual',
    title: answers.title,
    summary: answers.summary,
    details: answers.details,
    lastError,
  });
  const delivery = await tryOpenEmailDraft({
    subject: report.subject,
    body: report.body,
  });

  printReportResult(report, delivery, lastError, options.outputFormat);
}

export async function handleCliError(error, argv = []) {
  const snapshot = await saveSafeErrorSnapshot({ error, argv });
  const message = error?.message || 'Error desconocido';
  const agentMode = ['1', 'true', 'yes', 'on'].includes(String(process.env.XZP_AGENT_MODE || '').trim().toLowerCase());

  console.error(`Error: ${message}`);

  if (agentMode || !input.isTTY || !output.isTTY) {
    return;
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = (await rl.question('Deseas preparar un reporte para el mantenedor? [y/N]: ')).trim().toLowerCase();
    if (answer !== 'y' && answer !== 's' && answer !== 'si' && answer !== 'yes') {
      return;
    }

    const title = (await rl.question('Nombre corto del error [Enter=mensaje]: ')).trim() || message;
    const summary = (await rl.question('Descripcion corta: ')).trim() || message;
    const details = (await rl.question('Detalles extra, pasos o codigo relevante: ')).trim();

    const report = await writeErrorReportFile({
      source: 'automatico',
      title,
      summary,
      details,
      lastError: snapshot,
    });
    const delivery = await tryOpenEmailDraft({
      subject: report.subject,
      body: report.body,
    });

    printReportResult(report, delivery, snapshot, 'text');
  } finally {
    rl.close();
  }
}

async function collectManualErrorAnswers(lastError) {
  const rl = readline.createInterface({ input, output });

  try {
    const fallbackTitle = lastError?.message || 'Reporte manual de error';
    const title = (await rl.question(`Nombre del error [Enter=${fallbackTitle}]: `)).trim() || fallbackTitle;
    const summary = (await rl.question('Descripcion corta del problema: ')).trim() || fallbackTitle;
    const details = (await rl.question('Pega error, pasos, codigo o notas adicionales: ')).trim();

    return {
      title,
      summary,
      details,
    };
  } finally {
    rl.close();
  }
}

async function saveSafeErrorSnapshot({ error, argv }) {
  const { saveLastErrorSnapshot } = await import('../core/error-reports.js');
  return saveLastErrorSnapshot({
    argv,
    cwd: process.cwd(),
    error,
  });
}

function printReportResult(report, delivery, lastError, outputFormat = 'text') {
  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      filePath: report.filePath,
      jsonPath: report.jsonPath,
      snapshotId: lastError?.snapshotId || '',
      delivery,
    }, null, 2));
    return;
  }

  console.log('');
  console.log('Xzp preparo el reporte de error.');
  console.log('Archivo : ' + sanitizeTerminalText(report.filePath));
  console.log('JSON    : ' + sanitizeTerminalText(report.jsonPath || ''));
  if (lastError) {
    console.log('Base    : ultimo error capturado');
    console.log('Snap    : ' + sanitizeTerminalText(lastError.snapshotId || ''));
  }
  console.log('Destino : farllirs@gmail.com');

  if (delivery.opened) {
    console.log('Estado  : se intento abrir el cliente de correo con un borrador.');
    console.log('Metodo  : ' + delivery.method);
    return;
  }

  console.log('Estado  : no pude abrir un cliente de correo automaticamente.');
  console.log('Mailto  : ' + delivery.mailto);
}

function buildAgentErrorAnswers(lastError) {
  const fallback = lastError?.message || 'Reporte de error automatico';
  return {
    title: fallback,
    summary: fallback,
    details: 'Generado en modo agente sin preguntas interactivas. Revisar snapshot adjunto y reproducibilidad.',
  };
}
