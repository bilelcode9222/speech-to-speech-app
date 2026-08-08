export interface Language {
  code: string;
  label: string;
  flag: string;
}

/** Doit rester aligné avec backend/src/utils/languages.ts */
export const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'Anglais', flag: '🇬🇧' },
  { code: 'es', label: 'Espagnol', flag: '🇪🇸' },
  { code: 'de', label: 'Allemand', flag: '🇩🇪' },
  { code: 'it', label: 'Italien', flag: '🇮🇹' },
  { code: 'pt', label: 'Portugais', flag: '🇵🇹' },
  { code: 'nl', label: 'Néerlandais', flag: '🇳🇱' },
  { code: 'pl', label: 'Polonais', flag: '🇵🇱' },
  { code: 'ru', label: 'Russe', flag: '🇷🇺' },
  { code: 'ar', label: 'Arabe', flag: '🇸🇦' },
  { code: 'tr', label: 'Turc', flag: '🇹🇷' },
  { code: 'zh', label: 'Chinois', flag: '🇨🇳' },
  { code: 'ja', label: 'Japonais', flag: '🇯🇵' },
  { code: 'ko', label: 'Coréen', flag: '🇰🇷' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
  { code: 'id', label: 'Indonésien', flag: '🇮🇩' },
  { code: 'sv', label: 'Suédois', flag: '🇸🇪' },
  { code: 'uk', label: 'Ukrainien', flag: '🇺🇦' },
  { code: 'ro', label: 'Roumain', flag: '🇷🇴' },
  { code: 'el', label: 'Grec', flag: '🇬🇷' },
  { code: 'vi', label: 'Vietnamien', flag: '🇻🇳' },
];

export function findLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
