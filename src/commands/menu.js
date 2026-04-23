import {
  listFavoritePaths,
  loadUserConfig,
  setFeatureEnabled,
  setMenuLastAction,
  setMenuVisualMode,
  setPlatformMode,
  setPromptContextPosition,
  setPromptTheme,
} from '../core/config.js';
import { formatPlatformMode, resolvePlatformMode } from '../utils/platform.js';
import { runCopyCommand } from './copy.js';
import { runContextCommand } from './context.js';
import { runExplainCommand } from './explain.js';
import { runDoctorCommand } from './doctor.js';
import { runPasteCommand } from './paste.js';
import { runSafeShellCommand } from './safe-shell.js';
import { runSearchCommand } from './search.js';
import { runInspectCommand } from './inspect.js';
import { runTreeCommand } from './tree.js';
import { runVersionCommand } from './version.js';
import { runClipboardClearCommand, runClipboardStatusCommand } from './clipboard.js';
import {
  chooseFeatureToggle,
  chooseMenuAction,
  chooseMenuVisualMode,
  choosePlatformMode,
  choosePromptContextPosition,
  choosePromptTheme,
  chooseSearchPatternFromMenu,
  chooseSettingsAction,
  chooseTreeTargetFromMenu,
} from '../ui/prompt.js';
import { printHelp } from '../ui/output.js';

export async function runMenuCommand() {
  while (true) {
    const config = await loadUserConfig();
    const action = await chooseMenuAction(config.menu?.visualMode || 'cards');
    await setMenuLastAction(action);

    if (action === 'help') {
      const config = await loadUserConfig();
      printHelp(resolvePlatformMode(config));
      return;
    }

    if (action === 'copy') {
      await runCopyCommand({ copyMode: 'path', copyTarget: '' });
      return;
    }

    if (action === 'paste') {
      await runPasteCommand({});
      return;
    }

    if (action === 'clipboard') {
      await runClipboardStatusCommand();
      return;
    }

    if (action === 'clipboard-clear') {
      await runClipboardClearCommand();
      return;
    }

    if (action === 'version') {
      await runVersionCommand();
      return;
    }

    if (action === 'doctor') {
      await runDoctorCommand();
      return;
    }

    if (action === 'inspect') {
      await runInspectCommand();
      return;
    }

    if (action === 'context') {
      await runContextCommand({ contextProfile: true });
      return;
    }

    if (action === 'favorites') {
      const favorites = await listFavoritePaths();
      if (!favorites.length) {
        console.log('No hay favoritos guardados todavia.');
        return;
      }
      await runContextCommand({ contextAction: 'list-favorites' });
      return;
    }

    if (action === 'search') {
      const pattern = await chooseSearchPatternFromMenu();
      await runSearchCommand({ pattern, scope: '' });
      return;
    }

    if (action === 'explain') {
      await runExplainCommand({ topic: '' });
      return;
    }

    if (action === 'tree') {
      const target = await chooseTreeTargetFromMenu();
      await runTreeCommand({ target, scope: '', depth: 2 });
      return;
    }

    if (action === 'safe-shell') {
      await runSafeShellCommand();
      return;
    }

    if (action === 'settings') {
      await runSettingsMenu();
      continue;
    }

    if (action === 'exit') {
      console.log('Saliendo de Xzp.');
      return;
    }
  }
}

async function runSettingsMenu() {
  while (true) {
    const config = await loadUserConfig();
    const action = await chooseSettingsAction(config, config.menu?.visualMode || 'cards');

    if (action === 'back') {
      return;
    }

    if (action === 'platform-mode') {
      const currentMode = formatPlatformMode(resolvePlatformMode(config));
      const mode = await choosePlatformMode(currentMode);

      if (mode === 'back') {
        continue;
      }

      await setPlatformMode(mode);
      console.log('Modo de plataforma: ' + formatPlatformModeLabel(mode) + '.');
      console.log('');
      continue;
    }

    if (action === 'toggle-android-shortcut') {
      const toggle = await chooseFeatureToggle(
        config.features.androidShortcut,
        'Acceso rapido',
        'permite usar xzp -a en Termux o Linux',
      );

      if (toggle === 'back') {
        continue;
      }

      const enabled = toggle === 'enable';
      await setFeatureEnabled('androidShortcut', enabled);
      console.log(`Acceso rapido: ${enabled ? 'activado' : 'desactivado'}.`);
      console.log('');
      continue;
    }

    if (action === 'toggle-project-badge') {
      const toggle = await chooseFeatureToggle(
        config.features.projectBadge,
        'Detector de proyecto y color',
        'muestra el tipo de proyecto actual con color segun lenguaje',
      );

      if (toggle === 'back') {
        continue;
      }

      const enabled = toggle === 'enable';
      await setFeatureEnabled('projectBadge', enabled);
      console.log(`Detector de proyecto y color: ${enabled ? 'activado' : 'desactivado'}.`);
      console.log('');
      continue;
    }

    if (action === 'prompt-context-position') {
      const position = await choosePromptContextPosition(config.ui?.promptContextPosition || 'right');

      if (position === 'back') {
        continue;
      }

      await setPromptContextPosition(position);
      console.log('Posicion del contexto del prompt: ' + formatPromptContextPosition(position) + '.');
      console.log('');
      continue;
    }

    if (action === 'prompt-theme') {
      const theme = await choosePromptTheme(config.ui?.promptTheme || 'ocean');

      if (theme === 'back') {
        continue;
      }

      await setPromptTheme(theme);
      console.log('Tema visual del prompt: ' + theme + '.');
      console.log('');
      continue;
    }

    if (action === 'toggle-smart-project-install') {
      const toggle = await chooseFeatureToggle(
        config.features.smartProjectInstall,
        'Instalacion segura de proyectos',
        'rescata instalaciones y puede instalar runtimes con pkg en Termux',
      );

      if (toggle === 'back') {
        continue;
      }

      const enabled = toggle === 'enable';
      await setFeatureEnabled('smartProjectInstall', enabled);
      console.log(`Instalacion segura de proyectos: ${enabled ? 'activado' : 'desactivado'}.`);
      console.log('');
      continue;
    }

    if (action === 'menu-visual-mode') {
      const mode = await chooseMenuVisualMode(config.menu?.visualMode || 'cards');

      if (mode === 'back') {
        continue;
      }

      await setMenuVisualMode(mode);
      console.log('Modo visual del menu: ' + mode + '.');
      console.log('');
    }
  }
}

function formatPromptContextPosition(position) {
  if (position === 'inline') {
    return 'inline junto a la ruta';
  }

  if (position === 'off') {
    return 'oculto';
  }

  return 'a la derecha';
}

function formatPlatformModeLabel(mode) {
  if (mode === 'linux') {
    return 'linux';
  }

  if (mode === 'termux') {
    return 'termux';
  }

  return 'auto';
}
