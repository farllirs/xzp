import fs from 'node:fs/promises';
import { ensureAgentContextFile, getAgentContextFilePath } from '../core/agent-context.js';
import { loadUserConfig, setAgentMode } from '../core/config.js';
import { getDefaultLocale, t } from '../core/i18n.js';
import { printBanner, printKeyValueRows, printList, printSection, statusLabel } from '../ui/output.js';

export async function runAgentModeCommand(parsed = {}) {
  const locale = parsed.runtimePreferences?.locale || parsed.config?.ui?.locale || getDefaultLocale();

  if (parsed.agentAction === 'on') {
    await setAgentMode(true);
  }

  if (parsed.agentAction === 'off') {
    await setAgentMode(false);
  }

  const shouldRefreshContext = parsed.agentAction === 'on'
    || parsed.agentAction === 'context'
    || parsed.agentAction === 'refresh-context';
  const contextPath = await ensureAgentContextFile({
    locale,
    force: shouldRefreshContext,
  });
  const contextStats = await fs.stat(contextPath).catch(() => null);

  const config = await loadUserConfig();
  const enabled = Boolean(parsed.agentMode || config.runtime?.agentMode);
  const capabilities = buildAgentCapabilities(enabled, locale);

  if (parsed.outputFormat === 'json') {
    console.log(JSON.stringify({
      enabled,
      action: parsed.agentAction || 'status',
      capabilities,
      contextPath,
      contextUpdatedAt: contextStats?.mtime?.toISOString?.() || '',
      configPathHint: '~/.config/xzp/config.json',
    }, null, 2));
    return;
  }

  printBanner(t(locale, 'agentMode.title', 'Xzp Agent Mode'), [
    t(locale, 'agentMode.subtitle'),
  ]);
  printSection('Estado');
  printKeyValueRows([
    ['Activo', enabled ? statusLabel('si', 'ok') : statusLabel('no', 'warn')],
    ['Accion', parsed.agentAction || 'status'],
    ['Contexto', getAgentContextFilePath()],
    ['Actualizado', contextStats?.mtime?.toISOString?.() || 'desconocido'],
  ]);
  printSection('Capacidades');
  printList(capabilities);
}

function buildAgentCapabilities(enabled, locale) {
  const items = [
    t(locale, 'agentMode.capabilities.jsonDefault'),
    t(locale, 'agentMode.capabilities.avoidPrompts'),
    t(locale, 'agentMode.capabilities.preferPackage'),
    t(locale, 'agentMode.capabilities.persistContext'),
  ];

  if (!enabled) {
    items.unshift(t(locale, 'agentMode.capabilities.enableHint'));
  }

  return items;
}
