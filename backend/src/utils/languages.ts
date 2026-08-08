/**
 * Langues supportées par la chaîne complète (Whisper + Flash v2.5).
 * Le code ISO sert à Whisper, le nom sert au prompt de traduction.
 */
export const LANGUAGES: Record<string, string> = {
  fr: 'français',
  en: 'anglais',
  es: 'espagnol',
  de: 'allemand',
  it: 'italien',
  pt: 'portugais',
  nl: 'néerlandais',
  pl: 'polonais',
  ru: 'russe',
  ar: 'arabe',
  tr: 'turc',
  zh: 'chinois mandarin',
  ja: 'japonais',
  ko: 'coréen',
  hi: 'hindi',
  id: 'indonésien',
  sv: 'suédois',
  da: 'danois',
  fi: 'finnois',
  no: 'norvégien',
  cs: 'tchèque',
  el: 'grec',
  uk: 'ukrainien',
  ro: 'roumain',
  hu: 'hongrois',
  vi: 'vietnamien',
  ta: 'tamoul',
  ms: 'malais',
  hr: 'croate',
  sk: 'slovaque',
  bg: 'bulgare',
  fil: 'filipino',
};

export function languageName(code: string): string {
  return LANGUAGES[code] || code;
}

export function isSupported(code: string): boolean {
  return code in LANGUAGES;
}
