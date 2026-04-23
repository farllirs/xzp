import { parseArgs } from '../core/args.js';
import { loadUserConfig, resolveRuntimePreferences } from '../core/config.js';
import { runAndroidShellCommand } from '../commands/android-shell.js';
import { runAgentModeCommand } from '../commands/agent-mode.js';
import { runCopyCommand } from '../commands/copy.js';
import { runContextCommand } from '../commands/context.js';
import { runExplainCommand } from '../commands/explain.js';
import { runDoctorCommand } from '../commands/doctor.js';
import { runInstallCommand } from '../commands/install.js';
import { runInspectCommand } from '../commands/inspect.js';
import { runMenuCommand } from '../commands/menu.js';
import { runReportErrorCommand } from '../commands/report-error.js';
import { runPasteCommand } from '../commands/paste.js';
import { runSafeShellCommand } from '../commands/safe-shell.js';
import { runSearchCommand } from '../commands/search.js';
import { runTreeCommand } from '../commands/tree.js';
import { runVersionCommand } from '../commands/version.js';
import { runClipboardClearCommand, runClipboardStatusCommand } from '../commands/clipboard.js';
import { printHelp, printProjectContextLine, setOutputPreferences } from '../ui/output.js';
import { detectProjectContext, formatProjectContext } from '../utils/project-context.js';
import { resolvePlatformMode } from '../utils/platform.js';
import { findHelpCommand } from '../core/help.js';

export async function main(argv = process.argv.slice(2)) {
  const parsed = parseArgs(argv);
  const config = await loadUserConfig();
  const runtimePreferences = resolveRuntimePreferences(config);
  setOutputPreferences(runtimePreferences);
  const platformMode = resolvePlatformMode(config);
  const isStructuredOutput = runtimePreferences.outputFormat === 'json';
  const isPromptOnly = parsed.command === 'prompt-context' || parsed.command === 'prompt-project-root' || parsed.command === 'prompt-project-path';
  const isContextOnly = parsed.command === 'context';
  const isVersionOnly = parsed.command === 'version';
  const isSafeShortcutMaintenance = parsed.command === 'safe-shell'
    && (parsed.safeShortcutAction === 'list'
      || parsed.safeShortcutAction === 'remove'
      || parsed.safeShortcutAction === 'run'
      || Boolean(parsed.safeShortcutEntry));
  const isStandaloneView = parsed.help || parsed.command === 'doctor' || parsed.command === 'inspect' || isSafeShortcutMaintenance;

  if (!isStructuredOutput && config.features.projectBadge && !isPromptOnly && !isContextOnly && !isVersionOnly && !isStandaloneView && parsed.command !== 'tree') {
    const context = await detectProjectContext();
    if (context) {
      printProjectContextLine(formatProjectContext(context));
    }
  }

  if (parsed.help) {
    printHelp(platformMode, parsed.command || parsed.helpTarget || '');
    return;
  }

  if (!parsed.command && argv.length) {
    const candidate = pickCommandCandidate(argv);
    const suggestion = findHelpCommand(candidate);

    if (suggestion) {
      printHelp(platformMode, suggestion.name);
      return;
    }

    printHelp(platformMode, candidate);
    return;
  }

  if (!argv.length) {
    printHelp(platformMode);
    return;
  }

  if (parsed.command === 'version') {
    await runVersionCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
    });
    return;
  }

  if (parsed.command === 'agent-mode') {
    await runAgentModeCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'doctor') {
    await runDoctorCommand({
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'inspect') {
    await runInspectCommand({
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'report-error') {
    await runReportErrorCommand({
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'copy') {
    await runCopyCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'paste') {
    await runPasteCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'clipboard') {
    await runClipboardStatusCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'clipboard-clear') {
    await runClipboardClearCommand();
    return;
  }

  if (parsed.command === 'context') {
    await runContextCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'prompt-context') {
    await runContextCommand({ prompt: true });
    return;
  }

  if (parsed.command === 'prompt-project-root') {
    await runContextCommand({ projectRoot: true });
    return;
  }

  if (parsed.command === 'prompt-project-path') {
    await runContextCommand({ projectPath: true });
    return;
  }

  if (parsed.command === 'search') {
    await runSearchCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
      agentMode: parsed.agentMode || runtimePreferences.agentMode,
    });
    return;
  }

  if (parsed.command === 'explain') {
    await runExplainCommand(parsed);
    return;
  }

  if (parsed.command === 'menu') {
    await runMenuCommand();
    return;
  }

  if (parsed.command === 'tree') {
    await runTreeCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
    });
    return;
  }

  if (parsed.command === 'android') {
    await runAndroidShellCommand();
    return;
  }

  if (parsed.command === 'install') {
    await runInstallCommand(parsed);
    return;
  }

  if (parsed.command === 'safe-shell') {
    await runSafeShellCommand({
      ...parsed,
      outputFormat: runtimePreferences.outputFormat,
    });
    return;
  }

  printHelp(platformMode);
}

function pickCommandCandidate(argv) {
  const candidate = argv.find((token) => token && !token.startsWith('-'));
  return candidate || argv[0] || '';
}
