/**
 * Theme Studio — unified visual customization menu.
 *
 * Replaces the scattered settings for prompt theme, visual theme,
 * color mode, platform mode, etc. with a single interactive menu.
 *
 * Categories:
 *   🎨 Colores     — browse and edit every palette role
 *   📐 Disposición — visual theme, columns, rows
 *   💬 Prompt      — theme, position
 */

import { setOutputPreferences, resolveThemePalette, getActiveVisualTheme } from '../ui/output.js';
import { chooseGridOptionInteractive } from '../ui/prompt.js';
import { loadUserConfig, saveUserConfig } from '../core/config.js';
import { COLOR_ROLES, ROLE_LABELS, getColorCount, getColorAt } from '../utils/color-browser.js';

const VISUAL_THEMES = [
  { key: 'classic', label: '📋 Classic', desc: 'List-based navigation, clean and traditional' },
  { key: 'panels',  label: '🔲 Panels',  desc: 'Card-based navigation with selection glow and status bar' },
  { key: 'minimal', label: '📄 Minimal', desc: 'Ultra-compact list, no borders, maximum density' },
];

const PROMPT_THEMES = [
  { key: 'ocean',  label: '🌊 Ocean',  desc: 'Blue-cyan tones, clean and modern' },
  { key: 'forest', label: '🌲 Forest', desc: 'Green tones, natural and calm' },
  { key: 'ember',  label: '🔥 Ember',  desc: 'Warm red-orange tones, energetic' },
  { key: 'mono',   label: '⬜ Mono',   desc: 'Monochrome, no distractions' },
];

const PROMPT_POSITIONS = [
  { key: 'right',     label: '📐 Right',     desc: 'Prompt context appears to the right of the input' },
  { key: 'inline',    label: '📏 Inline',    desc: 'Prompt context appears inline above the input' },
  { key: 'disabled',  label: '🚫 Disabled',  desc: 'No prompt context shown' },
];

const COLUMN_OPTIONS = [
  { key: '0', label: '🔁 Auto',     desc: 'Automatic based on terminal width' },
  { key: '2', label: '2 cols',      desc: 'Force 2 columns' },
  { key: '3', label: '3 cols',      desc: 'Force 3 columns' },
  { key: '4', label: '4 cols',      desc: 'Force 4 columns' },
  { key: '5', label: '5 cols',      desc: 'Force 5 columns' },
  { key: '6', label: '6 cols',      desc: 'Force 6 columns' },
  { key: '7', label: '7 cols',      desc: 'Force 7 columns' },
  { key: '8', label: '8 cols',      desc: 'Force 8 columns' },
];

const ROW_OPTIONS = [
  { key: '2', label: '2 rows',  desc: '2 visible rows' },
  { key: '3', label: '3 rows',  desc: '3 visible rows' },
  { key: '4', label: '4 rows',  desc: '4 visible rows' },
  { key: '5', label: '5 rows',  desc: '5 visible rows' },
];

const roleIcons = {
  title: '📰', section: '🔲', accent: '✨', text: '📝',
  muted: '🌫️', selected: '✅', card: '🃏', border: '📏',
  highlight: '🟡', info: 'ℹ️', ok: '✅', warn: '⚠️',
  error: '❌', surface: '⬛',
};

/**
 * Main entry point: launches the Theme Studio.
 */
export async function runThemeStudio(context) {
  setOutputPreferences(context.runtimePreferences);

  const menuOptions = [
    { key: 'colors', label: '🎨 Colores',     desc: `Edit ${COLOR_ROLES.length} color roles` },
    { key: 'layout', label: '📐 Disposición',  desc: 'Visual theme, columns and rows' },
    { key: 'prompt', label: '💬 Prompt',       desc: 'Prompt theme and position' },
    { key: 'back',   label: '🔙 Volver' },
  ];

  const selected = await chooseGridOptionInteractive({
    title: '🎨 Theme Studio',
    options: menuOptions,
    getValue: (opt) => opt.key,
    getLines: (opt) => [opt.label, opt.desc || ''],
    introLines: ['Customize every aspect of Xzp visual appearance.'],
  });

  if (!selected || selected === 'back') return;

  switch (selected) {
    case 'colors': await runColorEditor(context); break;
    case 'layout': await runLayoutEditor(context); break;
    case 'prompt': await runPromptEditor(context); break;
  }
}

/**
 * Color Editor: browse roles, pick a role, pick a color from ANSI palette.
 */
async function runColorEditor(context) {
  const config = await loadUserConfig();
  const customColors = config.ui?.customColors || {};
  const palette = resolveThemePalette();

  while (true) {
    const roleOptions = COLOR_ROLES.map(role => {
      const currentCode = customColors[role] || palette[role] || 'white';
      return {
        key: role,
        label: `${roleIcons[role] || '🎨'} ${role}`,
        desc: `${ROLE_LABELS[role] || role}: ${currentCode}`,
        currentCode,
      };
    });
    roleOptions.push({ key: 'back', label: '🔙 Volver', desc: 'Back to Theme Studio' });

    const selected = await chooseGridOptionInteractive({
      title: '🎨 Colores',
      options: roleOptions,
      getValue: (opt) => opt.key,
      getLines: (opt) => {
        if (opt.key === 'back') return [opt.label];
        return [opt.label, `Current: ${opt.currentCode}`, opt.desc || ''];
      },
      introLines: ['Select a color role to change its ANSI color.'],
    });

    if (!selected || selected === 'back') break;

    // Find the option to get currentCode
    const opt = roleOptions.find(o => o.key === selected);
    const currentCode = opt ? opt.currentCode : 'white';

    const newCode = await pickColorForRole(selected, currentCode);
    if (newCode && newCode !== currentCode) {
      const updatedConfig = await loadUserConfig();
      if (!updatedConfig.ui.customColors) updatedConfig.ui.customColors = {};
      updatedConfig.ui.customColors[selected] = newCode;
      await saveUserConfig(updatedConfig);
      setOutputPreferences({ customColors: updatedConfig.ui.customColors });
    }
  }
}

/**
 * Color picker screen — shows ANSI colors in a grid for the user to choose from.
 */
async function pickColorForRole(role, currentCode) {
  const totalColors = getColorCount();

  // Find current index
  let selectedIdx = 0;
  for (let i = 0; i < totalColors; i++) {
    const c = getColorAt(i);
    if (c && c.ansi === currentCode) { selectedIdx = i; break; }
  }

  const colorOptions = [];
  for (let i = 0; i < totalColors; i++) {
    const c = getColorAt(i);
    if (c) colorOptions.push({ key: c.ansi, label: `■ ${c.name}`, icon: '■', swatch: c.ansi, desc: c.ansi });
  }

  const result = await chooseGridOptionInteractive({
    title: `🎨 ${role}`,
    options: colorOptions,
    getValue: (opt) => opt.key,
    getLines: (opt) => [opt.label, opt.desc],
    introLines: [`Current: ${currentCode} | Select a color for "${role}"`],
    defaultIndex: selectedIdx,
  });

  return result || null;
}

/**
 * Layout Editor: visual theme, columns, rows.
 */
async function runLayoutEditor(context) {
  const config = await loadUserConfig();
  let currentVisualTheme = config.ui?.visualTheme || 'panels';
  let currentColumns = String(config.ui?.gridColumns || 0);
  let currentRows = String(config.ui?.gridRows || 3);

  while (true) {
    const layoutOptions = [
      { key: 'visualTheme', label: '🖼️ Visual Theme', desc: `Current: ${currentVisualTheme}` },
      { key: 'columns',     label: '📊 Columns',      desc: `Current: ${currentColumns === '0' ? 'Auto' : currentColumns + ' cols'}` },
      { key: 'rows',        label: '📊 Rows',          desc: `Current: ${currentRows} rows` },
      { key: 'back',        label: '🔙 Volver' },
    ];

    const selected = await chooseGridOptionInteractive({
      title: '📐 Disposición',
      options: layoutOptions,
      getValue: (opt) => opt.key,
      getLines: (opt) => [opt.label, opt.desc || ''],
      introLines: ['Configure grid layout and visual theme.'],
    });

    if (!selected || selected === 'back') break;

    if (selected === 'visualTheme') {
      const result = await chooseGridOptionInteractive({
        title: '🖼️ Visual Theme',
        options: VISUAL_THEMES,
        getValue: (opt) => opt.key,
        getLines: (opt) => [opt.label, opt.desc],
        introLines: [`Current: ${currentVisualTheme}`],
      });
      if (result) {
        const cfg = await loadUserConfig();
        cfg.ui.visualTheme = result;
        await saveUserConfig(cfg);
        setOutputPreferences({ visualTheme: result });
        currentVisualTheme = result;
      }
    } else if (selected === 'columns') {
      const result = await chooseGridOptionInteractive({
        title: '📊 Columns',
        options: COLUMN_OPTIONS,
        getValue: (opt) => opt.key,
        getLines: (opt) => [opt.label, opt.desc],
        introLines: [`Current: ${currentColumns === '0' ? 'Auto' : currentColumns + ' cols'}`],
      });
      if (result) {
        const val = parseInt(result, 10);
        const cfg = await loadUserConfig();
        cfg.ui.gridColumns = val;
        await saveUserConfig(cfg);
        setOutputPreferences({ gridColumns: val });
        currentColumns = result;
      }
    } else if (selected === 'rows') {
      const result = await chooseGridOptionInteractive({
        title: '📊 Rows',
        options: ROW_OPTIONS,
        getValue: (opt) => opt.key,
        getLines: (opt) => [opt.label, opt.desc],
        introLines: [`Current: ${currentRows} rows`],
      });
      if (result) {
        const val = parseInt(result, 10);
        const cfg = await loadUserConfig();
        cfg.ui.gridRows = val;
        await saveUserConfig(cfg);
        setOutputPreferences({ gridRows: val });
        currentRows = result;
      }
    }
  }
}

/**
 * Prompt Editor: prompt theme and position.
 */
async function runPromptEditor(context) {
  const config = await loadUserConfig();
  let currentTheme = config.ui?.promptTheme || 'ocean';
  let currentPosition = config.ui?.promptContextPosition || 'right';

  while (true) {
    const promptOptions = [
      { key: 'promptTheme',    label: '💬 Prompt Theme',   desc: `Current: ${currentTheme}` },
      { key: 'promptPosition', label: '📐 Prompt Position', desc: `Current: ${currentPosition}` },
      { key: 'back',           label: '🔙 Volver' },
    ];

    const selected = await chooseGridOptionInteractive({
      title: '💬 Prompt',
      options: promptOptions,
      getValue: (opt) => opt.key,
      getLines: (opt) => [opt.label, opt.desc || ''],
      introLines: ['Customize the AI prompt appearance and behavior.'],
    });

    if (!selected || selected === 'back') break;

    if (selected === 'promptTheme') {
      const result = await chooseGridOptionInteractive({
        title: '💬 Prompt Theme',
        options: PROMPT_THEMES,
        getValue: (opt) => opt.key,
        getLines: (opt) => [opt.label, opt.desc],
        introLines: [`Current: ${currentTheme}`],
      });
      if (result) {
        const cfg = await loadUserConfig();
        cfg.ui.promptTheme = result;
        await saveUserConfig(cfg);
        setOutputPreferences({ promptTheme: result });
        currentTheme = result;
      }
    } else if (selected === 'promptPosition') {
      const result = await chooseGridOptionInteractive({
        title: '📐 Prompt Position',
        options: PROMPT_POSITIONS,
        getValue: (opt) => opt.key,
        getLines: (opt) => [opt.label, opt.desc],
        introLines: [`Current: ${currentPosition}`],
      });
      if (result) {
        const cfg = await loadUserConfig();
        cfg.ui.promptContextPosition = result;
        await saveUserConfig(cfg);
        setOutputPreferences({ promptContextPosition: result });
        currentPosition = result;
      }
    }
  }
}
