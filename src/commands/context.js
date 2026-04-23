import {
  buildProjectStackProfile,
  detectProjectContext,
  formatProjectContext,
  formatPromptContext,
  formatPromptProjectRoot,
  formatPromptProjectPath,
  formatProjectContextDetails,
} from '../utils/project-context.js';
import {
  getRecentContexts,
  listFavoritePaths,
  recordContextVisit,
  removeFavoritePath,
  saveFavoritePath,
} from '../core/config.js';
import { printBanner, printKeyValueRows, printList, printSection } from '../ui/output.js';

export async function runContextCommand(options = {}) {
  if (options.contextAction === 'list-favorites') {
    await printFavoritePaths(options.outputFormat);
    return;
  }

  if (options.contextAction === 'remove-favorite') {
    if (!options.favoriteName) {
      throw new Error('Debes indicar el nombre del favorito a eliminar.');
    }
    await removeFavoritePath(options.favoriteName);
    console.log(`Favorito eliminado: ${options.favoriteName}`);
    return;
  }

  const context = await detectProjectContext();

  if (!context) {
    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({ found: false }, null, 2));
      return;
    }

    if (!options.prompt && !options.projectRoot && !options.projectPath) {
      console.log('No detecte un proyecto compatible en esta carpeta.');
      console.log('Prueba entrando a un proyecto Python, Node, PHP, Rust, Go, Java o Ruby.');
    }
    return;
  }

  await recordContextVisit(context);
  const profile = buildProjectStackProfile(context);
  const recents = await getRecentContexts();

  if (options.contextAction === 'save-favorite') {
    const favoriteName = options.favoriteName || context.projectRoot?.split('/').pop() || context.type;
    await saveFavoritePath(favoriteName, context.projectRoot || context.cwd, {
      type: context.type,
      label: context.label,
      version: context.version || '',
    });

    if (options.outputFormat === 'json') {
      console.log(JSON.stringify({
        ok: true,
        action: 'save-favorite',
        name: favoriteName,
        path: context.projectRoot || context.cwd,
      }, null, 2));
      return;
    }

    console.log(`Favorito guardado: ${favoriteName}`);
    console.log(`Ruta             : ${context.projectRoot || context.cwd}`);
    return;
  }

  if (options.outputFormat === 'json' && !options.prompt && !options.projectRoot && !options.projectPath) {
    console.log(JSON.stringify({
      found: true,
      ...context,
      prompt: formatPromptContext(context),
      details: formatProjectContextDetails(context).split('\n'),
      profile,
      recentContexts: recents,
    }, null, 2));
    return;
  }

  if (options.projectRoot) {
    const rootName = formatPromptProjectRoot(context);
    if (rootName) {
      process.stdout.write(rootName);
    }
    return;
  }

  if (options.projectPath) {
    const projectPath = formatPromptProjectPath(context);
    if (projectPath) {
      process.stdout.write(projectPath);
    }
    return;
  }

  if (options.prompt) {
    const line = formatPromptContext(context);
    if (line) {
      process.stdout.write(line);
    }
    return;
  }

  printBanner('Xzp Context', [
    'Contexto activo del proyecto detectado desde la ruta actual.',
  ]);
  console.log(formatProjectContext(context));
  console.log('');
  console.log(formatProjectContextDetails(context));

  if (options.contextProfile) {
    printSection('Perfil');
    printList(profile.summary);
    printSection('Siguientes pasos');
    printList(profile.nextSteps);
  }

  if (recents.length > 1) {
    printSection('Recientes');
    printKeyValueRows(recents.slice(0, 4).map((entry, index) => [
      `#${index + 1}`,
      `${entry.label || entry.type} ${entry.projectRoot}`,
    ]));
  }
}

async function printFavoritePaths(outputFormat = 'text') {
  const favorites = await listFavoritePaths();

  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      total: favorites.length,
      favorites,
    }, null, 2));
    return;
  }

  printBanner('Xzp Favorites', [
    'Rutas rapidas persistentes guardadas desde el contexto del proyecto.',
  ]);

  if (!favorites.length) {
    console.log('No hay favoritos guardados.');
    return;
  }

  printKeyValueRows(favorites.map((favorite, index) => [
    `#${index + 1} ${favorite.name}`,
    favorite.path,
  ]));
}
