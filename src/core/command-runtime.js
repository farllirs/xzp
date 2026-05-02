import { loadUserConfig, resolveRuntimePreferences } from './config.js';
import { detectProjectContext, formatProjectContext } from '../utils/project-context.js';
import { resolvePlatformMode } from '../utils/platform.js';

const PROJECT_CONTEXT_CACHE = new Map();

export async function createExecutionContext({ argv, parsed }) {
  const config = await loadUserConfig();
  const runtimePreferences = resolveRuntimePreferences(config);
  const platformMode = resolvePlatformMode(config);

  return {
    argv: [...(argv || [])],
    parsed,
    config,
    runtimePreferences,
    platformMode,
    outputFormat: runtimePreferences.outputFormat,
    agentMode: parsed.agentMode || runtimePreferences.agentMode,
  };
}

export function isStructuredOutput(context) {
  return context.outputFormat === 'json';
}

export function isPromptOnlyCommand(commandName = '') {
  return commandName === 'prompt-context'
    || commandName === 'prompt-project-root'
    || commandName === 'prompt-project-path';
}

export function isStandaloneView(parsed = {}) {
  const isSafeShortcutMaintenance = parsed.command === 'safe-shell'
    && (parsed.safeShortcutAction === 'list'
      || parsed.safeShortcutAction === 'remove'
      || parsed.safeShortcutAction === 'run'
      || Boolean(parsed.safeShortcutEntry));

  return parsed.help
    || parsed.command === 'doctor'
    || parsed.command === 'inspect'
    || isSafeShortcutMaintenance;
}

export async function getProjectContext(context, cwd = process.cwd()) {
  const cacheKey = String(cwd || process.cwd());

  if (!PROJECT_CONTEXT_CACHE.has(cacheKey)) {
    PROJECT_CONTEXT_CACHE.set(cacheKey, await detectProjectContext(cacheKey));
  }

  return PROJECT_CONTEXT_CACHE.get(cacheKey) || null;
}

export async function getProjectBadgeLine(context, cwd = process.cwd()) {
  const projectContext = await getProjectContext(context, cwd);
  return projectContext ? formatProjectContext(projectContext) : '';
}

export async function shouldPrintProjectBadge(context) {
  const parsed = context.parsed || {};

  if (isStructuredOutput(context)) {
    return false;
  }

  if (!context.config?.features?.projectBadge) {
    return false;
  }

  if (isPromptOnlyCommand(parsed.command) || parsed.command === 'context' || parsed.command === 'version') {
    return false;
  }

  if (parsed.command === 'tree' || isStandaloneView(parsed)) {
    return false;
  }

  return true;
}

export function buildCommandOptions(context, overrides = {}) {
  return {
    ...context.parsed,
    outputFormat: context.outputFormat,
    agentMode: context.agentMode,
    platformMode: context.platformMode,
    runtimePreferences: context.runtimePreferences,
    config: context.config,
    argv: context.argv,
    ...overrides,
  };
}

export function pickCommandCandidate(argv = []) {
  const candidate = argv.find((token) => token && !token.startsWith('-'));
  return candidate || argv[0] || '';
}
