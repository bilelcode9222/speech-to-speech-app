import '@formatjs/intl-locale/polyfill';
import '@formatjs/intl-displaynames/polyfill';

import '@formatjs/intl-displaynames/locale-data/en';
import '@formatjs/intl-displaynames/locale-data/fr';
import '@formatjs/intl-displaynames/locale-data/es';
import '@formatjs/intl-displaynames/locale-data/de';
import '@formatjs/intl-displaynames/locale-data/it';
import '@formatjs/intl-displaynames/locale-data/pt';
import '@formatjs/intl-displaynames/locale-data/nl';
import '@formatjs/intl-displaynames/locale-data/ru';
import '@formatjs/intl-displaynames/locale-data/ar';
import '@formatjs/intl-displaynames/locale-data/zh';
import '@formatjs/intl-displaynames/locale-data/ja';

export const UI_LANGUAGES = [
  'en',
  'fr',
  'es',
  'de',
  'it',
  'pt',
  'nl',
  'ru',
  'ar',
  'zh',
  'ja',
] as const;

export type UiLanguage = (typeof UI_LANGUAGES)[number];

const AUTO_LABELS: Record<UiLanguage, string> = {
  en: 'Detect language',
  fr: 'Détecter la langue',
  es: 'Detectar idioma',
  de: 'Sprache erkennen',
  it: 'Rileva lingua',
  pt: 'Detectar idioma',
  nl: 'Taal detecteren',
  ru: 'Определить язык',
  ar: 'اكتشاف اللغة',
  zh: '检测语言',
  ja: '言語を検出',
};

export function normalizeUiLanguage(locale?: string | null): UiLanguage {
  if (!locale) return 'en';

  const normalized = locale.toLowerCase().replace('_', '-');
  const base = normalized.split('-')[0] as UiLanguage;

  return UI_LANGUAGES.includes(base) ? base : 'en';
}

export function getLanguageDisplayName(
  languageCode: string,
  interfaceLocale?: string | null,
): string {
  const uiLanguage = normalizeUiLanguage(interfaceLocale);

  if (languageCode === 'auto') {
    return AUTO_LABELS[uiLanguage];
  }

  try {
    const displayNames = new Intl.DisplayNames([uiLanguage], {
      type: 'language',
      fallback: 'code',
    });

    return displayNames.of(languageCode) ?? languageCode;
  } catch {
    return languageCode;
  }
}
