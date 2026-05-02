import fs from 'node:fs/promises';
import path from 'node:path';
import { detectProjectDirectorySignature } from './project-context.js';

const COLORS = {
  reset: '\x1b[0m',
  folder: '\x1b[36m',
  node: '\x1b[32m',
  python: '\x1b[34m',
  rust: '\x1b[33m',
  go: '\x1b[36m',
  java: '\x1b[35m',
  php: '\x1b[95m',
  ruby: '\x1b[91m',
  hint: '\x1b[90m',
};

export async function buildTreeReport({ root, label, maxDepth = Infinity, limit = 400, includeHidden = false }) {
  const lines = [await formatDirectoryLabel(`${path.basename(root) || root}/`, root)];
  const counters = {
    directories: 0,
    files: 0,
  };
  const flags = {
    truncatedByDepth: false,
    truncatedByLimit: false,
  };

  await walk(root, '', 0);

  return {
    label,
    root,
    depth: Number.isFinite(maxDepth) ? maxDepth : 'completa',
    lines,
    directories: counters.directories,
    files: counters.files,
    truncatedByDepth: flags.truncatedByDepth,
    truncatedByLimit: flags.truncatedByLimit,
    summary: summarizeTreeCounters(counters, flags, lines.length),
  };

  async function walk(currentPath, prefix, depth) {
    if (lines.length >= limit) {
      flags.truncatedByLimit = true;
      return;
    }

    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    const visibleEntries = entries
      .filter((entry) => includeHidden || !entry.name.startsWith('.'))
      .sort(sortEntries);

    for (let index = 0; index < visibleEntries.length; index += 1) {
      if (lines.length >= limit) {
        flags.truncatedByLimit = true;
        return;
      }

      const entry = visibleEntries[index];
      const isLast = index === visibleEntries.length - 1;
      const branch = isLast ? '└── ' : '├── ';
      const childPrefix = `${prefix}${isLast ? '    ' : '│   '}`;
      const fullPath = path.join(currentPath, entry.name);
      const label = entry.isDirectory()
        ? await formatDirectoryLabel(`${entry.name}/`, fullPath)
        : entry.name;

      lines.push(`${prefix}${branch}${label}`);

      if (entry.isDirectory()) {
        counters.directories += 1;
        if (depth + 1 >= maxDepth) {
          flags.truncatedByDepth = true;
          continue;
        }
        await walk(fullPath, childPrefix, depth + 1);
      } else {
        counters.files += 1;
      }
    }
  }
}

export function buildTreeComparison(leftReport, rightReport) {
  const leftSummary = leftReport?.summary || summarizeTreeCounters({
    directories: leftReport?.directories || 0,
    files: leftReport?.files || 0,
  }, {
    truncatedByDepth: Boolean(leftReport?.truncatedByDepth),
    truncatedByLimit: Boolean(leftReport?.truncatedByLimit),
  }, leftReport?.lines?.length || 0);
  const rightSummary = rightReport?.summary || summarizeTreeCounters({
    directories: rightReport?.directories || 0,
    files: rightReport?.files || 0,
  }, {
    truncatedByDepth: Boolean(rightReport?.truncatedByDepth),
    truncatedByLimit: Boolean(rightReport?.truncatedByLimit),
  }, rightReport?.lines?.length || 0);

  return {
    left: leftSummary,
    right: rightSummary,
    delta: {
      directories: (rightReport?.directories || 0) - (leftReport?.directories || 0),
      files: (rightReport?.files || 0) - (leftReport?.files || 0),
      lines: (rightReport?.lines?.length || 0) - (leftReport?.lines?.length || 0),
    },
  };
}

async function formatDirectoryLabel(value, directoryPath) {
  const signature = await detectProjectDirectorySignature(directoryPath);

  if (!signature) {
    return formatText(value, COLORS.folder);
  }

  const badge = formatProjectBadge(signature.label);
  return `${formatText(value, COLORS.folder)} ${badge}`;
}

function formatProjectBadge(label) {
  const color = COLORS[label.toLowerCase()] || COLORS.folder;
  return formatText(`[${label}]`, color);
}

function formatText(value, color) {
  if (!process.stdout.isTTY) {
    return value;
  }

  return `${color}${value}${COLORS.reset}`;
}

function sortEntries(left, right) {
  if (left.isDirectory() && !right.isDirectory()) {
    return -1;
  }

  if (!left.isDirectory() && right.isDirectory()) {
    return 1;
  }

  return left.name.localeCompare(right.name, 'es', { sensitivity: 'base' });
}

function summarizeTreeCounters(counters, flags, lineCount) {
  return {
    directories: counters.directories,
    files: counters.files,
    lines: lineCount,
    truncated: Boolean(flags.truncatedByDepth || flags.truncatedByLimit),
  };
}
