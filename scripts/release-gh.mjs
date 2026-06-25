import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '..', 'package.json'), 'utf8'));
const tag = `v${pkg.version}`;

console.log(`\n📦 Creando GitHub Release: ${tag}\n`);

// Intentar con gh CLI
try {
  execSync(`gh release create "${tag}" --generate-notes --verify`, { stdio: 'inherit' });
  console.log(`\n✅ GitHub Release "${tag}" creado exitosamente`);
  process.exit(0);
} catch (e) {
  if (e.code !== 'ENOENT') {
    console.error(`\n❌ gh CLI falló:`, e.stderr?.toString() || e.message);
    process.exit(1);
  }
}

// Fallback: gh no instalado
console.error(`\n❌ gh CLI no está instalado.`);
console.error(`   Instálalo con:  pkg install gh  (Termux)`);
console.error(`   o descarga desde: https://cli.github.com/`);
console.error(`\n   Luego autentícate:  gh auth login`);
console.error(`   Y ejecuta manualmente:  gh release create "${tag}" --generate-notes`);
process.exit(1);
