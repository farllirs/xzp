import { runAndroidShellCommand } from '../commands/android-shell.js';
import { runAgentModeCommand } from '../commands/agent-mode.js';
import { runClipboardClearCommand, runClipboardStatusCommand } from '../commands/clipboard.js';
import { runContextCommand } from '../commands/context.js';
import { runCopyCommand } from '../commands/copy.js';
import { runDoctorCommand } from '../commands/doctor.js';
import { runExplainCommand } from '../commands/explain.js';
import { runInspectCommand } from '../commands/inspect.js';
import { runInstallCommand } from '../commands/install.js';
import { runLocaleCommand } from '../commands/locale.js';
import { runMenuCommand } from '../commands/menu.js';
import { runPasteCommand } from '../commands/paste.js';
import { runReportErrorCommand } from '../commands/report-error.js';
import { runSafeShellCommand } from '../commands/safe-shell.js';
import { runSearchCommand } from '../commands/search.js';
import { runTreeCommand } from '../commands/tree.js';
import { runVersionCommand } from '../commands/version.js';
import { runVisualTestCommand } from '../commands/visual-test.js';
import { runDiagnoseCommand } from '../commands/diagnose.js';
import { runThemeStudio } from '../commands/theme-studio.js';
import { buildCommandOptions } from './command-runtime.js';

const COMMAND_REGISTRY = [
  {
    name: 'version',
    run: (context) => runVersionCommand(buildCommandOptions(context)),
  },
  {
    name: 'agent-mode',
    run: (context) => runAgentModeCommand(buildCommandOptions(context)),
  },
  {
    name: 'doctor',
    run: (context) => runDoctorCommand(buildCommandOptions(context)),
  },
  {
    name: 'inspect',
    run: (context) => runInspectCommand(buildCommandOptions(context)),
  },
  {
    name: 'report-error',
    run: (context) => runReportErrorCommand(buildCommandOptions(context)),
  },
  {
    name: 'visual-test',
    run: (context) => runVisualTestCommand(buildCommandOptions(context)),
  },
  {
    name: 'diagnose',
    aliases: ['test', 'health', 'check'],
    run: (context) => runDiagnoseCommand(buildCommandOptions(context)),
  },
  {
    name: 'copy',
    run: (context) => runCopyCommand(buildCommandOptions(context)),
  },
  {
    name: 'paste',
    run: (context) => runPasteCommand(buildCommandOptions(context)),
  },
  {
    name: 'clipboard',
    run: (context) => runClipboardStatusCommand(buildCommandOptions(context)),
  },
  {
    name: 'clipboard-clear',
    run: () => runClipboardClearCommand(),
  },
  {
    name: 'context',
    run: (context) => runContextCommand(buildCommandOptions(context)),
  },
  {
    name: 'prompt-context',
    run: () => runContextCommand({ prompt: true }),
  },
  {
    name: 'prompt-project-root',
    run: () => runContextCommand({ projectRoot: true }),
  },
  {
    name: 'prompt-project-path',
    run: () => runContextCommand({ projectPath: true }),
  },
  {
    name: 'search',
    run: (context) => runSearchCommand(buildCommandOptions(context)),
  },
  {
    name: 'explain',
    run: (context) => runExplainCommand(buildCommandOptions(context)),
  },
  {
    name: 'menu',
    run: () => runMenuCommand(),
  },
  {
    name: 'locale',
    run: (context) => runLocaleCommand(buildCommandOptions(context)),
  },
  {
    name: 'tree',
    run: (context) => runTreeCommand(buildCommandOptions(context)),
  },
  {
    name: 'android',
    run: (context) => runAndroidShellCommand(buildCommandOptions(context)),
  },
  {
    name: 'install',
    run: (context) => runInstallCommand(buildCommandOptions(context)),
  },
  {
    name: 'safe-shell',
    run: (context) => runSafeShellCommand(buildCommandOptions(context)),
  },
  {
    name: 'theme-studio',
    aliases: ['themes', 'theme', 'personalizar'],
    run: (context) => runThemeStudio(context),
  },
];

export function listRegisteredCommands() {
  return [...COMMAND_REGISTRY];
}

export function getRegisteredCommand(name = '') {
  const lowerName = name.toLowerCase();
  return COMMAND_REGISTRY.find((command) => {
    if (command.name === lowerName) return true;
    if (command.aliases && command.aliases.includes(lowerName)) return true;
    return false;
  }) || null;
}

export async function runRegisteredCommand(name, context) {
  const command = getRegisteredCommand(name);

  if (!command) {
    return false;
  }

  await command.run(context);
  return true;
}
