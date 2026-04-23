import readline, { emitKeypressEvents } from 'node:readline';
import { stdin as input, stdout as output } from 'node:process';

const ANSI = {
  clearDown: '[0J',
  cyan: '[36m',
  dim: '[2m',
  green: '[32m',
  red: '[31m',
  reset: '[0m',
  yellow: '[33m',
  bold: '[1m',
};

export async function chooseSearchScope(options) {
  return chooseNumericOption({
    title: 'Elige donde quieres buscar',
    options,
    getValue: (option) => option.key,
    getLines: (option) => [option.label, option.description, option.root],
    prompt: 'Scope [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa un numero o una clave valida.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
  });
}

export async function chooseExplainTopic(entries) {
  const topics = Object.keys(entries).map((topic) => ({ topic }));

  return chooseNumericOption({
    title: 'Elige un comando para explicar',
    options: topics,
    getValue: (option) => option.topic,
    getLines: (option) => [option.topic],
    prompt: 'Tema [1-' + topics.length + ', nombre, Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa un numero o el nombre del comando.',
    directMatch: (answer) => topics.find((option) => option.topic === answer.toLowerCase())?.topic,
  });
}

export async function chooseMenuAction(visualMode = 'cards') {
  const options = [
    { key: 'doctor', label: 'Doctor del entorno', hint: 'revisa shell, storage, config y herramientas visibles' },
    { key: 'inspect', label: 'Inspeccionar proyecto', hint: 'resume archivos clave y metadatos del proyecto actual' },
    { key: 'context', label: 'Contexto y perfil', hint: 'detecta stack, muestra perfil y recuerda proyectos recientes' },
    { key: 'favorites', label: 'Favoritos guardados', hint: 'lista rutas rapidas persistentes guardadas desde contexto' },
    { key: 'copy', label: 'Copiar ruta o nombre', hint: 'guarda la ruta actual en el portapapeles de Xzp' },
    { key: 'paste', label: 'Pegar contenido', hint: 'usa la ruta guardada y pregunta si mover o copiar' },
    { key: 'clipboard', label: 'Ver portapapeles', hint: 'muestra la ruta y el nombre guardados' },
    { key: 'clipboard-clear', label: 'Limpiar portapapeles', hint: 'borra el valor guardado por Xzp' },
    { key: 'search', label: 'Buscar archivos o carpetas', hint: 'encuentra rapido por nombre o patron' },
    { key: 'explain', label: 'Explicar un comando', hint: 'resume uso, riesgo y notas' },
    { key: 'tree', label: 'Ver arbol de una ruta', hint: 'muestra la estructura completa y marca proyectos' },
    { key: 'safe-shell', label: 'Entrar al modo seguro', hint: 'abre el proyecto con el entorno correcto' },
    { key: 'version', label: 'Ver version de Xzp', hint: 'compara local contra la version publicada' },
    { key: 'settings', label: 'Ajustes y funciones', hint: 'activa extras, plataforma y prompt' },
    { key: 'help', label: 'Ver ayuda', hint: 'muestra comandos y ejemplos' },
    { key: 'exit', label: 'Salir', hint: 'cerrar el menu' },
  ];

  return chooseNumericOption({
    title: 'Xzp Menu',
    options,
    getValue: (option) => option.key,
    getLines: (option) => [option.label, option.hint],
    prompt: 'Opcion [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa un numero valido del menu.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: visualMode === 'compact' ? 'simple' : 'card',
    introLines: ['Centro rapido para navegar, revisar version y entrar al modo seguro.'],
  });
}

export async function chooseSettingsAction(config, visualMode = 'cards') {
  const options = [
    {
      key: 'platform-mode',
      label: 'Modo de plataforma',
      status: formatPlatformMode(config.runtime?.platformMode || 'auto'),
      usage: 'elige auto, termux o linux',
    },
    {
      key: 'toggle-android-shortcut',
      label: 'Acceso rapido',
      status: formatStatus(config.features.androidShortcut),
      usage: 'permite xzp -a en Termux o Linux',
    },
    {
      key: 'toggle-project-badge',
      label: 'Detector de proyecto y color',
      status: formatStatus(config.features.projectBadge),
      usage: 'muestra lenguaje y color dentro de Xzp',
    },
    {
      key: 'prompt-context-position',
      label: 'Posicion del contexto del prompt',
      status: formatPromptPosition(config.ui?.promptContextPosition || 'right'),
      usage: 'elige derecha, inline junto a la ruta o desactivado',
    },
    {
      key: 'prompt-theme',
      label: 'Tema visual del prompt',
      status: formatPromptTheme(config.ui?.promptTheme || 'ocean'),
      usage: 'elige ocean, forest, ember o mono',
    },
    {
      key: 'toggle-smart-project-install',
      label: 'Instalacion segura de proyectos',
      status: formatStatus(config.features.smartProjectInstall),
      usage: 'rescata instalaciones y usa modo seguro por lenguaje',
    },
    {
      key: 'menu-visual-mode',
      label: 'Modo visual del menu',
      status: config.menu?.visualMode || 'cards',
      usage: 'elige cards o compact para terminales mas densas',
    },
    {
      key: 'back',
      label: 'Volver al menu principal',
    },
  ];

  return chooseNumericOption({
    title: 'Ajustes de Xzp',
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        'Actual : ' + option.status,
        'Uso    : ' + option.usage,
      ];
    },
    prompt: 'Ajuste [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa un numero valido del menu.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: visualMode === 'compact' ? 'simple' : 'card',
    introLines: ['Activa solo lo que quieras ver todos los dias.'],
  });
}

export async function choosePromptContextPosition(currentPosition) {
  const options = [
    {
      key: 'right',
      label: 'Derecha del prompt',
      usage: 'muestra [PYTHON] o [NODE] en la esquina derecha',
    },
    {
      key: 'inline',
      label: 'Inline junto a la ruta',
      usage: 'muestra Xzp@android /ruta [PYTHON] en la misma linea',
    },
    {
      key: 'off',
      label: 'Ocultar contexto',
      usage: 'no muestra badge del proyecto en el prompt',
    },
    {
      key: 'back',
      label: 'Volver',
    },
  ];

  return chooseNumericOption({
    title: 'Posicion del contexto del prompt',
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        'Uso    : ' + option.usage,
      ];
    },
    prompt: 'Posicion [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa 1, 2, 3 o 4.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: ['Actual: ' + formatPromptPosition(currentPosition)],
  });
}

export async function choosePlatformMode(currentMode) {
  const options = [
    {
      key: 'auto',
      label: 'Auto',
      usage: 'detecta si estas en Termux o Linux segun el entorno real',
    },
    {
      key: 'termux',
      label: 'Modo Termux',
      usage: 'activa comportamiento centrado en Android storage y Termux',
    },
    {
      key: 'linux',
      label: 'Modo Linux',
      usage: 'desactiva Android y asume un entorno Linux puro',
    },
    {
      key: 'back',
      label: 'Volver',
    },
  ];

  return chooseNumericOption({
    title: 'Modo de plataforma',
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        'Uso    : ' + option.usage,
      ];
    },
    prompt: 'Modo [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa 1, 2, 3 o 4.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: ['Actual: ' + formatPlatformMode(currentMode)],
  });
}

export async function chooseFeatureToggle(currentValue, featureName, description) {
  const options = [
    {
      key: 'enable',
      label: 'Activar',
      usage: description,
    },
    {
      key: 'disable',
      label: 'Desactivar',
      usage: 'oculta ' + featureName.toLowerCase() + ' hasta volver a activarlo',
    },
    {
      key: 'back',
      label: 'Volver',
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
        'Uso    : ' + option.usage,
      ];
    },
    prompt: 'Accion [1-' + options.length + ', Enter=3]: ',
    errorMessage: 'Opcion no valida. Usa 1, 2 o 3.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    defaultIndex: 2,
    style: 'card',
    introLines: ['Actual: ' + formatStatus(currentValue)],
  });
}

export async function choosePromptTheme(currentTheme) {
  const options = [
    { key: 'ocean', label: 'Ocean', usage: 'azules limpios y badge legible' },
    { key: 'forest', label: 'Forest', usage: 'verdes y aspecto mas suave' },
    { key: 'ember', label: 'Ember', usage: 'tono calido para destacar acciones' },
    { key: 'mono', label: 'Mono', usage: 'salida mas sobria y directa' },
    { key: 'back', label: 'Volver' },
  ];

  return chooseNumericOption({
    title: 'Tema visual del prompt',
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        'Uso    : ' + option.usage,
      ];
    },
    prompt: 'Tema [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa 1, 2, 3, 4 o 5.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: ['Actual: ' + formatPromptTheme(currentTheme)],
  });
}

export async function chooseMenuVisualMode(currentMode) {
  const options = [
    { key: 'cards', label: 'Cards', usage: 'paneles mas amplios con pistas visuales' },
    { key: 'compact', label: 'Compact', usage: 'mas denso para terminales estrechas' },
    { key: 'back', label: 'Volver' },
  ];

  return chooseNumericOption({
    title: 'Modo visual del menu',
    options,
    getValue: (option) => option.key,
    getLines: (option) => {
      if (option.key === 'back') {
        return [option.label];
      }

      return [
        option.label,
        'Uso    : ' + option.usage,
      ];
    },
    prompt: 'Modo [1-3, Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa 1, 2 o 3.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: ['Actual: ' + (currentMode || 'cards')],
  });
}

export async function choosePasteAction() {
  const options = [
    { key: 'copy', label: 'Copiar', usage: 'duplica el archivo o carpeta en la ruta actual' },
    { key: 'move', label: 'Mover', usage: 'traslada el archivo o carpeta a la ruta actual' },
  ];

  return chooseNumericOption({
    title: 'Accion al pegar',
    options,
    getValue: (option) => option.key,
    getLines: (option) => [
      option.label,
      'Uso    : ' + option.usage,
    ],
    prompt: 'Accion [1-' + options.length + ', Enter=1]: ',
    errorMessage: 'Opcion no valida. Usa 1 o 2.',
    directMatch: (answer) => options.find((option) => option.key === answer.toLowerCase())?.key,
    style: 'card',
    introLines: ['El portapapeles de Xzp guarda una ruta de archivo o carpeta.'],
  });
}

export async function chooseSearchPatternFromMenu() {
  const rl = readline.createInterface({ input, output });

  try {
    while (true) {
      const answer = (await rl.question('Patron a buscar: ')).trim();

      if (answer) {
        return answer;
      }

      console.log('Debes escribir algo para buscar.');
    }
  } finally {
    rl.close();
  }
}

export async function chooseTreeTargetFromMenu() {
  const rl = readline.createInterface({ input, output });

  try {
    const answer = (await rl.question('Ruta a mostrar [Enter=.]: ')).trim();
    return answer || '.';
  } finally {
    rl.close();
  }
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
      const answer = (await rl.question(prompt)).trim();
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
    const cleanup = () => {
      input.off('keypress', onKeypress);
      if (typeof input.setRawMode === 'function') {
        input.setRawMode(previousRawMode);
      }
      input.pause();
      clearScreenArea(lineCount);
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const fail = (error) => {
      cleanup();
      reject(error);
    };

    const render = () => {
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
        console.log(colorize(errorMessage, 'red'));
        state.typed = '';
        render();
        return true;
      }

      finish(selectedValue);
      return true;
    };

    const onKeypress = (_str, key) => {
      if (key?.ctrl && key.name === 'c') {
        fail(new Error('Operacion cancelada.'));
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

        fail(new Error('Operacion cancelada.'));
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

  output.write('\x1b[2J\x1b[H');
  console.log(colorize(title, 'cyan', 'bold'));
  console.log(colorize('════════════════════════════════════════', 'dim'));
  console.log(colorize(`Pagina ${pageNumber}/${totalPages}  •  Flechas para moverte  •  Enter para elegir  •  Esc para volver`, 'dim'));
  if (showPagination) {
    console.log(colorize('←/PgUp = pagina anterior  •  →/PgDn = pagina siguiente', 'dim'));
  }
  if (typed) {
    console.log(colorize(`Entrada: ${typed}`, 'yellow'));
  }
  console.log('');

  for (const line of introLines) {
    console.log(colorize(line, 'dim'));
  }

  if (introLines.length) {
    console.log('');
  }

  pageItems.forEach((option, index) => {
    const lines = getLines(option);
    const selected = index === selectedIndex;
    const prefix = selected ? colorize('> ', 'green', 'bold') : '  ';
    const label = selected ? colorize('[' + (index + 1) + ']', 'yellow', 'bold') : '[' + (index + 1) + ']';

    if (style === 'card') {
      console.log(prefix + label + ' ' + lines[0]);

      for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
        console.log('    ' + colorize('•', 'dim') + ' ' + lines[lineIndex]);
      }

      console.log('');
      return;
    }

    console.log(prefix + label + ' ' + lines[0]);

    for (let lineIndex = 1; lineIndex < lines.length; lineIndex += 1) {
      console.log('   - ' + lines[lineIndex]);
    }
  });

  console.log('');
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

  output.write('\x1b[2J\x1b[H');
}

function clamp(value, min, max) {
  if (max < min) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function formatStatus(enabled) {
  const text = enabled ? 'activado' : 'desactivado';

  if (!output.isTTY) {
    return text;
  }

  const color = enabled ? 'green' : 'red';
  return colorize(text, color, 'bold');
}

function formatPromptPosition(position) {
  if (position === 'inline') {
    return 'inline';
  }

  if (position === 'off') {
    return 'oculto';
  }

  return 'derecha';
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

function formatPlatformMode(mode) {
  if (mode === 'linux') {
    return 'linux';
  }

  if (mode === 'termux') {
    return 'termux';
  }

  return 'auto';
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
