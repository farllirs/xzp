/**
 * ANSI 256 Color Browser — interactive color picker for the Theme Studio.
 *
 * Shows a scrollable grid of colors grouped by hue. Returns an ANSI code
 * like "38;5;196" for use in palette customizations.
 */

import { renderGridScreen, computeGridCols, computeVisibleStart, computeVisibleCount } from '../ui/renderers/grid.js';

// ANSI 256 color palette: curated set of good-looking colors
const COLORS = [
  // Grays
  { name: 'Black',       ansi: '38;5;0',   block: '  ' },
  { name: 'Dark Gray',   ansi: '38;5;236', block: '  ' },
  { name: 'Gray 245',    ansi: '38;5;245', block: '  ' },
  { name: 'Gray 250',    ansi: '38;5;250', block: '  ' },
  { name: 'White',       ansi: '38;5;255', block: '  ' },
  // Reds
  { name: 'Red',         ansi: '38;5;196', block: '  ' },
  { name: 'Coral',       ansi: '38;5;203', block: '  ' },
  { name: 'Rose',        ansi: '38;5;210', block: '  ' },
  { name: 'Maroon',      ansi: '38;5;88',  block: '  ' },
  // Oranges
  { name: 'Orange',      ansi: '38;5;214', block: '  ' },
  { name: 'Amber',       ansi: '38;5;179', block: '  ' },
  { name: 'Gold',        ansi: '38;5;220', block: '  ' },
  // Yellows
  { name: 'Yellow',      ansi: '38;5;226', block: '  ' },
  { name: 'Olive',       ansi: '38;5;100', block: '  ' },
  // Greens
  { name: 'Green',       ansi: '38;5;46',  block: '  ' },
  { name: 'Mint',        ansi: '38;5;121', block: '  ' },
  { name: 'Forest',      ansi: '38;5;28',  block: '  ' },
  { name: 'Lime',        ansi: '38;5;154', block: '  ' },
  { name: 'Teal',        ansi: '38;5;37',  block: '  ' },
  // Blues
  { name: 'Blue',        ansi: '38;5;27',  block: '  ' },
  { name: 'Sky',         ansi: '38;5;75',  block: '  ' },
  { name: 'Ice',         ansi: '38;5;153', block: '  ' },
  { name: 'Steel',       ansi: '38;5;110', block: '  ' },
  { name: 'Navy',        ansi: '38;5;18',  block: '  ' },
  { name: 'Royal',       ansi: '38;5;63',  block: '  ' },
  // Purples
  { name: 'Purple',      ansi: '38;5;129', block: '  ' },
  { name: 'Violet',      ansi: '38;5;147', block: '  ' },
  { name: 'Magenta',     ansi: '38;5;200', block: '  ' },
  { name: 'Lavender',    ansi: '38;5;183', block: '  ' },
  // Pinks
  { name: 'Hot Pink',    ansi: '38;5;205', block: '  ' },
  { name: 'Bubblegum',   ansi: '38;5;218', block: '  ' },
  // Browns
  { name: 'Brown',       ansi: '38;5;94',  block: '  ' },
  { name: 'Tan',         ansi: '38;5;180', block: '  ' },
  // Cyans
  { name: 'Cyan',        ansi: '38;5;51',  block: '  ' },
  { name: 'Aqua',        ansi: '38;5;86',  block: '  ' },
];

// Role labels in the palette
export const COLOR_ROLES = [
  'title',
  'section',
  'accent',
  'text',
  'muted',
  'selected',
  'card',
  'border',
  'highlight',
  'info',
  'ok',
  'warn',
  'error',
  'surface',
];

export const ROLE_LABELS = {
  title: 'Title (headers)',
  section: 'Section (borders)',
  accent: 'Accent (highlights)',
  text: 'Text (body)',
  muted: 'Muted (secondary)',
  selected: 'Selected (active item)',
  card: 'Card (inactive card)',
  border: 'Border (dividers)',
  highlight: 'Highlight (warnings)',
  info: 'Info (status)',
  ok: 'Ok (success)',
  warn: 'Warn (caution)',
  error: 'Error (danger)',
  surface: 'Surface (background)',
};

/**
 * Render a color-picker grid.
 * @param {object} options
 * @param {string} options.roleName - The role being customized
 * @param {string} options.currentAnsi - Current ANSI code for this role
 * @param {number} options.selectedIndex - Which color is selected
 * @param {number} options.visibleStart - Viewport scroll start
 * @returns {string[]} Lines to render
 */
export function renderColorPicker({ roleName, currentAnsi, selectedIndex = 0, visibleStart = 0 }) {
  const cols = computeGridCols();
  const visibleCount = computeVisibleCount(cols);
  const start = computeVisibleStart(selectedIndex, visibleStart, cols, COLORS.length);
  const items = COLORS.slice(start, start + visibleCount);

  // Build a color swatch label with actual ANSI color + name
  const itemsWithSwatch = items.map((c, i) => ({
    key: c.ansi,
    label: `${c.block || '  '} ${c.name}`,
  }));

  const currentColor = COLORS.find(c => c.ansi === currentAnsi);
  const currentName = currentColor ? currentColor.name : 'Custom';

  return renderGridScreen({
    title: `🎨 ${roleName}`,
    options: COLORS.map(c => ({
      key: c.ansi,
      label: `${c.block || '  '} ${c.name}`,
    })),
    items: itemsWithSwatch,
    getLines: (opt) => {
      const color = COLORS.find(c => c.ansi === opt.key);
      return [opt.label, color ? `ANSI ${opt.key}` : ''];
    },
    introLines: [`Current: ${currentName} (${currentAnsi})`],
    selectedIndex: Math.max(0, COLORS.findIndex(c => c.ansi === currentAnsi)),
    cols,
    visibleStartIndex: start,
  });
}

export function getColorAnsiCode(index) {
  if (index >= 0 && index < COLORS.length) return COLORS[index].ansi;
  return '38;5;255';
}

export function getColorCount() {
  return COLORS.length;
}

export function getColorAt(index) {
  return COLORS[index] || null;
}
