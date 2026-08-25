import { useMemo } from 'react';
import { getLocales } from 'expo-localization';
import { FALLBACK_LOCALE, TRANSLATIONS, TranslationKey } from './translations';

/**
 * Traduction de l'interface, calée sur la langue du téléphone.
 *
 * Le code de langue est réduit à ses deux premières lettres : « fr-CA »
 * et « fr-FR » partagent le même dictionnaire. Une langue absente retombe
 * silencieusement sur l'anglais plutôt que d'afficher une clé brute.
 */
export function useTranslation() {
  const locale = useMemo(() => {
    const tag = getLocales()[0]?.languageCode ?? FALLBACK_LOCALE;
    const short = tag.slice(0, 2).toLowerCase();
    return short in TRANSLATIONS ? short : FALLBACK_LOCALE;
  }, []);

  const t = useMemo(() => {
    const dict = TRANSLATIONS[locale] ?? TRANSLATIONS[FALLBACK_LOCALE];
    return (key: TranslationKey) => dict[key];
  }, [locale]);

  return { t, locale };
}
