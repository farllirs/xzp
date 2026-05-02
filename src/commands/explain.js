import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadUserConfig } from '../core/config.js';
import { printBanner, printExplainEntry, printSection } from '../ui/output.js';
import { chooseExplainTopic } from '../ui/prompt.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXPLAIN_DATA_PATH = path.resolve(MODULE_DIR, '..', '..', 'data', 'commands', 'explain.json');

export async function runExplainCommand({ topic }) {
  const entries = await loadExplainEntries();
  const config = await loadUserConfig();
  const selectedTopic = topic ? normalizeTopic(topic) : await chooseExplainTopic(entries, config.ui?.locale || 'co_es');
  const entry = entries[selectedTopic];

  if (!entry) {
    const available = Object.keys(entries).join(', ');
    throw new Error(`No conozco ese comando todavia. Disponibles: ${available}`);
  }

  printBanner(`Explicar: ${selectedTopic}`, [
    'Referencia rapida para recordar sintaxis y uso base.',
  ]);
  printSection('Detalle');
  console.log(printExplainEntry(selectedTopic, entry));
}

async function loadExplainEntries() {
  const raw = await fs.readFile(EXPLAIN_DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

function normalizeTopic(topic) {
  return String(topic)
    .trim()
    .split(/\s+/)[0]
    .toLowerCase();
}
