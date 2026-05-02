import {
  listFavoritePaths,
  loadUserConfig,
  setLocale,
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
  chooseLocale,
  chooseMenuAction,
  chooseMenuVisualMode,
  choosePlatformMode,
  choosePromptContextPosition,
  choosePromptTheme,
  chooseSearchPatternFromMenu,
  chooseSettingsAction,
  chooseTreeTargetFromMenu,
} from '../ui/prompt.js';
import { t } from '../core/i18n.js';
import { printHelp } from '../ui/output.js';

export async function runMenuCommand() {
  while (true) {
    const config = await loadUserConfig();
    const locale = config.ui?.locale || 'co_es';
    const action = await chooseMenuAction(config.menu?.visualMode || 'cards', locale);
    await setMenuLastAction(action);

    if (action === 'language') {
      const selectedLocale = await chooseLocale(config.ui?.locale || 'co_es', locale);

      if (selectedLocale === 'back') {
        continue;
      }

      await setLocale(selectedLocale);
      console.log(t(locale, 'menu.localeChanged', 'Idioma activo: {value}.', { value: selectedLocale }));
      console.log('');
      continue;
    }

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
        console.log(t(locale, 'menu.noFavorites', 'No hay favoritos guardados todavia.'));
        return;
      }
      await runContextCommand({ contextAction: 'list-favorites' });
      return;
    }

    if (action === 'search') {
      const pattern = await chooseSearchPatternFromMenu(locale);
      await runSearchCommand({ pattern, scope: '' });
      return;
    }

    if (action === 'explain') {
      await runExplainCommand({ topic: '' });
      return;
    }

    if (action === 'tree') {
      const target = await chooseTreeTargetFromMenu(locale);
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
      console.log(t(locale, 'menu.exit', 'Saliendo de Xzp.'));
      return;
    }
  }
}

async function runSettingsMenu() {
  while (true) {
    const config = await loadUserConfig();
    const locale = config.ui?.locale || 'co_es';
    const action = await chooseSettingsAction(config, config.menu?.visualMode || 'cards', locale);

    if (action === 'back') {
      return;
    }

    if (action === 'platform-mode') {
      const currentMode = formatPlatformMode(resolvePlatformMode(config));
      const mode = await choosePlatformMode(currentMode, locale);

      if (mode === 'back') {
        continue;
      }

      await setPlatformMode(mode);
      console.log(t(locale, 'menu.platformModeChanged', 'Modo de plataforma: {value}.', { value: formatPlatformModeLabel(mode) }));
      console.log('');
      continue;
    }

    if (action === 'toggle-android-shortcut') {
      const toggle = await chooseFeatureToggle(
        config.features.androidShortcut,
        t(locale, 'menu.features.androidShortcut', 'Acceso rapido'),
        t(locale, 'menu.featureDescriptions.androidShortcut', 'permite usar xzp -a en Termux o Linux'),
        locale,
      );

      if (toggle === 'back') {
        continue;
      }

      const enabled = toggle === 'enable';
      await setFeatureEnabled('androidShortcut', enabled);
      console.log(t(locale, 'menu.featureStateChanged', '{feature}: {state}.', {
        feature: t(locale, 'menu.features.androidShortcut', 'Acceso rapido'),
        state: enabled ? t(locale, 'menu.enabled', 'activado') : t(locale, 'menu.disabled', 'desactivado'),
      }));
      console.log('');
      continue;
    }

    if (action === 'toggle-project-badge') {
      const toggle = await chooseFeatureToggle(
        config.features.projectBadge,
        t(locale, 'menu.features.projectBadge', 'Detector de proyecto y color'),
        t(locale, 'menu.featureDescriptions.projectBadge', 'muestra el tipo de proyecto actual con color segun lenguaje'),
        locale,
      );

      if (toggle === 'back') {
        continue;
      }

      const enabled = toggle === 'enable';
      await setFeatureEnabled('projectBadge', enabled);
      console.log(t(locale, 'menu.featureStateChanged', '{feature}: {state}.', {
        feature: t(locale, 'menu.features.projectBadge', 'Detector de proyecto y color'),
        state: enabled ? t(locale, 'menu.enabled', 'activado') : t(locale, 'menu.disabled', 'desactivado'),
      }));
      console.log('');
      continue;
    }

    if (action === 'prompt-context-position') {
      const position = await choosePromptContextPosition(config.ui?.promptContextPosition || 'right', locale);

      if (position === 'back') {
        continue;
      }

      await setPromptContextPosition(position);
      console.log(t(locale, 'menu.promptContextPositionChanged', 'Posicion del contexto del prompt: {value}.', {
        value: formatPromptContextPosition(position),
      }));
      console.log('');
      continue;
    }

    if (action === 'prompt-theme') {
      const theme = await choosePromptTheme(config.ui?.promptTheme || 'ocean', locale);

      if (theme === 'back') {
        continue;
      }

      await setPromptTheme(theme);
      console.log(t(locale, 'menu.promptThemeChanged', 'Tema visual del prompt: {value}.', { value: theme }));
      console.log('');
      continue;
    }

    if (action === 'toggle-smart-project-install') {
      const toggle = await chooseFeatureToggle(
        config.features.smartProjectInstall,
        t(locale, 'menu.features.smartProjectInstall', 'Instalacion segura de proyectos'),
        t(locale, 'menu.featureDescriptions.smartProjectInstall', 'rescata instalaciones y puede instalar runtimes con pkg en Termux'),
        locale,
      );

      if (toggle === 'back') {
        continue;
      }

      const enabled = toggle === 'enable';
      await setFeatureEnabled('smartProjectInstall', enabled);
      console.log(t(locale, 'menu.featureStateChanged', '{feature}: {state}.', {
        feature: t(locale, 'menu.features.smartProjectInstall', 'Instalacion segura de proyectos'),
        state: enabled ? t(locale, 'menu.enabled', 'activado') : t(locale, 'menu.disabled', 'desactivado'),
      }));
      console.log('');
      continue;
    }

    if (action === 'menu-visual-mode') {
      const mode = await chooseMenuVisualMode(config.menu?.visualMode || 'cards', locale);

      if (mode === 'back') {
        continue;
      }

      await setMenuVisualMode(mode);
      console.log(t(locale, 'menu.visualModeChanged', 'Modo visual del menu: {value}.', { value: mode }));
      console.log('');
    }
  }
}

function formatPromptContextPosition(position) {
  if (position === 'inline') {
    return 'inline';
  }

  if (position === 'off') {
    return 'off';
  }

  return 'right';
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
