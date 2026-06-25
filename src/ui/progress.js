import readline from 'node:readline';

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  mint: '\x1b[38;5;121m',
  steel: '\x1b[38;5;110m',
  amber: '\x1b[38;5;179m',
  red: '\x1b[38;5;203m',
  slate: '\x1b[38;5;245m',
  cyan: '\x1b[38;5;117m',
};

// Spinner frames for smooth animation (braille style)
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class ProgressBar {
  constructor({ total = 100, width = 30, title = 'Progreso', showSpinner = true, barStyle = 'blocks' } = {}) {
    this.total = total;
    this.width = width;
    this.title = title;
    this.current = 0;
    this.packageName = '';
    this.startTime = Date.now();
    this.lastRender = 0;
    this.showSpinner = showSpinner;
    this.barStyle = barStyle; // 'blocks', 'classic', 'arrows'
    this.spinnerIndex = 0;
    this.frame = 0;
  }

  update(current, packageName = '') {
    this.current = current;
    if (packageName) this.packageName = packageName;
    this.render();
  }

  increment(amount = 1, packageName = '') {
    this.current += amount;
    if (packageName) this.packageName = packageName;
    this.render();
  }

  setPackage(name) {
    this.packageName = name;
    this.render();
  }

  render(force = false) {
    const now = Date.now();
    if (!force && now - this.lastRender < 80) return; // ~12fps for smoother animation
    this.lastRender = now;
    this.frame++;

    if (!process.stdout.isTTY) return;

    const percent = Math.min(100, Math.round((this.current / this.total) * 100));
    const filledCount = Math.round((this.width * percent) / 100);
    const emptyCount = this.width - filledCount;

    // Animated spinner
    let spinner = '';
    if (this.showSpinner) {
      this.spinnerIndex = Math.floor(this.frame / 2) % SPINNER_FRAMES.length;
      spinner = `${ANSI.cyan}${SPINNER_FRAMES[this.spinnerIndex]}${ANSI.reset} `;
    }

    // Choose bar style
    let filledChar = '█';
    let emptyChar = '░';
    let barColor = ANSI.mint;

    if (this.barStyle === 'classic') {
      filledChar = '#';
      emptyChar = ' ';
      barColor = ANSI.mint;
    } else if (this.barStyle === 'arrows') {
      filledChar = '▶';
      emptyChar = '▷';
      barColor = ANSI.amber;
    }

    const bar = [
      barColor,
      filledChar.repeat(filledCount),
      ANSI.slate,
      emptyChar.repeat(emptyCount),
      ANSI.reset,
    ].join('');

    const elapsed = Math.round((now - this.startTime) / 1000);
    const timeStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
    
    const pkgLabel = this.packageName ? ` ${ANSI.bold}${this.packageName}${ANSI.reset}` : '';
    const statusLine = `${spinner}${ANSI.steel}${this.title}${ANSI.reset} [${bar}] ${percent}% | ${timeStr}${pkgLabel}`;

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(statusLine);
  }

  finish() {
    this.render(true);
    // Small completion animation
    if (process.stdout.isTTY) {
      process.stdout.write(` ${ANSI.mint}✓${ANSI.reset}`);
    }
    process.stdout.write('\n');
  }
}

export function createInstallationSummary(results) {
  const successful = results.filter(r => r.status === 'ok');
  const failed = results.filter(r => r.status === 'error');

  console.log('');
  console.log(`${ANSI.bold}Resumen de Instalacion${ANSI.reset}`);
  console.log(`${ANSI.slate}──────────────────────────────────────${ANSI.reset}`);

  if (successful.length > 0) {
    console.log(`${ANSI.mint}✓ Completados:${ANSI.reset}`);
    successful.forEach(r => console.log(`  - ${r.name} (${r.elapsed}s)`));
  }

  if (failed.length > 0) {
    console.log(`${ANSI.red}✗ Fallidos:${ANSI.reset}`);
    failed.forEach(r => console.log(`  - ${r.name}: ${r.error || 'error desconocido'}`));
  }

  console.log(`${ANSI.slate}──────────────────────────────────────${ANSI.reset}`);
  console.log(`Total: ${results.length} | Exitos: ${successful.length} | Fallos: ${failed.length}`);
  console.log('');
}
