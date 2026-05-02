import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getHomeDirectory } from '../utils/platform.js';
import {
  redactAndClampText,
  sanitizePathForLogs,
  sanitizeTerminalText,
} from '../utils/security.js';

const REPORT_EMAIL = 'farllirs@gmail.com';
const LAST_ERROR_FILENAME = 'last-error.json';
const MAX_MAIL_BODY_LENGTH = 5000;

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
  const normalized = normalizeReportInput({ createdAt, source, title, summary, details, lastError });
  const reportBody = buildErrorReportBody(normalized);
  const mailBody = buildMailBody(normalized);
  const safePayload = {
    createdAt: normalized.createdAt,
    source: normalized.source,
    title: normalized.title,
    summary: normalized.summary,
    details: normalized.details,
    lastError: sanitizeSnapshotForExport(normalized.lastError),
    mailBody,
  };

  await fs.mkdir(getErrorReportsDir(), { recursive: true });
  await fs.writeFile(filePath, reportBody, 'utf8');
  if (includeJson) {
    await fs.writeFile(jsonPath, `${JSON.stringify(safePayload, null, 2)}\n`, 'utf8');
  }

  return {
    filePath,
    jsonPath,
    subject: `[Xzp] ${normalized.title || normalized.summary || 'Reporte de error'}`.slice(0, 120),
    body: reportBody,
    mailBody,
    preview: buildReportPreview(normalized),
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

export function buildMailtoUrl(subject, body) {
  const encodedSubject = encodeMailtoComponent(subject);
  const encodedBody = encodeMailtoComponent(String(body || '').slice(0, MAX_MAIL_BODY_LENGTH));
  return `mailto:${REPORT_EMAIL}?subject=${encodedSubject}&body=${encodedBody}`;
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
    '## Resumen',
    '',
    `- Fecha: ${createdAt}`,
    `- Origen: ${source}`,
    `- Snapshot: ${lastError?.snapshotId || 'sin snapshot'}`,
    `- Titulo: ${title || 'sin titulo'}`,
    `- Resumen corto: ${summary || 'sin resumen'}`,
    '',
    '## Descripcion',
    '',
    details || 'Sin detalles adicionales.',
    '',
  ];

  if (lastError) {
    lines.push(
      '## Ultimo Error Capturado',
      '',
      `- Mensaje: ${redactAndClampText(lastError.message, 600)}`,
      `- Ruta actual: ${sanitizePathForLogs(lastError.cwd)}`,
      `- Comando: ${['xzp', ...((lastError.argv || []).map((item) => redactAndClampText(item, 240)))].join(' ')}`,
      `- Node: ${lastError.node}`,
      `- Plataforma: ${lastError.platform} ${lastError.release}`,
      '',
      '### Stack',
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

function buildMailBody({ createdAt, source, title, summary, details, lastError }) {
  const lines = [
    'Reporte de Error Xzp',
    '',
    `Fecha: ${createdAt}`,
    `Origen: ${source}`,
    `Titulo: ${title || 'sin titulo'}`,
    `Resumen: ${summary || 'sin resumen'}`,
    '',
    'Descripcion:',
    details || 'Sin detalles adicionales.',
    '',
  ];

  if (lastError) {
    lines.push(
      'Ultimo Error Capturado:',
      `Snapshot: ${lastError.snapshotId || 'sin snapshot'}`,
      `Mensaje: ${redactAndClampText(lastError.message, 600)}`,
      `Ruta actual: ${sanitizePathForLogs(lastError.cwd)}`,
      `Comando: ${['xzp', ...((lastError.argv || []).map((item) => redactAndClampText(item, 240)))].join(' ')}`,
      `Node: ${lastError.node}`,
      `Plataforma: ${lastError.platform} ${lastError.release}`,
      '',
      'Stack:',
      redactAndClampText(String(lastError.stack || lastError.message || '').trim(), 2500),
      '',
    );
  }

  lines.push(
    'Archivos generados localmente:',
    '- Revisar el .md y el .json en ~/.config/xzp/reports si el cliente de correo no abre bien.',
  );

  return clampReadableText(lines.join('\n'), MAX_MAIL_BODY_LENGTH);
}

function buildReportPreview({ title, summary, details, lastError }) {
  return {
    title,
    summary,
    detailsPreview: redactAndClampText(details, 240),
    snapshotId: lastError?.snapshotId || '',
    lastErrorMessage: lastError?.message ? redactAndClampText(lastError.message, 200) : '',
  };
}

function normalizeReportInput({ createdAt, source, title, summary, details, lastError }) {
  return {
    createdAt,
    source: sanitizeInlineValue(source, 40),
    title: sanitizeInlineValue(title || 'Reporte de error', 160),
    summary: sanitizeInlineValue(summary || title || 'Sin resumen', 500),
    details: clampReadableText(redactAndClampText(details || 'Sin detalles adicionales.', 4000), 4000),
    lastError: sanitizeSnapshotForExport(lastError),
  };
}

function sanitizeSnapshotForExport(lastError) {
  if (!lastError) {
    return null;
  }

  return {
    ...lastError,
    snapshotId: sanitizeInlineValue(lastError.snapshotId, 40),
    cwd: sanitizePathForLogs(lastError.cwd),
    argv: [...(lastError.argv || [])].map((item) => redactAndClampText(item, 240)),
    message: redactAndClampText(lastError.message, 600),
    stack: clampReadableText(redactAndClampText(lastError.stack, 4000), 4000),
    platform: sanitizeInlineValue(lastError.platform, 60),
    release: sanitizeInlineValue(lastError.release, 80),
    node: sanitizeInlineValue(lastError.node, 40),
  };
}

function createSnapshotId() {
  return Math.random().toString(36).slice(2, 10);
}

function sanitizeInlineValue(value, maxLength = 200) {
  return sanitizeTerminalText(String(value || ''))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function clampReadableText(value, maxLength = 4000) {
  const normalized = String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 24)).trimEnd()}\n\n[truncated for delivery]`;
}

function encodeMailtoComponent(value) {
  return encodeURIComponent(String(value || ''))
    .replace(/%0A/g, '%0D%0A')
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
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
