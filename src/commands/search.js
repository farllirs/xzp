import fs from 'node:fs/promises';
import {
  addSearchExcludePatterns,
  loadUserConfig,
  listSearchExcludePatterns,
} from '../core/config.js';
import { chooseSearchScope } from '../ui/prompt.js';
import { formatSearchResults, printBanner, printKeyValueRows, printSection } from '../ui/output.js';
import { getScopeOptions, resolveScopeRoot } from '../core/scopes.js';
import { searchEntries } from '../utils/fs-search.js';
import { resolvePlatformMode } from '../utils/platform.js';

export async function runSearchCommand({
  pattern,
  scope,
  searchType,
  includeHidden,
  limit,
  outputFormat,
  semanticSearch,
  searchExcludes,
  saveSearchExcludes,
  agentMode,
}) {
  const cleanPattern = (pattern || '').trim();

  if (!cleanPattern) {
    throw new Error('Debes indicar un patron. Ejemplo: xzp -b "archivo"');
  }

  const config = await loadUserConfig();
  const locale = config.ui?.locale || 'co_es';
  const platformMode = resolvePlatformMode(config);
  const scopeOptions = getScopeOptions(platformMode);
  const selectedScope = scope || (agentMode ? 'actual' : process.stdin.isTTY ? await chooseSearchScope(scopeOptions, locale) : 'actual');
  const root = resolveScopeRoot(selectedScope, scopeOptions);
  const persistedExcludes = await listSearchExcludePatterns();
  const effectiveExcludes = [...new Set([
    ...(persistedExcludes || []),
    ...((searchExcludes || []).map((item) => String(item || '').trim()).filter(Boolean)),
  ])];

  if (!root) {
    throw new Error(`Alcance no valido: ${selectedScope}`);
  }

  try {
    await fs.access(root);
  } catch {
    throw new Error(`No se puede acceder a la ruta: ${root}`);
  }

  const results = await searchEntries({
    root,
    pattern: cleanPattern,
    limit: limit || 80,
    type: searchType || '',
    includeHidden: Boolean(includeHidden),
    excludePatterns: effectiveExcludes,
    semantic: Boolean(semanticSearch),
  });

  if (saveSearchExcludes && searchExcludes?.length) {
    await addSearchExcludePatterns(searchExcludes);
  }

  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      pattern: cleanPattern,
      scope: selectedScope,
      root,
      filters: {
        type: searchType || 'all',
        includeHidden: Boolean(includeHidden),
        limit: limit || 80,
        semantic: Boolean(semanticSearch),
        excludes: effectiveExcludes,
      },
      total: results.length,
      results,
    }, null, 2));
    return;
  }

  printBanner('Xzp Search', [
    'Busqueda guiada dentro del scope elegido.',
  ]);
  printSection('Consulta');
  printKeyValueRows([
    ['Patron', cleanPattern],
    ['Alcance', selectedScope],
    ['Ruta', root],
    ['Semantica', semanticSearch ? 'si' : 'no'],
  ]);

  printSection('Resultados');
  printKeyValueRows([
    ['Coincidencias', results.length],
    ['Filtro tipo', searchType || 'todos'],
    ['Ocultos', includeHidden ? 'si' : 'no'],
    ['Limite', limit || 80],
    ['Exclusiones', effectiveExcludes.length ? effectiveExcludes.join(', ') : 'ninguna'],
  ]);
  console.log(formatSearchResults(results, root));
}
