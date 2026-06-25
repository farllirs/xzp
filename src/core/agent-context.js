import fs from 'node:fs/promises';
import path from 'node:path';
import { getUserConfigPath, loadUserConfig } from './config.js';
import { getDefaultLocale, t, tList } from './i18n.js';
import { listHelpCommands } from './help.js';
import { detectProjectContext } from '../utils/project-context.js';
import { gatherDoctorReport } from '../utils/system-inspect.js';
import { resolvePlatformMode } from '../utils/platform.js';

export function getAgentContextFilePath() {
  return path.join(path.dirname(getUserConfigPath()), 'agents', 'xzp-agent-context.md');
}

export async function ensureAgentContextFile(options = {}) {
  const locale = options.locale || getDefaultLocale();
  const force = Boolean(options.force);
  const filePath = getAgentContextFilePath();

  if (!force) {
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
    }
  }

  const markdown = buildAgentContextMarkdown({ locale });
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${markdown.trim()}\n`, 'utf8');

  // Professional addition: also generate rich JSON context for AI agents
  try {
    const richContext = await getRichAgentContext({ locale });
    const jsonPath = filePath.replace(/\.md$/, '.json');
    await fs.writeFile(jsonPath, JSON.stringify(richContext, null, 2), 'utf8');
  } catch (e) {
    // non-fatal
  }

  return filePath;
}

export function buildAgentContextMarkdown({ locale = getDefaultLocale() } = {}) {
  const commands = listHelpCommands(locale);
  const preferredCommands = commands.filter((command) => [
    'context',
    'search',
    'tree',
    'doctor',
    'inspect',
    'copy',
    'paste',
    'clipboard',
    'android',
    'safe-shell',
    'version',
    'report-error',
    'agent-mode',
  ].includes(command.name));

  const commandLines = preferredCommands.map((command) => {
    const aliases = (command.aliases || []).length ? ` (${command.aliases.join(', ')})` : '';
    return `- \`${command.name}\`${aliases}: ${command.summary}`;
  });

  const workflowLines = tList(locale, 'agentContext.workflows', []).map((line) => `- ${line}`);
  const priorityLines = tList(locale, 'agentContext.priorities', []).map((line) => `- ${line}`);
  const docLines = buildDocumentationLines();

  return [
    '# Xzp Agent Context',
    '',
    t(locale, 'agentContext.summary'),
    '',
    '## Operational Rule',
    '',
    t(locale, 'agentContext.rule'),
    '',
    '## Preferred Commands',
    '',
    ...commandLines,
    '',
    '## Default Workflows',
    '',
    ...workflowLines,
    '',
    '## Priorities',
    '',
    ...priorityLines,
    '',
    '## Reference Files',
    '',
    ...docLines,
    '',
    '## Notes',
    '',
    `- ${t(locale, 'agentContext.notes.contextPath', '', { path: getAgentContextFilePath() })}`,
    `- ${t(locale, 'agentContext.notes.configPath', '', { path: getUserConfigPath() })}`,
    `- ${t(locale, 'agentContext.notes.regeneration')}`,
  ].join('\n');
}

function buildDocumentationLines() {
  const candidates = [
    'README.md',
    'REYES.md',
    '.internal-docs/CORTE_CONTEXTO_ACTUAL.md',
    '.internal-docs/PLAN_CONTINUACION.md',
    '.internal-docs/ANDROID_NAVIGATION_MODE.md',
    '.internal-docs/RELEASE_CHECKLIST.md',
  ];

  return candidates.map((relativePath) => `- \`${relativePath}\``);
}

/**
 * Professional rich context for AI agents and automation.
 * Returns structured data ready for LLM tool-calling / ReAct agents.
 */
export async function getRichAgentContext(options = {}) {
  const locale = options.locale || getDefaultLocale();
  const config = await loadUserConfig();
  const platformMode = resolvePlatformMode(config);

  // Project understanding
  let project = { type: 'unknown', root: process.cwd() };
  try {
    project = await detectProjectContext(process.cwd());
  } catch {}

  // Environment snapshot (lightweight)
  let env = { tools: [], score: 0 };
  try {
    const report = await gatherDoctorReport();
    env.score = report.health?.score || 0;
    env.tools = (report.tools || []).slice(0, 12).map(t => ({
      name: t.name,
      found: t.found,
      path: t.path,
    }));
  } catch {}

  // Safe / preferred tools for agents (with basic schema)
  const safeTools = [
    { name: 'inspect', description: 'Get structured project summary and key files', safe: true, output: 'text|json' },
    { name: 'tree', description: 'Visual directory tree with technical summary', args: ['path'], safe: true },
    { name: 'search', description: 'Semantic or pattern file search', args: ['query'], safe: true },
    { name: 'context', description: 'Deep project context and stack profile', safe: true, output: 'json' },
    { name: 'doctor', description: 'Environment health check', safe: true },
    { name: 'copy', description: 'Copy current path or file to Xzp clipboard', safe: true },
    { name: 'paste', description: 'Paste from Xzp clipboard intelligently', safe: true },
    { name: 'safe-shell', description: 'Open isolated safe shell for the project', safe: true },
    { name: 'android', description: 'Quick navigation to Android storage (Termux)', safe: true },
  ];

  return {
    schemaVersion: '1.0',
    generatedAt: new Date().toISOString(),
    platform: platformMode,
    agentMode: Boolean(config.runtime?.agentMode),
    project: {
      type: project.type || 'unknown',
      root: project.root || process.cwd(),
      hasPackageJson: project.hasPackageJson || false,
      stack: project.stack || [],
    },
    environment: {
      healthScore: env.score,
      availableTools: env.tools,
    },
    recommendedTools: safeTools,
    capabilities: {
      jsonOutput: true,
      structuredContext: true,
      safeExecution: true,
      crossPlatformBridge: platformMode.includes('termux') || platformMode.includes('linux'),
      persistentMemory: true,
    },
    notesForAI: [
      'Always prefer xzp commands over raw shell when possible.',
      'Use --json or outputFormat=json for machine readable results.',
      'safe-shell is the recommended way to run potentially dangerous commands.',
      'Context files are in ~/.config/xzp/agents/',
    ],
  };
}
