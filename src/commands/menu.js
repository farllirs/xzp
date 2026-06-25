import {
  getAndroidConfig,
  listFavoritePaths,
  loadUserConfig,
  saveUserConfig,
  setAndroidSetting,
  setLocale,
  setFeatureEnabled,
  setMenuLastAction,
  setMenuVisualMode,
  setPlatformMode,
  setPromptContextPosition,
  setPromptTheme,
  setVisualTheme,
  toggleAndroidQuickAccess,
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
import { runVisualTestCommand } from './visual-test.js';
import { runClipboardClearCommand, runClipboardStatusCommand } from './clipboard.js';
import {
  chooseFeatureToggle,
  chooseLocale,
  chooseMainMenuAction,
  chooseFunctionAction,
  chooseMenuVisualMode,
  choosePlatformMode,
  chooseSearchPatternFromMenu,
  chooseSettingsAction,
  chooseTreeTargetFromMenu,
  chooseNumericOption,
} from '../ui/prompt.js';
import { t } from '../core/i18n.js';
import { printHelp, printSection, printKeyValueRows, getActiveVisualTheme } from '../ui/output.js';

export async function runMenuCommand() {
  while (true) {
    const config = await loadUserConfig();
    const locale = config.ui?.locale || 'co_es';
    const visualMode = config.menu?.visualMode || 'cards';
    const action = await chooseMainMenuAction(visualMode, locale);
    await setMenuLastAction(action);

    if (action === 'functions') {
      await runFunctionsMenu(visualMode, locale);
      continue;
    }

    if (action === 'locale') {
      const selectedLocale = await chooseLocale(locale, locale);
      if (selectedLocale && selectedLocale !== 'back') {
        await setLocale(selectedLocale);
        console.log(t(locale, 'menu.localeChanged', 'Idioma activo: {value}.', { value: selectedLocale }));
        console.log('');
      }
      continue;
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

async function runFunctionsMenu(visualMode, locale) {
  while (true) {
    const action = await chooseFunctionAction(visualMode, locale);

    switch (action) {
      case 'back':
        return;

      case 'doctor':
        await runDoctorCommand();
        return;

      case 'inspect':
        await runInspectCommand();
        return;

      case 'context':
        await runContextCommand({ contextProfile: true });
        return;

      case 'favorites': {
        const favorites = await listFavoritePaths();
        if (!favorites.length) {
          console.log(t(locale, 'menu.noFavorites', 'No hay favoritos guardados todavia.'));
          return;
        }
        await runContextCommand({ contextAction: 'list-favorites' });
        return;
      }

      case 'copy':
        await runCopyCommand({ copyMode: 'path', copyTarget: '' });
        return;

      case 'paste':
        await runPasteCommand({});
        return;

      case 'clipboard':
        await runClipboardStatusCommand();
        return;

      case 'clipboard-clear':
        await runClipboardClearCommand();
        return;

      case 'search': {
        const pattern = await chooseSearchPatternFromMenu(locale);
        await runSearchCommand({ pattern, scope: '' });
        return;
      }

      case 'explain':
        await runExplainCommand({ topic: '' });
        return;

      case 'tree': {
        const target = await chooseTreeTargetFromMenu(locale);
        await runTreeCommand({ target, scope: '', depth: 2 });
        return;
      }

      case 'safe-shell':
        await runSafeShellCommand();
        return;

      case 'visual-test':
        await runVisualTestCommand();
        return;

      case 'version':
        await runVersionCommand();
        return;

      case 'help': {
        const config = await loadUserConfig();
        printHelp(resolvePlatformMode(config));
        return;
      }

      default:
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

    if (action === 'theme-studio') {
      const { runThemeStudio } = await import('./theme-studio.js');
      await runThemeStudio({ runtimePreferences: config.ui, platformMode: resolvePlatformMode(config) });
      continue;
    }

    if (action === 'android-settings') {
      await showAndroidSettingsMenu(locale);
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

async function showAndroidSettingsMenu(locale) {
  while (true) {
    const config = await loadUserConfig();
    const android = config.android || {};

    const action = await chooseNumericOption({
      title: t(locale, 'menu.android.title', 'Configuración Android / Termux'),
      options: [
        {
          key: 'toggle-show-file-sizes',
          label: t(locale, 'menu.android.showFileSizes', 'Mostrar tamaños de archivo'),
          status: android.showFileSizes !== false ? '✅ activado' : '❌ desactivado',
        },
        {
          key: 'toggle-show-modified-date',
          label: t(locale, 'menu.android.showModifiedDate', 'Mostrar fecha de modificación'),
          status: android.showModifiedDate !== false ? '✅ activado' : '❌ desactivado',
        },
        {
          key: 'toggle-show-file-type',
          label: t(locale, 'menu.android.showFileType', 'Mostrar tipo de archivo'),
          status: android.showFileType !== false ? '✅ activado' : '❌ desactivado',
        },
        {
          key: 'toggle-persist-location',
          label: t(locale, 'menu.android.persistLastLocation', 'Persistir última ubicación'),
          status: android.persistLastLocation !== false ? '✅ activado' : '❌ desactivado',
        },
        {
          key: 'toggle-agent-integration',
          label: t(locale, 'menu.android.integrateWithAgent', 'Integrar con Modo Agente'),
          status: android.integrateWithAgent !== false ? '✅ activado' : '❌ desactivado',
        },
        {
          key: 'toggle-external-volumes',
          label: t(locale, 'menu.android.allowExternalVolumes', 'Permitir volúmenes externos'),
          status: android.allowExternalVolumes !== false ? '✅ activado' : '❌ desactivado',
        },
        {
          key: 'navigator-density',
          label: t(locale, 'menu.android.navigatorDensity', 'Densidad del navegador'),
          status: android.navigatorDensity || 'comfortable',
        },
        {
          key: 'edit-quick-access',
          label: t(locale, 'menu.android.editQuickAccess', 'Editar accesos rápidos'),
          status: (android.enabledQuickAccess || []).join(', ') || t(locale, 'menu.android.none', 'ninguno'),
        },
        {
          key: 'reset-defaults',
          label: t(locale, 'menu.android.resetDefaults', 'Restablecer valores por defecto'),
          status: '',
        },
        {
          key: 'back',
          label: t(locale, 'prompt.common.backToMainMenu', 'Volver al menú principal'),
        },
      ],
      getValue: (option) => option.key,
      getLines: (option) => {
        if (option.key === 'back' || option.key === 'reset-defaults') {
          return [option.label];
        }
        return [
          option.label,
          `  Estado: ${option.status}`,
        ];
      },
      prompt: t(locale, 'menu.android.prompt', 'Opción [1-{count}, Enter=1]: ', { count: 10 }),
      errorMessage: t(locale, 'menu.android.invalid', 'Opción no válida.'),
      directMatch: (answer) => null,
      defaultIndex: 0,
      style: 'card',
      introLines: [],
      locale,
      visualTheme: getActiveVisualTheme(),
    });

    if (action === 'back') return;

    if (action === 'toggle-show-file-sizes') {
      const current = android.showFileSizes !== false;
      await setAndroidSetting('showFileSizes', !current);
      continue;
    }

    if (action === 'toggle-show-modified-date') {
      const current = android.showModifiedDate !== false;
      await setAndroidSetting('showModifiedDate', !current);
      continue;
    }

    if (action === 'toggle-show-file-type') {
      const current = android.showFileType !== false;
      await setAndroidSetting('showFileType', !current);
      continue;
    }

    if (action === 'toggle-persist-location') {
      const current = android.persistLastLocation !== false;
      await setAndroidSetting('persistLastLocation', !current);
      continue;
    }

    if (action === 'toggle-agent-integration') {
      const current = android.integrateWithAgent !== false;
      await setAndroidSetting('integrateWithAgent', !current);
      continue;
    }

    if (action === 'toggle-external-volumes') {
      const current = android.allowExternalVolumes !== false;
      await setAndroidSetting('allowExternalVolumes', !current);
      continue;
    }

    if (action === 'navigator-density') {
      const newDensity = android.navigatorDensity === 'compact' ? 'comfortable' : 'compact';
      await setAndroidSetting('navigatorDensity', newDensity);
      continue;
    }

    if (action === 'edit-quick-access') {
      await showAndroidQuickAccessMenu(locale);
      continue;
    }

    if (action === 'reset-defaults') {
      await setAndroidSetting('showFileSizes', true);
      await setAndroidSetting('showModifiedDate', true);
      await setAndroidSetting('showFileType', true);
      await setAndroidSetting('persistLastLocation', true);
      await setAndroidSetting('integrateWithAgent', true);
      await setAndroidSetting('allowExternalVolumes', true);
      await setAndroidSetting('navigatorDensity', 'comfortable');
      await setAndroidSetting('enabledQuickAccess', [
        'shared', 'downloads', 'dcim', 'documents', 'pictures', 'screenshots', 'termux-home',
      ]);
      continue;
    }
  }
}

async function showAndroidQuickAccessMenu(locale) {
  const config = await loadUserConfig();
  const android = config.android || {};
  const currentQuickAccess = android.enabledQuickAccess || [];

  const allAccessOptions = [
    { key: 'shared', label: t(locale, 'menu.android.qaShared', 'shared (Almacenamiento compartido)') },
    { key: 'downloads', label: t(locale, 'menu.android.qaDownloads', 'downloads (Descargas)') },
    { key: 'dcim', label: t(locale, 'menu.android.qaDcim', 'dcim (Cámara)') },
    { key: 'documents', label: t(locale, 'menu.android.qaDocuments', 'documents (Documentos)') },
    { key: 'pictures', label: t(locale, 'menu.android.qaPictures', 'pictures (Imágenes)') },
    { key: 'screenshots', label: t(locale, 'menu.android.qaScreenshots', 'screenshots (Capturas)') },
    { key: 'termux-home', label: t(locale, 'menu.android.qaTermuxHome', 'termux-home (Home de Termux)') },
    { key: 'music', label: t(locale, 'menu.android.qaMusic', 'music (Música)') },
    { key: 'movies', label: t(locale, 'menu.android.qaMovies', 'movies (Películas)') },
    { key: 'back', label: t(locale, 'prompt.common.back', 'Volver') },
  ];

  while (true) {
    const updatedConfig = await loadUserConfig();
    const updatedQuickAccess = updatedConfig.android?.enabledQuickAccess || [];

    const action = await chooseNumericOption({
      title: t(locale, 'menu.android.qaTitle', 'Accesos rápidos Android'),
      options: allAccessOptions.map((opt) => ({
        ...opt,
        enabled: updatedQuickAccess.includes(opt.key),
      })),
      getValue: (option) => option.key,
      getLines: (option) => {
        if (option.key === 'back') return [option.label];
        const status = option.enabled ? '✅ activado' : '⬜ desactivado';
        return [
          option.label,
          `  ${status}`,
        ];
      },
      prompt: t(locale, 'menu.android.qaPrompt', 'Opción [1-{count}, Enter=10]: ', { count: allAccessOptions.length }),
      errorMessage: t(locale, 'menu.android.invalid', 'Opción no válida.'),
      directMatch: (answer) => null,
      defaultIndex: allAccessOptions.length - 1,
      style: 'card',
      introLines: [t(locale, 'menu.android.qaIntro', 'Selecciona qué accesos rápidos mostrar en el navegador Android.')],
      locale,
      visualTheme: getActiveVisualTheme(),
    });

    if (action === 'back') return;

    await toggleAndroidQuickAccess(action);
  }
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
