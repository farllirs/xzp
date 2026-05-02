import { loadUserConfig, setLocale } from '../core/config.js';
import { getDefaultLocale, listSupportedLocales, normalizeLocale } from '../core/i18n.js';

export async function runLocaleCommand(parsed = {}) {
  const requestedLocale = String(parsed.localeValue || '').trim();

  if (requestedLocale) {
    await setLocale(requestedLocale);
  }

  const config = await loadUserConfig();
  const currentLocale = normalizeLocale(config.ui?.locale || getDefaultLocale());
  const locales = listSupportedLocales();

  if (parsed.outputFormat === 'json') {
    console.log(JSON.stringify({
      locale: currentLocale,
      available: locales,
    }, null, 2));
    return;
  }

  console.log('Idioma actual: ' + currentLocale);
  console.log('Disponibles : ' + locales.map((entry) => `${entry.key} (${entry.label})`).join(', '));
}
