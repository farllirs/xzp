import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeParsedArgs, parseArgs } from '../src/core/args.js';

test('parsea doctor e inspect', () => {
  assert.equal(parseArgs(['doctor']).command, 'doctor');
  assert.equal(parseArgs(['--doctor']).command, 'doctor');
  assert.equal(parseArgs(['inspect']).command, 'inspect');
  assert.equal(parseArgs(['--inspect']).command, 'inspect');
  assert.equal(parseArgs(['--report-error']).command, 'report-error');
});

test('parsea guardado y ejecucion de accesos seguros', () => {
  const saveShortcut = parseArgs(['-r', 'app.py', 'mi-app']);
  assert.equal(saveShortcut.command, 'safe-shell');
  assert.equal(saveShortcut.safeShortcutEntry, 'app.py');
  assert.equal(saveShortcut.safeShortcutName, 'mi-app');

  const runShortcut = parseArgs(['-r', 'mi-app']);
  assert.equal(runShortcut.command, 'safe-shell');
  assert.equal(runShortcut.safeShortcutEntry, 'mi-app');

  const removeShortcut = parseArgs(['-r', '--remove-safe-shortcut', 'mi-app']);
  assert.equal(removeShortcut.safeShortcutAction, 'remove');
  assert.equal(removeShortcut.safeShortcutName, 'mi-app');
});

test('mantiene parseo de tree y depth', () => {
  const parsed = parseArgs(['tree', 'src', '--depth', '4']);
  assert.equal(parsed.command, 'tree');
  assert.equal(parsed.target, 'src');
  assert.equal(parsed.depth, 4);
});

test('parsea mejoras de copy y paste', () => {
  const copyParsed = parseArgs(['-c', '--relative']);
  assert.equal(copyParsed.command, 'copy');
  assert.equal(copyParsed.copyMode, 'relative');

  const pasteParsed = parseArgs(['-p', '--move', '--into', './tmp', '--preview']);
  assert.equal(pasteParsed.command, 'paste');
  assert.equal(pasteParsed.pasteAction, 'move');
  assert.equal(pasteParsed.pasteTarget, './tmp');
  assert.equal(pasteParsed.pastePreview, true);
});

test('parsea mejoras de search y tree', () => {
  const searchParsed = parseArgs(['-b', 'demo', '--files', '--hidden', '--limit', '25']);
  assert.equal(searchParsed.command, 'search');
  assert.equal(searchParsed.searchType, 'file');
  assert.equal(searchParsed.includeHidden, true);
  assert.equal(searchParsed.limit, 25);

  const treeParsed = parseArgs(['-t', '.', '--depth', '3', '--limit', '40', '--hidden']);
  assert.equal(treeParsed.command, 'tree');
  assert.equal(treeParsed.depth, 3);
  assert.equal(treeParsed.limit, 40);
  assert.equal(treeParsed.includeHidden, true);
});

test('parsea preset y estado para safe-shell', () => {
  const parsed = parseArgs(['-r', '--safe-status', '--preset', 'debug']);
  assert.equal(parsed.command, 'safe-shell');
  assert.equal(parsed.safeShortcutAction, 'status');
  assert.equal(parsed.safePreset, 'debug');
});

test('parsea favoritos, perfil, exclusiones y comparacion de tree', () => {
  const contextParsed = parseArgs(['-x', '--profile', '--save-favorite', 'demo']);
  assert.equal(contextParsed.command, 'context');
  assert.equal(contextParsed.contextProfile, true);
  assert.equal(contextParsed.contextAction, 'save-favorite');
  assert.equal(contextParsed.favoriteName, 'demo');

  const searchParsed = parseArgs(['-b', 'api client', '--semantic', '--exclude', 'dist', '--save-exclude']);
  assert.equal(searchParsed.semanticSearch, true);
  assert.deepEqual(searchParsed.searchExcludes, ['dist']);
  assert.equal(searchParsed.saveSearchExcludes, true);

  const treeParsed = parseArgs(['-t', '.', '--compare', 'src', '--summary']);
  assert.equal(treeParsed.treeCompareTarget, 'src');
  assert.equal(treeParsed.treeSummary, true);
});

test('parsea comandos legacy de version y doctor sin romper mejoras nuevas', () => {
  assert.equal(parseArgs(['-v']).command, 'version');
  assert.equal(parseArgs(['--doctor']).command, 'doctor');
});

test('parsea flags internos del navegador android', () => {
  const parsed = parseArgs(['-a', '--android-pick', '--android-start', '/sdcard/Download']);
  assert.equal(parsed.command, 'android');
  assert.equal(parsed.androidPickOnly, true);
  assert.equal(parsed.androidStartPath, '/sdcard/Download');
});

test('parsea cambio de locale por CLI', () => {
  const parsed = parseArgs(['--locale', 'ru']);
  assert.equal(parsed.command, 'locale');
  assert.equal(parsed.localeValue, 'ru');
});


test('normalizeParsedArgs limpia campos compartidos', () => {
  const normalized = normalizeParsedArgs({
    command: ' search ',
    scope: ' ACTUAL ',
    limit: '120',
    depth: '0',
    safePreset: 'DEV',
    androidPickOnly: 1,
    androidStartPath: ' /sdcard ',
    localeValue: ' EN ',
    searchExcludes: [' dist ', '', null],
  });

  assert.equal(normalized.command, 'search');
  assert.equal(normalized.scope, 'actual');
  assert.equal(normalized.limit, 120);
  assert.equal(normalized.depth, 2);
  assert.equal(normalized.safePreset, 'dev');
  assert.equal(normalized.androidPickOnly, true);
  assert.equal(normalized.androidStartPath, '/sdcard');
  assert.equal(normalized.localeValue, 'en');
  assert.deepEqual(normalized.searchExcludes, ['dist']);
});
