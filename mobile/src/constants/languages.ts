export interface Language {
  code: string;
  label: string;
  flag: string;
}

/**
 * Les 100 langues reconnues par Whisper, tirées de son tokenizer officiel.
 *
 * Chaque langue s'affiche dans sa propre graphie — « Français », « 日本語 »,
 * « العربية » — plutôt que traduite. C'est la convention d'iOS, de Google
 * Translate et de DeepL : on reconnaît sa langue écrite comme elle
 * s'écrit, et cela évite de traduire 100 noms dans chaque langue de
 * l'interface.
 *
 * Les plus courantes sont en tête, le reste suit l'ordre alphabétique.
 * La qualité de transcription varie fortement : excellente pour les
 * langues massivement représentées sur le web, approximative ailleurs.
 *
 * Doit rester aligné avec backend/src/utils/languages.ts.
 */
export const LANGUAGES: Language[] = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'ar', label: 'العربية', flag: '🇸🇦' },
  { code: 'zh', label: '中文', flag: '🇨🇳' },
  { code: 'ja', label: '日本語', flag: '🇯🇵' },
  { code: 'ru', label: 'Русский', flag: '🇷🇺' },
  { code: 'af', label: 'Afrikaans', flag: '🇿🇦' },
  { code: 'az', label: 'Azərbaycan', flag: '🇦🇿' },
  { code: 'id', label: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ms', label: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'jw', label: 'Basa Jawa', flag: '🇮🇩' },
  { code: 'su', label: 'Basa Sunda', flag: '🇮🇩' },
  { code: 'bs', label: 'Bosanski', flag: '🇧🇦' },
  { code: 'br', label: 'Brezhoneg', flag: '🇫🇷' },
  { code: 'ca', label: 'Català', flag: '🇪🇸' },
  { code: 'sn', label: 'ChiShona', flag: '🇿🇼' },
  { code: 'cy', label: 'Cymraeg', flag: '🏴󠁧󠁢󠁷󠁬󠁳󠁿' },
  { code: 'da', label: 'Dansk', flag: '🇩🇰' },
  { code: 'et', label: 'Eesti', flag: '🇪🇪' },
  { code: 'eu', label: 'Euskara', flag: '🇪🇸' },
  { code: 'fo', label: 'Føroyskt', flag: '🇫🇴' },
  { code: 'gl', label: 'Galego', flag: '🇪🇸' },
  { code: 'ha', label: 'Hausa', flag: '🇳🇬' },
  { code: 'hr', label: 'Hrvatski', flag: '🇭🇷' },
  { code: 'sw', label: 'Kiswahili', flag: '🇰🇪' },
  { code: 'ht', label: 'Kreyòl ayisyen', flag: '🇭🇹' },
  { code: 'la', label: 'Latina', flag: '🇻🇦' },
  { code: 'lv', label: 'Latviešu', flag: '🇱🇻' },
  { code: 'lt', label: 'Lietuvių', flag: '🇱🇹' },
  { code: 'ln', label: 'Lingála', flag: '🇨🇩' },
  { code: 'lb', label: 'Lëtzebuergesch', flag: '🇱🇺' },
  { code: 'hu', label: 'Magyar', flag: '🇭🇺' },
  { code: 'mg', label: 'Malagasy', flag: '🇲🇬' },
  { code: 'mt', label: 'Malti', flag: '🇲🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'no', label: 'Norsk', flag: '🇳🇴' },
  { code: 'nn', label: 'Nynorsk', flag: '🇳🇴' },
  { code: 'oc', label: 'Occitan', flag: '🇫🇷' },
  { code: 'uz', label: 'Oʻzbekcha', flag: '🇺🇿' },
  { code: 'pl', label: 'Polski', flag: '🇵🇱' },
  { code: 'ro', label: 'Română', flag: '🇷🇴' },
  { code: 'sq', label: 'Shqip', flag: '🇦🇱' },
  { code: 'sk', label: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', label: 'Slovenščina', flag: '🇸🇮' },
  { code: 'so', label: 'Soomaali', flag: '🇸🇴' },
  { code: 'fi', label: 'Suomi', flag: '🇫🇮' },
  { code: 'sv', label: 'Svenska', flag: '🇸🇪' },
  { code: 'tl', label: 'Tagalog', flag: '🇵🇭' },
  { code: 'mi', label: 'Te Reo Māori', flag: '🇳🇿' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'tk', label: 'Türkmençe', flag: '🇹🇲' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'yo', label: 'Yorùbá', flag: '🇳🇬' },
  { code: 'is', label: 'Íslenska', flag: '🇮🇸' },
  { code: 'cs', label: 'Čeština', flag: '🇨🇿' },
  { code: 'haw', label: 'ʻŌlelo Hawaiʻi', flag: '🇺🇸' },
  { code: 'el', label: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'ba', label: 'Башҡортса', flag: '🇷🇺' },
  { code: 'be', label: 'Беларуская', flag: '🇧🇾' },
  { code: 'bg', label: 'Български', flag: '🇧🇬' },
  { code: 'mk', label: 'Македонски', flag: '🇲🇰' },
  { code: 'mn', label: 'Монгол', flag: '🇲🇳' },
  { code: 'sr', label: 'Српски', flag: '🇷🇸' },
  { code: 'tt', label: 'Татарча', flag: '🇷🇺' },
  { code: 'tg', label: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'uk', label: 'Українська', flag: '🇺🇦' },
  { code: 'kk', label: 'Қазақша', flag: '🇰🇿' },
  { code: 'hy', label: 'Հայերեն', flag: '🇦🇲' },
  { code: 'yi', label: 'ייִדיש', flag: '🇮🇱' },
  { code: 'he', label: 'עברית', flag: '🇮🇱' },
  { code: 'ur', label: 'اردو', flag: '🇵🇰' },
  { code: 'sd', label: 'سنڌي', flag: '🇵🇰' },
  { code: 'fa', label: 'فارسی', flag: '🇮🇷' },
  { code: 'ps', label: 'پښتو', flag: '🇦🇫' },
  { code: 'ne', label: 'नेपाली', flag: '🇳🇵' },
  { code: 'mr', label: 'मराठी', flag: '🇮🇳' },
  { code: 'sa', label: 'संस्कृतम्', flag: '🇮🇳' },
  { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' },
  { code: 'as', label: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'bn', label: 'বাংলা', flag: '🇧🇩' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'gu', label: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
  { code: 'te', label: 'తెలుగు', flag: '🇮🇳' },
  { code: 'kn', label: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'ml', label: 'മലയാളം', flag: '🇮🇳' },
  { code: 'si', label: 'සිංහල', flag: '🇱🇰' },
  { code: 'th', label: 'ไทย', flag: '🇹🇭' },
  { code: 'lo', label: 'ລາວ', flag: '🇱🇦' },
  { code: 'bo', label: 'བོད་སྐད།', flag: '🇨🇳' },
  { code: 'my', label: 'မြန်မာ', flag: '🇲🇲' },
  { code: 'ka', label: 'ქართული', flag: '🇬🇪' },
  { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
  { code: 'km', label: 'ខ្មែរ', flag: '🇰🇭' },
  { code: 'yue', label: '粵語', flag: '🇭🇰' },
  { code: 'ko', label: '한국어', flag: '🇰🇷' },
];

export function findLanguage(code: string): Language {
  return LANGUAGES.find((l) => l.code === code) || LANGUAGES[0];
}
