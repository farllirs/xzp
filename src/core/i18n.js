import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_LOCALE = 'co_es';
const SUPPORTED_LOCALES = [
  { key: 'co_es', label: 'Espanol (Colombia)' },
  { key: 'en', label: 'English' },
  { key: 'ru', label: 'Russkiy' },
];
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const LOCALES_DIR = path.resolve(MODULE_DIR, '../../data/locales');
const localeCache = new Map();

export function getDefaultLocale() {
  return DEFAULT_LOCALE;
}

export function listSupportedLocales() {
  return SUPPORTED_LOCALES.map((entry) => ({ ...entry }));
}

export function normalizeLocale(locale = '') {
  const normalized = String(locale || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');

  if (!normalized) {
    return DEFAULT_LOCALE;
  }

  const exactMatch = SUPPORTED_LOCALES.find((entry) => entry.key === normalized);
  if (exactMatch) {
    return exactMatch.key;
  }

  const prefixMatch = SUPPORTED_LOCALES.find((entry) => normalized.startsWith(entry.key.split('_')[0]));
  if (prefixMatch) {
    return prefixMatch.key;
  }

  return DEFAULT_LOCALE;
}

export function loadLocaleMessages(locale = DEFAULT_LOCALE) {
  const normalizedLocale = normalizeLocale(locale);

  if (localeCache.has(normalizedLocale)) {
    return localeCache.get(normalizedLocale);
  }

  const messages = readLocaleMessages(normalizedLocale)
    || readLocaleMessages(DEFAULT_LOCALE)
    || {};

  localeCache.set(normalizedLocale, messages);
  return messages;
}

export function t(locale, key, fallback = '', params = {}) {
  const messages = loadLocaleMessages(locale);
  const resolved = getNestedValue(messages, key);
  const baseValue = typeof resolved === 'string' ? resolved : fallback;
  return interpolate(baseValue, params);
}

export function tList(locale, key, fallback = []) {
  const messages = loadLocaleMessages(locale);
  const resolved = getNestedValue(messages, key);
  return Array.isArray(resolved) ? [...resolved] : [...fallback];
}

export function tObject(locale, key, fallback = null) {
  const messages = loadLocaleMessages(locale);
  const resolved = getNestedValue(messages, key);
  return resolved && typeof resolved === 'object' && !Array.isArray(resolved)
    ? structuredCloneCompat(resolved)
    : fallback;
}

function readLocaleMessages(locale) {
  const localePath = path.join(LOCALES_DIR, `${locale}.json`);

  try {
    const raw = fs.readFileSync(localePath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getNestedValue(source, key) {
  return String(key || '')
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => (current && Object.prototype.hasOwnProperty.call(current, segment) ? current[segment] : undefined), source);
}

function interpolate(template, params = {}) {
  return String(template || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_match, key) => {
    if (!Object.prototype.hasOwnProperty.call(params, key)) {
      return '';
    }

    return String(params[key] ?? '');
  });
}

function structuredCloneCompat(value) {
  return JSON.parse(JSON.stringify(value));
}
