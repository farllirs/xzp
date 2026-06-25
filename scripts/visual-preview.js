#!/usr/bin/env node

/**
 * Visual Preview — renders every UI component so the AI can inspect
 * what's broken.  Run with:
 *   node scripts/visual-preview.js
 *
 * Pipe through `cat` or `less -R` to preserve colors.
 */

// ── Bootstrap a minimal execution context ──────────────────────────
import { setOutputPreferences } from '../src/ui/output.js';
import { renderGridScreen, computeGridCols, computeVisibleCount } from '../src/ui/renderers/grid.js';

setOutputPreferences({
  theme: 'ocean',
  visualTheme: 'panels',
  density: 'comfortable',
  locale: 'co_es',
  noColor: !process.stdout.isTTY,
});

const LOCALE = 'co_es';
const DIVIDER = '\n' + '═'.repeat(60) + '\n';

// ── Helpers ────────────────────────────────────────────────────────
function heading(label) {
  console.log(`\n  ${label}`);
  console.log(`  ${'─'.repeat(label.length + 2)}`);
}

function getLines(opt) {
  if (!opt.hint && !opt.usage) return [opt.label || opt.key];
  return [opt.label || opt.key, opt.hint || opt.usage || ''];
}

// ── 1. GRID VIEW — Funciones menu (16 options) ────────────────────
heading('1. GRID — Funciones (16 options, default cols)');

const functionOptions = [
  { key: 'doctor',   label: '🔍 Doctor del entorno',            hint: 'revisa shell, storage, config y herramientas visibles' },
  { key: 'inspect',  label: '📋 Inspeccionar proyecto',          hint: 'resume archivos clave y metadatos del proyecto actual' },
  { key: 'context',  label: '📦 Contexto y perfil',              hint: 'detecta stack, muestra perfil y recuerda proyectos' },
  { key: 'favorites',label: '⭐ Favoritos guardados',            hint: 'lista rutas rapidas persistentes' },
  { key: 'copy',     label: '📄 Copiar ruta o nombre',           hint: 'guarda la ruta actual en el portapapeles' },
  { key: 'paste',    label: '📌 Pegar contenido',                hint: 'usa la ruta guardada y pregunta acciones' },
  { key: 'clipboard',label: '📋 Ver portapapeles',               hint: 'muestra la ruta y el nombre guardados' },
  { key: 'clipboard-clear', label: '🗑️ Limpiar portapapeles',   hint: 'borra el valor guardado por Xzp' },
  { key: 'search',   label: '🔎 Buscar archivos o carpetas',     hint: 'encuentra rapido por nombre o patron' },
  { key: 'explain',  label: '💡 Explicar un comando',            hint: 'resume uso, riesgo y notas' },
  { key: 'tree',     label: '🌳 Ver arbol de una ruta',          hint: 'muestra la estructura completa' },
  { key: 'safe-shell', label: '🛡️ Entrar al modo seguro',       hint: 'abre el proyecto con el entorno correcto' },
  { key: 'visual-test', label: '🎨 Test visual',                 hint: 'simula carga, progreso y resumen' },
  { key: 'version',  label: '📦 Ver version de Xzp',             hint: 'compara local contra la version publicada' },
  { key: 'help',     label: '❓ Ver ayuda',                      hint: 'muestra comandos y ejemplos' },
  { key: 'back',     label: '🔙 Volver al menu principal' },
];

const cols = computeGridCols();
const maxVisible = computeVisibleCount(cols);
const total = functionOptions.length;

// Render page 0
const items0 = functionOptions.slice(0, maxVisible);
let lines = renderGridScreen({
  title: '🔧 Funciones',
  options: functionOptions,
  items: items0,
  getLines,
  introLines: ['Selecciona una funcion para ejecutar al instante.'],
  selectedIndex: 0,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// Render page with a selected item in the middle
console.log(DIVIDER);
heading('1b. GRID — same, selectedIndex=7, scrolled');

const itemsMid = functionOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: '🔧 Funciones',
  options: functionOptions,
  items: itemsMid,
  getLines,
  introLines: ['Selecciona una funcion para ejecutar al instante.'],
  selectedIndex: 7,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 2. GRID VIEW — Main menu (4 options) ──────────────────────────
console.log(DIVIDER);
heading('2. GRID — Main menu (4 options)');

const mainOptions = [
  { key: 'functions', label: '🔧 Funciones',         hint: 'ejecutar comandos directos de Xzp' },
  { key: 'locale',    label: '🌐 Idioma',             hint: 'cambiar el idioma activo de Xzp' },
  { key: 'settings',  label: '🎨 Personalización',    hint: 'temas, plataforma y caracteristicas' },
  { key: 'exit',      label: '🚪 Salir',              hint: 'cerrar el menu' },
];

const itemsMain = mainOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: 'Menú Principal',
  options: mainOptions,
  items: itemsMain,
  getLines,
  introLines: ['Elige una categoria para comenzar.'],
  selectedIndex: 0,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 3. GRID — Settings (10 options) ────────────────────────────────
console.log(DIVIDER);
heading('3. GRID — Settings (10 options)');

const settingsOptions = [
  { key: 'prompt-theme',           label: '🎨 Tema visual del prompt',        usage: 'elige ocean, forest, ember o mono' },
  { key: 'visual-theme',           label: '🖼️ Tema visual',                   usage: 'classic, panels o minimal' },
  { key: 'menu-visual-mode',       label: '🖼️ Modo visual del menu',          usage: 'elige cards o compact' },
  { key: 'prompt-context-position',label: '📐 Posicion del contexto',          usage: 'elige derecha, inline o desactivado' },
  { key: 'platform-mode',          label: '💻 Modo de plataforma',             usage: 'elige auto, termux o linux' },
  { key: 'toggle-android-shortcut',label: '📱 Acceso rapido Android',          usage: 'permite xzp -a en Termux o Linux' },
  { key: 'toggle-project-badge',   label: '🏷️ Detector de proyecto',          usage: 'muestra lenguaje y color dentro de Xzp' },
  { key: 'toggle-smart-install',   label: '🔒 Instalacion segura',             usage: 'rescata instalaciones' },
  { key: 'android-settings',       label: '⚙️ Android / Termux',              usage: 'accesos rapidos, apariencia, agente' },
  { key: 'back',                   label: '🔙 Volver al menu principal' },
];

function getSettingsLines(opt) {
  if (opt.key === 'back') return [opt.label];
  return [opt.label, `Actual: panels`, `Uso: ${opt.usage}`];
}

const itemsSettings = settingsOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: '🎨 Personalización',
  options: settingsOptions,
  items: itemsSettings,
  getLines: getSettingsLines,
  introLines: ['Activa solo lo que quieras ver todos los dias.'],
  selectedIndex: 5,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 4. GRID — Language selector (4 options) ────────────────────────
console.log(DIVIDER);
heading('4. GRID — Language selector (4 options)');

const localeOptions = [
  { key: 'co_es', label: 'Espanol (Colombia)', usage: 'locale por defecto del proyecto' },
  { key: 'en',    label: 'English',            usage: 'interfaz base en ingles' },
  { key: 'ru',    label: 'Russkiy',            usage: 'interfaz base en ruso' },
  { key: 'back',  label: 'Volver' },
];

function getLocaleLines(opt) {
  if (opt.key === 'back') return [opt.label];
  return [opt.label, `Uso: ${opt.usage}`];
}

const itemsLocale = localeOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: 'Lenguaje',
  options: localeOptions,
  items: itemsLocale,
  getLines: getLocaleLines,
  introLines: ['Actual: co_es'],
  selectedIndex: 1,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 5. GRID — Feature toggle (3 options) ───────────────────────────
console.log(DIVIDER);
heading('5. GRID — Feature toggle (3 options, selected=1)');

const featureOptions = [
  { key: 'enable',  label: 'Activar',   usage: 'descripcion de la caracteristica' },
  { key: 'disable', label: 'Desactivar',usage: 'oculta hasta volver a activarlo' },
  { key: 'back',    label: 'Volver' },
];

function getFeatureLines(opt) {
  if (opt.key === 'back') return [opt.label];
  return [opt.label, `Uso: ${opt.usage}`];
}

const itemsFeature = featureOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: 'Acceso rapido Android',
  options: featureOptions,
  items: itemsFeature,
  getLines: getFeatureLines,
  introLines: ['Actual: activado'],
  selectedIndex: 1,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 6. GRID — Visual theme selector (4 options) ────────────────────
console.log(DIVIDER);
heading('6. GRID — Visual theme selector (4 options)');

const themeOptions = [
  { key: 'classic', label: 'Classic', usage: 'list-based navigation, clean and traditional' },
  { key: 'panels',  label: 'Panels',  usage: 'card-based navigation with selection glow and status bar' },
  { key: 'minimal', label: 'Minimal', usage: 'ultra-compact list, no borders, maximum density' },
  { key: 'back',    label: 'Back' },
];

function getThemeLines(opt) {
  if (opt.key === 'back') return [opt.label];
  return [opt.label, `Usage: ${opt.usage}`];
}

const itemsTheme = themeOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: 'Visual Theme',
  options: themeOptions,
  items: itemsTheme,
  getLines: getThemeLines,
  introLines: ['Current: panels'],
  selectedIndex: 1,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 7. GRID — Color mode (4 options) ───────────────────────────────
console.log(DIVIDER);
heading('7. GRID — Color mode (4 options)');

const colorOptions = [
  { key: 'default', label: 'Default', usage: "use the theme's built-in colors" },
  { key: 'system',  label: 'System',  usage: 'use terminal default colors (no ANSI codes)' },
  { key: 'custom',  label: 'Custom',  usage: 'pick individual colors via hex codes' },
  { key: 'back',    label: 'Back' },
];

function getColorLines(opt) {
  if (opt.key === 'back') return [opt.label];
  return [opt.label, `Usage: ${opt.usage}`];
}

const itemsColor = colorOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: 'Color Mode',
  options: colorOptions,
  items: itemsColor,
  getLines: getColorLines,
  introLines: ['Current: default'],
  selectedIndex: 0,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// ── 8. GRID — Viewport scroll simulation (30 options) ──────────────
console.log(DIVIDER);
heading('8. GRID — Many options (30), testing viewport scroll');

const manyOptions = [];
for (let i = 0; i < 30; i++) {
  manyOptions.push({
    key: `opt${i}`,
    label: `📦 Opcion ${i + 1}`,
    hint: `descripcion de la opcion numero ${i + 1}`,
  });
}

const itemsMany = manyOptions.slice(0, maxVisible);
lines = renderGridScreen({
  title: 'Demo — 30 opciones',
  options: manyOptions,
  items: itemsMany,
  getLines,
  introLines: ['Navega con ← → ↑ ↓, el viewport rota solo.'],
  selectedIndex: 0,
  cols,
  visibleStartIndex: 0,
});
console.log(lines.join('\n'));

// Show a viewport with visibleStart > 0
console.log('\n  → Viewport scroll: visibleStart=8, selectedIndex=10\n');
const startScroll = Math.min(8, Math.max(0, manyOptions.length - maxVisible));
const itemsScroll = manyOptions.slice(startScroll, startScroll + maxVisible);
lines = renderGridScreen({
  title: 'Demo — scrolled (start=8)',
  options: manyOptions,
  items: itemsScroll,
  getLines,
  introLines: ['El viewport muestra opciones 8-23.'],
  selectedIndex: 10,
  cols,
  visibleStartIndex: startScroll,
});
console.log(lines.join('\n'));

// ── 9. Info ────────────────────────────────────────────────────────
console.log(DIVIDER);
console.log(`Terminal columns: ${process.stdout.columns || 80}`);
console.log(`Computed cols:    ${cols}`);
console.log(`Max visible:      ${maxVisible} (${cols} cols × 3 rows)`);
console.log(`\nHit: node scripts/visual-preview.js | cat`);
