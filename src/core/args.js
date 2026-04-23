export function parseArgs(argv) {
  const parsed = {
    help: false,
    helpTarget: '',
    command: '',
    copyMode: 'path',
    copyTarget: '',
    pasteTarget: '',
    pastePreview: false,
    pasteAction: '',
    pattern: '',
    searchType: '',
    includeHidden: false,
    limit: 80,
    topic: '',
    target: '',
    scope: '',
    depth: 2,
    safeShortcutAction: '',
    safeShortcutEntry: '',
    safeShortcutName: '',
    safePreset: 'default',
    contextAction: '',
    favoriteName: '',
    contextProfile: false,
    semanticSearch: false,
    searchExcludes: [],
    saveSearchExcludes: false,
    treeCompareTarget: '',
    treeSummary: false,
    agentMode: false,
    agentAction: '',
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '-h' || token === '--help' || token === 'help') {
      parsed.help = true;
      const next = argv[index + 1];
      if (next && !next.startsWith('-') && !parsed.helpTarget) {
        parsed.helpTarget = next;
        index += 1;
      }
      continue;
    }

    if (token === '-v' || token === '--version' || token === 'version') {
      parsed.command = 'version';
      continue;
    }

    if (token === '--agent' || token === '--agent-mode' || token === 'agent-mode') {
      parsed.command = 'agent-mode';
      parsed.agentMode = true;
      continue;
    }

    if (token === '--agent-on') {
      parsed.command = 'agent-mode';
      parsed.agentAction = 'on';
      parsed.agentMode = true;
      continue;
    }

    if (token === '--agent-off') {
      parsed.command = 'agent-mode';
      parsed.agentAction = 'off';
      continue;
    }

    if (token === '--agent-status') {
      parsed.command = 'agent-mode';
      parsed.agentAction = 'status';
      continue;
    }

    if (token === '-D' || token === '--doctor' || token === 'doctor') {
      parsed.command = 'doctor';
      continue;
    }

    if (token === '-I' || token === '--inspect' || token === 'inspect') {
      parsed.command = 'inspect';
      continue;
    }

    if (token === '--report-error' || token === 'report-error') {
      parsed.command = 'report-error';
      continue;
    }

    if (token === '-c' || token === '--copy' || token === 'copy') {
      parsed.command = 'copy';
      const next = argv[index + 1];
      if (next && !next.startsWith('-')) {
        parsed.copyTarget = next;
        index += 1;
      }
      continue;
    }

    if (token === '-p' || token === '--paste' || token === 'paste') {
      parsed.command = 'paste';
      continue;
    }

    if (token === '-k' || token === '--clipboard' || token === 'clipboard') {
      parsed.command = 'clipboard';
      continue;
    }

    if (token === '-K' || token === '--clear-clipboard' || token === 'clear-clipboard') {
      parsed.command = 'clipboard-clear';
      continue;
    }

    if (token === '-x' || token === '--context' || token === 'context') {
      parsed.command = 'context';
      continue;
    }

    if (token === '--prompt-context') {
      parsed.command = 'prompt-context';
      continue;
    }

    if (token === '--prompt-project-root') {
      parsed.command = 'prompt-project-root';
      continue;
    }

    if (token === '--prompt-project-path') {
      parsed.command = 'prompt-project-path';
      continue;
    }

    if (token === '-m' || token === '--menu' || token === 'menu') {
      parsed.command = 'menu';
      continue;
    }

    if (token === '-b' || token === '--buscar' || token === '--search' || token === 'search') {
      parsed.command = 'search';
      const next = argv[index + 1];
      if (next && !next.startsWith('-')) {
        parsed.pattern = next;
        index += 1;
      }
      continue;
    }

    if (token === '-e' || token === '--explicar' || token === '--explain' || token === 'explicar' || token === 'explain') {
      parsed.command = 'explain';
      const next = argv[index + 1];
      if (next && !next.startsWith('-')) {
        parsed.topic = next;
        index += 1;
      }
      continue;
    }

    if (token === '-t' || token === '--tree' || token === 'tree') {
      parsed.command = 'tree';
      const next = argv[index + 1];
      if (next && !next.startsWith('-')) {
        parsed.target = next;
        index += 1;
      }
      continue;
    }

    if (token === '-a' || token === '--android' || token === 'android') {
      parsed.command = 'android';
      continue;
    }

    if (token === '-i' || token === '--instalar' || token === '--install' || token === 'install') {
      parsed.command = 'install';
      continue;
    }

    if (token === '-r' || token === '--seguro' || token === '--safe-shell' || token === 'seguro' || token === 'safe-shell') {
      parsed.command = 'safe-shell';
      continue;
    }

    if (token === '--list-safe-shortcuts') {
      parsed.command = 'safe-shell';
      parsed.safeShortcutAction = 'list';
      continue;
    }

    if (token === '--remove-safe-shortcut') {
      parsed.command = 'safe-shell';
      parsed.safeShortcutAction = 'remove';
      const next = argv[index + 1];
      if (next) {
        parsed.safeShortcutName = next;
        index += 1;
      }
      continue;
    }

    if (token === '--run-safe-shortcut') {
      parsed.command = 'safe-shell';
      parsed.safeShortcutAction = 'run';
      const next = argv[index + 1];
      if (next) {
        parsed.safeShortcutName = next;
        index += 1;
      }
      continue;
    }

    if (token === '--safe-status') {
      parsed.command = 'safe-shell';
      parsed.safeShortcutAction = 'status';
      continue;
    }

    if (token === '--profile') {
      if (!parsed.command) {
        parsed.command = 'context';
      }
      parsed.contextProfile = true;
      continue;
    }

    if (token === '--save-favorite') {
      parsed.command = 'context';
      parsed.contextAction = 'save-favorite';
      const next = argv[index + 1];
      if (next) {
        parsed.favoriteName = next;
        index += 1;
      }
      continue;
    }

    if (token === '--list-favorites') {
      parsed.command = 'context';
      parsed.contextAction = 'list-favorites';
      continue;
    }

    if (token === '--remove-favorite') {
      parsed.command = 'context';
      parsed.contextAction = 'remove-favorite';
      const next = argv[index + 1];
      if (next) {
        parsed.favoriteName = next;
        index += 1;
      }
      continue;
    }

    if (token === '--preset') {
      const next = argv[index + 1];
      if (next) {
        parsed.safePreset = normalizeSafePreset(next);
        index += 1;
      }
      continue;
    }

    if (token === '-s' || token === '--scope') {
      const next = argv[index + 1];
      if (next) {
        parsed.scope = next.toLowerCase();
        index += 1;
      }
      continue;
    }

    if (token === '--files') {
      parsed.searchType = 'file';
      continue;
    }

    if (token === '--dirs' || token === '--directories') {
      parsed.searchType = 'directory';
      continue;
    }

    if (token === '--hidden') {
      parsed.includeHidden = true;
      continue;
    }

    if (token === '--semantic') {
      parsed.semanticSearch = true;
      continue;
    }

    if (token === '--exclude') {
      const next = argv[index + 1];
      if (next) {
        parsed.searchExcludes.push(next);
        index += 1;
      }
      continue;
    }

    if (token === '--save-exclude') {
      parsed.saveSearchExcludes = true;
      continue;
    }

    if (token === '--name') {
      parsed.copyMode = 'name';
      continue;
    }

    if (token === '--relative') {
      parsed.copyMode = 'relative';
      continue;
    }

    if (token === '--ext') {
      parsed.copyMode = 'ext';
      continue;
    }

    if (token === '--json') {
      parsed.copyMode = 'json';
      continue;
    }

    if (token === '--shell') {
      parsed.copyMode = 'shell';
      continue;
    }

    if (token === '--project-root') {
      parsed.copyMode = 'project-root';
      continue;
    }

    if (token === '--move') {
      parsed.pasteAction = 'move';
      continue;
    }

    if (token === '--copy-action') {
      parsed.pasteAction = 'copy';
      continue;
    }

    if (token === '--into') {
      const next = argv[index + 1];
      if (next) {
        parsed.pasteTarget = next;
        index += 1;
      }
      continue;
    }

    if (token === '--preview') {
      parsed.pastePreview = true;
      continue;
    }

    if (token === '-d' || token === '--depth') {
      const next = argv[index + 1];
      if (next) {
        parsed.depth = normalizeDepth(next);
        index += 1;
      }
      continue;
    }

    if (token === '--limit') {
      const next = argv[index + 1];
      if (next) {
        parsed.limit = normalizeLimit(next);
        index += 1;
      }
      continue;
    }

    if (token === '--compare') {
      const next = argv[index + 1];
      if (next) {
        parsed.treeCompareTarget = next;
        index += 1;
      }
      continue;
    }

    if (token === '--summary') {
      parsed.treeSummary = true;
      continue;
    }

    if (!parsed.pattern && parsed.command === 'search') {
      parsed.pattern = token;
      continue;
    }

    if (!parsed.topic && parsed.command === 'explain') {
      parsed.topic = token;
      continue;
    }

    if (!parsed.target && parsed.command === 'tree') {
      parsed.target = token;
      continue;
    }

    if (parsed.command === 'safe-shell') {
      if (!parsed.safeShortcutEntry) {
        parsed.safeShortcutEntry = token;
        continue;
      }

      if (!parsed.safeShortcutName) {
        parsed.safeShortcutName = token;
      }
    }
  }

  return parsed;
}

function normalizeDepth(value) {
  const numeric = Number.parseInt(value, 10);

  if (!Number.isInteger(numeric) || numeric < 1) {
    return 2;
  }

  return numeric;
}

function normalizeLimit(value) {
  const numeric = Number.parseInt(value, 10);

  if (!Number.isInteger(numeric) || numeric < 1) {
    return 80;
  }

  return Math.min(numeric, 500);
}

function normalizeSafePreset(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['default', 'dev', 'debug', 'test', 'release'].includes(normalized) ? normalized : 'default';
}
