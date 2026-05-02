import fs from 'node:fs/promises';
import path from 'node:path';
import { loadUserConfig } from '../core/config.js';
import { formatTreeReport, printBanner, printKeyValueRows, printSection } from '../ui/output.js';
import { getScopeOptions, resolveScopeRoot } from '../core/scopes.js';
import { buildTreeComparison, buildTreeReport } from '../utils/fs-tree.js';
import { resolvePlatformMode } from '../utils/platform.js';

export async function runTreeCommand({
  target,
  scope,
  depth,
  limit,
  includeHidden,
  outputFormat,
  treeCompareTarget,
  treeSummary,
}) {
  const config = await loadUserConfig();
  const platformMode = resolvePlatformMode(config);
  const scopeOptions = getScopeOptions(platformMode);
  const selectedScope = scope || 'actual';
  const root = resolveScopeRoot(selectedScope, scopeOptions);

  if (!root) {
    throw new Error(`Alcance no valido: ${selectedScope}`);
  }

  const cleanTarget = (target || '.').trim() || '.';
  const resolvedTarget = path.resolve(root, cleanTarget);
  const relativeToRoot = path.relative(root, resolvedTarget);

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error('La ruta pedida se sale del scope elegido.');
  }

  let stats;
  try {
    await fs.access(resolvedTarget);
    stats = await fs.stat(resolvedTarget);
  } catch {
    throw new Error(`No se puede acceder a la ruta: ${resolvedTarget}`);
  }

  if (!stats.isDirectory()) {
    const singleFileReport = {
      label: cleanTarget,
      root: resolvedTarget,
      depth: 'completa',
      directories: 0,
      files: 1,
      truncatedByDepth: false,
      truncatedByLimit: false,
      lines: [path.basename(resolvedTarget)],
    };

    if (outputFormat === 'json') {
      console.log(JSON.stringify(singleFileReport, null, 2));
      return;
    }

    printBanner('Xzp Tree', [
      'Vista estructural de la ruta solicitada.',
    ]);
    printSection('Objetivo');
    printKeyValueRows([
      ['Scope', selectedScope],
      ['Ruta', resolvedTarget],
      ['Tipo', 'archivo'],
    ]);
    console.log(formatTreeReport(singleFileReport));
    return;
  }

  const report = await buildTreeReport({
    root: resolvedTarget,
    label: cleanTarget,
    maxDepth: depth || Infinity,
    limit: limit || 400,
    includeHidden: Boolean(includeHidden),
  });

  let comparison = null;
  if (treeCompareTarget) {
    const compareTargetPath = path.resolve(root, treeCompareTarget);
    const compareRelative = path.relative(root, compareTargetPath);
    if (compareRelative.startsWith('..') || path.isAbsolute(compareRelative)) {
      throw new Error('La ruta de comparacion se sale del scope elegido.');
    }

    const compareStats = await fs.stat(compareTargetPath).catch(() => null);
    if (!compareStats?.isDirectory()) {
      throw new Error('La ruta de comparacion debe ser una carpeta accesible.');
    }

    const compareReport = await buildTreeReport({
      root: compareTargetPath,
      label: treeCompareTarget,
      maxDepth: depth || Infinity,
      limit: limit || 400,
      includeHidden: Boolean(includeHidden),
    });
    comparison = buildTreeComparison(report, compareReport);
  }

  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      ...report,
      comparison,
    }, null, 2));
    return;
  }

  printBanner('Xzp Tree', [
    'Vista estructural de la ruta solicitada.',
  ]);
  printSection('Objetivo');
  printKeyValueRows([
    ['Scope', selectedScope],
    ['Ruta', resolvedTarget],
    ['Profundidad', report.depth],
    ['Lineas', report.lines.length],
    ['Directorios', report.directories],
    ['Archivos', report.files],
    ['Ocultos', includeHidden ? 'si' : 'no'],
    ['Limite', limit || 400],
    ['Resumen', treeSummary ? 'expandido' : 'normal'],
  ]);
  console.log(formatTreeReport(report));

  if (treeSummary) {
    printSection('Resumen');
    printKeyValueRows([
      ['Lineas', report.summary.lines],
      ['Directorios', report.summary.directories],
      ['Archivos', report.summary.files],
      ['Truncado', report.summary.truncated ? 'si' : 'no'],
    ]);
  }

  if (comparison) {
    printSection('Comparacion');
    printKeyValueRows([
      ['Base dirs', comparison.left.directories],
      ['Base files', comparison.left.files],
      ['Otra dirs', comparison.right.directories],
      ['Otra files', comparison.right.files],
      ['Delta dirs', comparison.delta.directories],
      ['Delta files', comparison.delta.files],
      ['Delta lineas', comparison.delta.lines],
    ]);
  }
}
