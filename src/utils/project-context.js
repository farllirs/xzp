import fs from 'node:fs/promises';
import path from 'node:path';

const COLORS = {
  reset: '\x1b[0m',
  python: '\x1b[34m',
  node: '\x1b[32m',
  rust: '\x1b[33m',
  go: '\x1b[36m',
  java: '\x1b[35m',
  php: '\x1b[95m',
  ruby: '\x1b[91m',
  generic: '\x1b[92m',
};

const LANGUAGE_META = {
  python: { label: 'PYTHON' },
  node: { label: 'NODE' },
  rust: { label: 'RUST' },
  go: { label: 'GO' },
  java: { label: 'JAVA' },
  php: { label: 'PHP' },
  ruby: { label: 'RUBY' },
};

const MAX_PARENT_LOOKUP = 16;
const MAX_IMPLICIT_SCAN_DEPTH = 3;
const MAX_IMPLICIT_SCAN_ENTRIES = 160;

export async function detectProjectContext(cwd = process.cwd()) {
  const searchChain = buildSearchChain(cwd);
  const detections = [];

  for (const directoryPath of searchChain) {
    const detected = await detectProjectContextAt(directoryPath, cwd);
    if (detected) {
      detections.push(detected);
    }
  }

  if (!detections.length) {
    return null;
  }

  const explicit = detections.filter((item) => item.detectionKind === 'explicit');
  if (explicit.length) {
    return pickBestDetection(explicit);
  }

  return pickBestDetection(detections);
}

export async function detectProjectDirectorySignature(directoryPath) {
  const entries = await safeReadDir(directoryPath);
  if (!entries.length) {
    return null;
  }

  const names = new Set(entries.map((entry) => entry.name));
  const hasPyFiles = entries.some((entry) => !entry.isDirectory() && entry.name.endsWith('.py'));
  const hasJsFiles = entries.some((entry) => !entry.isDirectory() && isNodeScript(entry.name));
  const hasPhpFiles = entries.some((entry) => !entry.isDirectory() && entry.name.endsWith('.php'));
  const hasRubyFiles = entries.some((entry) => !entry.isDirectory() && entry.name.endsWith('.rb'));

  if (names.has('pyproject.toml') || names.has('requirements.txt') || names.has('Pipfile') || names.has('setup.py') || hasPyFiles) {
    return createContext('python', directoryPath, directoryPath, await detectPythonVersion(directoryPath), 'explicit');
  }

  if (names.has('package.json') || names.has('node_modules') || hasJsFiles) {
    return createContext('node', directoryPath, directoryPath, await detectNodeVersion(directoryPath), 'explicit');
  }

  if (names.has('Cargo.toml')) {
    return createContext('rust', directoryPath, directoryPath, await detectRustVersion(directoryPath), 'explicit');
  }

  if (names.has('go.mod')) {
    return createContext('go', directoryPath, directoryPath, await detectGoVersion(directoryPath), 'explicit');
  }

  if (names.has('pom.xml') || names.has('build.gradle') || names.has('build.gradle.kts')) {
    return createContext('java', directoryPath, directoryPath, await detectJavaVersion(directoryPath), 'explicit');
  }

  if (names.has('composer.json') || hasPhpFiles) {
    return createContext('php', directoryPath, directoryPath, await detectPhpVersion(directoryPath), 'explicit');
  }

  if (names.has('Gemfile') || hasRubyFiles) {
    return createContext('ruby', directoryPath, directoryPath, await detectRubyVersion(directoryPath), 'explicit');
  }

  return null;
}

export function formatProjectContext(context) {
  const folderName = path.basename(context.projectRoot || context.cwd) || context.cwd;
  const segment = buildContextSegment(context);
  const badge = process.stdout.isTTY
    ? `${COLORS[context.type] || COLORS.generic}[${segment}]${COLORS.reset}`
    : `[${segment}]`;

  return `Contexto: ${folderName} ${badge}`;
}

export function formatPromptContext(context) {
  return buildContextSegment(context);
}

export function formatPromptProjectRoot(context) {
  return context.projectRoot || context.cwd;
}

export function formatPromptProjectPath(context) {
  return context.projectRoot || context.cwd;
}

export function formatProjectContextDetails(context) {
  const profile = buildProjectStackProfile(context);
  return [
    'Carpeta : ' + context.cwd,
    'Proyecto: ' + (context.projectRoot || context.cwd),
    'Tipo    : ' + context.label,
    'Version : ' + (context.version || 'sin detectar'),
    'Origen  : ' + (context.detectionKind || 'desconocido'),
    'Relativo: ' + formatRelativeProjectPath(context),
    'Prompt  : [' + formatPromptContext(context) + ']',
    'Perfil  : ' + profile.summary.join(' | '),
  ].join('\n');
}

export function buildProjectStackProfile(context) {
  const root = context?.projectRoot || context?.cwd || '';
  const summary = [
    `runtime:${context?.type || 'unknown'}`,
    `root:${path.basename(root) || root || '.'}`,
  ];
  const nextSteps = ['xzp -i', 'xzp -r', 'xzp -t . --depth 2'];

  if (context?.type === 'node') {
    summary.push('manager:npm-compatible');
    nextSteps.unshift('xzp -b "package" --scope actual');
  } else if (context?.type === 'python') {
    summary.push('manager:pip-compatible');
    nextSteps.unshift('xzp -b "requirements" --scope actual');
  } else if (context?.type === 'php') {
    summary.push('manager:composer');
  } else if (context?.type === 'ruby') {
    summary.push('manager:bundler');
  } else if (context?.type === 'rust') {
    summary.push('manager:cargo');
  } else if (context?.type === 'go') {
    summary.push('manager:go-mod');
  } else if (context?.type === 'java') {
    summary.push('manager:maven-or-gradle');
  }

  if (context?.detectionKind) {
    summary.push(`signal:${context.detectionKind}`);
  }

  return {
    summary,
    nextSteps,
  };
}

async function detectProjectContextAt(targetDir, cwd) {
  const entries = await safeReadDir(targetDir);
  if (!entries.length) {
    return null;
  }

  const names = new Set(entries.map((entry) => entry.name));
  const hasPyFiles = entries.some((entry) => !entry.isDirectory() && entry.name.endsWith('.py'));
  const hasJsFiles = entries.some((entry) => !entry.isDirectory() && isNodeScript(entry.name));
  const hasPhpFiles = entries.some((entry) => !entry.isDirectory() && entry.name.endsWith('.php'));
  const hasRubyFiles = entries.some((entry) => !entry.isDirectory() && entry.name.endsWith('.rb'));

  if (names.has('pyproject.toml') || names.has('requirements.txt') || names.has('Pipfile') || names.has('setup.py')) {
    return createContext('python', cwd, targetDir, await detectPythonVersion(targetDir), 'explicit');
  }

  if (names.has('package.json') || names.has('node_modules')) {
    return createContext('node', cwd, targetDir, await detectNodeVersion(targetDir), 'explicit');
  }

  if (names.has('Cargo.toml')) {
    return createContext('rust', cwd, targetDir, await detectRustVersion(targetDir), 'explicit');
  }

  if (names.has('go.mod')) {
    return createContext('go', cwd, targetDir, await detectGoVersion(targetDir), 'explicit');
  }

  if (names.has('pom.xml') || names.has('build.gradle') || names.has('build.gradle.kts')) {
    return createContext('java', cwd, targetDir, await detectJavaVersion(targetDir), 'explicit');
  }

  if (names.has('composer.json')) {
    return createContext('php', cwd, targetDir, await detectPhpVersion(targetDir), 'explicit');
  }

  if (names.has('Gemfile')) {
    return createContext('ruby', cwd, targetDir, await detectRubyVersion(targetDir), 'explicit');
  }

  if (hasPyFiles) {
    return createContext('python', cwd, targetDir, await detectPythonVersion(targetDir), 'implicit');
  }

  if (hasJsFiles) {
    return createContext('node', cwd, targetDir, await detectNodeVersion(targetDir), 'implicit');
  }

  if (hasPhpFiles) {
    return createContext('php', cwd, targetDir, await detectPhpVersion(targetDir), 'implicit');
  }

  if (hasRubyFiles) {
    return createContext('ruby', cwd, targetDir, await detectRubyVersion(targetDir), 'implicit');
  }

  const nestedImplicitType = await detectImplicitLanguageFromTree(targetDir);
  if (nestedImplicitType) {
    return createContext(nestedImplicitType, cwd, targetDir, await detectVersionForType(nestedImplicitType, targetDir), 'implicit');
  }

  return null;
}

async function detectImplicitLanguageFromTree(rootDir) {
  const queue = [{ dir: rootDir, depth: 0 }];
  let visitedEntries = 0;

  while (queue.length && visitedEntries < MAX_IMPLICIT_SCAN_ENTRIES) {
    const current = queue.shift();
    const nestedEntries = await safeReadDir(current.dir);
    if (!nestedEntries.length) {
      continue;
    }

    for (const item of nestedEntries) {
      visitedEntries += 1;

      if (!item.isDirectory()) {
        if (item.name.endsWith('.py')) {
          return 'python';
        }

        if (isNodeScript(item.name)) {
          return 'node';
        }

        if (item.name.endsWith('.php')) {
          return 'php';
        }

        if (item.name.endsWith('.rb')) {
          return 'ruby';
        }

        continue;
      }

      if (current.depth + 1 > MAX_IMPLICIT_SCAN_DEPTH) {
        continue;
      }

      if (shouldSkipImplicitDirectory(item.name)) {
        continue;
      }

      queue.push({
        dir: path.join(current.dir, item.name),
        depth: current.depth + 1,
      });
    }
  }

  return '';
}

function pickBestDetection(detections) {
  return detections[0];
}

function createContext(type, cwd, projectRoot, version, detectionKind) {
  const meta = LANGUAGE_META[type] || { label: type.toUpperCase() };
  return {
    type,
    cwd,
    projectRoot,
    label: meta.label,
    version,
    detectionKind,
  };
}

function formatRelativeProjectPath(context) {
  const relative = path.relative(context.projectRoot || context.cwd, context.cwd || context.projectRoot);
  return relative || '.';
}

function buildContextSegment(context) {
  return context.label;
}

function buildSearchChain(cwd) {
  const chain = [];
  let current = path.resolve(cwd);

  for (let depth = 0; depth < MAX_PARENT_LOOKUP; depth += 1) {
    chain.push(current);
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return chain;
}

async function detectPythonVersion(cwd) {
  const pythonVersionFile = await readFileIfExists(path.join(cwd, '.python-version'));
  const pipfile = await readFileIfExists(path.join(cwd, 'Pipfile'));
  const pyproject = await readFileIfExists(path.join(cwd, 'pyproject.toml'));
  const venvConfig = await readFileIfExists(path.join(cwd, '.venv', 'pyvenv.cfg'));
  const runtime = await readFileIfExists(path.join(cwd, 'runtime.txt'));

  return compactVersion(
    firstNonEmptyLine(pythonVersionFile) ||
    matchVersion(pipfile, /python_version\s*=\s*["']([^"']+)["']/i) ||
    matchVersion(pyproject, /requires-python\s*=\s*["']([^"']+)["']/i) ||
    matchVersion(venvConfig, /^version\s*=\s*(.+)$/im) ||
    matchVersion(runtime, /python-([^\s]+)/i),
  );
}

async function detectNodeVersion(cwd) {
  const nvmrc = await readFileIfExists(path.join(cwd, '.nvmrc'));
  const nodeVersionFile = await readFileIfExists(path.join(cwd, '.node-version'));
  const packageJsonRaw = await readFileIfExists(path.join(cwd, 'package.json'));

  try {
    if (packageJsonRaw) {
      const packageJson = JSON.parse(packageJsonRaw);
      return compactVersion(
        firstNonEmptyLine(nvmrc) ||
        firstNonEmptyLine(nodeVersionFile) ||
        packageJson.engines?.node,
      );
    }
  } catch {
    return compactVersion(firstNonEmptyLine(nvmrc) || firstNonEmptyLine(nodeVersionFile));
  }

  return compactVersion(firstNonEmptyLine(nvmrc) || firstNonEmptyLine(nodeVersionFile));
}

async function detectPhpVersion(cwd) {
  const composerRaw = await readFileIfExists(path.join(cwd, 'composer.json'));

  try {
    if (composerRaw) {
      const composer = JSON.parse(composerRaw);
      return compactVersion(composer.require?.php);
    }
  } catch {
    return null;
  }

  return null;
}

async function detectGoVersion(cwd) {
  const goMod = await readFileIfExists(path.join(cwd, 'go.mod'));
  return compactVersion(matchVersion(goMod, /^go\s+([^\s]+)$/im));
}

async function detectRustVersion(cwd) {
  const cargoToml = await readFileIfExists(path.join(cwd, 'Cargo.toml'));
  const toolchain = await readFileIfExists(path.join(cwd, 'rust-toolchain'));
  const toolchainToml = await readFileIfExists(path.join(cwd, 'rust-toolchain.toml'));

  return compactVersion(
    matchVersion(cargoToml, /rust-version\s*=\s*["']([^"']+)["']/i) ||
    firstNonEmptyLine(toolchain) ||
    matchVersion(toolchainToml, /channel\s*=\s*["']([^"']+)["']/i),
  );
}

async function detectRubyVersion(cwd) {
  const rubyVersion = await readFileIfExists(path.join(cwd, '.ruby-version'));
  const gemfile = await readFileIfExists(path.join(cwd, 'Gemfile'));

  return compactVersion(
    firstNonEmptyLine(rubyVersion) ||
    matchVersion(gemfile, /ruby\s+["']([^"']+)["']/i),
  );
}

async function detectJavaVersion(cwd) {
  const pom = await readFileIfExists(path.join(cwd, 'pom.xml'));
  const gradle = await readFileIfExists(path.join(cwd, 'build.gradle'));
  const gradleKts = await readFileIfExists(path.join(cwd, 'build.gradle.kts'));

  return compactVersion(
    matchVersion(pom, /<java.version>([^<]+)<\/java.version>/i) ||
    matchVersion(pom, /<maven.compiler.release>([^<]+)<\/maven.compiler.release>/i) ||
    matchVersion(gradle, /sourceCompatibility\s*=\s*['\"]?([^\s'\"]+)/i) ||
    matchVersion(gradleKts, /JavaLanguageVersion\.of\((\d+)\)/i),
  );
}

async function detectVersionForType(type, cwd) {
  if (type === 'python') {
    return detectPythonVersion(cwd);
  }

  if (type === 'node') {
    return detectNodeVersion(cwd);
  }

  if (type === 'php') {
    return detectPhpVersion(cwd);
  }

  if (type === 'ruby') {
    return detectRubyVersion(cwd);
  }

  if (type === 'go') {
    return detectGoVersion(cwd);
  }

  if (type === 'rust') {
    return detectRustVersion(cwd);
  }

  if (type === 'java') {
    return detectJavaVersion(cwd);
  }

  return null;
}

async function safeReadDir(directoryPath) {
  try {
    return await fs.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }
}

async function readFileIfExists(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    return '';
  }
}

function compactVersion(rawValue) {
  if (!rawValue) {
    return null;
  }

  const cleaned = String(rawValue).trim();
  const versionMatch = cleaned.match(/\d+(?:\.\d+){0,2}/);

  if (versionMatch) {
    const parts = versionMatch[0].split('.');
    return parts.slice(0, 2).join('.');
  }

  return cleaned.slice(0, 10);
}

function matchVersion(content, expression) {
  if (!content) {
    return '';
  }

  const match = content.match(expression);
  return match?.[1]?.trim() || '';
}

function firstNonEmptyLine(content) {
  if (!content) {
    return '';
  }

  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean) || '';
}

function isNodeScript(name) {
  return name.endsWith('.js') || name.endsWith('.mjs') || name.endsWith('.cjs') || name.endsWith('.ts');
}

function shouldSkipImplicitDirectory(name) {
  return [
    '.git',
    '.venv',
    'node_modules',
    '__pycache__',
    '.mypy_cache',
    '.pytest_cache',
    '.ruff_cache',
    'dist',
    'build',
  ].includes(name);
}
