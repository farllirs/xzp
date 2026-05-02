import { getDefaultLocale, tList } from './i18n.js';

export function listHelpCommands(locale = getDefaultLocale()) {
  const commands = tList(locale, 'help.commands', []);
  return commands.map((command) => ({
    name: String(command.name || '').trim(),
    aliases: Array.isArray(command.aliases) ? command.aliases : [],
    summary: String(command.summary || '').trim(),
    usage: String(command.usage || '').trim(),
    details: Array.isArray(command.details) ? command.details : [],
  }));
}

export function findHelpCommand(topic, locale = getDefaultLocale()) {
  const normalized = normalizeTopic(topic);
  const commands = listHelpCommands(locale);

  if (!normalized) {
    return null;
  }

  for (const command of commands) {
    const names = [command.name, ...(command.aliases || [])];
    if (names.some((name) => normalizeTopic(name) === normalized)) {
      return command;
    }
  }

  let best = null;
  let bestScore = Infinity;

  for (const command of commands) {
    const candidates = [command.name, ...(command.aliases || [])];
    for (const candidate of candidates) {
      const score = levenshtein(normalized, normalizeTopic(candidate));
      if (score < bestScore) {
        bestScore = score;
        best = command;
      }
    }
  }

  if (!best || bestScore > Math.max(2, Math.ceil(normalized.length / 2))) {
    return null;
  }

  return best;
}

export function getHelpCommand(name) {
  return listHelpCommands().find((command) => command.name === name) || null;
}

function normalizeTopic(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function levenshtein(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}
