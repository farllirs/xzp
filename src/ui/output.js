import path from 'node:path';
import { getUserConfigPath } from '../core/config.js';
import { getScopeOptions } from '../core/scopes.js';
import { findHelpCommand, listHelpCommands } from '../core/help.js';
import { isHostTermux } from '../utils/platform.js';

const ANSI = {
  bold: '\x1b[1m',
  cyan: '\x1b[36m',
  dim: '\x1b[2m',
  magenta: '\x1b[35m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
};

const OUTPUT_PREFERENCES = {
  theme: 'ocean',
  density: 'comfortable',
  noColor: false,
};

const THEME_PALETTES = {
  ocean: {
    title: 'cyan',
    section: 'green',
    accent: 'magenta',
    info: 'cyan',
    ok: 'green',
    warn: 'yellow',
    error: 'red',
  },
  forest: {
    title: 'green',
    section: 'green',
    accent: 'yellow',
    info: 'green',
    ok: 'green',
    warn: 'yellow',
    error: 'red',
  },
  ember: {
    title: 'yellow',
    section: 'yellow',
    accent: 'red',
    info: 'yellow',
    ok: 'green',
    warn: 'yellow',
    error: 'red',
  },
  mono: {
    title: 'reset',
    section: 'reset',
    accent: 'reset',
    info: 'reset',
    ok: 'reset',
    warn: 'reset',
    error: 'reset',
  },
  paper: {
    title: 'cyan',
    section: 'magenta',
    accent: 'green',
    info: 'cyan',
    ok: 'green',
    warn: 'yellow',
    error: 'red',
  },
  contrast: {
    title: 'magenta',
    section: 'yellow',
    accent: 'cyan',
    info: 'cyan',
    ok: 'green',
    warn: 'yellow',
    error: 'red',
  },
};

export function setOutputPreferences(preferences = {}) {
  OUTPUT_PREFERENCES.theme = preferences.theme || OUTPUT_PREFERENCES.theme;
  OUTPUT_PREFERENCES.density = preferences.density || OUTPUT_PREFERENCES.density;
  OUTPUT_PREFERENCES.noColor = Boolean(preferences.noColor);
}

export function printHelp(platformMode = '', topic = '') {
  if (topic) {
    const command = findHelpCommand(topic);
    if (command) {
      printCommandHelp(command, topic);
      return;
    }

    printShortHelp(platformMode, topic);
    return;
  }

  printShortHelp(platformMode);
}

export function printShortHelp(platformMode = '', unknownTopic = '') {
  printBanner('Xzp CLI', [
    'Explorar, entender y preparar proyectos desde Termux o Linux.',
    'Android storage aparece cuando el modo de plataforma lo permite.',
    'Usa `xzp -h <comando>` para ver la ayuda puntual de cada comando.',
  ]);

  printBlock('Comandos principales', [
    'xzp -m                 menu visual',
    'xzp -v                 version local y publicada',
    'xzp --agent-status     estado del modo agente',
    'xzp --doctor           revisar entorno y herramientas',
    'xzp --inspect          resumir el proyecto actual',
    'xzp --report-error     preparar reporte para el mantenedor',
    'xzp -c                 copiar ruta o nombre actual',
    'xzp -p                 pegar o mover lo copiado',
    'xzp -k                 ver el portapapeles de Xzp',
    'xzp -K                 limpiar el portapapeles',
    'xzp -x                 contexto del proyecto actual',
    'xzp -x --profile       contexto con perfil por stack',
    'xzp -x --list-favorites favoritos persistentes',
    'xzp -b "archivo"       buscar archivos o carpetas',
    'xzp -e ls              explicar un comando',
    'xzp -t src             arbol completo de una ruta',
    'xzp -i                 instalar dependencias del proyecto detectado',
    'xzp -r                 abrir modo seguro del proyecto',
    'xzp -r main.py bot     guardar acceso seguro',
    'xzp -r bot             ejecutar acceso seguro',
    'xzp -a                 acceso rapido a Android o Linux',
  ]);

  printBlock('Uso rapido', [
    'xzp --doctor',
    'xzp --inspect',
    'xzp --report-error',
    'xzp --agent-status',
    'xzp -c --relative',
    'xzp -c --json',
    'xzp -c --name',
    'xzp -b "*.js" --scope actual',
    'xzp -b "api client" --semantic --exclude dist',
    'xzp -t . --depth 3 --scope actual',
    'xzp -t . --summary --compare src',
    'xzp -x',
    'xzp -p --preview --into ./tmp',
    'xzp -r app.py mi-app',
    'xzp -r --list-safe-shortcuts',
    'xzp --prompt-context',
    'xzp --prompt-project-root',
    'xzp --prompt-project-path',
  ]);

  const scopeOptions = getScopeOptions(platformMode || (isHostTermux() ? 'termux' : 'linux'));
  printBlock('Scopes', scopeOptions.map((option) => `${option.key.padEnd(19, ' ')}${option.description}`));

  if (unknownTopic) {
    console.log(statusLabel(`No reconoci "${unknownTopic}"`, 'warn'));
    console.log('');
  }

  console.log(dim('Configuracion: ' + getUserConfigPath()));
}

export function printCommandHelp(command, topic = command.name) {
  printBanner(`Ayuda: ${command.name}`, [
    command.summary,
  ]);
  printKeyValueRows([
    ['Uso', command.usage],
    ['Alias', (command.aliases || []).length ? command.aliases.join(', ') : 'ninguno'],
  ]);
  console.log('');

  if (command.details && command.details.length) {
    printBlock('Detalle', command.details);
  }

  const related = listHelpCommands()
    .filter((item) => item.name !== command.name)
    .slice(0, 4)
    .map((item) => item.name);

  if (related.length) {
    printBlock('Relacionados', related.map((name) => `xzp -h ${name}`));
  }

  if (topic !== command.name) {
    console.log(dim('Se resolvio desde: ' + topic));
  }
}

export function printSection(title) {
  console.log(colorize(title, resolveThemePalette().section, 'bold'));
  console.log(dim('----------------------------------------'));
}

export function printProjectContextLine(line) {
  console.log(line);
  console.log('');
}

export function formatSearchResults(results, root) {
  if (!results.length) {
    return 'No se encontraron coincidencias.';
  }

  return results
    .map((item, index) => {
      const relative = path.relative(root, item.path) || '.';
      const suffix = item.type === 'directory' ? '/' : '';
      return (index + 1) + '. ' + relative + suffix;
    })
    .join('\n');
}

export function printExplainEntry(topic, entry) {
  return [
    'Comando : ' + topic,
    'Que hace: ' + entry.summary,
    'Uso base:',
    entry.usage,
  ].join('\n');
}

export function formatTreeReport(report) {
  return report.lines.join('\n');
}

function printBlock(title, lines) {
  const heading = supportsColor()
    ? ANSI.bold + resolveThemePalette().sectionCode + '[' + title + ']' + ANSI.reset
    : '[' + title + ']';
  console.log(heading);

  for (const line of lines) {
    console.log('  ' + line);
  }

  printGap();
}

function dim(text) {
  if (!process.stdout.isTTY) {
    return text;
  }

  return ANSI.dim + text + ANSI.reset;
}

export function printBanner(title = 'Xzp CLI', subtitleLines = []) {
  renderBanner(title, subtitleLines);
}

export function printKeyValueRows(rows) {
  const width = rows.reduce((max, [key]) => Math.max(max, String(key).length), 0);

  for (const [key, value] of rows) {
    console.log(`${String(key).padEnd(width, ' ')} : ${value}`);
  }

  console.log('');
}

export function printList(items) {
  for (const item of items) {
    console.log(' - ' + item);
  }
  console.log('');
}

export function statusLabel(text, tone = 'info') {
  const palette = resolveThemePalette();

  return supportsColor()
    ? colorize(`[${text}]`, palette[tone] || palette.info, 'bold')
    : `[${text}]`;
}

function renderBanner(title, subtitleLines) {
  if (!supportsColor()) {
    console.log(title);
    for (const line of subtitleLines) {
      console.log(line);
    }
    printGap();
    return;
  }

  const palette = resolveThemePalette();
  console.log(colorize(title, palette.title, 'bold'));
  console.log(dim('========================================'));
  for (const line of subtitleLines) {
    console.log(dim(line));
  }
  printGap();
}

function colorize(text, color, weight = '') {
  if (!supportsColor()) {
    return text;
  }

  const parts = [];

  if (weight && ANSI[weight]) {
    parts.push(ANSI[weight]);
  }

  if (color && ANSI[color]) {
    parts.push(ANSI[color]);
  }

  parts.push(text, ANSI.reset);
  return parts.join('');
}

function supportsColor() {
  return process.stdout.isTTY && !OUTPUT_PREFERENCES.noColor;
}

function resolveThemePalette() {
  const theme = THEME_PALETTES[OUTPUT_PREFERENCES.theme] || THEME_PALETTES.ocean;
  return {
    ...theme,
    sectionCode: ANSI[theme.section] || '',
  };
}

function printGap() {
  if (OUTPUT_PREFERENCES.density !== 'compact') {
    console.log('');
  }
}
