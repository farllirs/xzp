import { colorize, resolveThemePalette, supportsColor, getOutputPreferences } from '../output.js';

const CARD_WIDTH = 14;
const CARD_HEIGHT = 3;
const H_GAP = 2;
const MIN_COLS = 2;
const MAX_COLS = 8;
const VISIBLE_ROWS = 3;

// Emoji regex
const EMOJI_RE = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F|\p{Emoji})(\u200D[\p{Emoji_Presentation}\p{Emoji}\uFE0F])*/u;

function splitEmoji(text) {
  const m = text.match(EMOJI_RE);
  if (m) {
    let emoji = m[0];
    let rest = text.slice(emoji.length);
    // Consume trailing variation selector (FE0F) as part of the emoji
    if (rest.startsWith('\uFE0F')) {
      emoji += '\uFE0F';
      rest = rest.slice(1);
    }
    return { emoji, rest: rest.trimStart() };
  }
  return { emoji: '', rest: text };
}

/**
 * Compute columns based on terminal width or user preference.
 * Range: 2–8 columns. At 40 cols → 2, 80 cols → 4, 120 cols → 6, 160+ cols → 8.
 * If user has set gridColumns (>0), that takes priority.
 */
export function computeGridCols() {
  const prefs = getOutputPreferences();
  if (prefs.gridColumns > 0) {
    return Math.max(MIN_COLS, Math.min(MAX_COLS, prefs.gridColumns));
  }
  const termWidth = process.stdout.columns || 80;
  const cardUnit = CARD_WIDTH + 4; // borders (2) + H_GAP (2) per card
  const cols = Math.floor(termWidth / cardUnit);
  return Math.max(MIN_COLS, Math.min(MAX_COLS, cols));
}

/**
 * Compute how many items are visible on one screen.
 * Uses user-configured gridRows if available, otherwise VISIBLE_ROWS.
 */
export function computeVisibleCount(cols) {
  const prefs = getOutputPreferences();
  const rows = prefs.gridRows > 0 ? prefs.gridRows : VISIBLE_ROWS;
  return cols * rows;
}

/**
 * Calculate visibleStartIndex so that selectedIndex is always visible.
 */
export function computeVisibleStart(selectedIndex, visibleStart, cols, totalItems) {
  const visibleCount = computeVisibleCount(cols);
  const maxStart = Math.max(0, totalItems - visibleCount);
  let start = visibleStart;

  // If selected above viewport, scroll up so selected is at top
  if (selectedIndex < visibleStart) {
    start = Math.min(selectedIndex, maxStart);
  }

  // If selected below viewport, scroll down so selected is at top
  if (selectedIndex >= visibleStart + visibleCount) {
    start = Math.min(selectedIndex, maxStart);
  }

  return Math.max(0, Math.min(start, maxStart));
}

export function renderGridScreen({
  title,
  options,       // full options array (for status bar)
  items,         // pre-sliced items to render
  getLines,
  introLines,
  selectedIndex,
  cols,
  visibleStartIndex,
}) {
  const palette = resolveThemePalette();
  const totalOptions = options.length;
  const rows = [];
  const canColor = supportsColor();

  // ── Centering ──
  const termWidth = process.stdout.columns || 80;
  const cardRowWidth = cols * (CARD_WIDTH + 2) + (cols - 1) * H_GAP;
  const leftPad = Math.max(0, Math.floor((termWidth - cardRowWidth) / 2));
  const padStr = ' '.repeat(leftPad);

  // ── Header ──
  const headerWidth = cardRowWidth - 2; // esquinas suman 2 al total
  const displayTitle = truncateText(title, Math.max(10, headerWidth - 4));
  const edge = canColor ? colorize('╭', palette.section) : '+';
  const titleVisual = charWidth(displayTitle);
  const titleLine = canColor ? colorize(` ${displayTitle} `, palette.title, 'bold') : ` ${displayTitle} `;
  const edgeEnd = canColor ? colorize('╮', palette.section) : '+';
  const titlePad = Math.max(0, headerWidth - titleVisual - 2);
  rows.push(`${padStr}${edge}${titleLine}${' '.repeat(titlePad)}${edgeEnd}`);

  // ── Divider ──
  const div = canColor ? colorize('╰', palette.section) : '+';
  const divEnd = canColor ? colorize('╯', palette.section) : '+';
  rows.push(`${padStr}${div}${'─'.repeat(headerWidth)}${divEnd}`);

  // ── Intro ──
  for (const line of introLines) {
    rows.push(`${padStr}  ${canColor ? colorize(line, palette.muted) : line}`);
  }
  if (introLines.length) rows.push(padStr);

  // ── Grid of cards ──
  const cardRows = [];
  for (let i = 0; i < items.length; i += cols) {
    const rowItems = items.slice(i, i + cols);

    // Top border: rounded curves only, no vertical walls
    let topLine = padStr;
    for (let c = 0; c < rowItems.length; c++) {
      const idx = visibleStartIndex + i + c;
      const isSelected = idx === selectedIndex;
      const t = isSelected ? palette.selected : palette.card;
      topLine += (canColor ? colorize('╭', t) : '+')
        + (canColor ? colorize('─'.repeat(CARD_WIDTH), t) : '-'.repeat(CARD_WIDTH))
        + (canColor ? colorize('╮', t) : '+');
      if (c < rowItems.length - 1) topLine += ' '.repeat(H_GAP);
    }
    cardRows.push(topLine);

    // Card content lines — NO vertical walls, content centered
    // Each content card unit = 1 (left spacer) + CARD_WIDTH + 1 (right spacer) = 16, matching border width
    for (let lineN = 0; lineN < CARD_HEIGHT; lineN++) {
      let line = padStr;
      for (let c = 0; c < rowItems.length; c++) {
        const idx = visibleStartIndex + i + c;
        const isSelected = idx === selectedIndex;
        const opt = rowItems[c];
        const fg = isSelected ? palette.title : palette.text;

        // Left spacer where ╭/╰ would be (keeps content aligned with border width)
        line += ' ';

        if (lineN === 0) {
          // Icon line: opt.icon > emoji from splitEmoji > fallback ' '
          const explicitIcon = opt.icon || '';
          const icon = explicitIcon || splitEmoji(opt.label || opt.key || '').emoji || ' ';
          // Use opt.swatch color for the icon if provided (e.g., ■ in ANSI color)
          const useSwatch = opt.swatch && canColor;
          const iconColor = useSwatch ? opt.swatch : fg;
          const iconWeight = useSwatch ? '' : (isSelected ? 'bold' : '');
          const iconW = charWidth(icon);
          const pad = Math.max(0, Math.floor((CARD_WIDTH - iconW) / 2));
          const content = padEndWidth(' '.repeat(pad) + icon, CARD_WIDTH);
          line += canColor ? colorize(content, iconColor, iconWeight) : content;
        } else if (lineN === 1) {
          // Label line: text WITHOUT emoji/icon, centered
          let clean = '';
          if (opt.icon) {
            // explicit icon → strip it from label text
            const labelText = (opt.label || opt.key || '');
            clean = labelText.replace(opt.icon, '').trim();
          } else {
            const { rest } = splitEmoji(opt.label || opt.key || '');
            clean = rest.trim();
          }
          const labelW = charWidth(clean);
          const pad = Math.max(0, Math.floor((CARD_WIDTH - labelW) / 2));
          const label = padEndWidth(
            ' '.repeat(pad) + truncateToWidth(clean, CARD_WIDTH - pad),
            CARD_WIDTH
          );
          line += canColor ? colorize(label, fg, isSelected ? 'bold' : '') : label;
        } else {
          // Empty line
          line += ' '.repeat(CARD_WIDTH);
        }

        // Right spacer where ╮/╯ would be
        line += ' ';

        if (c < rowItems.length - 1) line += ' '.repeat(H_GAP);
      }
      cardRows.push(line);
    }

    // Bottom border: rounded curves only, no vertical walls
    let bottomLine = padStr;
    for (let c = 0; c < rowItems.length; c++) {
      const idx = visibleStartIndex + i + c;
      const isSelected = idx === selectedIndex;
      const t = isSelected ? palette.selected : palette.card;
      bottomLine += (canColor ? colorize('╰', t) : '+')
        + (canColor ? colorize('─'.repeat(CARD_WIDTH), t) : '-'.repeat(CARD_WIDTH))
        + (canColor ? colorize('╯', t) : '+');
      if (c < rowItems.length - 1) bottomLine += ' '.repeat(H_GAP);
    }
    cardRows.push(bottomLine);
    cardRows.push(padStr);
  }

  rows.push(...cardRows);

  // ── Status bar ──
  const selectedOption = options[selectedIndex];
  if (selectedOption) {
    const lines = getLines(selectedOption);
    const fullLabel = lines[0] || '';
    const desc = lines.slice(1).join(' · ') || '';
    const sep = canColor ? colorize(' · ', palette.muted) : ' · ';
    const statusText = `${fullLabel}${sep}${desc}`;
    const statusWidth = Math.max(10, cardRowWidth - 4);
    const truncated = truncateToWidth(statusText, statusWidth);
    const statusBar = canColor
      ? colorize(`${' '.repeat(leftPad)}  ${truncated}`, palette.muted)
      : `  ${truncated}`;
    rows.push(statusBar);
  }

  // ── Footer navigation hint ──
  const prefs2 = getOutputPreferences();
  const gridRows = prefs2.gridRows > 0 ? prefs2.gridRows : VISIBLE_ROWS;
  const visibleEnd = Math.min(totalOptions, visibleStartIndex + (cols * gridRows));
  const pageInfo = visibleStartIndex > 0 || visibleEnd < totalOptions
    ? `  [${visibleStartIndex + 1}-${visibleEnd} / ${totalOptions}]`
    : `  [${totalOptions}]`;
  rows.push(
    `${padStr}`
    + (canColor
      ? colorize(`← → ↑ ↓ Navegar  ·  Enter  ·  Esc${pageInfo}`, palette.muted)
      : `<- -> Navigate  ·  Enter  ·  Esc${pageInfo}`),
  );

  return rows;
}

/** Approximate visible width (emoji ~ 2, zero-width chars = 0, ASCII = 1). */
function charWidth(str) {
  let w = 0;
  for (const ch of str) {
    const cp = ch.codePointAt(0);
    // Variation selectors and zero-width joiner
    if (cp === 0xFE0F || cp === 0xFE0E || cp === 0x200D) continue;
    w += (cp > 0xFFFF || (cp >= 0x2000 && cp <= 0x2FFFF)) ? 2 : 1;
  }
  return w;
}

/** Pad string to a target VISIBLE width (not character count). */
function padEndWidth(str, targetWidth) {
  const current = charWidth(str);
  if (current >= targetWidth) return str;
  return str + ' '.repeat(targetWidth - current);
}

/** Truncate string so visible width ≤ max, appending … if truncated. */
function truncateToWidth(str, max) {
  if (max <= 0) return '';
  let w = 0;
  let result = '';
  for (const ch of str) {
    const cw = charWidth(ch);
    if (w + cw > max) {
      // Replace last char with … if there's room
      if (result.length > 0) {
        result = result.slice(0, -1) + '…';
      }
      return result;
    }
    w += cw;
    result += ch;
  }
  return result;
}

/** Truncate text by character count. */
function truncateText(str, maxLen) {
  if (!str || str.length <= maxLen) return str || '';
  return str.slice(0, Math.max(0, maxLen - 1)) + '…';
}
