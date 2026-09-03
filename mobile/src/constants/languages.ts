export interface Language {
  code: string;
  label: string;
  flag: string;
  /**
   * true si la voix OpenAI sait prononcer cette langue correctement.
   *
   * OpenAI documente 57 langues pour tts-1. Sur les 43 autres, l'API ne
   * renvoie pas d'erreur : elle produit un MP3 valide mais mal prononcé.
   * Ces langues restent utilisables en SOURCE (Whisper les transcrit bien)
   * mais sont exclues du sélecteur de langue cible.
   *
   * Référence : https://platform.openai.com/docs/guides/text-to-speech
   */
  tts: boolean;
}

/**
 * Les 100 langues reconnues par Whisper, tirées de son tokenizer officiel.
 *
 * ATTENTION : `label` n'est PAS ce que voit l'utilisateur.
 *
 * L'affichage passe par `getLanguageDisplayName()`
 * (src/i18n/languageDisplayNames.ts), qui traduit chaque nom dans la langue
 * de l'interface via `Intl.DisplayNames` — « arabe » et non « العربية »
 * quand le téléphone est en français. Les 100 codes sont couverts.
 *
 * `label` ne sert que de filet de sécurité : si le polyfill @formatjs
 * échouait au démarrage, il évite d'afficher des codes bruts comme « haw »
 * ou « yue ». Ne pas le supprimer, mais ne pas compter dessus non plus.
 *
 * Les plus courantes sont en tête, le reste suit l'ordre alphabétique.
 * La qualité de transcription varie fortement : excellente pour les
 * langues massivement représentées sur le web, approximative ailleurs.
 *
 * Doit rester aligné avec backend/src/utils/languages.ts.
 */
export const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷', tts: true },
  { code: 'en', label: 'English', flag: '🇬🇧', tts: true },
  { code: 'es', label: 'Español', flag: '🇪🇸', tts: true },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', tts: true },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', tts: true },
  { code: 'pt', label: 'Português', flag: '🇵🇹', tts: true },
  { code: 'ar', label: 'العربية', flag: '🇸🇦', tts: true },
  { code: 'zh', label: '中文', flag: '🇨🇳', tts: true },
  { code: 'ja', label: '日本語', flag: '🇯🇵', tts: true },
  { code: 'ru', label: 'Русский', flag: '🇷🇺', tts: true },
  { code: 'af', label: 'Afrikaans', flag: '🇿🇦', tts: true },
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿', tts: true },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩', tts: true },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾', tts: true },
  { code: 'jw', label: 'Basa Jawa', flag: '🇮🇩', tts: false },
  { code: 'su', label: 'Basa Sunda', flag: '🇮🇩', tts: false },
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦', tts: true },
  { code: 'br', label: 'Brezhoneg', flag: '🇫🇷', tts: false },
  { code: 'ca', label: 'Català', flag: '🇪🇸', tts: true },
  { code: 'sn', label: 'ChiShona', flag: '🇿🇼', tts: false },
  { code: 'cy', label: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿', tts: true },
  { code: 'da', label: 'Dansk', flag: '🇩🇰', tts: true },
  { code: 'et', label: 'Eesti', flag: '🇪🇪', tts: true },
  { code: 'eu', label: 'Euskara', flag: '🇪🇸', tts: false },
  { code: 'fo', label: 'Føroyskt', flag: '🇫🇴', tts: false },
  { code: 'gl', label: 'Galego', flag: '🇪🇸', tts: true },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬', tts: false },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷', tts: true },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪', tts: true },
  { code: 'ht', label: 'Kreyòl ayisyen', flag: '🇭🇹', tts: false },
  { code: 'la', label: 'Latina', flag: '🇻🇦', tts: false },
  { code: 'lv', label: 'Latviešu', flag: '🇱🇻', tts: true },
  { code: 'lt', label: 'Lietuvių', flag: '🇱🇹', tts: true },
  { code: 'ln', label: 'Lingála', flag: '🇨🇩', tts: false },
  { code: 'lb', label: 'Lëtzebuergesch', flag: '🇱🇺', tts: false },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺', tts: true },
  { code: 'mg', label: 'Malagasy', flag: '🇲🇬', tts: false },
  { code: 'mt', label: 'Malti', flag: '🇲🇹', tts: false },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱', tts: true },
  { code: 'no', label: 'Norsk', flag: '🇳🇴', tts: true },
  { code: 'nn', label: 'Nynorsk', flag: '🇳🇴', tts: false },
  { code: 'oc', label: 'Occitan', flag: '🇫🇷', tts: false },
  { code: 'uz', label: 'Oʻzbekcha', flag: '🇺🇿', tts: false },
  { code: 'pl', label: 'Polski', flag: '🇵🇱', tts: true },
  { code: 'ro', label: 'Română', flag: '🇷🇴', tts: true },
  { code: 'sq', label: 'Shqip', flag: '🇦🇱', tts: false },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰', tts: true },
  { code: 'sl', label: 'Slovenščina', flag: '🇸🇮', tts: true },
  { code: 'so', label: 'Soomaali', flag: '🇸🇴', tts: false },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮', tts: true },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪', tts: true },
  { code: 'tl', label: 'Tagalog', flag: '🇵🇭', tts: true },
  { code: 'mi', label: 'Te Reo Māori', flag: '🇳🇿', tts: true },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', tts: true },
  { code: 'tk', label: 'Türkmençe', flag: '🇹🇲', tts: false },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷', tts: true },
  { code: 'yo', label: 'Yorùbá', flag: '🇳🇬', tts: false },
  { code: 'is', label: 'Íslenska', flag: '🇮🇸', tts: true },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿', tts: true },
  { code: 'haw', label: 'ʻŌlelo Hawaiʻi', flag: '🇺🇸', tts: false },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷', tts: true },
  { code: 'ba', label: 'Башҡортса', flag: '🇷🇺', tts: false },
  { code: 'be', label: 'Беларуская', flag: '🇧🇾', tts: true },
  { code: 'bg', label: 'Български', flag: '🇧🇬', tts: true },
  { code: 'mk', label: 'Македонски', flag: '🇲🇰', tts: true },
  { code: 'mn', label: 'Монгол', flag: '🇲🇳', tts: false },
  { code: 'sr', label: 'Српски', flag: '🇷🇸', tts: true },
  { code: 'tt', label: 'Татарча', flag: '🇷🇺', tts: false },
  { code: 'tg', label: 'Тоҷикӣ', flag: '🇹🇯', tts: false },
  { code: 'uk', label: 'Українська', flag: '🇺🇦', tts: true },
  { code: 'kk', label: 'Қазақша', flag: '🇰🇿', tts: true },
  { code: 'hy', label: 'Հայերեն', flag: '🇦🇲', tts: true },
  { code: 'yi', label: 'ייִדיש', flag: '🇮🇱', tts: false },
  { code: 'he', label: 'עברית', flag: '🇮🇱', tts: true },
  { code: 'ur', label: 'اردو', flag: '🇵🇰', tts: true },
  { code: 'sd', label: 'سنڌي', flag: '🇵🇰', tts: false },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷', tts: true },
  { code: 'ps', label: 'پښتو', flag: '🇦🇫', tts: false },
  { code: 'ne', label: 'नेपाली', flag: '🇳🇵', tts: true },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳', tts: true },
  { code: 'sa', label: 'संस्कृतम्', flag: '🇮🇳', tts: false },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳', tts: true },
  { code: 'as', label: 'অসমীয়া', flag: '🇮🇳', tts: false },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩', tts: false },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳', tts: false },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳', tts: false },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳', tts: true },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳', tts: false },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳', tts: true },
  { code: 'ml', label: 'മലയാളം', flag: '🇮🇳', tts: false },
  { code: 'si', label: 'සිංහල', flag: '🇱🇰', tts: false },
  { code: 'th', label: 'ไทย', flag: '🇹🇭', tts: true },
  { code: 'lo', label: 'ລາວ', flag: '🇱🇦', tts: false },
  { code: 'bo', label: 'བོད་སྐད།', flag: '🇨🇳', tts: false },
  { code: 'my', label: 'မြန်မာ', flag: '🇲🇲', tts: false },
  { code: 'ka', label: 'ქართული', flag: '🇬🇪', tts: false },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹', tts: false },
  { code: 'km', label: 'ខ្មែរ', flag: '🇰🇭', tts: false },
  { code: 'yue', label: '粵語', flag: '🇭🇰', tts: false },
  { code: 'ko', label: '한국어', flag: '🇰🇷', tts: true },
];

/**
 * Langues réellement utilisables, en source comme en cible.
 *
 * L'API OpenAI n'accepte que 57 langues, aussi bien pour le paramètre
 * `language` de la transcription que pour la voix. Choisir le singhalais
 * en source provoquait une erreur 400 : « Language 'si' is not supported ».
 *
 * Les 43 autres restent atteignables par la détection automatique : le
 * backend omet alors le paramètre et Whisper devine librement.
 */
export const SUPPORTED_LANGUAGES: Language[] = LANGUAGES.filter((l) => l.tts);

/** Alias historique : source et cible partagent désormais la même liste. */
export const TARGET_LANGUAGES: Language[] = SUPPORTED_LANGUAGES;

export function findLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}

/** Une langue peut-elle servir de cible ? */
export function canBeTarget(code: string): boolean {
  return SUPPORTED_LANGUAGES.some((l) => l.code === code);
}

/** Une langue peut-elle être envoyée comme source explicite ? */
export function canBeSource(code: string): boolean {
  return code === 'auto' || canBeTarget(code);
}
