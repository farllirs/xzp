import { spawn } from 'node:child_process';
import { ProgressBar } from '../ui/progress.js';
import { readLocalPackage, readLatestPublishedVersion, compareVersions } from './version.js';
import { chooseUpdateAction } from '../ui/prompt.js';

export async function checkAndUpdateSystem(context) {
  if (context.parsed?.command === 'version' || context.parsed?.help) return;
  if (!process.stdout.isTTY) return;

  const localPackage = await readLocalPackage();
  const latest = await readLatestPublishedVersion(localPackage.name);

  if (!latest) return;

  const comparison = compareVersions(localPackage.version, latest.version);
  if (comparison >= 0) return;

  const action = await chooseUpdateAction(localPackage.version, latest.version, context.config?.ui?.locale);

  if (action === 'update') {
    const code = await runGlobalUpdate();
    if (code === 0) {
      process.exit(0);
    }
  } else if (action === 'quit') {
    console.log('Operacion cancelada por el usuario.');
    process.exit(0);
  }
}

export async function runGlobalUpdate() {
  const bar = new ProgressBar({
    total: 1,
    title: 'Actualizando Xzp',
  });

  bar.setPackage('@nyxur/xzp');

  return new Promise((resolve) => {
    const child = spawn('npm', ['install', '-g', '@nyxur/xzp'], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    child.stdout.on('data', () => bar.increment(0.1));
    child.stderr.on('data', () => bar.increment(0.1));

    child.on('exit', (code) => {
      bar.update(1, '@nyxur/xzp');
      bar.finish();
      if (code === 0) {
        console.log('Xzp se actualizo correctamente. Reinicia la terminal para aplicar los cambios.');
      } else {
        console.log('Error al actualizar Xzp. Intenta correr: npm install -g @nyxur/xzp manualmente.');
      }
      resolve(code);
    });
  });
}
