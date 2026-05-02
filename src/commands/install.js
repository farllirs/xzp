import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  clearProjectState,
  getInstallReport,
  getUserConfigPath,
  loadUserConfig,
  saveInstallReport,
  saveProjectState,
} from '../core/config.js';
import { printSection } from '../ui/output.js';
import { ProgressBar, createInstallationSummary } from '../ui/progress.js';
import { detectProjectContext } from '../utils/project-context.js';
import { isAndroidStoragePath, resolvePlatformMode, shouldRestrictProjectToAndroidStorage } from '../utils/platform.js';
import { sanitizePathForLogs } from '../utils/security.js';

const RUNTIME_CANDIDATES = {
  python: [
    'python3',
    'python',
    '/data/data/com.termux/files/usr/bin/python3',
    '/data/data/com.termux/files/usr/bin/python',
  ],
  node: ['node', '/data/data/com.termux/files/usr/bin/node'],
  php: ['php', '/data/data/com.termux/files/usr/bin/php'],
  ruby: ['ruby', '/data/data/com.termux/files/usr/bin/ruby'],
  go: ['go', '/data/data/com.termux/files/usr/bin/go'],
  rust: ['rustc', '/data/data/com.termux/files/usr/bin/rustc'],
  java: ['java', '/data/data/com.termux/files/usr/bin/java'],
};

const RUNTIME_PACKAGES = {
  python: ['python'],
  node: ['nodejs'],
  php: ['php'],
  ruby: ['ruby'],
  go: ['golang'],
  rust: ['rust'],
  java: [],
};

const RUNTIME_SMOKE_TESTS = {
  python: ['-c', 'print("xzp-ok")'],
  node: ['-e', 'console.log("xzp-ok")'],
  php: ['-r', 'echo "xzp-ok";'],
  ruby: ['-e', 'puts "xzp-ok"'],
  go: ['version'],
  rust: ['--version'],
  java: ['--version'],
};

const TOOL_CANDIDATES = {
  npm: ['npm', '/data/data/com.termux/files/usr/bin/npm'],
  composer: ['composer', '/data/data/com.termux/files/usr/bin/composer'],
  bundle: ['bundle', '/data/data/com.termux/files/usr/bin/bundle'],
  cargo: ['cargo', '/data/data/com.termux/files/usr/bin/cargo'],
  mvn: ['mvn', '/data/data/com.termux/files/usr/bin/mvn'],
  gradle: ['gradle', '/data/data/com.termux/files/usr/bin/gradle'],
};

const TOOL_SMOKE_TESTS = {
  npm: ['--version'],
  composer: ['--version'],
  bundle: ['--version'],
  cargo: ['--version'],
  mvn: ['--version'],
  gradle: ['--version'],
};

const TOOL_PACKAGES = {
  composer: ['composer'],
  mvn: [],
  gradle: [],
};

const PYTHON_IMPORT_TO_PACKAGE = {
  PIL: 'Pillow',
  cv2: 'opencv-python',
  discord: 'discord.py',
  dotenv: 'python-dotenv',
  flask: 'Flask',
  nextcord: 'nextcord',
  numpy: 'numpy',
  pandas: 'pandas',
  pyrogram: 'pyrogram',
  pytz: 'pytz',
  requests: 'requests',
  telebot: 'pyTelegramBotAPI',
  telegram: 'python-telegram-bot',
  yaml: 'PyYAML',
};

const PYTHON_SYSTEM_PACKAGE_HINTS = {
  Pillow: ['libjpeg-turbo', 'libpng', 'freetype', 'libwebp', 'libtiff'],
};

const PYTHON_STDLIB_MODULES = new Set([
  'abc', 'argparse', 'array', 'asyncio', 'base64', 'calendar', 'collections', 'concurrent', 'contextlib',
  'copy', 'csv', 'dataclasses', 'datetime', 'decimal', 'difflib', 'enum', 'functools', 'glob', 'hashlib',
  'heapq', 'html', 'http', 'importlib', 'inspect', 'io', 'itertools', 'json', 'logging', 'math', 'numbers',
  'operator', 'os', 'pathlib', 'pickle', 'platform', 'queue', 'random', 're', 'secrets', 'shutil', 'signal',
  'socket', 'sqlite3', 'statistics', 'string', 'subprocess', 'sys', 'tempfile', 'threading', 'time',
  'traceback', 'typing', 'unittest', 'urllib', 'uuid', 'warnings', 'weakref', 'xml', 'zipfile',
]);

export async function runInstallCommand() {
  const config = await loadUserConfig();

  if (!config.features.smartProjectInstall) {
    throw new Error(
      `La instalacion segura de proyectos esta desactivada. Activa features.smartProjectInstall en ${getUserConfigPath()}`,
    );
  }

  const projectContext = await detectProjectContext();
  const platformMode = resolvePlatformMode(config);
  if (!projectContext) {
    throw new Error('No pude detectar el lenguaje del proyecto actual. Entra al root del proyecto o a una subcarpeta que pertenezca a uno.');
  }

  const currentDir = process.cwd();
  const projectRoot = projectContext.projectRoot || currentDir;
  const projectKey = getProjectKey(projectRoot);
  const storedProjectState = config.projects?.[projectKey] || null;
  const previousInstallReport = await getInstallReport(projectKey);
  const installMode = await detectInstallMode(projectContext.type, projectRoot);
  const runtime = await ensureRuntimeAvailable(projectContext.type, platformMode);
  const preflight = await runInstallPreflight(projectContext.type, projectRoot, installMode);

  if (!runtime) {
    throw new Error(platformMode === 'termux'
      ? `No encontre el runtime para ${projectContext.label} en este entorno y tampoco pude instalarlo con pkg.`
      : `No encontre el runtime para ${projectContext.label}. En modo Linux instala el runtime manualmente y luego vuelve a correr xzp -i.`);
  }

  if (!installMode) {
    throw new Error(
      `Detecte ${projectContext.label} en ${projectRoot}, pero no encontre un archivo o patron de instalacion que Xzp sepa usar todavia.`,
    );
  }

  const installCommand = await ensureInstallCommandAvailable(runtime, installMode, platformMode);
  const preferSafeMode = shouldUseSafeMode(projectContext.type, projectRoot, storedProjectState, platformMode);

  printSection('Instalar Proyecto');
  console.log(`Proyecto : ${projectRoot}`);
  if (currentDir !== projectRoot) {
    console.log(`Desde    : ${currentDir}`);
  }
  console.log(`Lenguaje : ${projectContext.label}`);
  console.log(`Modo     : ${installMode.label}`);
  console.log(`Runtime  : ${runtime}`);
  console.log(`Comando  : ${installCommand} ${installMode.args.join(' ')}`);
  console.log(`Perfil   : ${preferSafeMode ? 'modo seguro directo' : 'modo normal primero'}`);
  console.log('Prueba   : runtime verificado por Xzp');
  console.log(`Checks   : ${preflight.summary.join(' | ')}`);

  if (installMode.packages?.length) {
    console.log(`Paquetes : ${installMode.packages.join(', ')}`);
  }

  if (previousInstallReport?.status) {
    console.log(`Previo   : ${previousInstallReport.status} @ ${previousInstallReport.updatedAt || 'sin fecha'}`);
  }

  console.log('');

  if (preferSafeMode) {
    await runSafeInstall({
      projectRoot,
      runtime,
      installCommand,
      installMode,
      projectKey,
      projectContext,
      reason: storedProjectState?.lastFailureReason || 'preferencia guardada',
      platformMode,
    });
    return;
  }

  console.log('Intento 1: instalacion normal dentro del proyecto.');
  console.log('');

  const installResult = await runCommandWithProgress(installCommand, installMode.args, projectRoot, {
    title: 'instalacion normal',
    packages: installMode.packages || [],
    manager: installMode.tool || runtime,
  });

  if (installResult.exitCode === 0) {
    const postCheck = await verifyInstallResult(projectContext.type, projectRoot);
    await clearProjectState(projectKey);
    await saveInstallReport(projectKey, {
      path: projectRoot,
      mode: installMode.label,
      status: postCheck.ok ? 'ok' : 'warning',
      preflight,
      postCheck,
    });
    console.log('Instalacion completada sin entorno extra.');
    printInstallPostCheck(postCheck);
    createInstallationSummary(installResult.results);
    return;
  }

  console.log('Xzp nota: la instalacion normal fallo. Revisando rescate seguro...');
  console.log('');

  if (!supportsSafeMode(projectContext.type)) {
    createInstallationSummary(installResult.results);
    throw new Error(`La instalacion fallo y el rescate automatico aun no existe para ${projectContext.label}.`);
  }

  if (shouldRestrictProjectToAndroidStorage(platformMode) && !isAndroidStoragePath(projectRoot)) {
    createInstallationSummary(installResult.results);
    throw new Error('La instalacion normal fallo y el proyecto no esta en Android storage. En Termux, el rescate automatico solo se aplica a proyectos dentro de /sdcard o /storage/emulated/0.');
  }

  await saveProjectState(projectKey, {
    path: projectRoot,
    language: projectContext.type,
    preferSafeInstall: true,
    lastFailureReason: 'fallo instalacion normal en Android storage',
    installModeLabel: installMode.label,
    packages: installMode.packages || [],
    safeMode: getSafeModeKind(projectContext.type),
    updatedAt: new Date().toISOString(),
  });

  await runSafeInstall({
    projectRoot,
    runtime,
    installCommand,
    installMode,
    projectKey,
    projectContext,
    reason: 'fallo instalacion normal en Android storage',
    platformMode,
    previousResults: installResult.results,
  });
}

async function runSafeInstall({
  projectRoot,
  runtime,
  installCommand,
  installMode,
  projectKey,
  projectContext,
  reason,
  platformMode,
  previousResults = [],
}) {
  if (!supportsSafeMode(projectContext.type)) {
    throw new Error(`El modo seguro directo aun no existe para ${projectContext.label}.`);
  }

  if (shouldRestrictProjectToAndroidStorage(platformMode) && !isAndroidStoragePath(projectRoot)) {
    throw new Error('El modo seguro directo solo existe para proyectos dentro de Android storage.');
  }

  if (projectContext.type === 'python') {
    const venvDir = getRescueVenvPath(projectRoot);
    console.log(`Modo Xzp : entrando directo al entorno seguro (${reason}).`);
    console.log(`Base HOME: ${process.env.HOME || '/data/data/com.termux/files/home'}`);
    console.log(`Entorno  : ${venvDir}`);
    console.log(`Regreso  : ${projectRoot}`);
    console.log('');

    await ensurePythonSystemPackages(installMode, platformMode);
    await ensureRescueVenv(runtime, venvDir);

    const rescuePython = path.join(venvDir, 'bin', 'python');
    const rescueResult = await runCommandWithProgress(rescuePython, installMode.args, projectRoot, {
      title: 'instalacion segura python',
      packages: installMode.packages || [],
      manager: 'python',
    });

    const allResults = [...previousResults, ...rescueResult.results];

    if (rescueResult.exitCode !== 0) {
      await saveProjectState(projectKey, {
        path: projectRoot,
        language: projectContext.type,
        preferSafeInstall: true,
        lastFailureReason: 'fallo tambien en entorno seguro',
        installModeLabel: installMode.label,
        packages: installMode.packages || [],
        safeMode: 'python-venv',
        safeWorkspacePath: venvDir,
        updatedAt: new Date().toISOString(),
      });

      createInstallationSummary(allResults);
      throw new Error('La instalacion tambien fallo dentro del entorno seguro.');
    }

    await saveProjectState(projectKey, {
      path: projectRoot,
      language: projectContext.type,
      preferSafeInstall: true,
      lastFailureReason: '',
      installModeLabel: installMode.label,
      packages: installMode.packages || [],
      safeMode: 'python-venv',
      safeWorkspacePath: venvDir,
      updatedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
    });
    const postCheck = await verifyInstallResult(projectContext.type, projectRoot, {
      workspacePath: venvDir,
      safeMode: true,
    });
    await saveInstallReport(projectKey, {
      path: projectRoot,
      mode: installMode.label,
      status: postCheck.ok ? 'ok' : 'warning',
      safeMode: 'python-venv',
      preflight: await runInstallPreflight(projectContext.type, projectRoot, installMode),
      postCheck,
    });

    console.log('Instalacion completada usando entorno seguro de Xzp.');
    console.log(`Venv     : ${venvDir}`);
    printInstallPostCheck(postCheck);
    createInstallationSummary(allResults);
    return;
  }

  if (projectContext.type === 'node') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectContext.type);
    console.log(`Modo Xzp : entrando directo al entorno seguro (${reason}).`);
    console.log(`Base HOME: ${process.env.HOME || '/data/data/com.termux/files/home'}`);
    console.log(`Seguro   : ${safeProjectDir}`);
    console.log(`Origen   : ${projectRoot}`);
    console.log('');

    await syncProjectToSafeWorkspace(projectRoot, safeProjectDir, projectContext.type);

    const rescueResult = await runCommandWithProgress(installCommand, installMode.args, safeProjectDir, {
      title: 'instalacion segura node',
      packages: installMode.packages || [],
      manager: installMode.tool || 'node',
    });

    const allResults = [...previousResults, ...rescueResult.results];

    if (rescueResult.exitCode !== 0) {
      await saveProjectState(projectKey, {
        path: projectRoot,
        language: projectContext.type,
        preferSafeInstall: true,
        lastFailureReason: 'fallo tambien en entorno seguro',
        installModeLabel: installMode.label,
        packages: installMode.packages || [],
        safeMode: 'node-workspace',
        safeWorkspacePath: safeProjectDir,
        updatedAt: new Date().toISOString(),
      });

      createInstallationSummary(allResults);
      throw new Error('La instalacion tambien fallo dentro del entorno seguro.');
    }

    await saveProjectState(projectKey, {
      path: projectRoot,
      language: projectContext.type,
      preferSafeInstall: true,
      lastFailureReason: '',
      installModeLabel: installMode.label,
      packages: installMode.packages || [],
      safeMode: 'node-workspace',
      safeWorkspacePath: safeProjectDir,
      updatedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
    });
    const postCheck = await verifyInstallResult(projectContext.type, safeProjectDir, {
      workspacePath: safeProjectDir,
      safeMode: true,
    });
    await saveInstallReport(projectKey, {
      path: projectRoot,
      mode: installMode.label,
      status: postCheck.ok ? 'ok' : 'warning',
      safeMode: 'node-workspace',
      preflight: await runInstallPreflight(projectContext.type, projectRoot, installMode),
      postCheck,
    });

    console.log('Instalacion completada usando espacio seguro de Xzp para Node.');
    console.log(`Seguro   : ${safeProjectDir}`);
    printInstallPostCheck(postCheck);
    createInstallationSummary(allResults);
    return;
  }

  if (projectContext.type === 'php') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectContext.type);
    console.log(`Modo Xzp : entrando directo al entorno seguro (${reason}).`);
    console.log(`Base HOME: ${process.env.HOME || '/data/data/com.termux/files/home'}`);
    console.log(`Seguro   : ${safeProjectDir}`);
    console.log(`Origen   : ${projectRoot}`);
    console.log('');

    await syncProjectToSafeWorkspace(projectRoot, safeProjectDir, projectContext.type);

    const rescueResult = await runCommandWithProgress(installCommand, installMode.args, safeProjectDir, {
      title: 'instalacion segura php',
      packages: installMode.packages || [],
      manager: installMode.tool || 'php',
    });

    const allResults = [...previousResults, ...rescueResult.results];

    if (rescueResult.exitCode !== 0) {
      await saveProjectState(projectKey, {
        path: projectRoot,
        language: projectContext.type,
        preferSafeInstall: true,
        lastFailureReason: 'fallo tambien en entorno seguro',
        installModeLabel: installMode.label,
        packages: installMode.packages || [],
        safeMode: 'php-workspace',
        safeWorkspacePath: safeProjectDir,
        updatedAt: new Date().toISOString(),
      });

      createInstallationSummary(allResults);
      throw new Error('La instalacion tambien fallo dentro del entorno seguro.');
    }

    await saveProjectState(projectKey, {
      path: projectRoot,
      language: projectContext.type,
      preferSafeInstall: true,
      lastFailureReason: '',
      installModeLabel: installMode.label,
      packages: installMode.packages || [],
      safeMode: 'php-workspace',
      safeWorkspacePath: safeProjectDir,
      updatedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
    });
    const postCheck = await verifyInstallResult(projectContext.type, safeProjectDir, {
      workspacePath: safeProjectDir,
      safeMode: true,
    });
    await saveInstallReport(projectKey, {
      path: projectRoot,
      mode: installMode.label,
      status: postCheck.ok ? 'ok' : 'warning',
      safeMode: 'php-workspace',
      preflight: await runInstallPreflight(projectContext.type, projectRoot, installMode),
      postCheck,
    });

    console.log('Instalacion completada usando espacio seguro de Xzp para PHP.');
    console.log(`Seguro   : ${safeProjectDir}`);
    printInstallPostCheck(postCheck);
    createInstallationSummary(allResults);
    return;
  }

  if (projectContext.type === 'ruby' || projectContext.type === 'go' || projectContext.type === 'rust' || projectContext.type === 'java') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectContext.type);
    console.log(`Modo Xzp : entrando directo al entorno seguro (${reason}).`);
    console.log(`Base HOME: ${process.env.HOME || '/data/data/com.termux/files/home'}`);
    console.log(`Seguro   : ${safeProjectDir}`);
    console.log(`Origen   : ${projectRoot}`);
    console.log('');

    await syncProjectToSafeWorkspace(projectRoot, safeProjectDir, projectContext.type);

    const rescueResult = await runCommandWithProgress(installCommand, installMode.args, safeProjectDir, {
      title: `instalacion segura ${projectContext.type}`,
      packages: installMode.packages || [],
      manager: installMode.tool || projectContext.type,
    });

    const allResults = [...previousResults, ...rescueResult.results];

    if (rescueResult.exitCode !== 0) {
      await saveProjectState(projectKey, {
        path: projectRoot,
        language: projectContext.type,
        preferSafeInstall: true,
        lastFailureReason: 'fallo tambien en entorno seguro',
        installModeLabel: installMode.label,
        packages: installMode.packages || [],
        safeMode: getSafeModeKind(projectContext.type),
        safeWorkspacePath: safeProjectDir,
        updatedAt: new Date().toISOString(),
      });

      createInstallationSummary(allResults);
      throw new Error('La instalacion tambien fallo dentro del entorno seguro.');
    }

    await saveProjectState(projectKey, {
      path: projectRoot,
      language: projectContext.type,
      preferSafeInstall: true,
      lastFailureReason: '',
      installModeLabel: installMode.label,
      packages: installMode.packages || [],
      safeMode: getSafeModeKind(projectContext.type),
      safeWorkspacePath: safeProjectDir,
      updatedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
    });
    const postCheck = await verifyInstallResult(projectContext.type, safeProjectDir, {
      workspacePath: safeProjectDir,
      safeMode: true,
    });
    await saveInstallReport(projectKey, {
      path: projectRoot,
      mode: installMode.label,
      status: postCheck.ok ? 'ok' : 'warning',
      safeMode: getSafeModeKind(projectContext.type),
      preflight: await runInstallPreflight(projectContext.type, projectRoot, installMode),
      postCheck,
    });

    console.log(`Instalacion completada usando espacio seguro de Xzp para ${projectContext.label}.`);
    console.log(`Seguro   : ${safeProjectDir}`);
    printInstallPostCheck(postCheck);
    createInstallationSummary(allResults);
    return;
  }

  throw new Error(`El modo seguro directo aun no existe para ${projectContext.label}.`);
}

function shouldUseSafeMode(projectType, projectRoot, projectState, platformMode) {
  return Boolean(
    supportsSafeMode(projectType)
      && (!shouldRestrictProjectToAndroidStorage(platformMode) || isAndroidStoragePath(projectRoot))
      && projectState?.preferSafeInstall,
  );
}

function getProjectKey(projectRoot) {
  return createHash('sha1').update(projectRoot).digest('hex');
}

async function runInstallPreflight(projectType, projectRoot, installMode) {
  const checks = [];
  const entries = await fs.readdir(projectRoot, { withFileTypes: true }).catch(() => []);
  const hasGit = entries.some((entry) => entry.name === '.git');
  const hasReadme = entries.some((entry) => entry.name.toLowerCase() === 'readme.md');
  const hasLock = detectLockfile(projectType, entries);

  checks.push(hasReadme ? 'readme:ok' : 'readme:missing');
  checks.push(hasGit ? 'git:ok' : 'git:none');
  checks.push(hasLock ? `lock:${hasLock}` : 'lock:none');
  checks.push(`install:${installMode?.label || 'unknown'}`);

  if (!installMode) {
    throw new Error(`No pude preparar validacion previa para ${sanitizePathForLogs(projectRoot)} porque falta un modo de instalacion.`);
  }

  return {
    ok: true,
    summary: checks,
  };
}

async function verifyInstallResult(projectType, targetRoot, options = {}) {
  const checks = [];
  const findings = [];
  const workspacePath = options.workspacePath || targetRoot;

  if (projectType === 'node') {
    const nodeModules = await pathExists(path.join(workspacePath, 'node_modules'));
    checks.push(['node_modules', nodeModules ? 'ok' : 'missing']);
    if (!nodeModules) {
      findings.push('No vi node_modules despues de la instalacion.');
    }
  }

  if (projectType === 'php') {
    const vendor = await pathExists(path.join(workspacePath, 'vendor'));
    checks.push(['vendor', vendor ? 'ok' : 'missing']);
    if (!vendor) {
      findings.push('No vi vendor despues de la instalacion.');
    }
  }

  if (projectType === 'python') {
    const venvPath = options.safeMode ? workspacePath : path.join(targetRoot, '.venv');
    const venvExists = await pathExists(venvPath);
    checks.push(['python-env', venvExists ? 'ok' : 'not-visible']);
  }

  if (projectType === 'rust') {
    const cargoLock = await pathExists(path.join(targetRoot, 'Cargo.lock'));
    checks.push(['cargo-lock', cargoLock ? 'ok' : 'unchanged']);
  }

  if (projectType === 'go') {
    const goSum = await pathExists(path.join(targetRoot, 'go.sum'));
    checks.push(['go-sum', goSum ? 'ok' : 'unchanged']);
  }

  if (projectType === 'java') {
    const gradleDir = await pathExists(path.join(workspacePath, '.gradle'));
    checks.push(['gradle-cache', gradleDir ? 'ok' : 'not-visible']);
  }

  if (projectType === 'ruby') {
    const gemLock = await pathExists(path.join(targetRoot, 'Gemfile.lock'));
    checks.push(['gem-lock', gemLock ? 'ok' : 'unchanged']);
  }

  return {
    ok: findings.length === 0,
    checks,
    findings,
  };
}

function printInstallPostCheck(postCheck) {
  if (!postCheck) {
    return;
  }

  console.log('');
  console.log('Post-check');
  for (const [label, status] of postCheck.checks || []) {
    console.log(`${label.padEnd(12, ' ')} : ${status}`);
  }

  if (postCheck.findings?.length) {
    console.log('Alertas      : ' + postCheck.findings.join(' | '));
  }
}

async function detectInstallMode(projectType, projectRoot) {
  if (projectType === 'node') {
    const packageLockPath = path.join(projectRoot, 'package-lock.json');
    if (await pathExists(packageLockPath)) {
      return {
        label: 'package-lock.json',
        commandType: 'tool',
        tool: 'npm',
        args: ['ci'],
      };
    }

    const shrinkwrapPath = path.join(projectRoot, 'npm-shrinkwrap.json');
    if (await pathExists(shrinkwrapPath)) {
      return {
        label: 'npm-shrinkwrap.json',
        commandType: 'tool',
        tool: 'npm',
        args: ['ci'],
      };
    }

    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await pathExists(packageJsonPath)) {
      return {
        label: 'package.json',
        commandType: 'tool',
        tool: 'npm',
        args: ['install'],
      };
    }
  }

  if (projectType === 'php') {
    const composerLockPath = path.join(projectRoot, 'composer.lock');
    if (await pathExists(composerLockPath)) {
      return {
        label: 'composer.lock',
        commandType: 'tool',
        tool: 'composer',
        args: ['install', '--no-interaction'],
      };
    }

    const composerJsonPath = path.join(projectRoot, 'composer.json');
    if (await pathExists(composerJsonPath)) {
      return {
        label: 'composer.json',
        commandType: 'tool',
        tool: 'composer',
        args: ['install', '--no-interaction'],
      };
    }
  }

  if (projectType === 'ruby') {
    const gemfileLockPath = path.join(projectRoot, 'Gemfile.lock');
    if (await pathExists(gemfileLockPath)) {
      return {
        label: 'Gemfile.lock',
        commandType: 'tool',
        tool: 'bundle',
        args: ['install'],
      };
    }

    const gemfilePath = path.join(projectRoot, 'Gemfile');
    if (await pathExists(gemfilePath)) {
      return {
        label: 'Gemfile',
        commandType: 'tool',
        tool: 'bundle',
        args: ['install'],
      };
    }
  }

  if (projectType === 'go') {
    const goModPath = path.join(projectRoot, 'go.mod');
    if (await pathExists(goModPath)) {
      return {
        label: 'go.mod',
        commandType: 'runtime',
        args: ['mod', 'download'],
      };
    }
  }

  if (projectType === 'rust') {
    const cargoLockPath = path.join(projectRoot, 'Cargo.lock');
    if (await pathExists(cargoLockPath)) {
      return {
        label: 'Cargo.lock',
        commandType: 'tool',
        tool: 'cargo',
        args: ['fetch'],
      };
    }

    const cargoTomlPath = path.join(projectRoot, 'Cargo.toml');
    if (await pathExists(cargoTomlPath)) {
      return {
        label: 'Cargo.toml',
        commandType: 'tool',
        tool: 'cargo',
        args: ['fetch'],
      };
    }
  }

  if (projectType === 'java') {
    const mavenWrapper = await findJavaWrapper(projectRoot, ['mvnw']);
    const gradleWrapper = await findJavaWrapper(projectRoot, ['gradlew']);
    const pomPath = path.join(projectRoot, 'pom.xml');
    const gradlePath = path.join(projectRoot, 'build.gradle');
    const gradleKtsPath = path.join(projectRoot, 'build.gradle.kts');

    if (mavenWrapper && await pathExists(pomPath)) {
      return {
        label: path.basename(mavenWrapper),
        commandType: 'local-script',
        script: mavenWrapper,
        args: ['dependency:go-offline'],
      };
    }

    if (await pathExists(pomPath)) {
      return {
        label: 'pom.xml',
        commandType: 'tool',
        tool: 'mvn',
        args: ['dependency:go-offline'],
      };
    }

    if (gradleWrapper && (await pathExists(gradlePath) || await pathExists(gradleKtsPath))) {
      return {
        label: path.basename(gradleWrapper),
        commandType: 'local-script',
        script: gradleWrapper,
        args: ['dependencies'],
      };
    }

    if (await pathExists(gradlePath) || await pathExists(gradleKtsPath)) {
      return {
        label: (await pathExists(gradleKtsPath)) ? 'build.gradle.kts' : 'build.gradle',
        commandType: 'tool',
        tool: 'gradle',
        args: ['dependencies'],
      };
    }
  }

  if (projectType !== 'python') {
    return null;
  }

  const requirementsPath = path.join(projectRoot, 'requirements.txt');
  if (await pathExists(requirementsPath)) {
    return {
      label: 'requirements.txt',
      commandType: 'runtime',
      args: ['-m', 'pip', 'install', '-r', 'requirements.txt'],
    };
  }

  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  if (await pathExists(pyprojectPath)) {
    return {
      label: 'pyproject.toml',
      commandType: 'runtime',
      args: ['-m', 'pip', 'install', '.'],
    };
  }

  const setupPath = path.join(projectRoot, 'setup.py');
  if (await pathExists(setupPath)) {
    return {
      label: 'setup.py',
      commandType: 'runtime',
      args: ['-m', 'pip', 'install', '.'],
    };
  }

  const inferredPackages = await inferPythonPackagesFromImports(projectRoot);
  if (inferredPackages.length) {
    return {
      label: 'imports detectados del proyecto',
      commandType: 'runtime',
      args: ['-m', 'pip', 'install', ...inferredPackages],
      packages: inferredPackages,
    };
  }

  return null;
}

async function ensureInstallCommandAvailable(runtime, installMode, platformMode) {
  if (installMode.commandType === 'runtime') {
    return runtime;
  }

  if (installMode.commandType === 'local-script' && installMode.script) {
    return installMode.script;
  }

  if (installMode.commandType === 'tool' && installMode.tool) {
    const tool = await ensureToolAvailable(installMode.tool, platformMode);
    if (tool) {
      return tool;
    }

    throw new Error(platformMode === 'termux'
      ? `No encontre la herramienta ${installMode.tool} para completar la instalacion segura.`
      : `No encontre la herramienta ${installMode.tool}. En modo Linux instalala manualmente y vuelve a correr xzp -i.`);
  }

  throw new Error('Xzp no pudo resolver el comando de instalacion para este proyecto.');
}

async function inferPythonPackagesFromImports(projectRoot) {
  const files = await collectPythonFiles(projectRoot);
  const localModules = await collectLocalPythonModules(projectRoot);
  const packages = new Set();

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, 'utf8').catch(() => '');
    const modules = extractPythonImports(raw);

    for (const moduleName of modules) {
      if (PYTHON_STDLIB_MODULES.has(moduleName)) {
        continue;
      }

      if (localModules.has(moduleName)) {
        continue;
      }

      const packageName = PYTHON_IMPORT_TO_PACKAGE[moduleName];
      if (packageName) {
        packages.add(packageName);
      }
    }
  }

  return [...packages].sort();
}

async function collectPythonFiles(rootDir) {
  const found = [];
  await walkPythonTree(rootDir, found);
  return found;
}

async function walkPythonTree(currentDir, found) {
  let entries = [];

  try {
    entries = await fs.readdir(currentDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.name === '__pycache__' || entry.name === '.git' || entry.name === '.venv' || entry.name === 'venv') {
      continue;
    }

    const fullPath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      await walkPythonTree(fullPath, found);
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.py')) {
      found.push(fullPath);
    }
  }
}

async function collectLocalPythonModules(projectRoot) {
  const names = new Set();
  let entries = [];

  try {
    entries = await fs.readdir(projectRoot, { withFileTypes: true });
  } catch {
    return names;
  }

  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.py')) {
      names.add(path.basename(entry.name, '.py'));
      continue;
    }

    if (entry.isDirectory()) {
      names.add(entry.name);
    }
  }

  return names;
}

function extractPythonImports(source) {
  const modules = new Set();
  const lines = source.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    let match = trimmed.match(/^import\s+(.+)$/);
    if (match) {
      const parts = match[1].split(',');
      for (const part of parts) {
        const topLevel = part.trim().split(/\s+as\s+/)[0].split('.')[0].trim();
        if (topLevel) {
          modules.add(topLevel);
        }
      }
      continue;
    }

    match = trimmed.match(/^from\s+([A-Za-z_][\w.]*)\s+import\s+/);
    if (match) {
      const topLevel = match[1].split('.')[0].trim();
      if (topLevel) {
        modules.add(topLevel);
      }
    }
  }

  return modules;
}

async function ensureRuntimeAvailable(projectType, platformMode) {
  const runtime = await findRuntimeExecutable(projectType);
  if (runtime) {
    return runtime;
  }

  if (platformMode !== 'termux') {
    return '';
  }

  const installed = await installRuntimeWithPkg(projectType);
  if (!installed) {
    return '';
  }

  return findRuntimeExecutable(projectType);
}

async function findRuntimeExecutable(projectType) {
  const candidates = RUNTIME_CANDIDATES[projectType] || [];
  const smokeArgs = RUNTIME_SMOKE_TESTS[projectType] || ['--version'];

  for (const candidate of candidates) {
    const ok = await canRun(candidate, smokeArgs);
    if (ok) {
      return candidate;
    }
  }

  return '';
}

async function findToolExecutable(toolName) {
  const candidates = TOOL_CANDIDATES[toolName] || [];
  const smokeArgs = TOOL_SMOKE_TESTS[toolName] || ['--version'];

  for (const candidate of candidates) {
    const ok = await canRun(candidate, smokeArgs);
    if (ok) {
      return candidate;
    }
  }

  return '';
}

async function ensureToolAvailable(toolName, platformMode) {
  const tool = await findToolExecutable(toolName);
  if (tool) {
    return tool;
  }

  if (platformMode !== 'termux') {
    return '';
  }

  const installed = await installToolWithPkg(toolName);
  if (!installed) {
    return '';
  }

  return findToolExecutable(toolName);
}

async function installToolWithPkg(toolName) {
  const packages = TOOL_PACKAGES[toolName] || [];

  if (!packages.length) {
    return false;
  }

  console.log(`Herramienta faltante: ${toolName}. Intentando instalar con pkg...`);
  console.log(`Paquetes : ${packages.join(', ')}`);
  console.log('');

  return installPackagesWithPkg(packages, toolName);
}

async function installRuntimeWithPkg(projectType) {
  const packages = RUNTIME_PACKAGES[projectType] || [];

  if (!packages.length) {
    return false;
  }

  console.log(`Runtime faltante para ${projectType}. Intentando instalar con pkg...`);
  console.log(`Paquetes : ${packages.join(', ')}`);
  console.log('');

  return installPackagesWithPkg(packages, projectType);
}

function throwPkgInstallError(projectType, output) {
  const normalized = output.toLowerCase();

  if (normalized.includes('no mirror or mirror group selected') || normalized.includes('termux-change-repo')) {
    throw new Error(
      `No pude instalar ${projectType} porque Termux no tiene mirrors configurados. Ejecuta termux-change-repo, luego pkg update, y despues vuelve a correr xzp -i.`,
    );
  }

  if (normalized.includes('temporary failure resolving') || normalized.includes('failed to fetch') || normalized.includes('could not resolve')) {
    throw new Error(
      `No pude instalar ${projectType} con pkg por un problema de red o repositorios. Revisa tu conexion, corre pkg update y vuelve a intentar.`,
    );
  }

  if (normalized.includes('permission denied')) {
    throw new Error(
      `pkg no pudo instalar ${projectType} por permisos insuficientes o entorno bloqueado. Revisa Termux y vuelve a intentarlo.`,
    );
  }

  throw new Error(`No pude instalar ${projectType} con pkg. Revisa la salida anterior para ver el motivo exacto.`);
}

async function ensurePythonSystemPackages(installMode, platformMode) {
  if (platformMode !== 'termux') {
    return;
  }

  const packages = gatherSystemPackagesForPythonInstall(installMode);
  if (!packages.length) {
    return;
  }

  console.log('Xzp nota: preparando paquetes nativos de Termux para este proyecto.');
  console.log(`Sistema  : ${packages.join(', ')}`);
  console.log('');

  await installPackagesWithPkg(packages, 'dependencias nativas de Python');
}

function gatherSystemPackagesForPythonInstall(installMode) {
  const packages = new Set();
  const projectPackages = installMode.packages || [];

  for (const packageName of projectPackages) {
    const hintedPackages = PYTHON_SYSTEM_PACKAGE_HINTS[packageName] || [];
    for (const hintedPackage of hintedPackages) {
      packages.add(hintedPackage);
    }
  }

  return [...packages];
}

async function installPackagesWithPkg(packages, label) {
  const pkgBinary = await findPkgBinary();

  if (!pkgBinary || !packages.length) {
    return false;
  }

  const result = await runCommandCapture(
    pkgBinary,
    ['install', '-y', ...packages],
    process.env.HOME || '/data/data/com.termux/files/home',
  );

  if (result.stdout.trim()) {
    process.stdout.write(result.stdout);
    if (!result.stdout.endsWith('\n')) {
      process.stdout.write('\n');
    }
  }

  if (result.stderr.trim()) {
    process.stderr.write(result.stderr);
    if (!result.stderr.endsWith('\n')) {
      process.stderr.write('\n');
    }
  }

  if (result.exitCode === 0) {
    return true;
  }

  throwPkgInstallError(label, result.output);
  return false;
}

async function findPkgBinary() {
  const candidates = ['pkg', '/data/data/com.termux/files/usr/bin/pkg'];

  for (const candidate of candidates) {
    if (candidate.includes('/')) {
      if (await pathExists(candidate)) {
        return candidate;
      }

      continue;
    }

    const ok = await canRun(candidate, ['help']);
    if (ok) {
      return candidate;
    }
  }

  return '';
}

async function ensureRescueVenv(basePython, venvDir) {
  const rescuePython = path.join(venvDir, 'bin', 'python');
  if (await pathExists(rescuePython)) {
    return;
  }

  await fs.mkdir(path.dirname(venvDir), { recursive: true });

  let exitCode = await runCommandWithProgress(
    basePython,
    ['-m', 'venv', venvDir],
    process.env.HOME || '/data/data/com.termux/files/home',
    {
      title: 'creando entorno virtual',
      packages: ['venv'],
      manager: 'python',
    },
  );

  if (exitCode === 0 && (await pathExists(rescuePython))) {
    return;
  }

  console.log('Xzp nota: el soporte de entorno virtual no estaba listo. Intentando prepararlo...');
  console.log('');

  await ensureVirtualenvSupport(basePython);

  exitCode = await runCommandWithProgress(
    basePython,
    ['-m', 'virtualenv', venvDir],
    process.env.HOME || '/data/data/com.termux/files/home',
    {
      title: 'creando virtualenv',
      packages: ['virtualenv'],
      manager: 'python',
    },
  );

  if (exitCode !== 0 || !(await pathExists(rescuePython))) {
    throw new Error('No pude crear el entorno seguro en HOME ni preparando virtualenv automaticamente.');
  }
}

async function ensureVirtualenvSupport(basePython) {
  const home = process.env.HOME || '/data/data/com.termux/files/home';

  await runCommand(basePython, ['-m', 'ensurepip', '--upgrade'], home).catch(() => 1);

  const pipCandidates = [
    ['-m', 'pip', '--version'],
    ['-m', 'pip3', '--version'],
  ];

  let pipReady = false;
  for (const args of pipCandidates) {
    if (await canRun(basePython, args)) {
      pipReady = true;
      break;
    }
  }

  if (!pipReady) {
    throw new Error('No pude preparar pip para crear el entorno seguro.');
  }

  const installExitCode = await runCommandWithProgress(
    basePython,
    ['-m', 'pip', 'install', '--upgrade', 'pip', 'virtualenv'],
    home,
    {
      title: 'preparando pip y virtualenv',
      packages: ['pip', 'virtualenv'],
      manager: 'pip',
    },
  );

  if (installExitCode !== 0) {
    throw new Error('No pude instalar virtualenv para preparar el entorno seguro.');
  }
}

function getRescueVenvPath(projectRoot) {
  const home = process.env.HOME || '/data/data/com.termux/files/home';
  const digest = createHash('sha1').update(projectRoot).digest('hex').slice(0, 8);
  const baseName = path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const safeName = baseName || 'project';
  return path.join(home, '.xzp', 'venvs', `${safeName}-${digest}`);
}

function getSafeProjectWorkspacePath(projectRoot, projectType) {
  const home = process.env.HOME || '/data/data/com.termux/files/home';
  const digest = createHash('sha1').update(projectRoot).digest('hex').slice(0, 8);
  const baseName = path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const safeName = baseName || projectType || 'project';
  const safeKind = projectType || 'project';
  return path.join(home, '.xzp', 'projects', safeKind, `${safeName}-${digest}`);
}

async function syncProjectToSafeWorkspace(projectRoot, safeProjectDir, projectType) {
  await fs.mkdir(safeProjectDir, { recursive: true });
  await resetDirectoryContents(safeProjectDir);
  await copyDirectoryRecursive(projectRoot, safeProjectDir);
  await writeSafeWorkspaceMeta(safeProjectDir, projectRoot, projectType);
}

async function resetDirectoryContents(targetDir) {
  let entries = [];

  try {
    entries = await fs.readdir(targetDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    await fs.rm(path.join(targetDir, entry.name), { recursive: true, force: true });
  }
}

async function writeSafeWorkspaceMeta(safeProjectDir, projectRoot, projectType) {
  const metadataPath = path.join(safeProjectDir, '.xzp-workspace.json');
  const metadata = {
    projectRoot,
    projectType,
    generatedAt: new Date().toISOString(),
  };

  await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}
`, 'utf8');
}

async function copyDirectoryRecursive(sourceDir, targetDir) {
  let entries = [];

  try {
    entries = await fs.readdir(sourceDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (shouldSkipSafeCopy(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await fs.mkdir(targetPath, { recursive: true });
      await copyDirectoryRecursive(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

function shouldSkipSafeCopy(name) {
  return name === '.git'
    || name === '.gradle'
    || name === '.idea'
    || name === '.vscode'
    || name === '.mypy_cache'
    || name === '.pytest_cache'
    || name === '.ruff_cache'
    || name === '.venv'
    || name === 'venv'
    || name === '__pycache__'
    || name === 'node_modules'
    || name === 'vendor'
    || name === 'target'
    || name === 'dist'
    || name === 'build'
    || name === 'bin';
}

function detectLockfile(projectType, entries = []) {
  const names = new Set(entries.map((entry) => entry.name));

  if (projectType === 'node') {
    if (names.has('package-lock.json')) {
      return 'package-lock.json';
    }
    if (names.has('pnpm-lock.yaml')) {
      return 'pnpm-lock.yaml';
    }
    if (names.has('yarn.lock')) {
      return 'yarn.lock';
    }
  }

  if (projectType === 'php' && names.has('composer.lock')) {
    return 'composer.lock';
  }

  if (projectType === 'ruby' && names.has('Gemfile.lock')) {
    return 'Gemfile.lock';
  }

  if (projectType === 'rust' && names.has('Cargo.lock')) {
    return 'Cargo.lock';
  }

  if (projectType === 'go' && names.has('go.sum')) {
    return 'go.sum';
  }

  return '';
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}


async function findJavaWrapper(projectRoot, names) {
  for (const name of names) {
    const targetPath = path.join(projectRoot, name);
    if (await pathExists(targetPath)) {
      return targetPath;
    }
  }

  return '';
}

function supportsSafeMode(projectType) {
  return projectType === 'python' || projectType === 'node' || projectType === 'php' || projectType === 'ruby' || projectType === 'go' || projectType === 'rust' || projectType === 'java';
}

function getSafeModeKind(projectType) {
  if (projectType === 'python') {
    return 'python-venv';
  }

  if (projectType === 'node') {
    return 'node-workspace';
  }

  if (projectType === 'php') {
    return 'php-workspace';
  }

  if (projectType === 'ruby') {
    return 'ruby-workspace';
  }

  if (projectType === 'go') {
    return 'go-workspace';
  }

  if (projectType === 'rust') {
    return 'rust-workspace';
  }

  if (projectType === 'java') {
    return 'java-workspace';
  }

  return '';
}

function runCommand(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: process.env,
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`El comando termino por senal: ${signal}`));
        return;
      }

      resolve(code || 0);
    });
  });
}

async function runCommandWithProgress(command, args, cwd, options = {}) {
  const startedAt = Date.now();
  const expectedPackages = options.packages || inferPackagesFromArgs(args);
  const bar = new ProgressBar({
    total: expectedPackages.length || 1,
    title: options.title || 'Instalando',
  });

  let discoveredPackage = '';
  let hadErrorLine = '';
  let lastLine = '';
  const results = [];

  const child = spawn(command, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });

  return new Promise((resolve) => {
    const onChunk = (chunk, isError = false) => {
      const text = String(chunk || '');
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      for (const line of lines) {
        lastLine = line;
        const detected = detectProgressPackage(line, expectedPackages);
        if (detected) {
          if (discoveredPackage && detected !== discoveredPackage) {
            results.push({ name: discoveredPackage, status: 'ok', elapsed: Math.round((Date.now() - startedAt) / 1000) });
            bar.increment();
          }
          discoveredPackage = detected;
          bar.setPackage(detected);
        }
        if (isError || /\berror\b|\bfailed\b|\bnot found\b/i.test(line)) {
          hadErrorLine = line;
        }
      }
    };

    child.stdout.on('data', (chunk) => onChunk(chunk, false));
    child.stderr.on('data', (chunk) => onChunk(chunk, true));

    child.on('error', (error) => {
      bar.finish();
      resolve({
        exitCode: 1,
        status: 'error',
        error: error.message,
        name: options.title || 'comando',
        results,
      });
    });

    child.on('exit', (code) => {
      bar.finish();
      const elapsed = Math.round((Date.now() - startedAt) / 1000);
      
      if (discoveredPackage) {
        results.push({
          name: discoveredPackage,
          status: code === 0 ? 'ok' : 'error',
          error: code === 0 ? '' : (hadErrorLine || lastLine),
          elapsed,
        });
      } else if (expectedPackages.length === 0) {
        results.push({
          name: options.title || 'proceso',
          status: code === 0 ? 'ok' : 'error',
          error: code === 0 ? '' : (hadErrorLine || lastLine),
          elapsed,
        });
      }

      resolve({
        exitCode: code || 0,
        status: code === 0 ? 'ok' : 'error',
        name: options.title || 'comando',
        results,
      });
    });
  });
}

function runCommandCapture(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error(`El comando termino por senal: ${signal}`));
        return;
      }

      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
        output: `${stdout}\n${stderr}`,
      });
    });
  });
}

function canRun(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      stdio: 'ignore',
      env: process.env,
    });

    child.on('error', () => resolve(false));
    child.on('exit', (code) => resolve(code === 0));
  });
}

function inferPackagesFromArgs(args = []) {
  const packages = [];
  for (const token of args || []) {
    if (!token || token.startsWith('-')) {
      continue;
    }
    if (['install', 'ci', 'download', 'fetch', 'dependency:go-offline', '.', 'mod', 'pip', 'venv', 'virtualenv'].includes(token)) {
      continue;
    }
    packages.push(token);
  }
  return packages;
}

function detectProgressPackage(line, expectedPackages = []) {
  const normalizedLine = String(line || '').toLowerCase();
  for (const pkg of expectedPackages) {
    if (normalizedLine.includes(String(pkg).toLowerCase())) {
      return pkg;
    }
  }

  const generic = normalizedLine.match(/\b([a-z0-9_.@/-]{3,})\b/);
  return generic ? generic[1] : '';
}

function truncateLine(line) {
  const clean = String(line || '').replace(/\s+/g, ' ').trim();
  return clean.length > 90 ? clean.slice(0, 87) + '...' : clean;
}

function formatElapsed(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function sanitizeInstallToken(value) {
  return String(value || '').split('/').pop() || 'tool';
}
