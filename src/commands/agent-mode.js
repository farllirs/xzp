import { loadUserConfig, setAgentMode } from '../core/config.js';
import { printBanner, printKeyValueRows, printList, printSection, statusLabel } from '../ui/output.js';

export async function runAgentModeCommand(parsed = {}) {
  if (parsed.agentAction === 'on') {
    await setAgentMode(true);
  }

  if (parsed.agentAction === 'off') {
    await setAgentMode(false);
  }

  const config = await loadUserConfig();
  const enabled = Boolean(parsed.agentMode || config.runtime?.agentMode);
  const capabilities = buildAgentCapabilities(enabled);

  if (parsed.outputFormat === 'json') {
    console.log(JSON.stringify({
      enabled,
      capabilities,
      configPathHint: '~/.config/xzp/config.json',
    }, null, 2));
    return;
  }

  printBanner('Xzp Agent Mode', [
    'Modo no interactivo pensado para agentes y automatizaciones.',
  ]);
  printSection('Estado');
  printKeyValueRows([
    ['Activo', enabled ? statusLabel('si', 'ok') : statusLabel('no', 'warn')],
    ['Accion', parsed.agentAction || 'status'],
  ]);
  printSection('Capacidades');
  printList(capabilities);
}

function buildAgentCapabilities(enabled) {
  const items = [
    'salida JSON por defecto cuando el modo esta activo',
    'evita prompts en comandos compatibles y aplica defaults seguros',
    'facilita uso desde agentes sobre context, search, tree, doctor e inspect',
    'mantiene reportes y estados persistentes para integracion automatizada',
  ];

  if (!enabled) {
    items.unshift('puedes activarlo con `xzp --agent-on` o `XZP_AGENT_MODE=1`');
  }

  return items;
}
