const HELP_COMMANDS = [
  {
    name: 'agent-mode',
    aliases: [],
    summary: 'Activa o revisa el modo pensado para agentes y automatizaciones.',
    usage: 'xzp --agent-status | xzp --agent-on | xzp --agent-off',
    details: [
      'Cuando se activa, Xzp prefiere JSON, evita prompts y usa defaults seguros en comandos compatibles.',
      'Tambien puede activarse temporalmente con `XZP_AGENT_MODE=1`.',
    ],
  },
  {
    name: 'menu',
    aliases: ['m'],
    summary: 'Abre el menu visual de Xzp.',
    usage: 'xzp -m',
    details: [
      'Navega con flechas o con numeros segun la pantalla.',
      'Sirve para entrar a ajustes, busqueda, version, contexto y shell segura.',
    ],
  },
  {
    name: 'copy',
    aliases: ['c'],
    summary: 'Copia ruta, nombre o formatos derivados al portapapeles de Xzp.',
    usage: 'xzp -c [ruta] [--name|--relative|--ext|--json|--shell|--project-root]',
    details: [
      'Sin argumento, usa el proyecto o la carpeta actual.',
      'Con `--name` guarda solo el nombre visible.',
      'Con `--relative` usa el root del proyecto como base cuando existe.',
      'Con `--json` y `XZP_OUTPUT_FORMAT=json` puedes integrarlo mejor en scripts.',
    ],
  },
  {
    name: 'paste',
    aliases: ['p'],
    summary: 'Pega o mueve lo que Xzp guardo.',
    usage: 'xzp -p [--move|--copy-action] [--into ruta] [--preview]',
    details: [
      'Preguntara la accion si no la pasas por bandera.',
      'Trabaja sobre el portapapeles guardado por `xzp -c`.',
      'Con `--preview` calcula el destino sin tocar archivos.',
    ],
  },
  {
    name: 'clipboard',
    aliases: ['k'],
    summary: 'Muestra lo que hay guardado en el portapapeles de Xzp.',
    usage: 'xzp -k',
    details: ['Te enseña origen, nombre, tipo, modo, valor derivado y fecha.'],
  },
  {
    name: 'clipboard-clear',
    aliases: ['K'],
    summary: 'Limpia el portapapeles de Xzp.',
    usage: 'xzp -K',
    details: ['Borrara la ruta guardada por el portapapeles de Xzp.'],
  },
  {
    name: 'context',
    aliases: ['x'],
    summary: 'Muestra el contexto del proyecto actual.',
    usage: 'xzp -x [--profile] [--save-favorite nombre|--list-favorites|--remove-favorite nombre]',
    details: [
      'Detecta Python, Node, PHP, Ruby, Go, Rust o Java.',
      'Tambien puede usarse para rutas del prompt como `--prompt-context`.',
      'Con `XZP_OUTPUT_FORMAT=json` devuelve una estructura lista para scripts.',
      'Ahora puede guardar rutas favoritas persistentes y mostrar perfil por stack.',
    ],
  },
  {
    name: 'search',
    aliases: ['b', 'buscar'],
    summary: 'Busca archivos o carpetas por patron.',
    usage: 'xzp -b "archivo" --scope actual [--files|--dirs] [--hidden] [--limit 120] [--semantic] [--exclude dist]',
    details: [
      'Soporta scopes, filtros por tipo, ranking de coincidencias y exclusiones persistentes.',
      'Con `XZP_OUTPUT_FORMAT=json` devuelve resultados estructurados.',
    ],
  },
  {
    name: 'explain',
    aliases: ['e', 'explicar'],
    summary: 'Explica un comando conocido por Xzp.',
    usage: 'xzp -e ls',
    details: ['Muestra uso, riesgo y notas sobre el comando.'],
  },
  {
    name: 'tree',
    aliases: ['t'],
    summary: 'Muestra el arbol completo de carpetas y archivos.',
    usage: 'xzp -t src [--depth 3] [--summary] [--compare otra/ruta]',
    details: [
      'Acepta `--depth`, `--limit` y `--hidden` para controlar la vista.',
      'Marca automaticamente carpetas de proyecto por lenguaje.',
      'Ahora tambien puede resumir y comparar dos rutas dentro del mismo scope.',
    ],
  },
  {
    name: 'android',
    aliases: ['a'],
    summary: 'Abre el acceso rapido a Android o Linux.',
    usage: 'xzp -a',
    details: [
      'En Termux apunta a almacenamiento Android.',
      'En Linux usa la raiz rapida configurada para el entorno.',
    ],
  },
  {
    name: 'install',
    aliases: ['i'],
    summary: 'Instala dependencias del proyecto detectado.',
    usage: 'xzp -i',
    details: ['Usa el modo seguro y la deteccion de lenguaje.'],
  },
  {
    name: 'safe-shell',
    aliases: ['r', 'seguro'],
    summary: 'Abre la shell segura del proyecto.',
    usage: 'xzp -r',
    details: [
      'Sin argumentos abre el entorno seguro del proyecto detectado.',
      'Con `xzp -r app.py mi-app` guarda un acceso rapido seguro.',
      'Con `xzp -r mi-app` ejecuta el acceso guardado sin entrar manualmente a carpetas.',
      'Tambien admite `--list-safe-shortcuts`, `--remove-safe-shortcut <nombre>`, `--safe-status` y `--preset <dev|debug|test|release>`.',
      'Los launchers generados recuerdan el preset guardado y Xzp conserva la ultima sesion segura.',
    ],
  },
  {
    name: 'version',
    aliases: ['v'],
    summary: 'Compara la version local con npm.',
    usage: 'xzp -v',
    details: [
      'Muestra version local, publicada y estado de alineacion.',
      'Ahora recomienda el siguiente bump y funciona mejor como centro rapido de release.',
    ],
  },
  {
    name: 'doctor',
    aliases: ['D'],
    summary: 'Diagnostica el entorno visible para Xzp.',
    usage: 'xzp --doctor',
    details: [
      'Revisa host, shell, configuracion, storage y herramientas base.',
      'Sirve antes de publicar una release o depurar una instalacion rota.',
    ],
  },
  {
    name: 'inspect',
    aliases: ['I'],
    summary: 'Resume el proyecto actual con metadatos utiles.',
    usage: 'xzp --inspect',
    details: [
      'Muestra lenguaje, archivos clave, metadatos y siguientes pasos.',
      'Ahora tambien expone perfil por stack y deuda visible.',
      'Es util para auditar rapido un proyecto antes de tocarlo.',
    ],
  },
  {
    name: 'report-error',
    aliases: [],
    summary: 'Prepara un reporte de error para el mantenedor.',
    usage: 'xzp --report-error',
    details: [
      'Toma el ultimo error guardado por Xzp y te pide una descripcion corta.',
      'Genera salida en markdown y JSON con snapshot identificable.',
      'Luego intenta abrir un borrador de correo para enviarlo a farllirs@gmail.com.',
    ],
  },
  {
    name: 'prompt-context',
    aliases: [],
    summary: 'Genera una linea compacta del contexto del proyecto.',
    usage: 'xzp --prompt-context',
    details: ['Se usa para personalizar el prompt o integrarlo en shells.'],
  },
  {
    name: 'prompt-project-root',
    aliases: [],
    summary: 'Imprime el root del proyecto detectado.',
    usage: 'xzp --prompt-project-root',
    details: ['Devuelve solo la carpeta raiz del proyecto.'],
  },
  {
    name: 'prompt-project-path',
    aliases: [],
    summary: 'Imprime la ruta del proyecto detectado.',
    usage: 'xzp --prompt-project-path',
    details: ['Devuelve la ruta del proyecto detectado para el prompt.'],
  },
];

export function listHelpCommands() {
  return [...HELP_COMMANDS];
}

export function findHelpCommand(topic) {
  const normalized = normalizeTopic(topic);

  if (!normalized) {
    return null;
  }

  for (const command of HELP_COMMANDS) {
    const names = [command.name, ...(command.aliases || [])];
    if (names.some((name) => normalizeTopic(name) === normalized)) {
      return command;
    }
  }

  let best = null;
  let bestScore = Infinity;

  for (const command of HELP_COMMANDS) {
    const candidates = [command.name, ...(command.aliases || [])];
    for (const candidate of candidates) {
      const score = levenshtein(normalized, normalizeTopic(candidate));
      if (score < bestScore) {
        bestScore = score;
        best = command;
      }
    }
  }

  if (!best || bestScore > Math.max(2, Math.ceil(normalized.length / 2))) {
    return null;
  }

  return best;
}

export function getHelpCommand(name) {
  return listHelpCommands().find((command) => command.name === name) || null;
}

function normalizeTopic(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');
}

function levenshtein(left, right) {
  const rows = left.length + 1;
  const cols = right.length + 1;
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0));

  for (let row = 0; row < rows; row += 1) {
    matrix[row][0] = row;
  }

  for (let col = 0; col < cols; col += 1) {
    matrix[0][col] = col;
  }

  for (let row = 1; row < rows; row += 1) {
    for (let col = 1; col < cols; col += 1) {
      const cost = left[row - 1] === right[col - 1] ? 0 : 1;
      matrix[row][col] = Math.min(
        matrix[row - 1][col] + 1,
        matrix[row][col - 1] + 1,
        matrix[row - 1][col - 1] + cost,
      );
    }
  }

  return matrix[rows - 1][cols - 1];
}
