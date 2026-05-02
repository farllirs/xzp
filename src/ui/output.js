import path from 'node:path';
import { getUserConfigPath } from '../core/config.js';
import { getScopeOptions } from '../core/scopes.js';
import { findHelpCommand, listHelpCommands } from '../core/help.js';
import { getDefaultLocale, t, tList } from '../core/i18n.js';
import { isHostTermux } from '../utils/platform.js';

const ANSI = {
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  slate: '\x1b[38;5;245m',
  steel: '\x1b[38;5;110m',
  ice: '\x1b[38;5;153m',
  mint: '\x1b[38;5;121m',
  violet: '\x1b[38;5;147m',
  rose: '\x1b[38;5;210m',
  amber: '\x1b[38;5;179m',
  red: '\x1b[38;5;203m',
  white: '\x1b[38;5;255m',
};

const OUTPUT_PREFERENCES = {
  theme: 'ocean',
  density: 'comfortable',
  noColor: false,
  locale: getDefaultLocale(),
};

const THEME_PALETTES = {
  ocean: {
    title: 'ice',
    section: 'steel',
    accent: 'mint',
    info: 'steel',
    ok: 'mint',
    warn: 'amber',
    error: 'red',
    text: 'white',
    muted: 'slate',
  },
  forest: {
    title: 'mint',
    section: 'ice',
    accent: 'steel',
    info: 'steel',
    ok: 'mint',
    warn: 'amber',
    error: 'red',
    text: 'white',
    muted: 'slate',
  },
  ember: {
    title: 'rose',
    section: 'violet',
    accent: 'ice',
    info: 'violet',
    ok: 'mint',
    warn: 'amber',
    error: 'red',
    text: 'white',
    muted: 'slate',
  },
  mono: {
    title: 'white',
    section: 'white',
    accent: 'white',
    info: 'white',
    ok: 'white',
    warn: 'white',
    error: 'white',
    text: 'white',
    muted: 'slate',
  },
  paper: {
    title: 'ice',
    section: 'steel',
    accent: 'mint',
    info: 'steel',
    ok: 'mint',
    warn: 'amber',
    error: 'red',
    text: 'white',
    muted: 'slate',
  },
  contrast: {
    title: 'white',
    section: 'violet',
    accent: 'ice',
    info: 'steel',
    ok: 'mint',
    warn: 'amber',
    error: 'red',
    text: 'white',
    muted: 'slate',
  },
};

export function setOutputPreferences(preferences = {}) {
  OUTPUT_PREFERENCES.theme = preferences.theme || OUTPUT_PREFERENCES.theme;
  OUTPUT_PREFERENCES.density = preferences.density || OUTPUT_PREFERENCES.density;
  OUTPUT_PREFERENCES.noColor = Boolean(preferences.noColor);
  OUTPUT_PREFERENCES.locale = preferences.locale || OUTPUT_PREFERENCES.locale;
}

export function getOutputLocale() {
  return OUTPUT_PREFERENCES.locale || getDefaultLocale();
}

export function printHelp(platformMode = '', topic = '') {
  const locale = OUTPUT_PREFERENCES.locale;
  if (topic) {
    const command = findHelpCommand(topic, locale);
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
  const locale = getOutputLocale();
  printBanner(t(locale, 'output.help.bannerTitle', 'Xzp CLI'), [
    t(locale, 'output.help.bannerLine1'),
    t(locale, 'output.help.bannerLine2'),
    t(locale, 'output.help.bannerLine3'),
  ]);

  printBlock(
    t(locale, 'output.help.mainCommandsTitle', 'Comandos principales'),
    tList(locale, 'output.help.mainCommands', []),
  );

  printBlock(
    t(locale, 'output.help.quickUsageTitle', 'Uso rapido'),
    tList(locale, 'output.help.quickUsage', []),
  );

  const scopeOptions = getScopeOptions(platformMode || (isHostTermux() ? 'termux' : 'linux'));
  printBlock('Scopes', scopeOptions.map((option) => `${option.key.padEnd(19, ' ')}${option.description}`));

  if (unknownTopic) {
    console.log(statusLabel(t(locale, 'output.help.unknownTopic', '', { topic: unknownTopic }), 'warn'));
    console.log('');
  }

  console.log(muted(t(locale, 'output.help.configPath', 'Config  {path}', { path: getUserConfigPath() })));
}

export function printCommandHelp(command, topic = command.name) {
  const locale = getOutputLocale();
  printBanner(t(locale, 'output.help.commandTitle', 'Ayuda · {command}', { command: command.name }), [command.summary]);
  printKeyValueRows([
    [t(locale, 'output.help.labels.usage', 'Uso'), command.usage],
    [t(locale, 'output.help.labels.aliases', 'Alias'), (command.aliases || []).length ? command.aliases.join(', ') : t(locale, 'output.help.none', 'ninguno')],
  ]);

  if (command.details && command.details.length) {
    printBlock(t(locale, 'output.help.labels.details', 'Detalle'), command.details);
  }

  const related = listHelpCommands(locale)
    .filter((item) => item.name !== command.name)
    .slice(0, 4)
    .map((item) => item.name);

  if (related.length) {
    printBlock(t(locale, 'output.help.labels.related', 'Relacionados'), related.map((name) => `xzp -h ${name}`));
  }

  if (topic !== command.name) {
    console.log(muted(t(locale, 'output.help.resolvedFrom', 'Resuelto desde  {topic}', { topic })));
  }
}

export function printSection(title) {
  const palette = resolveThemePalette();
  console.log('');
  console.log(colorize(`◆ ${title}`, palette.section, 'bold'));
  console.log(muted('  ──────────────────────────────────────'));
}

export function printProjectContextLine(line) {
  console.log(line);
  console.log('');
}

export function formatSearchResults(results, root) {
  const locale = getOutputLocale();
  if (!results.length) {
    return t(locale, 'output.search.noMatches', 'No se encontraron coincidencias.');
  }

  return results
    .map((item, index) => {
      const relative = path.relative(root, item.path) || '.';
      const suffix = item.type === 'directory' ? '/' : '';
      return `${String(index + 1).padStart(2, '0')}  ${relative}${suffix}`;
    })
    .join('\n');
}

export function printExplainEntry(topic, entry) {
  const locale = getOutputLocale();
  return [
    t(locale, 'output.explain.commandLabel', 'Comando') + '   ' + topic,
    t(locale, 'output.explain.describeLabel', 'Describe') + '  ' + entry.summary,
    t(locale, 'output.explain.usageLabel', 'Uso base'),
    entry.usage,
  ].join('\n');
}

export function formatTreeReport(report) {
  return report.lines.join('\n');
}

export function printBanner(title = 'Xzp CLI', subtitleLines = []) {
  renderBanner(title, subtitleLines);
}

export function printKeyValueRows(rows) {
  const width = rows.reduce((max, [key]) => Math.max(max, String(key).length), 0);

  for (const [key, value] of rows) {
    const left = colorize(String(key).padEnd(width, ' '), resolveThemePalette().muted, '');
    console.log(`  ${left}  ${dim('•')}  ${value}`);
  }

  console.log('');
}

export function printList(items) {
  const palette = resolveThemePalette();

  for (const item of items) {
    const bullet = supportsColor() ? colorize('•', palette.accent, 'bold') : '•';
    console.log(`  ${bullet} ${item}`);
  }

  console.log('');
}

export function statusLabel(text, tone = 'info') {
  const palette = resolveThemePalette();
  const content = ` ${text.toUpperCase()} `;
  return supportsColor()
    ? colorize(content, palette[tone] || palette.info, 'bold')
    : `[${text}]`;
}

function printBlock(title, lines) {
  const palette = resolveThemePalette();
  const edge = supportsColor() ? colorize('│', palette.muted) : '|';
  const cap = supportsColor() ? colorize(`┌ ${title}`, palette.section, 'bold') : title;

  console.log(cap);
  console.log(muted('│'));
  for (const line of lines) {
    console.log(`${edge} ${line}`);
  }
  console.log(muted('└──────────────────────────────────────'));
  printGap();
}

function renderBanner(title, subtitleLines) {
  const palette = resolveThemePalette();

  if (!supportsColor()) {
    console.log(title);
    for (const line of subtitleLines) {
      console.log(line);
    }
    printGap();
    return;
  }

  console.log(colorize('╭──────────────────────────────────────╮', palette.section));
  console.log(colorize(`│ ${title.padEnd(36, ' ')} │`, palette.title, 'bold'));
  console.log(colorize('╰──────────────────────────────────────╯', palette.section));
  for (const line of subtitleLines) {
    console.log(`  ${muted(line)}`);
  }
  printGap();
}

function muted(text) {
  const palette = resolveThemePalette();
  return supportsColor() ? colorize(text, palette.muted) : text;
}

function dim(text) {
  if (!process.stdout.isTTY) {
    return text;
  }

  return ANSI.dim + text + ANSI.reset;
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
  return THEME_PALETTES[OUTPUT_PREFERENCES.theme] || THEME_PALETTES.ocean;
}

function printGap() {
  if (OUTPUT_PREFERENCES.density !== 'compact') {
    console.log('');
  }
}
