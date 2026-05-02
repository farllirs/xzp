import fs from 'node:fs/promises';
import path from 'node:path';
import { getUserConfigPath } from './config.js';
import { getDefaultLocale, t, tList } from './i18n.js';
import { listHelpCommands } from './help.js';

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
