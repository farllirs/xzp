import fs from 'node:fs/promises';
import { ensureAgentContextFile, getAgentContextFilePath, getRichAgentContext } from '../core/agent-context.js';
import { loadUserConfig, setAgentMode } from '../core/config.js';
import { getDefaultLocale, t } from '../core/i18n.js';
import { printBanner, printKeyValueRows, printList, printSection, statusLabel } from '../ui/output.js';

export async function runAgentModeCommand(parsed = {}) {
  const locale = parsed.runtimePreferences?.locale || parsed.config?.ui?.locale || getDefaultLocale();
  const action = parsed.agentAction || 'status';

  if (action === 'on') {
    await setAgentMode(true);
  }
  if (action === 'off') {
    await setAgentMode(false);
  }

  const shouldRefresh = ['on', 'context', 'refresh-context', 'tools'].includes(action);
  const contextPath = await ensureAgentContextFile({ locale, force: shouldRefresh });
  const contextStats = await fs.stat(contextPath).catch(() => null);

  const config = await loadUserConfig();
  const enabled = Boolean(parsed.agentMode || config.runtime?.agentMode);

  // Professional rich output for AI agents
  if (parsed.outputFormat === 'json' || action === 'context') {
    const rich = await getRichAgentContext({ locale });
    if (action === 'tools') {
      console.log(JSON.stringify({ tools: rich.recommendedTools, capabilities: rich.capabilities }, null, 2));
      return;
    }
    console.log(JSON.stringify(rich, null, 2));
    return;
  }

  // Human friendly output
  printBanner(t(locale, 'agentMode.title', 'Xzp Agent Mode'), [
    t(locale, 'agentMode.subtitle'),
  ]);

  printSection('Estado');
  printKeyValueRows([
    ['Activo', enabled ? statusLabel('si', 'ok') : statusLabel('no', 'warn')],
    ['Accion', action],
    ['Contexto Markdown', getAgentContextFilePath()],
    ['Contexto JSON (AI)', getAgentContextFilePath().replace('.md', '.json')],
    ['Actualizado', contextStats?.mtime?.toISOString?.() || 'desconocido'],
  ]);

  printSection('Capacidades para Agentes de IA');
  const capabilities = buildAgentCapabilities(enabled, locale);
  printList(capabilities);

  if (action === 'tools' || action === 'help') {
    printSection('Herramientas Recomendadas para IA');
    const rich = await getRichAgentContext({ locale });
    rich.recommendedTools.forEach(tool => {
      console.log(`  • ${tool.name.padEnd(14)} ${tool.description}`);
    });
  }
}

function buildAgentCapabilities(enabled, locale) {
  const items = [
    'Salida JSON estructurada lista para LLMs (--json / outputFormat=json)',
    'Contexto rico persistente (Markdown + JSON) en ~/.config/xzp/agents/',
    'Lista de herramientas seguras con descripciones para tool-calling',
    'Detección automática de proyecto + snapshot de entorno',
    'Modo safe-shell recomendado para ejecución controlada',
    'Bridge Termux ↔ Linux proot-distro',
    'Memoria persistente y preferencia por comandos xzp sobre shell raw',
  ];

  if (!enabled) {
    items.unshift('Activa con `xzp --agent-on` o XZP_AGENT_MODE=1');
  }

  return items;
}
