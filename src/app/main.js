import { parseArgs, normalizeParsedArgs } from '../core/args.js';
import { findHelpCommand } from '../core/help.js';
import { printHelp, printProjectContextLine, setOutputPreferences } from '../ui/output.js';
import { createExecutionContext, getProjectBadgeLine, pickCommandCandidate, shouldPrintProjectBadge } from '../core/command-runtime.js';
import { runRegisteredCommand } from '../core/command-registry.js';
import { checkAndUpdateSystem } from '../commands/update.js';

export async function main(argv = process.argv.slice(2)) {
  const parsed = normalizeParsedArgs(parseArgs(argv));
  const executionContext = await createExecutionContext({ argv, parsed });

  await checkAndUpdateSystem(executionContext);

  setOutputPreferences(executionContext.runtimePreferences);

  if (await shouldPrintProjectBadge(executionContext)) {
    const badgeLine = await getProjectBadgeLine(executionContext);
    if (badgeLine) {
      printProjectContextLine(badgeLine);
    }
  }

  if (parsed.help) {
    printHelp(executionContext.platformMode, parsed.command || parsed.helpTarget || '');
    return;
  }

  if (!parsed.command && argv.length) {
    const candidate = pickCommandCandidate(argv);
    const suggestion = findHelpCommand(candidate);

    if (suggestion) {
      printHelp(executionContext.platformMode, suggestion.name);
      return;
    }

    printHelp(executionContext.platformMode, candidate);
    return;
  }

  if (!argv.length) {
    printHelp(executionContext.platformMode);
    return;
  }

  const handled = await runRegisteredCommand(parsed.command, executionContext);
  if (handled) {
    return;
  }

  printHelp(executionContext.platformMode);
}
