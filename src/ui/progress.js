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
};

export class ProgressBar {
  constructor({ total = 100, width = 30, title = 'Progreso' } = {}) {
    this.total = total;
    this.width = width;
    this.title = title;
    this.current = 0;
    this.packageName = '';
    this.startTime = Date.now();
    this.lastRender = 0;
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
    if (!force && now - this.lastRender < 100) return; // Limit to 10fps
    this.lastRender = now;

    if (!process.stdout.isTTY) return;

    const percent = Math.min(100, Math.round((this.current / this.total) * 100));
    const filledCount = Math.round((this.width * percent) / 100);
    const emptyCount = this.width - filledCount;

    const bar = [
      ANSI.mint,
      '#'.repeat(filledCount),
      ANSI.slate,
      ' '.repeat(emptyCount),
      ANSI.reset,
    ].join('');

    const elapsed = Math.round((now - this.startTime) / 1000);
    const timeStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`;
    
    const pkgLabel = this.packageName ? ` ${ANSI.bold}${this.packageName}${ANSI.reset}` : '';
    const statusLine = `${ANSI.steel}${this.title}${ANSI.reset} [${bar}] ${percent}% | ${timeStr}${pkgLabel}`;

    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
    process.stdout.write(statusLine);
  }

  finish() {
    this.render(true);
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
