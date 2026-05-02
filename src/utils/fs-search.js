import fs from 'node:fs/promises';
import path from 'node:path';

export async function searchEntries({
  root,
  pattern,
  limit = 80,
  type = '',
  includeHidden = false,
  excludePatterns = [],
  semantic = false,
}) {
  const results = [];
  const matcher = createMatcher(pattern, semantic);
  const excludes = new Set((excludePatterns || []).map((item) => String(item || '').trim()).filter(Boolean));

  async function walk(currentPath) {
    if (results.length >= limit) {
      return;
    }

    let entries;
    try {
      entries = await fs.readdir(currentPath, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= limit) {
        return;
      }

      const fullPath = path.join(currentPath, entry.name);
      const relativePath = path.relative(root, fullPath);
      const entryType = entry.isDirectory() ? 'directory' : 'file';

      if (!includeHidden && isHiddenEntry(relativePath)) {
        continue;
      }

      if (matchesExcludedPath(entry.name, relativePath, excludes)) {
        continue;
      }

      if ((matcher(entry.name) || matcher(relativePath)) && matchesType(type, entryType)) {
        results.push({
          path: fullPath,
          relativePath,
          type: entryType,
          score: scoreMatch(entry.name, relativePath, pattern, semantic),
        });
      }

      if (entry.isDirectory() && !shouldSkipDirectory(entry.name)) {
        await walk(fullPath);
      }
    }
  }

  await walk(root);
  return results
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }
      return left.relativePath.localeCompare(right.relativePath, 'es', { sensitivity: 'base' });
    })
    .slice(0, limit);
}

function createMatcher(pattern, semantic = false) {
  const clean = pattern.trim().toLowerCase();
  const tokens = normalizeSemanticTokens(clean);

  if (clean.includes('*')) {
    const source = escapeRegex(clean).replaceAll('\\*', '.*');
    const regex = new RegExp(`^${source}$`, 'i');
    return (value) => regex.test(value.toLowerCase());
  }

  if (semantic) {
    return (value) => {
      const normalized = value.toLowerCase();
      return tokens.every((token) => normalized.includes(token));
    };
  }

  return (value) => value.toLowerCase().includes(clean);
}

function escapeRegex(value) {
  return value.replace(/[|\\{}()[\]^$+?.*]/g, '\\$&');
}

function shouldSkipDirectory(name) {
  return name === '.git' || name === 'node_modules';
}

function isHiddenEntry(relativePath) {
  return relativePath.split(path.sep).some((part) => part.startsWith('.'));
}

function matchesType(expectedType, entryType) {
  return !expectedType || expectedType === entryType;
}

function scoreMatch(name, relativePath, pattern, semantic = false) {
  const cleanPattern = String(pattern || '').trim().toLowerCase();
  const cleanName = String(name || '').toLowerCase();
  const cleanRelative = String(relativePath || '').toLowerCase();
  const semanticTokens = semantic ? normalizeSemanticTokens(cleanPattern) : [];

  if (cleanName === cleanPattern || cleanRelative === cleanPattern) {
    return 100;
  }

  if (cleanName.startsWith(cleanPattern)) {
    return 80;
  }

  if (cleanRelative.startsWith(cleanPattern)) {
    return 70;
  }

  if (cleanName.includes(cleanPattern)) {
    return 60;
  }

  if (cleanRelative.includes(cleanPattern)) {
    return 50;
  }

  if (semantic && semanticTokens.length) {
    const nameHits = semanticTokens.filter((token) => cleanName.includes(token)).length;
    const relativeHits = semanticTokens.filter((token) => cleanRelative.includes(token)).length;
    return (nameHits * 12) + (relativeHits * 8);
  }

  return 10;
}

function matchesExcludedPath(name, relativePath, excludes) {
  if (!excludes.size) {
    return false;
  }

  const cleanName = String(name || '').toLowerCase();
  const cleanRelative = String(relativePath || '').toLowerCase();

  for (const exclude of excludes) {
    const cleanExclude = exclude.toLowerCase();
    if (cleanName === cleanExclude || cleanRelative.includes(cleanExclude)) {
      return true;
    }
  }

  return false;
}

function normalizeSemanticTokens(pattern) {
  return String(pattern || '')
    .split(/[\s._/-]+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2);
}
