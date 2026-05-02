import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import {
  loadUserConfig,
  getSafeShortcut,
  listSafeShortcuts,
  removeSafeShortcut,
  saveSafeShortcut,
} from '../core/config.js';
import { detectProjectContext } from '../utils/project-context.js';
import { createPromptShellSession } from '../utils/prompt-shell.js';
import { resolveInteractiveShell } from '../utils/shell.js';
import { getHomeDirectory, isAndroidStoragePath, resolvePlatformMode, shouldRestrictProjectToAndroidStorage } from '../utils/platform.js';
import { sanitizeTerminalText } from '../utils/security.js';

export async function runSafeShellCommand(parsed = {}) {
  const config = await loadUserConfig();

  if (parsed.safeShortcutAction === 'list') {
    await runSafeShortcutListCommand(parsed.outputFormat);
    return;
  }

  if (parsed.safeShortcutAction === 'remove') {
    await runSafeShortcutRemoveCommand(parsed.safeShortcutName, parsed.outputFormat);
    return;
  }

  if (parsed.safeShortcutAction === 'status') {
    await runSafeStatusCommand(config, parsed);
    return;
  }

  if (!config.features.smartProjectInstall) {
    throw new Error('La instalacion segura de proyectos esta desactivada. Activa esa funcion antes de abrir el modo seguro.');
  }

  if (parsed.safeShortcutAction === 'run') {
    await runSafeShortcutLaunchCommand(parsed.safeShortcutName, config, parsed.safePreset);
    return;
  }

  if (parsed.safeShortcutEntry && parsed.safeShortcutName) {
    await runSafeShortcutSaveCommand(parsed.safeShortcutEntry, parsed.safeShortcutName, config, parsed.safePreset);
    return;
  }

  if (parsed.safeShortcutEntry) {
    const existingShortcut = await getSafeShortcut(parsed.safeShortcutEntry);
    if (existingShortcut) {
      await runSafeShortcutLaunchCommand(existingShortcut.name, config, parsed.safePreset);
      return;
    }

    throw new Error('No existe un acceso seguro con ese nombre. Usa `xzp -r --list-safe-shortcuts` para ver los guardados o `xzp -r <archivo> <nombre>` para crear uno.');
  }

  const currentDir = process.cwd();
  const projectReference = await resolveSafeProjectReference();
  const projectContext = projectReference.context;
  const platformMode = resolvePlatformMode(config);

  if (!projectContext || !supportsSafeMode(projectContext.type)) {
    throw new Error('El modo seguro de Xzp por ahora solo existe para proyectos Python, Node, PHP, Ruby, Go, Rust y Java.');
  }

  const launchPlan = await resolveSafeLaunchPlan({
    projectRoot: projectReference.projectRoot,
    projectType: projectContext.type,
    platformMode,
    preset: parsed.safePreset,
  });
  const interactiveShell = await resolveInteractiveShell(platformMode);
  const shellSession = await createPromptShellSession({
    interactiveShell,
    platformMode,
    label: platformMode === 'termux' ? 'Xzp@android' : 'Xzp@linux',
    promptTheme: config.ui?.promptTheme || 'ocean',
    contextPosition: config.ui?.promptContextPosition || 'right',
  });

  console.log('Modo Xzp : shell segura para ' + path.basename(launchPlan.projectRoot));
  console.log('Proyecto : ' + launchPlan.projectRoot);
  if (currentDir !== launchPlan.projectRoot) {
    console.log('Desde    : ' + currentDir);
  }
  for (const [label, value] of launchPlan.summary) {
    console.log(label.padEnd(9, ' ') + ': ' + value);
  }
  console.log('Shell    : ' + interactiveShell.shellName + ' interactiva');
  console.log('');

  await saveLastSafeSession({
    mode: 'shell',
    projectRoot: launchPlan.projectRoot,
    projectType: projectContext.type,
    preset: parsed.safePreset || 'default',
    cwd: launchPlan.cwd,
    shellName: interactiveShell.shellName,
  });
  await openSafeShell(shellSession, launchPlan.cwd, launchPlan.envPatch);
}

function getProjectKey(projectRoot) {
  return createHash('sha1').update(projectRoot).digest('hex');
}

function getRescueVenvPath(projectRoot) {
  const home = process.env.HOME || '/data/data/com.termux/files/home';
  const digest = createHash('sha1').update(projectRoot).digest('hex').slice(0, 8);
  const baseName = path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const safeName = baseName || 'project';
  return path.join(home, '.xzp', 'venvs', safeName + '-' + digest);
}

function getSafeProjectWorkspacePath(projectRoot, projectType) {
  const home = process.env.HOME || '/data/data/com.termux/files/home';
  const digest = createHash('sha1').update(projectRoot).digest('hex').slice(0, 8);
  const baseName = path.basename(projectRoot).toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const safeName = baseName || projectType || 'project';
  const safeKind = projectType || 'project';
  return path.join(home, '.xzp', 'projects', safeKind, safeName + '-' + digest);
}

function getComposerHome() {
  const home = process.env.HOME || '/data/data/com.termux/files/home';
  return path.join(home, '.xzp', 'composer');
}

async function hasJavaBuildFiles(pomPath, gradlePath, gradleKtsPath) {
  return Boolean(await pathExists(pomPath) || await pathExists(gradlePath) || await pathExists(gradleKtsPath));
}

async function ensureSafeWorkspaceMatchesProject(safeProjectDir, projectRoot, projectType) {
  const metadataPath = path.join(safeProjectDir, '.xzp-workspace.json');
  let metadataRaw = '';

  try {
    metadataRaw = await fs.readFile(metadataPath, 'utf8');
  } catch {
    return;
  }

  try {
    const metadata = JSON.parse(metadataRaw);
    if (metadata.projectRoot && metadata.projectRoot !== projectRoot) {
      throw new Error('workspace-root-mismatch');
    }
    if (metadata.projectType && metadata.projectType !== projectType) {
      throw new Error('workspace-type-mismatch');
    }
  } catch (error) {
    if (error && (error.message === 'workspace-root-mismatch' || error.message === 'workspace-type-mismatch')) {
      throw error;
    }
  }
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function supportsSafeMode(projectType) {
  return projectType === 'python' || projectType === 'node' || projectType === 'php' || projectType === 'ruby' || projectType === 'go' || projectType === 'rust' || projectType === 'java';
}

async function resolveSafeProjectReference() {
  const safeProject = process.env.XZP_SAFE_PROJECT || '';
  const safeRuntime = process.env.XZP_SAFE_RUNTIME || '';

  if (safeProject && safeRuntime && supportsSafeMode(safeRuntime)) {
    const normalizedProjectRoot = await normalizeProjectRootPath(safeProject);
    return {
      projectRoot: normalizedProjectRoot,
      context: {
        cwd: process.cwd(),
        projectRoot: normalizedProjectRoot,
        type: safeRuntime,
        label: safeRuntime.toUpperCase(),
        version: '',
      },
    };
  }

  const detectedContext = await detectProjectContext();
  if (!detectedContext) {
    return {
      projectRoot: '',
      context: null,
    };
  }

  const normalizedProjectRoot = await normalizeProjectRootPath(detectedContext.projectRoot || detectedContext.cwd);
  return {
    projectRoot: normalizedProjectRoot,
    context: detectedContext,
  };
}

async function resolveSafeLaunchPlan({ projectRoot, projectType, platformMode, preset = 'default' }) {
  projectRoot = await normalizeProjectRootPath(projectRoot);

  if (shouldRestrictProjectToAndroidStorage(platformMode) && !isAndroidStoragePath(projectRoot)) {
    throw new Error('El modo seguro de Xzp en Termux por ahora se usa en proyectos Python, Node, PHP, Ruby, Go, Rust o Java dentro de Android storage.');
  }

  const projectKey = getProjectKey(projectRoot);
  const baseEnv = {
    XZP_CONTEXT: 'safe-shell',
    XZP_SAFE_PROJECT: projectRoot,
    XZP_SAFE_PROJECT_KEY: projectKey,
    XZP_SAFE_RUNTIME: projectType,
    ...resolveSafePresetEnv(projectType, preset),
  };

  if (projectType === 'python') {
    const venvDir = getRescueVenvPath(projectRoot);
    const rescuePython = path.join(venvDir, 'bin', 'python');

    try {
      await fs.access(rescuePython);
    } catch {
      throw new Error('No encontre el entorno seguro de este proyecto. Corre xzp -i primero para prepararlo.');
    }

    return {
      projectRoot,
      cwd: projectRoot,
      envPatch: {
        ...baseEnv,
        PATH: path.join(venvDir, 'bin') + ':' + (process.env.PATH || ''),
        VIRTUAL_ENV: venvDir,
        XZP_SAFE_WORKSPACE: projectRoot,
        XZP_SAFE_LABEL: 'PYTHON SAFE',
      },
      summary: [
        ['Preset', preset],
        ['Entorno', venvDir],
        ['Python', rescuePython],
      ],
    };
  }

  if (projectType === 'node') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectType);
    const packageJsonPath = path.join(safeProjectDir, 'package.json');
    const nodeModulesDir = path.join(safeProjectDir, 'node_modules');
    const nodeBinDir = path.join(nodeModulesDir, '.bin');

    try {
      await fs.access(packageJsonPath);
      await fs.access(nodeModulesDir);
      await ensureSafeWorkspaceMatchesProject(safeProjectDir, projectRoot, projectType);
    } catch {
      throw new Error('No encontre un espacio seguro valido para este proyecto Node. Corre xzp -i primero para recrearlo.');
    }

    return {
      projectRoot,
      cwd: safeProjectDir,
      envPatch: {
        ...baseEnv,
        PATH: nodeBinDir + ':' + (process.env.PATH || ''),
        XZP_SAFE_WORKSPACE: safeProjectDir,
        XZP_SAFE_LABEL: 'NODE SAFE',
      },
      summary: [
        ['Preset', preset],
        ['Seguro', safeProjectDir],
        ['Modulos', nodeModulesDir],
      ],
    };
  }

  if (projectType === 'php') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectType);
    const composerJsonPath = path.join(safeProjectDir, 'composer.json');
    const vendorDir = path.join(safeProjectDir, 'vendor');
    const vendorBinDir = path.join(vendorDir, 'bin');
    const composerHome = getComposerHome();

    try {
      await fs.access(composerJsonPath);
      await fs.access(vendorDir);
      await ensureSafeWorkspaceMatchesProject(safeProjectDir, projectRoot, projectType);
    } catch {
      throw new Error('No encontre un espacio seguro valido para este proyecto PHP. Corre xzp -i primero para recrearlo.');
    }

    await fs.mkdir(composerHome, { recursive: true });

    return {
      projectRoot,
      cwd: safeProjectDir,
      envPatch: {
        ...baseEnv,
        PATH: vendorBinDir + ':' + (process.env.PATH || ''),
        COMPOSER_HOME: composerHome,
        XZP_SAFE_WORKSPACE: safeProjectDir,
        XZP_SAFE_LABEL: 'PHP SAFE',
      },
      summary: [
        ['Preset', preset],
        ['Seguro', safeProjectDir],
        ['Vendor', vendorDir],
      ],
    };
  }

  if (projectType === 'ruby' || projectType === 'go' || projectType === 'rust' || projectType === 'java') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectType);

    try {
      await ensureSafeWorkspaceMatchesProject(safeProjectDir, projectRoot, projectType);
      await validateSafeWorkspaceByType(safeProjectDir, projectRoot, projectType);
    } catch {
      throw new Error(`No encontre un espacio seguro valido para este proyecto ${projectType.toUpperCase()}. Corre xzp -i primero para recrearlo.`);
    }

    return {
      projectRoot,
      cwd: safeProjectDir,
      envPatch: {
        ...baseEnv,
        XZP_SAFE_WORKSPACE: safeProjectDir,
        XZP_SAFE_LABEL: projectType.toUpperCase() + ' SAFE',
      },
      summary: [
        ['Preset', preset],
        ['Seguro', safeProjectDir],
      ],
    };
  }

  throw new Error('Xzp todavia no sabe abrir ese tipo de modo seguro.');
}

async function validateSafeWorkspaceByType(safeProjectDir, projectRoot, projectType) {
  if (projectType === 'ruby') {
    await fs.access(path.join(safeProjectDir, 'Gemfile'));
    return;
  }

  if (projectType === 'go') {
    await fs.access(path.join(safeProjectDir, 'go.mod'));
    return;
  }

  if (projectType === 'rust') {
    await fs.access(path.join(safeProjectDir, 'Cargo.toml'));
    return;
  }

  if (projectType === 'java') {
    const pomPath = path.join(safeProjectDir, 'pom.xml');
    const gradlePath = path.join(safeProjectDir, 'build.gradle');
    const gradleKtsPath = path.join(safeProjectDir, 'build.gradle.kts');
    if (!(await hasJavaBuildFiles(pomPath, gradlePath, gradleKtsPath))) {
      throw new Error('missing-java-build-files');
    }
  }
}

async function runSafeShortcutSaveCommand(entryValue, shortcutName, config, preset = 'default') {
  const normalizedName = normalizeSafeShortcutName(shortcutName);
  const cleanEntry = String(entryValue || '').trim();

  if (!cleanEntry) {
    throw new Error('Debes indicar un archivo principal o entrypoint para guardar el acceso seguro.');
  }

  if (!normalizedName) {
    throw new Error('Debes indicar un nombre valido para el acceso seguro.');
  }

  const projectReference = await resolveSafeProjectReference();
  const projectContext = projectReference.context;
  const platformMode = resolvePlatformMode(config);

  if (!projectContext || !supportsSafeMode(projectContext.type)) {
    throw new Error('Solo puedes guardar accesos seguros dentro de proyectos compatibles con el modo seguro.');
  }

  await resolveSafeLaunchPlan({
    projectRoot: projectReference.projectRoot,
    projectType: projectContext.type,
    platformMode,
    preset,
  });

  const execution = resolveSafeShortcutExecution(projectContext.type, cleanEntry);
  const launcherPath = await writeSafeShortcutLauncher(normalizedName, preset);

  await saveSafeShortcut(normalizedName, {
    projectRoot: projectReference.projectRoot,
    projectType: projectContext.type,
    entry: cleanEntry,
    launcherPath,
    execution,
    preset,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log('Xzp guardo un acceso seguro.');
  console.log('Nombre   : ' + normalizedName);
  console.log('Proyecto : ' + projectReference.projectRoot);
  console.log('Tipo     : ' + projectContext.label);
  console.log('Entrada  : ' + cleanEntry);
  console.log('Preset   : ' + preset);
  console.log('Comando  : ' + execution.command + ' ' + execution.args.join(' '));
  console.log('Launcher : ' + launcherPath);
  console.log('');
  console.log('Uso rapido:');
  console.log('  xzp -r ' + normalizedName);
  console.log('  ' + launcherPath);
}

async function runSafeShortcutLaunchCommand(shortcutName, config, overridePreset = 'default') {
  const shortcut = await getSafeShortcut(shortcutName);

  if (!shortcut) {
    throw new Error('No existe un acceso seguro con ese nombre.');
  }

  const preset = overridePreset !== 'default' ? overridePreset : (shortcut.preset || 'default');
  const platformMode = resolvePlatformMode(config);
  const launchPlan = await resolveSafeLaunchPlan({
    projectRoot: shortcut.projectRoot,
    projectType: shortcut.projectType,
    platformMode,
    preset,
  });
  const execution = resolveSafeShortcutExecution(shortcut.projectType, shortcut.entry);

  console.log('Xzp ejecuto acceso seguro.');
  console.log('Nombre   : ' + shortcut.name);
  console.log('Proyecto : ' + shortcut.projectRoot);
  console.log('Entrada  : ' + shortcut.entry);
  console.log('Preset   : ' + preset);
  console.log('Comando  : ' + execution.command + ' ' + execution.args.join(' '));
  console.log('');

  await saveLastSafeSession({
    mode: 'shortcut',
    shortcutName: shortcut.name,
    projectRoot: shortcut.projectRoot,
    projectType: shortcut.projectType,
    preset,
    cwd: launchPlan.cwd,
    command: execution.command,
    args: execution.args,
  });
  await runSafeCommand(execution.command, execution.args, launchPlan.cwd, launchPlan.envPatch);
}

async function runSafeShortcutListCommand(outputFormat = 'text') {
  const shortcuts = await listSafeShortcuts();

  if (!shortcuts.length) {
    if (outputFormat === 'json') {
      console.log(JSON.stringify({ shortcuts: [] }, null, 2));
      return;
    }
    console.log('No tienes accesos seguros guardados.');
    return;
  }

  const normalized = await Promise.all(shortcuts.map(async (shortcut) => ({
    ...shortcut,
    preset: shortcut.preset || 'default',
    launcherExists: shortcut.launcherPath ? await pathExists(shortcut.launcherPath) : false,
  })));

  if (outputFormat === 'json') {
    console.log(JSON.stringify({ shortcuts: normalized }, null, 2));
    return;
  }

  console.log('Accesos seguros guardados:');
  console.log('');
  for (const shortcut of normalized) {
    console.log('- ' + shortcut.name);
    console.log('  Tipo     : ' + shortcut.projectType.toUpperCase());
    console.log('  Proyecto : ' + shortcut.projectRoot);
    console.log('  Entrada  : ' + shortcut.entry);
    console.log('  Preset   : ' + shortcut.preset);
    if (shortcut.launcherPath) {
      console.log('  Launcher : ' + shortcut.launcherPath);
      console.log('  Estado   : ' + (shortcut.launcherExists ? 'listo' : 'faltante'));
    }
    console.log('');
  }
}

async function runSafeShortcutRemoveCommand(shortcutName, outputFormat = 'text') {
  const shortcut = await getSafeShortcut(shortcutName);
  if (!shortcut) {
    throw new Error('No existe un acceso seguro con ese nombre.');
  }

  if (shortcut.launcherPath) {
    await fs.rm(shortcut.launcherPath, { force: true }).catch(() => {});
  }

  await removeSafeShortcut(shortcut.name);

  if (outputFormat === 'json') {
    console.log(JSON.stringify({
      removed: true,
      name: shortcut.name,
      launcherPath: shortcut.launcherPath || '',
    }, null, 2));
    return;
  }

  console.log('Acceso seguro eliminado: ' + shortcut.name);
}

async function runSafeStatusCommand(config, parsed = {}) {
  const projectReference = await resolveSafeProjectReference();
  const projectContext = projectReference.context;
  const platformMode = resolvePlatformMode(config);

  if (!projectContext || !supportsSafeMode(projectContext.type)) {
    throw new Error('No detecte un proyecto compatible para revisar estado seguro.');
  }

  const preset = parsed.safePreset || 'default';
  const status = await buildSafeStatus({
    projectRoot: projectReference.projectRoot,
    projectType: projectContext.type,
    platformMode,
    preset,
  });

  if (parsed.outputFormat === 'json') {
    console.log(JSON.stringify(status, null, 2));
    return;
  }

  console.log('Estado seguro de Xzp');
  console.log('Proyecto : ' + status.projectRoot);
  console.log('Tipo     : ' + status.projectType.toUpperCase());
  console.log('Preset   : ' + status.preset);
  for (const item of status.checks) {
    console.log(`${item.label.padEnd(9, ' ')}: ${item.path}`);
    console.log(`Estado    : ${item.exists ? 'listo' : 'faltante'}`);
  }
  if (status.lastSession) {
    console.log('Ultima sesion');
    console.log('Modo      : ' + status.lastSession.mode);
    console.log('Preset    : ' + status.lastSession.preset);
    console.log('Fecha     : ' + status.lastSession.updatedAt);
    if (status.lastSession.shortcutName) {
      console.log('Shortcut  : ' + status.lastSession.shortcutName);
    }
  }
}

async function buildSafeStatus({ projectRoot, projectType, platformMode, preset }) {
  const checks = [];
  const lastSession = await loadLastSafeSession();

  if (projectType === 'python') {
    const venvDir = getRescueVenvPath(projectRoot);
    const pythonPath = path.join(venvDir, 'bin', 'python');
    checks.push({
      label: 'Entorno',
      path: venvDir,
      exists: await pathExists(pythonPath),
    });
  } else if (projectType === 'node') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectType);
    checks.push({
      label: 'Seguro',
      path: safeProjectDir,
      exists: await pathExists(path.join(safeProjectDir, 'node_modules')),
    });
  } else if (projectType === 'php') {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectType);
    checks.push({
      label: 'Seguro',
      path: safeProjectDir,
      exists: await pathExists(path.join(safeProjectDir, 'vendor')),
    });
  } else {
    const safeProjectDir = getSafeProjectWorkspacePath(projectRoot, projectType);
    checks.push({
      label: 'Seguro',
      path: safeProjectDir,
      exists: await pathExists(safeProjectDir),
    });
  }

  return {
    projectRoot,
    projectType,
    platformMode,
    preset,
    checks,
    lastSession: lastSession && lastSession.projectRoot === projectRoot ? lastSession : null,
  };
}

export async function __testBuildSafeStatus(input) {
  return buildSafeStatus(input);
}

export function resolveSafeShortcutExecution(projectType, entryValue) {
  const cleanEntry = String(entryValue || '').trim();
  if (!cleanEntry) {
    throw new Error('La entrada del acceso seguro esta vacia.');
  }

  const explicitCommand = parseExplicitRuntimeCommand(cleanEntry, projectType);
  if (explicitCommand) {
    return explicitCommand;
  }

  const normalizedPath = cleanEntry.replace(/\\/g, '/');
  const lower = normalizedPath.toLowerCase();

  if (projectType === 'python') {
    return { command: 'python', args: [cleanEntry] };
  }

  if (projectType === 'node') {
    return { command: 'node', args: [cleanEntry] };
  }

  if (projectType === 'php') {
    return { command: 'php', args: [cleanEntry] };
  }

  if (projectType === 'ruby') {
    return { command: 'ruby', args: [cleanEntry] };
  }

  if (projectType === 'go') {
    return { command: 'go', args: ['run', cleanEntry] };
  }

  if (projectType === 'rust') {
    if (cleanEntry === '.' || lower === 'cargo' || lower === 'cargo.toml') {
      return { command: 'cargo', args: ['run'] };
    }

    return { command: 'cargo', args: ['run', '--bin', cleanEntry] };
  }

  if (projectType === 'java') {
    if (lower.endsWith('.jar')) {
      return { command: 'java', args: ['-jar', cleanEntry] };
    }

    return { command: 'java', args: [cleanEntry] };
  }

  throw new Error('Xzp no puede resolver ese acceso seguro.');
}

function parseExplicitRuntimeCommand(entryValue, projectType) {
  const tokens = splitCommandString(entryValue);
  if (!tokens.length) {
    return null;
  }

  const runtimeAliases = getSafeRuntimeAliases(projectType);
  const head = tokens[0].toLowerCase();

  if (!runtimeAliases.includes(head)) {
    return null;
  }

  if (tokens.length < 2) {
    throw new Error('El acceso seguro necesita argumentos despues del runtime.');
  }

  return {
    command: tokens[0],
    args: tokens.slice(1),
  };
}

function getSafeRuntimeAliases(projectType) {
  if (projectType === 'python') {
    return ['python', 'python3'];
  }

  if (projectType === 'node') {
    return ['node'];
  }

  if (projectType === 'php') {
    return ['php'];
  }

  if (projectType === 'ruby') {
    return ['ruby'];
  }

  if (projectType === 'go') {
    return ['go'];
  }

  if (projectType === 'rust') {
    return ['cargo', 'rustc'];
  }

  if (projectType === 'java') {
    return ['java'];
  }

  return [];
}

function splitCommandString(value) {
  const tokens = [];
  let current = '';
  let quote = '';

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];

    if (quote) {
      if (char === quote) {
        quote = '';
        continue;
      }

      if (char === '\\' && index + 1 < value.length) {
        current += value[index + 1];
        index += 1;
        continue;
      }

      current += char;
      continue;
    }

    if (char === '"' || char === '\'') {
      quote = char;
      continue;
    }

    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    if (char === '\\' && index + 1 < value.length) {
      current += value[index + 1];
      index += 1;
      continue;
    }

    current += char;
  }

  if (quote) {
    throw new Error('La entrada del acceso seguro tiene comillas sin cerrar.');
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

async function writeSafeShortcutLauncher(shortcutName, preset = 'default') {
  const home = getHomeDirectory();
  const binDir = path.join(home, 'bin');
  const launcherPath = path.join(binDir, 'xzp-safe-' + shortcutName);
  const content = [
    '#!/data/data/com.termux/files/usr/bin/sh',
    `exec xzp --run-safe-shortcut "${escapeForDoubleQuotes(shortcutName)}" --preset "${escapeForDoubleQuotes(preset)}" "$@"`,
    '',
  ].join('\n');

  await fs.mkdir(binDir, { recursive: true });
  await fs.writeFile(launcherPath, content, 'utf8');
  await fs.chmod(launcherPath, 0o755);
  return launcherPath;
}

export async function __testWriteSafeShortcutLauncher(shortcutName, preset = 'default') {
  return writeSafeShortcutLauncher(shortcutName, preset);
}

export function resolveSafePresetEnv(projectType, preset = 'default') {
  const base = {
    XZP_SAFE_PRESET: preset,
  };

  if (preset === 'dev') {
    return {
      ...base,
      NODE_ENV: 'development',
    };
  }

  if (preset === 'debug') {
    return {
      ...base,
      NODE_ENV: 'development',
      XZP_DEBUG: '1',
      PYTHONUNBUFFERED: projectType === 'python' ? '1' : undefined,
    };
  }

  if (preset === 'test') {
    return {
      ...base,
      NODE_ENV: 'test',
      CI: '1',
      PYTHONUNBUFFERED: projectType === 'python' ? '1' : undefined,
    };
  }

  if (preset === 'release') {
    return {
      ...base,
      NODE_ENV: 'production',
    };
  }

  return base;
}

function getLastSafeSessionPath() {
  return path.join(getHomeDirectory(), '.config', 'xzp', 'last-safe-session.json');
}

async function saveLastSafeSession(session) {
  const sessionPath = getLastSafeSessionPath();
  const payload = {
    ...session,
    projectRoot: sanitizeTerminalText(session.projectRoot || ''),
    projectType: sanitizeTerminalText(session.projectType || ''),
    preset: sanitizeTerminalText(session.preset || 'default'),
    cwd: sanitizeTerminalText(session.cwd || ''),
    shellName: sanitizeTerminalText(session.shellName || ''),
    shortcutName: sanitizeTerminalText(session.shortcutName || ''),
    command: sanitizeTerminalText(session.command || ''),
    args: (session.args || []).map((item) => sanitizeTerminalText(item)),
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  await fs.writeFile(sessionPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

async function loadLastSafeSession() {
  try {
    const raw = await fs.readFile(getLastSafeSessionPath(), 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeSafeShortcutName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9._-]+/g, '')
    .slice(0, 48);
}

function escapeForDoubleQuotes(value) {
  return String(value).replace(/"/g, '\\"');
}

async function normalizeProjectRootPath(projectRoot) {
  try {
    return await fs.realpath(projectRoot);
  } catch {
    return path.resolve(projectRoot);
  }
}

function openSafeShell(shellSession, cwd, envPatch) {
  return new Promise((resolve, reject) => {
    const child = spawn(shellSession.shellPath, shellSession.shellArgs, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...shellSession.env,
        ...envPatch,
      },
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error('La shell segura termino por senal: ' + signal));
        return;
      }

      if (code && code !== 0) {
        reject(new Error('La shell segura termino con codigo ' + code));
        return;
      }

      resolve();
    });
  });
}

function runSafeCommand(command, args, cwd, envPatch) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...envPatch,
      },
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (signal) {
        reject(new Error('El acceso seguro termino por senal: ' + signal));
        return;
      }

      if (code && code !== 0) {
        reject(new Error('El acceso seguro termino con codigo ' + code));
        return;
      }

      resolve();
    });
  });
}
