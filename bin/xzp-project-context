#!/usr/bin/env node
import { main } from '../src/app/main.js';

const argv = process.argv.slice(2);

if (argv.includes('--root')) {
  await main(['--prompt-project-root']);
} else if (argv.includes('--path')) {
  await main(['--prompt-project-path']);
} else {
  await main(['--prompt-context']);
}
