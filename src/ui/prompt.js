import fs from 'node:fs/promises';
import path from 'node:path';
import readline, { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';
import { getDefaultLocale, t, tList } from '../core/i18n.js';
import { detectProjectDirectorySignature } from '../utils/project-context.js';

const ANSI = {
  altScreenOn: '\x1b[?1049h',
  altScreenOff: '\x1b[?1049l',
  cursorHide: '\x1b[?25l',
  cursorShow: '\x1b[?25h',
  clearScreen: '\x1b[2J',
  clearScrollback: '\x1b[3J',
  cursorHome: '\x1b[H',
  clearDown: '\x1b[0J',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  reset: '\x1b[0m',
  slate: '\x1b[38;5;245m',
  steel: '\x1b[38;5;110m',
  ice: '\x1b[38;5;153m',
  mint: '\x1b[38;5;121m',
  violet: '\x1b[38;5;147m',
  amber: '\x1b[38;5;179m',
  red: '\x1b[38;5;203m',
  white: '\x1b[38;5;255m',
};

const DIRECTORY_SIGNATURE_CACHE_LIMIT = 200;

let activeInteractiveSession = null;
let interactiveSessionCounter = 0;
let ACTIVE_PROMPT_LOCALE = getDefaultLocale();

export async function chooseSearchScope(options, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  return chooseNumericOption({
    title: t(locale, 'prompt.searchScope.title', 'Elige donde quieres buscar'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => [option.label, option.description, option.root],
    prompt: t(locale, 'prompt.searchScope.prompt', 'Scope [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOptionOrKey', 'Opcion no valida. Usa un numero o una clave valida.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
  });
}

export async function chooseExplainTopic(entries, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const topics = Object.keys(entries).map((topic) => ({ topic }));

  return chooseNumericOption({
    title: t(locale, 'prompt.explainTopic.title', 'Elige un comando para explicar'),
    options: topics,
    getValue: (option) => option.topic,
    getLines: (option) => [option.topic],
    prompt: t(locale, 'prompt.explainTopic.prompt', 'Tema [1-{count}, nombre, Enter=1]: ', { count: topics.length }),
    errorMessage: t(locale, 'prompt.explainTopic.error', 'Opcion no valida. Usa un numero o el nombre del comando.'),
    directMatch: (answer) => topics.find((option) => option.topic === answer.toLowerCase())?.topic,
  });
}

export async function chooseMenuAction(visualMode = 'cards', locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.menu.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.menu.title', 'Xzp Menu'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => [option.label, option.hint],
    prompt: t(locale, 'prompt.menu.prompt', 'Opcion [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidMenuOption', 'Opcion no valida. Usa un numero valido del menu.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: visualMode === 'compact' ? 'simple' : 'card',
    introLines: [t(locale, 'prompt.menu.intro', 'Centro rapido para navegar, revisar version y entrar al modo seguro.')],
  });
}

export async function chooseLocale(currentLocale, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.locale.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.locale.title', 'Lenguaje'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.locale.prompt', 'Idioma [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToFour', 'Opcion no valida. Usa 1, 2, 3 o 4.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [t(locale, 'prompt.common.currentValue', 'Actual: {value}', { value: currentLocale || 'co_es' })],
  });
}

export async function chooseSettingsAction(config, visualMode = 'cards', locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = [
    {
      key: 'platform-mode',
      label: t(locale, 'prompt.settings.options.platformMode.label', 'Modo de plataforma'),
      status: formatPlatformMode(config.runtime?.platformMode || 'auto', locale),
      usage: t(locale, 'prompt.settings.options.platformMode.usage', 'elige auto, termux o linux'),
    },
    {
      key: 'toggle-android-shortcut',
      label: t(locale, 'prompt.settings.options.androidShortcut.label', 'Acceso rapido'),
      status: formatStatus(config.features.androidShortcut, locale),
      usage: t(locale, 'prompt.settings.options.androidShortcut.usage', 'permite xzp -a en Termux o Linux'),
    },
    {
      key: 'toggle-project-badge',
      label: t(locale, 'prompt.settings.options.projectBadge.label', 'Detector de proyecto y color'),
      status: formatStatus(config.features.projectBadge, locale),
      usage: t(locale, 'prompt.settings.options.projectBadge.usage', 'muestra lenguaje y color dentro de Xzp'),
    },
    {
      key: 'prompt-context-position',
      label: t(locale, 'prompt.settings.options.promptContextPosition.label', 'Posicion del contexto del prompt'),
      status: formatPromptPosition(config.ui?.promptContextPosition || 'right', locale),
      usage: t(locale, 'prompt.settings.options.promptContextPosition.usage', 'elige derecha, inline junto a la ruta o desactivado'),
    },
    {
      key: 'prompt-theme',
      label: t(locale, 'prompt.settings.options.promptTheme.label', 'Tema visual del prompt'),
      status: formatPromptTheme(config.ui?.promptTheme || 'ocean'),
      usage: t(locale, 'prompt.settings.options.promptTheme.usage', 'elige ocean, forest, ember o mono'),
    },
    {
      key: 'toggle-smart-project-install',
      label: t(locale, 'prompt.settings.options.smartProjectInstall.label', 'Instalacion segura de proyectos'),
      status: formatStatus(config.features.smartProjectInstall, locale),
      usage: t(locale, 'prompt.settings.options.smartProjectInstall.usage', 'rescata instalaciones y usa modo seguro por lenguaje'),
    },
    {
      key: 'menu-visual-mode',
      label: t(locale, 'prompt.settings.options.menuVisualMode.label', 'Modo visual del menu'),
      status: config.menu?.visualMode || 'cards',
      usage: t(locale, 'prompt.settings.options.menuVisualMode.usage', 'elige cards o compact para terminales mas densas'),
    },
    {
      key: 'back',
      label: t(locale, 'prompt.common.backToMainMenu', 'Volver al menu principal'),
    },
  ];

  return chooseNumericOption({
    title: t(locale, 'prompt.settings.title', 'Ajustes de Xzp'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.currentRowPrefix', 'Actual : ') + option.status,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.settings.prompt', 'Ajuste [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidMenuOption', 'Opcion no valida. Usa un numero valido del menu.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: visualMode === 'compact' ? 'simple' : 'card',
    introLines: [t(locale, 'prompt.settings.intro', 'Activa solo lo que quieras ver todos los dias.')],
  });
}

export async function choosePromptContextPosition(currentPosition, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.promptContextPosition.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.promptContextPosition.title', 'Posicion del contexto del prompt'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.promptContextPosition.prompt', 'Posicion [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToFour', 'Opcion no valida. Usa 1, 2, 3 o 4.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [t(locale, 'prompt.common.currentValue', 'Actual: {value}', { value: formatPromptPosition(currentPosition, locale) })],
  });
}

export async function choosePlatformMode(currentMode, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.platformMode.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.platformMode.title', 'Modo de plataforma'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.platformMode.prompt', 'Modo [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToFour', 'Opcion no valida. Usa 1, 2, 3 o 4.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [t(locale, 'prompt.common.currentValue', 'Actual: {value}', { value: formatPlatformMode(currentMode, locale) })],
  });
}

export async function chooseFeatureToggle(currentValue, featureName, description, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = [
    {
      key: 'enable',
      label: t(locale, 'prompt.featureToggle.enableLabel', 'Activar'),
      usage: description,
    },
    {
      key: 'disable',
      label: t(locale, 'prompt.featureToggle.disableLabel', 'Desactivar'),
      usage: t(locale, 'prompt.featureToggle.disableUsage', 'oculta {feature} hasta volver a activarlo', {
        feature: featureName.toLowerCase(),
      }),
    },
    {
      key: 'back',
      label: t(locale, 'prompt.common.back', 'Volver'),
    },
  ];

  return chooseNumericOption({
    title: featureName,
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.featureToggle.prompt', 'Accion [1-{count}, Enter=3]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToThree', 'Opcion no valida. Usa 1, 2 o 3.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    defaultIndex: 2,
    style: 'card',
    introLines: [t(locale, 'prompt.common.currentValue', 'Actual: {value}', { value: formatStatus(currentValue, locale) })],
  });
}

export async function choosePromptTheme(currentTheme, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.promptTheme.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.promptTheme.title', 'Tema visual del prompt'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.promptTheme.prompt', 'Tema [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToFive', 'Opcion no valida. Usa 1, 2, 3, 4 o 5.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [t(locale, 'prompt.common.currentValue', 'Actual: {value}', { value: formatPromptTheme(currentTheme) })],
  });
}

export async function chooseMenuVisualMode(currentMode, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.menuVisualMode.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.menuVisualMode.title', 'Modo visual del menu'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
      ];
    },
    prompt: t(locale, 'prompt.menuVisualMode.prompt', 'Modo [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToThree', 'Opcion no valida. Usa 1, 2 o 3.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [t(locale, 'prompt.common.currentValue', 'Actual: {value}', { value: currentMode || 'cards' })],
  });
}

export async function choosePasteAction(locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = tList(locale, 'prompt.pasteAction.options', []).map((option) => ({ ...option }));

  return chooseNumericOption({
    title: t(locale, 'prompt.pasteAction.title', 'Accion al pegar'),
    options,
    getValue: (option) => option.key,
    getLines: (option) => [
      option.label,
      t(locale, 'prompt.common.usagePrefix', 'Uso    : ') + option.usage,
    ],
    prompt: t(locale, 'prompt.pasteAction.prompt', 'Accion [1-{count}, Enter=1]: ', { count: options.length }),
    errorMessage: t(locale, 'prompt.common.invalidOneToTwo', 'Opcion no valida. Usa 1 o 2.'),
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [t(locale, 'prompt.pasteAction.intro', 'El portapapeles de Xzp guarda una ruta de archivo o carpeta.')],
  });
}

export async function chooseUpdateAction(localVersion, latestVersion, locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const options = [
    {
      key: 'update',
      label: 'Actualizar ahora',
      hint: `Instalar version ${latestVersion} globalmente`,
    },
    {
      key: 'skip',
      label: 'Saltar',
      hint: 'Continuar con la version actual por esta vez',
    },
    {
      key: 'quit',
      label: 'Quitar',
      hint: 'Cancelar ejecucion',
    },
  ];

  return chooseNumericOption({
    title: 'Actualizacion de Xzp',
    options,
    getValue: (option) => option.key,
    getLines: (option) => [option.label, option.hint],
    prompt: 'Opcion [1-3, Enter=1]: ',
    errorMessage: 'Opcion no valida.',
    directMatch: (answer) => options.find((o) => o.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: [`Nueva version disponible: ${latestVersion}`, `Tu version actual: ${localVersion}`],
  });
}

export async function chooseSearchPatternFromMenu(locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const answer = String(await rl.question(t(locale, 'prompt.searchPattern.question', 'Patron a buscar: ')) || '').trim();

      if (answer) {
        return answer;
      }

      console.log(t(locale, 'prompt.searchPattern.required', 'Debes escribir algo para buscar.'));
    }
  } finally {
    rl.close();
  }
}

export async function chooseTreeTargetFromMenu(locale = getDefaultLocale()) {
  ACTIVE_PROMPT_LOCALE = locale;
  const rl = readline.createInterface({ input, output });

  try {
    const answer = String(await rl.question(t(locale, 'prompt.treeTarget.question', 'Ruta a mostrar [Enter=.]: ')) || '').trim();
    return answer || '.';
  } finally {
    rl.close();
  }
}

export async function chooseDirectoryNavigator({
  root,
  title = 'Xzp Navigator',
  emptyMessage = 'No hay carpetas visibles aqui.',
  pageSize = 10,
  locale = getDefaultLocale(),
}) {
  ACTIVE_PROMPT_LOCALE = locale;
  const initialRoot = path.resolve(root || process.cwd());

  if (!input.isTTY || !output.isTTY) {
    return initialRoot;
  }

  const state = {
    currentPath: initialRoot,
    selectedIndex: 0,
    pageIndex: 0,
    typed: '',
  };

  const session = beginInteractiveSession();
  emitKeypressEvents(input);
  const previousRawMode = Boolean(input.isRaw);
  if (typeof input.setRawMode === 'function') {
    input.setRawMode(true);
  }
  input.resume();

  return await new Promise((resolve, reject) => {
    let currentEntries = [];
    let maxPages = 1;
    let closed = false;
    let actionQueue = Promise.resolve();

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      input.off('keypress', onKeypress);
      if (typeof input.setRawMode === 'function') {
        input.setRawMode(previousRawMode);
      }
      input.pause();
      endInteractiveSession(session.id);
      clearScreenArea(0);
    };
    session.cleanup = cleanup;

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    const finish = (selectedPath) => {
      cleanup();
      resolve(path.resolve(selectedPath || state.currentPath));
    };

    const loadEntries = async () => {
      currentEntries = await readDirectoryNavigatorEntries(state.currentPath);
      if (closed || !isInteractiveSessionActive(session.id)) {
        return;
      }
      maxPages = Math.max(1, Math.ceil(currentEntries.length / pageSize));
      state.pageIndex = clamp(state.pageIndex, 0, maxPages - 1);
      state.selectedIndex = clamp(
        state.selectedIndex,
        0,
        Math.max(0, getCurrentPage(currentEntries, state.pageIndex, pageSize).length - 1),
      );
    };

    const render = async () => {
      await loadEntries();
      if (closed || !isInteractiveSessionActive(session.id)) {
        return;
      }
      clearScreenArea(0);
      renderDirectoryNavigatorScreen({
        title,
        currentPath: state.currentPath,
        entries: currentEntries,
        pageIndex: state.pageIndex,
        pageSize,
        selectedIndex: state.selectedIndex,
        typed: state.typed,
        emptyMessage,
        locale,
      });
    };

    const moveToParent = async () => {
      const parent = path.dirname(state.currentPath);
      if (parent !== state.currentPath) {
        state.currentPath = parent;
        state.pageIndex = 0;
        state.selectedIndex = 0;
        state.typed = '';
        await render();
      }
    };

    const enterSelected = async () => {
      const pageItems = getCurrentPage(currentEntries, state.pageIndex, pageSize);
      const current = pageItems[state.selectedIndex] || null;

      if (!current) {
        finish(state.currentPath);
        return;
      }

      if (current.kind === 'action-select') {
        finish(state.currentPath);
        return;
      }

      if (current.kind === 'action-parent') {
        await moveToParent();
        return;
      }

      if (current.kind === 'directory') {
        state.currentPath = current.path;
        state.pageIndex = 0;
        state.selectedIndex = 0;
        state.typed = '';
        await render();
        return;
      }

      finish(state.currentPath);
    };

    const applyTypedFilter = async () => {
      const query = state.typed.trim().toLowerCase();
      if (!query) {
        return false;
      }

      await loadEntries();
      const index = currentEntries.findIndex((entry) => String(entry.label || '').toLowerCase().includes(query));
      state.typed = '';

      if (index === -1) {
        await render();
        return true;
      }

      state.pageIndex = Math.floor(index / pageSize);
      state.selectedIndex = index % pageSize;
      await render();
      return true;
    };

    const runSerialAction = (task) => {
      actionQueue = actionQueue
        .then(async () => {
          if (closed) {
            return;
          }

          await task();
        })
        .catch((error) => {
          fail(error);
        });
    };

    const onKeypress = (_str, key) => {
      runSerialAction(async () => {
        if (key?.ctrl && key.name === 'c') {
          fail(new Error(t(locale, 'prompt.common.operationCanceled', 'Operacion cancelada.')));
          return;
        }

        if (key?.ctrl && key.name === 'g') {
          finish(state.currentPath);
          return;
        }

        if (key?.name === 'return') {
          if (state.typed) {
            await applyTypedFilter();
            return;
          }

          await enterSelected();
          return;
        }

        if (key?.name === 'escape' || key?.name === 'left') {
          await moveToParent();
          return;
        }

        if (key?.name === 'right') {
          await enterSelected();
          return;
        }

        if (key?.name === 'up') {
          state.selectedIndex = wrapIndex(state.selectedIndex - 1, getCurrentPage(currentEntries, state.pageIndex, pageSize).length);
          await render();
          return;
        }

        if (key?.name === 'down') {
          state.selectedIndex = wrapIndex(state.selectedIndex + 1, getCurrentPage(currentEntries, state.pageIndex, pageSize).length);
          await render();
          return;
        }

        if (key?.name === 'pageup') {
          if (state.pageIndex > 0) {
            state.pageIndex -= 1;
            state.selectedIndex = 0;
            await render();
          }
          return;
        }

        if (key?.name === 'pagedown') {
          if (state.pageIndex < maxPages - 1) {
            state.pageIndex += 1;
            state.selectedIndex = 0;
            await render();
          }
          return;
        }

        if (key?.name === 'backspace' || key?.name === 'delete') {
          state.typed = state.typed.slice(0, -1);
          await render();
          return;
        }

        if (key?.sequence && /^[1-9]$/.test(key.sequence)) {
          const index = Number.parseInt(key.sequence, 10) - 1;
          const pageItems = getCurrentPage(currentEntries, state.pageIndex, pageSize);
          if (pageItems[index]) {
            state.selectedIndex = index;
            await enterSelected();
          }
          return;
        }

        if (key?.sequence && /^[0-9a-zA-Z._ -]$/.test(key.sequence)) {
          state.typed += key.sequence;
          await render();
        }
      });
    };

    input.on('keypress', onKeypress);
    render().catch(fail);
  });
}

async function chooseNumericOption({
  title,
  options,
  getValue,
  getLines,
  prompt,
  errorMessage,
  directMatch,
  defaultIndex = 0,
  style = 'simple',
  introLines = [],
  pageSize = 9,
}) {
  if (!input.isTTY || !output.isTTY) {
    return chooseNumericOptionFallback({
      title,
      options,
      getValue,
      getLines,
      prompt,
      errorMessage,
      directMatch,
      defaultIndex,
      style,
      introLines,
    });
  }

  return chooseNumericOptionInteractive({
    title,
    options,
    getValue,
    getLines,
    errorMessage,
    directMatch,
    defaultIndex,
    style,
    introLines,
    pageSize,
  });
}

async function chooseNumericOptionFallback({
  title,
  options,
  getValue,
  getLines,
  prompt,
  errorMessage,
  directMatch,
  defaultIndex,
  style,
  introLines,
}) {
  const rl = readline.createInterface({ input, output });

  try {
    renderOptionScreen({
      title,
      options,
      getLines,
      style,
      introLines,
      pageIndex: 0,
      pageSize: options.length,
      selectedIndex: defaultIndex,
      showPagination: false,
    });

    while (true) {
      const answer = String(await rl.question(prompt) || '').trim();
      const selectedValue = resolveAnswer(answer, options, getValue, directMatch, defaultIndex);

      if (selectedValue) {
        return selectedValue;
      }

      console.log(colorize(errorMessage, 'red'));
    }
  } finally {
    rl.close();
  }
}

async function chooseNumericOptionInteractive({
  title,
  options,
  getValue,
  getLines,
  errorMessage,
  directMatch,
  defaultIndex,
  style,
  introLines,
  pageSize,
}) {
  const state = {
    pageIndex: 0,
    selectedIndex: 0,
    typed: '',
  };

  const pageCount = Math.max(1, Math.ceil(options.length / pageSize));
  state.selectedIndex = clamp(defaultIndex, 0, Math.max(0, getCurrentPage(options, state.pageIndex, pageSize).length - 1));

  const session = beginInteractiveSession();
  emitKeypressEvents(input);
  const previousRawMode = Boolean(input.isRaw);
  if (typeof input.setRawMode === 'function') {
    input.setRawMode(true);
  }
  input.resume();

  const lineCount = computeRenderLines({
    title,
    options,
    getLines,
    style,
    introLines,
    pageSize,
    pageIndex: state.pageIndex,
    selectedIndex: state.selectedIndex,
    showPagination: pageCount > 1,
  });

  return await new Promise((resolve, reject) => {
    let closed = false;

    const cleanup = () => {
      if (closed) {
        return;
      }

      closed = true;
      input.off('keypress', onKeypress);
      if (typeof input.setRawMode === 'function') {
        input.setRawMode(previousRawMode);
      }
      input.pause();
      endInteractiveSession(session.id);
      clearScreenArea(lineCount);
    };
    session.cleanup = cleanup;

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    const render = () => {
      if (!isInteractiveSessionActive(session.id)) {
        return;
      }

      clearScreenArea(lineCount);
      renderOptionScreen({
        title,
        options,
        getLines,
        style,
        introLines,
        pageIndex: state.pageIndex,
        pageSize,
        selectedIndex: state.selectedIndex,
        showPagination: pageCount > 1,
        typed: state.typed,
      });
    };

    const selectCurrent = () => {
      const pageItems = getCurrentPage(options, state.pageIndex, pageSize);
      const current = pageItems[state.selectedIndex] || pageItems[0];

      if (!current) {
        return;
      }

      finish(getValue(current));
    };

    const escapeValue = resolveEscapeValue(options, getValue);

    const handleTypedSelection = () => {
      const answer = state.typed.trim();
      if (!answer) {
        return false;
      }

      const selectedValue = resolveAnswer(answer, options, getValue, directMatch, defaultIndex);
      if (!selectedValue) {
        console.log(colorize(errorMessage, 'yellow'));
        state.typed = '';
        render();
        return true;
      }

      finish(selectedValue);
      return true;
    };

    const onKeypress = (_str, key) => {
      if (key?.ctrl && key.name === 'c') {
        fail(new Error(t(locale, 'prompt.common.operationCanceled', 'Operacion cancelada.')));
        return;
      }

      if (key?.name === 'return') {
        if (state.typed) {
          handleTypedSelection();
          return;
        }

        selectCurrent();
        return;
      }

      if (key?.name === 'escape') {
        if (escapeValue) {
          finish(escapeValue);
          return;
        }

        fail(new Error(t(locale, 'prompt.common.operationCanceled', 'Operacion cancelada.')));
        return;
      }

      if (key?.name === 'up') {
        state.selectedIndex = wrapIndex(state.selectedIndex - 1, getCurrentPage(options, state.pageIndex, pageSize).length);
        render();
        return;
      }

      if (key?.name === 'down') {
        state.selectedIndex = wrapIndex(state.selectedIndex + 1, getCurrentPage(options, state.pageIndex, pageSize).length);
        render();
        return;
      }

      if (key?.name === 'left' || key?.name === 'pageup') {
        if (state.pageIndex > 0) {
          state.pageIndex -= 1;
          state.selectedIndex = 0;
          state.typed = '';
          render();
        }
        return;
      }

      if (key?.name === 'right' || key?.name === 'pagedown') {
        if (state.pageIndex < pageCount - 1) {
          state.pageIndex += 1;
          state.selectedIndex = 0;
          state.typed = '';
          render();
        }
        return;
      }

      if (key?.name === 'backspace' || key?.name === 'delete') {
        state.typed = state.typed.slice(0, -1);
        render();
        return;
      }

      if (key?.name === 'home') {
        state.pageIndex = 0;
        state.selectedIndex = 0;
        state.typed = '';
        render();
        return;
      }

      if (key?.name === 'end') {
        state.pageIndex = pageCount - 1;
        state.selectedIndex = 0;
        state.typed = '';
        render();
        return;
      }

      if (key?.sequence && /^[1-9]$/.test(key.sequence)) {
        const index = Number.parseInt(key.sequence, 10) - 1;
        const pageItems = getCurrentPage(options, state.pageIndex, pageSize);
        if (pageItems[index]) {
          finish(getValue(pageItems[index]));
          return;
        }
      }

      if (key?.sequence && /^[0-9a-zA-Z_-]$/.test(key.sequence)) {
        state.typed += key.sequence;
        render();
      }
    };

    input.on('keypress', onKeypress);
    render();
  });
}

function renderOptionScreen({
  title,
  options,
  getLines,
  style,
  introLines,
  pageIndex,
  pageSize,
  selectedIndex,
  showPagination,
  typed = '',
}) {
  const pageItems = getCurrentPage(options, pageIndex, pageSize);
  const totalPages = Math.max(1, Math.ceil(options.length / pageSize));
  const pageNumber = pageIndex + 1;

  const frame = [
    colorize('╭──────────────────────────────────────╮', 'steel'),
    colorize('│ ' + title.padEnd(36, ' ') + ' │', 'ice', 'bold'),
    colorize('╰──────────────────────────────────────╯', 'steel'),
    colorize(
      t(ACTIVE_PROMPT_LOCALE, 'prompt.common.paginationHeader', '  Pagina {page}/{total}  ·  Flechas navegar  ·  Enter elegir  ·  Esc volver', {
        page: pageNumber,
        total: totalPages,
      }),
      'slate',
    ),
  ];
  if (showPagination) {
    frame.push(colorize(t(ACTIVE_PROMPT_LOCALE, 'prompt.common.paginationFooter', '  ←/PgUp pagina anterior  ·  →/PgDn pagina siguiente'), 'slate'));
  }
  if (typed) {
    frame.push(colorize(t(ACTIVE_PROMPT_LOCALE, 'prompt.common.activeFilter', '  Filtro activo  {value}', { value: typed }), 'steel'));
  }
  frame.push('');

  for (const line of introLines) {
    frame.push(colorize('  ' + line, 'slate'));
  }

  if (introLines.length) {
    frame.push('');
  }

  pageItems.forEach((option, index) => {
    const lines = getLines(option);
    const selected = index === selectedIndex;
    const tone = selected ? 'ice' : 'white';
    const edge = selected ? colorize('▌', 'mint', 'bold') : colorize('·', 'slate');
    const badge = selected
      ? colorize(' ' + String(index + 1).padStart(2, '0') + ' ', 'mint', 'bold')
      : colorize(' ' + String(index + 1).padStart(2, '0') + ' ', 'steel', 'bold');

    if (style === 'card') {
      frame.push(edge + ' ' + badge + ' ' + colorize(lines[0], tone, selected ? 'bold' : ''));
      for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
        frame.push('  ' + colorize('│', selected ? 'mint' : 'slate') + ' ' + colorize(lines[lineIndex], 'slate'));
      }
      frame.push('  ' + colorize('└────────────────────────────────────', selected ? 'mint' : 'slate'));
      frame.push('');
      return;
    }

    frame.push(edge + ' ' + badge + ' ' + colorize(lines[0], tone, selected ? 'bold' : ''));
    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      frame.push('    ' + colorize(lines[lineIndex], 'slate'));
    }
  });

  frame.push('');
  writeInteractiveFrame(frame);
}
function computeRenderLines({
  options,
  getLines,
  style,
  introLines,
  pageSize,
  pageIndex,
  showPagination,
}) {
  const pageItems = getCurrentPage(options, pageIndex, pageSize);
  let lines = 5 + introLines.length;

  if (showPagination) {
    lines += 1;
  }

  if (pageItems.length) {
    lines += 1;
  }

  for (const option of pageItems) {
    lines += getLines(option).length;
    if (style === 'card') {
      lines += 1;
    }
  }

  lines += 2;
  return lines;
}

function getCurrentPage(options, pageIndex, pageSize) {
  const start = pageIndex * pageSize;
  return options.slice(start, start + pageSize);
}

function resolveEscapeValue(options, getValue) {
  const backOption = options.find((option) => option.key === 'back');
  if (backOption) {
    return getValue(backOption);
  }

  const exitOption = options.find((option) => option.key === 'exit');
  if (exitOption) {
    return getValue(exitOption);
  }

  return null;
}

function resolveAnswer(answer, options, getValue, directMatch, defaultIndex) {
  if (!answer) {
    const fallback = options[defaultIndex] || options[0];
    return fallback ? getValue(fallback) : '';
  }

  const directValue = typeof directMatch === 'function' ? directMatch(answer) : '';
  if (directValue) {
    return directValue;
  }

  if (/^[1-9]\d*$/.test(answer)) {
    const numericIndex = Number.parseInt(answer, 10) - 1;
    const option = options[numericIndex];
    return option ? getValue(option) : '';
  }

  return '';
}

function wrapIndex(index, length) {
  if (!length) {
    return 0;
  }

  if (index < 0) {
    return length - 1;
  }

  if (index >= length) {
    return 0;
  }

  return index;
}

function clearScreenArea(lineCount) {
  if (!input.isTTY || !output.isTTY) {
    return;
  }

  output.write(ANSI.cursorHome + ANSI.clearScreen + ANSI.clearDown);
}

async function readDirectoryNavigatorEntries(currentPath) {
  const entries = [];
  entries.push({
    key: 'select-current',
    label: '[[useCurrentFolder]]',
    lines: [
      currentPath,
      '[[useCurrentFolderHint]]',
    ],
    kind: 'action-select',
    path: currentPath,
  });

  const parent = path.dirname(currentPath);
  if (parent !== currentPath) {
    entries.push({
      key: 'parent',
      label: '..',
      lines: [
        parent,
        '[[goParentHint]]',
      ],
      kind: 'action-parent',
      path: parent,
    });
  }

  let visibleEntries = [];
  try {
    visibleEntries = await fs.readdir(currentPath, { withFileTypes: true });
  } catch {
    return entries;
  }

  const directories = visibleEntries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .sort((left, right) => left.name.localeCompare(right.name, 'es', { sensitivity: 'base' }));

  const normalizedDirectories = await Promise.all(directories.map(async (entry) => {
    const directoryPath = path.join(currentPath, entry.name);
    const signature = await getCachedDirectorySignature(directoryPath);
    const badge = signature?.label ? '[' + signature.label + ']' : '';

    return {
      key: directoryPath,
      label: badge ? entry.name + ' ' + badge : entry.name,
      lines: [
        directoryPath,
        badge ? '[[detectedProject]] ' + badge : '[[navigableFolder]]',
      ],
      kind: 'directory',
      path: directoryPath,
    };
  }));

  return [...entries, ...normalizedDirectories];
}

const directorySignatureCache = new Map();

function beginInteractiveSession() {
  activeInteractiveSession?.cleanup();

  const id = String(++interactiveSessionCounter);
  const session = {
    id,
    cleanup: () => {},
  };

  activeInteractiveSession = session;
  enterInteractiveScreen();
  return session;
}

function endInteractiveSession(sessionId) {
  if (activeInteractiveSession?.id === sessionId) {
    leaveInteractiveScreen();
    activeInteractiveSession = null;
  }
}

function isInteractiveSessionActive(sessionId) {
  return activeInteractiveSession?.id === sessionId;
}

async function getCachedDirectorySignature(directoryPath) {
  const cacheKey = path.resolve(directoryPath);

  if (directorySignatureCache.has(cacheKey)) {
    const cached = directorySignatureCache.get(cacheKey);
    directorySignatureCache.delete(cacheKey);
    directorySignatureCache.set(cacheKey, cached);
    return cached;
  }

  const signature = await detectProjectDirectorySignature(cacheKey).catch(() => null);
  directorySignatureCache.set(cacheKey, signature);

  if (directorySignatureCache.size > DIRECTORY_SIGNATURE_CACHE_LIMIT) {
    const oldestKey = directorySignatureCache.keys().next().value;
    if (oldestKey) {
      directorySignatureCache.delete(oldestKey);
    }
  }

  return signature;
}

function renderDirectoryNavigatorScreen({
  title,
  currentPath,
  entries,
  pageIndex,
  pageSize,
  selectedIndex,
  typed,
  emptyMessage,
  locale = getDefaultLocale(),
}) {
  const pageItems = getCurrentPage(entries, pageIndex, pageSize);
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));

  const lines = [
    colorize('╭──────────────────────────────────────╮', 'steel'),
    colorize('│ ' + title.padEnd(36, ' ') + ' │', 'ice', 'bold'),
    colorize('╰──────────────────────────────────────╯', 'steel'),
    colorize(t(locale, 'prompt.navigator.controls', '  ↑/↓ mover  ·  Enter/→ entrar  ·  Esc/← subir  ·  Ctrl+G usar ruta'), 'slate'),
    colorize(t(locale, 'prompt.navigator.currentPath', '  Ruta actual  {path}', { path: currentPath }), 'slate'),
    colorize(t(locale, 'prompt.navigator.page', '  Pagina {page}/{total}', { page: pageIndex + 1, total: totalPages }), 'slate'),
  ];
  if (typed) {
    lines.push(colorize(t(locale, 'prompt.common.activeFilter', '  Filtro activo  {value}', { value: typed }), 'steel'));
  }
  lines.push('');

  if (!pageItems.length) {
    lines.push(colorize('  ' + emptyMessage, 'amber'));
    lines.push('');
    writeInteractiveFrame(lines);
    return;
  }

  pageItems.forEach((entry, index) => {
    const isSelected = index === selectedIndex;
    const tone = isSelected ? 'ice' : 'white';
    const edge = isSelected ? colorize('▌', 'mint', 'bold') : colorize('·', 'slate');
    const badge = isSelected
      ? colorize(' ' + String(index + 1).padStart(2, '0') + ' ', 'mint', 'bold')
      : colorize(' ' + String(index + 1).padStart(2, '0') + ' ', 'steel', 'bold');

    lines.push(edge + ' ' + badge + ' ' + colorize(resolvePromptToken(entry.label, locale), tone, isSelected ? 'bold' : ''));
    for (const line of entry.lines || []) {
      lines.push('  ' + colorize('│', isSelected ? 'mint' : 'slate') + ' ' + colorize(resolvePromptToken(line, locale), 'slate'));
    }
    lines.push('  ' + colorize('└────────────────────────────────────', isSelected ? 'mint' : 'slate'));
    lines.push('');
  });

  writeInteractiveFrame(lines);
}
function clamp(value, min, max) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function formatStatus(enabled, locale = getDefaultLocale()) {
  const text = enabled
    ? t(locale, 'prompt.common.enabled', 'activado')
    : t(locale, 'prompt.common.disabled', 'desactivado');

  if (!output.isTTY) {
    return text;
  }

  const color = enabled ? 'green' : 'red';
  return colorize(text, color, 'bold');
}

function formatPromptPosition(position, locale = getDefaultLocale()) {
  if (position === 'inline') {
    return t(locale, 'prompt.common.promptPositionInline', 'inline');
  }

  if (position === 'off') {
    return t(locale, 'prompt.common.promptPositionOff', 'oculto');
  }

  return t(locale, 'prompt.common.promptPositionRight', 'derecha');
}

function formatPromptTheme(theme) {
  if (theme === 'forest') {
    return 'forest';
  }

  if (theme === 'ember') {
    return 'ember';
  }

  if (theme === 'mono') {
    return 'mono';
  }

  return 'ocean';
}

function formatPlatformMode(mode, locale = getDefaultLocale()) {
  if (mode === 'linux') {
    return t(locale, 'prompt.common.platformLinux', 'linux');
  }

  if (mode === 'termux') {
    return t(locale, 'prompt.common.platformTermux', 'termux');
  }

  return t(locale, 'prompt.common.platformAuto', 'auto');
}

function resolvePromptToken(value, locale = getDefaultLocale()) {
  return String(value || '')
    .replace('[[useCurrentFolder]]', t(locale, 'prompt.navigator.useCurrentFolder', 'Usar esta carpeta'))
    .replace('[[useCurrentFolderHint]]', t(locale, 'prompt.navigator.useCurrentFolderHint', 'Abre la shell aqui y copia esta ruta al portapapeles de Xzp.'))
    .replace('[[goParentHint]]', t(locale, 'prompt.navigator.goParentHint', 'Sube a la carpeta padre.'))
    .replace('[[detectedProject]]', t(locale, 'prompt.navigator.detectedProject', 'Proyecto detectado'))
    .replace('[[navigableFolder]]', t(locale, 'prompt.navigator.navigableFolder', 'Carpeta navegable'));
}

function colorize(text, color, weight = '') {
  if (!output.isTTY) {
    return text;
  }

  const parts = [];
  if (weight && ANSI[weight]) {
    parts.push(ANSI[weight]);
  }
  if (color && ANSI[color]) {
    parts.push(ANSI[color]);
  }
  parts.push(text, ANSI.reset);
  return parts.join('');
}

function enterInteractiveScreen() {
  if (!input.isTTY || !output.isTTY) {
    return;
  }

  output.write(
    ANSI.altScreenOn
      + ANSI.cursorHide
      + ANSI.cursorHome
      + ANSI.clearScreen
      + ANSI.clearScrollback
      + ANSI.clearDown,
  );
}

function leaveInteractiveScreen() {
  if (!input.isTTY || !output.isTTY) {
    return;
  }

  output.write(ANSI.cursorShow + ANSI.altScreenOff);
}

function writeInteractiveFrame(lines) {
  if (!output.isTTY) {
    output.write(lines.join('\n') + '\n');
    return;
  }

  output.write(
    ANSI.cursorHome
      + ANSI.clearScreen
      + ANSI.clearDown
      + lines.join('\n')
      + '\n',
  );
}
