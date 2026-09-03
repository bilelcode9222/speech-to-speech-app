/**
 * Les 100 langues reconnues par Whisper (99 du tokenizer + yue).
 * Le code ISO sert à la transcription, le nom au prompt de traduction.
 *
 * Doit rester aligné avec mobile/src/constants/languages.ts.
 */
export const LANGUAGES: Record<string, string> = {
  fr: 'français',
  en: 'anglais',
  es: 'espagnol',
  de: 'allemand',
  it: 'italien',
  pt: 'portugais',
  ar: 'arabe',
  zh: 'chinois mandarin',
  ja: 'japonais',
  ru: 'russe',
  af: 'afrikaans',
  sq: 'albanais',
  am: 'amharique',
  hy: 'arménien',
  as: 'assamais',
  az: 'azéri',
  ba: 'bachkir',
  eu: 'basque',
  bn: 'bengali',
  my: 'birman',
  be: 'biélorusse',
  bs: 'bosniaque',
  br: 'breton',
  bg: 'bulgare',
  yue: 'cantonais',
  ca: 'catalan',
  ko: 'coréen',
  hr: 'croate',
  ht: 'créole haïtien',
  da: 'danois',
  et: 'estonien',
  fi: 'finnois',
  fo: 'féroïen',
  gl: 'galicien',
  cy: 'gallois',
  el: 'grec',
  gu: 'gujarati',
  ka: 'géorgien',
  ha: 'haoussa',
  haw: 'hawaïen',
  hi: 'hindi',
  hu: 'hongrois',
  he: 'hébreu',
  id: 'indonésien',
  is: 'islandais',
  jw: 'javanais',
  kn: 'kannada',
  kk: 'kazakh',
  km: 'khmer',
  lo: 'lao',
  la: 'latin',
  lv: 'letton',
  ln: 'lingala',
  lt: 'lituanien',
  lb: 'luxembourgeois',
  mk: 'macédonien',
  ms: 'malais',
  ml: 'malayalam',
  mg: 'malgache',
  mt: 'maltais',
  mi: 'maori',
  mr: 'marathi',
  mn: 'mongol',
  no: 'norvégien',
  nn: 'norvégien nynorsk',
  nl: 'néerlandais',
  ne: 'népalais',
  oc: 'occitan',
  ur: 'ourdou',
  uz: 'ouzbek',
  ps: 'pachto',
  pa: 'pendjabi',
  fa: 'persan',
  pl: 'polonais',
  ro: 'roumain',
  sa: 'sanskrit',
  sr: 'serbe',
  sn: 'shona',
  sd: 'sindhi',
  si: 'singhalais',
  sk: 'slovaque',
  sl: 'slovène',
  so: 'somali',
  su: 'soundanais',
  sv: 'suédois',
  sw: 'swahili',
  tg: 'tadjik',
  tl: 'tagalog',
  ta: 'tamoul',
  tt: 'tatar',
  cs: 'tchèque',
  th: 'thaï',
  bo: 'tibétain',
  tr: 'turc',
  tk: 'turkmène',
  te: 'télougou',
  uk: 'ukrainien',
  vi: 'vietnamien',
  yi: 'yiddish',
  yo: 'yoruba',
};

export function languageName(code: string): string {
  return LANGUAGES[code] || code;
}

export function isSupported(code: string): boolean {
  // 'auto' n'est pas une langue mais une consigne : laisser Whisper
  // détecter. Valide en source uniquement, jamais en cible.
  if (code === 'auto') return true;
  return code in LANGUAGES;
}

/**
 * Les 57 langues pour lesquelles OpenAI documente une voix correcte.
 *
 * Attention : l'API ne rejette PAS les autres. Elle renvoie un MP3 valide
 * mais mal prononcé, donc aucune exception n'est levée et le repli du
 * pipeline ne se déclenche jamais. Il faut vérifier en amont.
 *
 * Référence : https://platform.openai.com/docs/guides/text-to-speech
 */
const TTS_LANGUAGES = new Set([
  'af', 'ar', 'hy', 'az', 'be', 'bs', 'bg', 'ca', 'zh', 'hr',
  'cs', 'da', 'nl', 'en', 'et', 'fi', 'fr', 'gl', 'de', 'el',
  'he', 'hi', 'hu', 'is', 'id', 'it', 'ja', 'kn', 'kk', 'ko',
  'lv', 'lt', 'mk', 'ms', 'mr', 'mi', 'ne', 'no', 'fa', 'pl',
  'pt', 'ro', 'ru', 'sr', 'sk', 'sl', 'es', 'sw', 'sv', 'tl',
  'ta', 'th', 'tr', 'uk', 'ur', 'vi', 'cy',
]);

/** La voix OpenAI sait-elle prononcer cette langue ? */
export function hasVoice(code: string): boolean {
  return TTS_LANGUAGES.has(code);
}

/**
 * Une langue peut-elle servir de cible ?
 * 'auto' est exclu : la cible doit toujours être explicite.
 */
export function canBeTarget(code: string): boolean {
  return code in LANGUAGES && hasVoice(code);
}
