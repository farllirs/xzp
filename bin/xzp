#!/usr/bin/env node
import { main } from '../src/app/main.js';
import { handleCliError } from '../src/commands/report-error.js';

try {
  await main();
} catch (error) {
  await handleCliError(error, process.argv.slice(2)).catch(() => {
    console.error(`Error: ${error.message}`);
  });
  process.exitCode = 1;
}
