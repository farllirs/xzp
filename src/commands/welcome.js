import { setLocale } from '../core/config.js';
import { getDefaultLocale, t } from '../core/i18n.js';
import { printBanner } from '../ui/output.js';
import { chooseLocale } from '../ui/prompt.js';

export async function showWelcomeIfFirstRun(executionContext) {
  if (!process.stdout.isTTY) {
    return false;
  }

  if (!executionContext.freshInstall) {
    return false;
  }

  const locale = executionContext.config?.ui?.locale || getDefaultLocale();

  printBanner(
    t(locale, 'welcome.title', 'Welcome to Xzp!'),
    [
      t(locale, 'welcome.subtitle1', 'Xzp helps you explore, understand, and prepare projects'),
      t(locale, 'welcome.subtitle2', 'from Termux or Linux with ease.'),
      '',
      t(locale, 'welcome.localeIntro', 'Let us set up your language preference first.'),
    ],
  );

  console.log('');

  const selected = await chooseLocale(locale, locale);
  if (selected && selected !== 'back' && executionContext.config) {
    const prev = executionContext.config.ui?.locale;
    executionContext.config.ui.locale = selected;
    await setLocale(selected).catch(() => {
      executionContext.config.ui.locale = prev;
    });
  }

  return true;
}
