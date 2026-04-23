import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { getUserConfigPath, loadUserConfig } from '../core/config.js';
import {
  getAndroidStorageRoot,
  getHomeDirectory,
  getQuickAccessRoot,
  isHostTermux,
  resolvePlatformMode,
} from './platform.js';
import { detectProjectContext } from './project-context.js';
import { resolveInteractiveShell } from './shell.js';

const TOOL_GROUPS = [
  {
    label: 'Base',
    entries: [
      { name: 'node', aliases: ['node'] },
      { name: 'npm', aliases: ['npm'] },
    ],
  },
  {
    label: 'Python',
    entries: [
      { name: 'python', aliases: ['python3', 'python'] },
      { name: 'pip', aliases: ['pip3', 'pip'] },
    ],
  },
  {
    label: 'Node',
    entries: [
      { name: 'pnpm', aliases: ['pnpm'] },
      { name: 'yarn', aliases: ['yarn'] },
    ],
  },
  {
    label: 'PHP',
    entries: [
      { name: 'php', aliases: ['php'] },
      { name: 'composer', aliases: ['composer'] },
    ],
  },
  {
    label: 'Ruby',
    entries: [
      { name: 'ruby', aliases: ['ruby'] },
      { name: 'bundle', aliases: ['bundle'] },
    ],
  },
  {
    label: 'Go',
    entries: [
      { name: 'go', aliases: ['go'] },
    ],
  },
  {
    label: 'Rust',
    entries: [
      { name: 'rustc', aliases: ['rustc'] },
      { name: 'cargo', aliases: ['cargo'] },
    ],
  },
  {
    label: 'Java',
    entries: [
      { name: 'java', aliases: ['java'] },
      { name: 'mvn', aliases: ['mvn'] },
      { name: 'gradle', aliases: ['gradle'] },
    ],
  },
];

const INSPECT_FILES = [
  'README.md',
  '.env.example',
  '.gitignore',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'tsconfig.json',
  'pyproject.toml',
  'requirements.txt',
  'Pipfile',
  'setup.py',
  'composer.json',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Gemfile',
  'Makefile',
];

export async function gatherDoctorReport() {
  const config = await loadUserConfig();
  const platformMode = resolvePlatformMode(config);
  const shell = await resolveInteractiveShell(platformMode);
  const quickAccessRoot = getQuickAccessRoot(platformMode);
  const androidRoot = getAndroidStorageRoot(platformMode);
  const tools = [];

  for (const group of TOOL_GROUPS) {
    for (const entry of group.entries) {
      const resolved = await resolveCommandOnPath(entry.aliases);
      tools.push({
        group: group.label,
        name: entry.name,
        found: Boolean(resolved),
        path: resolved || '',
      });
    }
  }

  const issues = buildDoctorIssues({
    platformMode,
    androidRoot,
    quickAccessRoot,
    tools,
    features: config.features,
  });

  return {
    host: isHostTermux() ? 'termux' : 'linux',
    cwd: process.cwd(),
    home: getHomeDirectory(),
    configPath: getUserConfigPath(),
    platformMode,
    quickAccessRoot,
    androidRoot: androidRoot || '',
    shell,
    features: [
      { key: 'androidShortcut', label: 'Acceso rapido', enabled: config.features.androidShortcut },
      { key: 'projectBadge', label: 'Badge de proyecto', enabled: config.features.projectBadge },
      { key: 'smartProjectInstall', label: 'Instalacion segura', enabled: config.features.smartProjectInstall },
    ],
    tools,
    issues,
    health: summarizeDoctorHealth(issues),
  };
}

export async function gatherProjectInspectReport() {
  const context = await detectProjectContext();

  if (!context) {
    return {
      found: false,
      cwd: process.cwd(),
      recommendations: [
        'Entra al root de un proyecto compatible y vuelve a correr `xzp --inspect`.',
        'Usa `xzp -b nombre --scope actual` para localizar archivos rapido.',
        'Usa `xzp -t . --depth 2` para revisar la estructura actual.',
      ],
    };
  }

  const projectRoot = context.projectRoot || context.cwd;
  const entries = await safeReadDir(projectRoot);
  const topFiles = entries.filter((entry) => !entry.isDirectory());
  const topDirectories = entries.filter((entry) => entry.isDirectory());
  const importantFiles = INSPECT_FILES.filter((name) => entries.some((entry) => entry.name === name));
  const metadata = await readProjectMetadata(context.type, projectRoot);

  return {
    found: true,
    context,
    projectRoot,
    topLevel: {
      files: topFiles.length,
      directories: topDirectories.length,
    },
    importantFiles,
    metadata,
    stackProfile: buildStackProfile(context.type, importantFiles, metadata),
    visibleDebt: buildVisibleDebt(context.type, importantFiles, metadata),
    recommendations: buildRecommendations(context.type, metadata),
  };
}

async function readProjectMetadata(projectType, projectRoot) {
  if (projectType === 'node') {
    return readNodeMetadata(projectRoot);
  }

  if (projectType === 'python') {
    return readPythonMetadata(projectRoot);
  }

  if (projectType === 'php') {
    return readPhpMetadata(projectRoot);
  }

  if (projectType === 'rust') {
    return readRustMetadata(projectRoot);
  }

  if (projectType === 'go') {
    return readGoMetadata(projectRoot);
  }

  if (projectType === 'java') {
    return readJavaMetadata(projectRoot);
  }

  if (projectType === 'ruby') {
    return readRubyMetadata(projectRoot);
  }

  return { summary: [] };
}

async function readNodeMetadata(projectRoot) {
  const packagePath = path.join(projectRoot, 'package.json');

  try {
    const raw = await fs.readFile(packagePath, 'utf8');
    const pkg = JSON.parse(raw);
    const scripts = Object.keys(pkg.scripts || {});

    return {
      summary: [
        { key: 'Paquete', value: pkg.name || path.basename(projectRoot) },
        { key: 'Version', value: pkg.version || 'sin version' },
        { key: 'Gestor', value: pkg.packageManager || detectNodeLockfile(projectRoot) || 'npm' },
        { key: 'Scripts', value: scripts.length ? scripts.join(', ') : 'sin scripts' },
      ],
      scripts,
    };
  } catch {
    return {
      summary: [
        { key: 'Paquete', value: path.basename(projectRoot) },
        { key: 'Version', value: 'sin detectar' },
      ],
      scripts: [],
    };
  }
}

async function readPythonMetadata(projectRoot) {
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  const requirementsPath = path.join(projectRoot, 'requirements.txt');

  if (await pathExists(pyprojectPath)) {
    const raw = await fs.readFile(pyprojectPath, 'utf8');
    return {
      summary: [
        { key: 'Config', value: 'pyproject.toml' },
        { key: 'Python', value: extractTomlValue(raw, 'requires-python') || 'sin declarar' },
        { key: 'Build', value: detectPythonBuildBackend(raw) },
      ],
    };
  }

  if (await pathExists(requirementsPath)) {
    const raw = await fs.readFile(requirementsPath, 'utf8');
    const dependencies = raw
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .slice(0, 8);

    return {
      summary: [
        { key: 'Config', value: 'requirements.txt' },
        { key: 'Deps', value: dependencies.length ? dependencies.join(', ') : 'sin dependencias visibles' },
      ],
    };
  }

  return {
    summary: [
      { key: 'Config', value: 'archivos Python detectados' },
    ],
  };
}

async function readPhpMetadata(projectRoot) {
  const composerPath = path.join(projectRoot, 'composer.json');

  if (!(await pathExists(composerPath))) {
    return { summary: [{ key: 'Config', value: 'archivos PHP detectados' }] };
  }

  try {
    const raw = await fs.readFile(composerPath, 'utf8');
    const composer = JSON.parse(raw);
    return {
      summary: [
        { key: 'Paquete', value: composer.name || path.basename(projectRoot) },
        { key: 'PHP', value: composer.require?.php || 'sin declarar' },
        { key: 'Scripts', value: Object.keys(composer.scripts || {}).join(', ') || 'sin scripts' },
      ],
    };
  } catch {
    return { summary: [{ key: 'Config', value: 'composer.json' }] };
  }
}

async function readRustMetadata(projectRoot) {
  return readLineMetadata(projectRoot, 'Cargo.toml', 'Cargo');
}

async function readGoMetadata(projectRoot) {
  return readLineMetadata(projectRoot, 'go.mod', 'Go');
}

async function readJavaMetadata(projectRoot) {
  if (await pathExists(path.join(projectRoot, 'pom.xml'))) {
    return { summary: [{ key: 'Build', value: 'Maven' }] };
  }

  if (await pathExists(path.join(projectRoot, 'build.gradle')) || await pathExists(path.join(projectRoot, 'build.gradle.kts'))) {
    return { summary: [{ key: 'Build', value: 'Gradle' }] };
  }

  return { summary: [{ key: 'Build', value: 'Java detectado' }] };
}

async function readRubyMetadata(projectRoot) {
  return readLineMetadata(projectRoot, 'Gemfile', 'Bundler');
}

async function readLineMetadata(projectRoot, fileName, label) {
  const target = path.join(projectRoot, fileName);
  if (!(await pathExists(target))) {
    return { summary: [{ key: label, value: 'detectado' }] };
  }

  const raw = await fs.readFile(target, 'utf8');
  const firstMeaningfulLine = raw
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#') && !line.startsWith('//'));

  return {
    summary: [
      { key: label, value: fileName },
      { key: 'Detalle', value: firstMeaningfulLine || 'sin detalle visible' },
    ],
  };
}

function buildRecommendations(projectType, metadata) {
  const recommendations = [
    'Usa `xzp -x` para confirmar el contexto detectado.',
    'Usa `xzp -t . --depth 2` para revisar la estructura visible.',
  ];

  if (projectType === 'node' && metadata.scripts?.includes('dev')) {
    recommendations.unshift('Tienes script `dev`; revisa si conviene documentarlo en la siguiente release.');
  }

  if (projectType === 'node' || projectType === 'python' || projectType === 'php' || projectType === 'ruby' || projectType === 'go' || projectType === 'rust' || projectType === 'java') {
    recommendations.unshift('Usa `xzp -i` para preparar dependencias con el flujo seguro de Xzp.');
    recommendations.unshift('Usa `xzp -r` si quieres entrar a la shell segura del proyecto.');
  }

  return recommendations;
}

function detectPythonBuildBackend(raw) {
  if (raw.includes('poetry')) {
    return 'poetry';
  }

  if (raw.includes('setuptools')) {
    return 'setuptools';
  }

  if (raw.includes('hatchling')) {
    return 'hatchling';
  }

  return 'sin detectar';
}

function detectNodeLockfile(projectRoot) {
  if (pathExistsSync(path.join(projectRoot, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }

  if (pathExistsSync(path.join(projectRoot, 'yarn.lock'))) {
    return 'yarn';
  }

  if (pathExistsSync(path.join(projectRoot, 'package-lock.json'))) {
    return 'npm';
  }

  return '';
}

function extractTomlValue(raw, key) {
  const match = raw.match(new RegExp(`^\\s*${escapeRegex(key)}\\s*=\\s*["']([^"']+)["']`, 'm'));
  return match ? match[1] : '';
}

function escapeRegex(value) {
  return String(value).replace(/[|\\{}()[\]^$+?.*]/g, '\\$&');
}

async function resolveCommandOnPath(aliases) {
  for (const alias of aliases) {
    const resolved = await resolveSingleCommand(alias);
    if (resolved) {
      return resolved;
    }
  }

  return '';
}

async function resolveSingleCommand(commandName) {
  if (!commandName) {
    return '';
  }

  if (commandName.includes(path.sep)) {
    return (await pathExists(commandName)) ? commandName : '';
  }

  const pathEntries = String(process.env.PATH || '')
    .split(path.delimiter)
    .filter(Boolean);

  for (const entry of pathEntries) {
    const candidate = path.join(entry, commandName);
    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return '';
}

async function safeReadDir(targetPath) {
  try {
    return await fs.readdir(targetPath, { withFileTypes: true });
  } catch {
    return [];
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

function pathExistsSync(targetPath) {
  try {
    return requireFsSync(targetPath);
  } catch {
    return false;
  }
}

function requireFsSync(targetPath) {
  const nodeFs = process.getBuiltinModule ? process.getBuiltinModule('fs') : null;
  if (!nodeFs) {
    return false;
  }

  return nodeFs.existsSync(targetPath);
}

export async function readCommandVersion(commandPath, args = ['--version']) {
  if (!commandPath) {
    return '';
  }

  return await new Promise((resolve) => {
    const child = spawn(commandPath, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      resolve('');
    }, 1800);

    child.stdout.on('data', (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr += String(chunk);
    });

    child.on('error', () => {
      clearTimeout(timeout);
      resolve('');
    });

    child.on('exit', () => {
      clearTimeout(timeout);
      const text = (stdout || stderr).trim().split('\n')[0] || '';
      resolve(text);
    });
  });
}

function buildStackProfile(projectType, importantFiles, metadata) {
  const summary = [];

  if (projectType === 'node') {
    summary.push('runtime: node');
    if (importantFiles.includes('package.json')) {
      summary.push('manifest: package.json');
    }
    if (importantFiles.includes('tsconfig.json')) {
      summary.push('typescript: visible');
    }
    if (metadata.scripts?.includes('dev')) {
      summary.push('dev-script: yes');
    }
  }

  if (projectType === 'python') {
    summary.push('runtime: python');
    if (importantFiles.includes('pyproject.toml')) {
      summary.push('build: pyproject');
    }
    if (importantFiles.includes('requirements.txt')) {
      summary.push('deps: requirements');
    }
  }

  if (projectType === 'php') {
    summary.push('runtime: php');
    if (importantFiles.includes('composer.json')) {
      summary.push('deps: composer');
    }
  }

  if (projectType === 'rust') {
    summary.push('runtime: rust');
    summary.push('build: cargo');
  }

  if (projectType === 'go') {
    summary.push('runtime: go');
    summary.push('build: go-mod');
  }

  if (projectType === 'java') {
    summary.push('runtime: java');
    summary.push(importantFiles.includes('pom.xml') ? 'build: maven' : 'build: gradle-or-plain-java');
  }

  if (projectType === 'ruby') {
    summary.push('runtime: ruby');
    summary.push('build: bundler');
  }

  return summary;
}

function buildVisibleDebt(projectType, importantFiles, metadata) {
  const debt = [];

  if (!importantFiles.includes('README.md')) {
    debt.push('Falta README en el root del proyecto.');
  }

  if (projectType === 'node') {
    if (!importantFiles.includes('package-lock.json') && !importantFiles.includes('pnpm-lock.yaml') && !importantFiles.includes('yarn.lock')) {
      debt.push('No veo lockfile de dependencias Node.');
    }

    if (!metadata.scripts?.length) {
      debt.push('No hay scripts visibles en package.json.');
    }
  }

  if (projectType === 'python') {
    if (!importantFiles.includes('pyproject.toml') && !importantFiles.includes('requirements.txt') && !importantFiles.includes('Pipfile')) {
      debt.push('No veo archivo claro de dependencias Python.');
    }
  }

  if (projectType === 'php' && !importantFiles.includes('composer.json')) {
    debt.push('No veo composer.json en el root.');
  }

  if (!importantFiles.includes('.gitignore')) {
    debt.push('No veo .gitignore en el root.');
  }

  return debt;
}

function buildDoctorIssues({ platformMode, androidRoot, quickAccessRoot, tools, features }) {
  const issues = [];
  const toolMap = new Map(tools.map((tool) => [tool.name, tool]));

  const node = toolMap.get('node');
  const npm = toolMap.get('npm');

  if (!node?.found) {
    issues.push({
      severity: 'critical',
      code: 'missing-node',
      label: 'Node no esta disponible',
      recommendation: 'Instala Node antes de usar la mayoria de flujos de Xzp.',
    });
  }

  if (!npm?.found) {
    issues.push({
      severity: 'high',
      code: 'missing-npm',
      label: 'npm no esta disponible',
      recommendation: 'Instala npm o nodejs completo para publicar y revisar paquetes.',
    });
  }

  if (platformMode === 'termux' && !androidRoot) {
    issues.push({
      severity: 'high',
      code: 'missing-android-storage',
      label: 'Storage Android no detectado',
      recommendation: 'Ejecuta termux-setup-storage y vuelve a comprobar el entorno.',
    });
  }

  if (!quickAccessRoot) {
    issues.push({
      severity: 'medium',
      code: 'missing-quick-access-root',
      label: 'No hay ruta base de acceso rapido',
      recommendation: 'Revisa permisos de storage o la configuracion de plataforma.',
    });
  }

  if (!features.smartProjectInstall) {
    issues.push({
      severity: 'medium',
      code: 'safe-install-disabled',
      label: 'La instalacion segura esta apagada',
      recommendation: 'Activa smartProjectInstall si quieres usar los flujos protegidos de Xzp.',
    });
  }

  const packageTools = ['composer', 'bundle', 'cargo', 'mvn', 'gradle', 'pnpm', 'yarn'];
  const missingPackageTools = packageTools.filter((name) => !toolMap.get(name)?.found);
  if (missingPackageTools.length >= 4) {
    issues.push({
      severity: 'low',
      code: 'many-optional-tools-missing',
      label: 'Faltan varias herramientas opcionales',
      recommendation: `Instala solo las que uses: ${missingPackageTools.slice(0, 6).join(', ')}.`,
    });
  }

  return issues;
}

function summarizeDoctorHealth(issues = []) {
  const counts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  for (const issue of issues) {
    if (counts[issue.severity] !== undefined) {
      counts[issue.severity] += 1;
    }
  }

  const penalties = (counts.critical * 35) + (counts.high * 20) + (counts.medium * 10) + (counts.low * 4);
  const score = Math.max(0, 100 - penalties);

  return {
    score,
    counts,
    status: score >= 90
      ? 'solido'
      : score >= 70
        ? 'usable'
        : score >= 45
          ? 'fragil'
          : 'critico',
  };
}

export function __testSummarizeDoctorHealth(issues = []) {
  return summarizeDoctorHealth(issues);
}
