import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getHomeDirectory } from '../utils/platform.js';
import {
  redactAndClampText,
  redactSensitiveText,
  sanitizePathForLogs,
  sanitizeTerminalText,
} from '../utils/security.js';

const REPORT_EMAIL = 'farllirs@gmail.com';
const LAST_ERROR_FILENAME = 'last-error.json';

export function getErrorReportsDir() {
  return path.join(getHomeDirectory(), '.config', 'xzp', 'reports');
}

export function getLastErrorPath() {
  return path.join(getErrorReportsDir(), LAST_ERROR_FILENAME);
}

export async function saveLastErrorSnapshot({ argv, cwd, error }) {
  const snapshotId = createSnapshotId();
  const snapshot = {
    snapshotId,
    createdAt: new Date().toISOString(),
    argv: [...(argv || [])].map((item) => redactAndClampText(item, 240)),
    cwd: sanitizePathForLogs(cwd || process.cwd()),
    platform: os.platform(),
    release: os.release(),
    node: process.version,
    message: redactAndClampText(error?.message || 'Error desconocido', 600),
    stack: redactAndClampText(String(error?.stack || error?.message || 'Sin stack'), 4000),
  };

  await fs.mkdir(getErrorReportsDir(), { recursive: true });
  await fs.writeFile(getLastErrorPath(), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  return snapshot;
}

export async function loadLastErrorSnapshot() {
  try {
    const raw = await fs.readFile(getLastErrorPath(), 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return null;
    }

    throw new Error(`No pude leer el ultimo error guardado: ${error.message}`);
  }
}

export async function writeErrorReportFile({
  source = 'manual',
  title = '',
  summary = '',
  details = '',
  lastError = null,
  includeJson = true,
}) {
  const createdAt = new Date().toISOString();
  const safeStamp = createdAt.replace(/[:.]/g, '-');
  const filePath = path.join(getErrorReportsDir(), `report-${safeStamp}.md`);
  const jsonPath = path.join(getErrorReportsDir(), `report-${safeStamp}.json`);
  const reportBody = buildErrorReportBody({
    createdAt,
    source,
    title: redactAndClampText(title, 160),
    summary: redactAndClampText(summary, 500),
    details: redactAndClampText(details, 4000),
    lastError,
  });
  const safePayload = {
    createdAt,
    source,
    title: redactAndClampText(title, 160),
    summary: redactAndClampText(summary, 500),
    details: redactAndClampText(details, 4000),
    lastError: sanitizeSnapshotForExport(lastError),
  };

  await fs.mkdir(getErrorReportsDir(), { recursive: true });
  await fs.writeFile(filePath, reportBody, 'utf8');
  if (includeJson) {
    await fs.writeFile(jsonPath, `${JSON.stringify(safePayload, null, 2)}\n`, 'utf8');
  }

  return {
    filePath,
    jsonPath,
    subject: `[Xzp] ${safePayload.title || safePayload.summary || 'Reporte de error'}`.slice(0, 120),
    body: reportBody,
    createdAt,
  };
}

export async function tryOpenEmailDraft({ subject, body }) {
  const mailto = buildMailtoUrl(subject, body);
  const openers = [
    ['termux-open-url', mailto],
    ['xdg-open', mailto],
    ['open', mailto],
  ];

  for (const [command, ...args] of openers) {
    const ok = await spawnDetached(command, args);
    if (ok) {
      return {
        opened: true,
        method: command,
        mailto,
      };
    }
  }

  return {
    opened: false,
    method: '',
    mailto,
  };
}

function buildMailtoUrl(subject, body) {
  const params = new URLSearchParams({
    subject,
    body: body.slice(0, 6000),
  });

  return `mailto:${REPORT_EMAIL}?${params.toString()}`;
}

function buildErrorReportBody({
  createdAt,
  source,
  title,
  summary,
  details,
  lastError,
}) {
  const lines = [
    '# Reporte de Error Xzp',
    '',
    `Fecha: ${createdAt}`,
    `Origen: ${source}`,
    `Snapshot: ${lastError?.snapshotId || 'sin snapshot'}`,
    `Titulo: ${title || 'sin titulo'}`,
    `Resumen: ${summary || 'sin resumen'}`,
    '',
    '## Descripcion',
    '',
    redactAndClampText(details || 'Sin detalles adicionales.', 4000),
    '',
  ];

  if (lastError) {
    lines.push(
      '## Ultimo Error Capturado',
      '',
      `Mensaje: ${redactAndClampText(lastError.message, 600)}`,
      `Ruta actual: ${sanitizePathForLogs(lastError.cwd)}`,
      `Comando: ${['xzp', ...((lastError.argv || []).map((item) => redactAndClampText(item, 240)))].join(' ')}`,
      `Node: ${lastError.node}`,
      `Plataforma: ${lastError.platform} ${lastError.release}`,
      '',
      '```text',
      redactAndClampText(String(lastError.stack || lastError.message || '').trim(), 4000),
      '```',
      '',
    );
  }

  lines.push(
    '## Destino',
    '',
    `Enviar a: ${REPORT_EMAIL}`,
    '',
  );

  return lines.join('\n');
}

function createSnapshotId() {
  return Math.random().toString(36).slice(2, 10);
}

function sanitizeSnapshotForExport(lastError) {
  if (!lastError) {
    return null;
  }

  return {
    ...lastError,
    cwd: sanitizePathForLogs(lastError.cwd),
    argv: [...(lastError.argv || [])].map((item) => redactAndClampText(item, 240)),
    message: redactAndClampText(lastError.message, 600),
    stack: redactAndClampText(lastError.stack, 4000),
  };
}

function spawnDetached(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      detached: true,
    });

    child.on('error', () => resolve(false));
    child.on('spawn', () => {
      child.unref();
      resolve(true);
    });
  });
}
