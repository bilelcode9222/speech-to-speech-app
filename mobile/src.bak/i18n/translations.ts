/**
 * Textes de l'interface, par langue.
 *
 * Seules les langues traduites avec un niveau de confiance suffisant sont
 * listées ici. Mieux vaut une langue absente — l'app retombe alors sur
 * l'anglais — qu'une traduction approximative, qui donne une impression
 * de négligence.
 *
 * Les noms de langues du sélecteur ne sont volontairement pas traduits :
 * ils s'affichent dans leur propre langue (Français, English, Español),
 * ce qui est plus lisible et évite 100 × N traductions.
 */

export type TranslationKey =
  | 'connected'
  | 'serverOffline'
  | 'micDenied'
  | 'micDeniedBody'
  | 'micUnavailable'
  | 'micUnavailableBody'
  | 'faceToFaceEnter'
  | 'faceToFaceExit'
  | 'themeToLight'
  | 'themeToDark'
  | 'spokenLanguage'
  | 'translateTo'
  | 'translationFailed'
  | 'translating'
  | 'tapToTranslate'
  | 'tapAndSpeak'
  | 'stopAndTranslate'
  | 'startRecording'
  | 'nothingYet'
  | 'emptyHint'
  | 'speaking'
  | 'swapLanguages';

type Dict = Record<TranslationKey, string>;

const en: Dict = {
  connected: 'Connected',
  serverOffline: 'Server offline',
  micDenied: 'Microphone denied',
  micDeniedBody:
    'The app cannot work without microphone access. Allow it in Settings.',
  micUnavailable: 'Microphone unavailable',
  micUnavailableBody: 'Recording could not start.',
  faceToFaceEnter: 'Face-to-face mode',
  faceToFaceExit: 'Exit face-to-face mode',
  themeToLight: 'Switch to light mode',
  themeToDark: 'Switch to dark mode',
  spokenLanguage: 'Spoken language',
  translateTo: 'Translate to',
  translationFailed: 'Translation interrupted',
  translating: 'Translating',
  tapToTranslate: 'Tap to translate',
  tapAndSpeak: 'Tap and speak',
  stopAndTranslate: 'Stop and translate',
  startRecording: 'Start recording',
  nothingYet: 'Nothing yet',
  emptyHint: 'Tap the button, say a sentence, tap again.',
  speaking: 'Speaking',
  swapLanguages: 'Swap languages',
};

const fr: Dict = {
  connected: 'Connecté',
  serverOffline: 'Serveur hors ligne',
  micDenied: 'Micro refusé',
  micDeniedBody:
    "L'application ne peut pas fonctionner sans accès au micro. Autorise-le dans Réglages.",
  micUnavailable: 'Micro indisponible',
  micUnavailableBody: "L'enregistrement n'a pas pu démarrer.",
  faceToFaceEnter: 'Mode face à face',
  faceToFaceExit: 'Quitter le mode face à face',
  themeToLight: 'Passer en mode clair',
  themeToDark: 'Passer en mode sombre',
  spokenLanguage: 'Langue parlée',
  translateTo: 'Traduire vers',
  translationFailed: 'Traduction interrompue',
  translating: 'Traduction en cours',
  tapToTranslate: 'Touche pour traduire',
  tapAndSpeak: 'Touche et parle',
  stopAndTranslate: 'Arrêter et traduire',
  startRecording: "Démarrer l'enregistrement",
  nothingYet: 'Rien encore',
  emptyHint: 'Touche le bouton, dis une phrase, touche à nouveau.',
  speaking: 'Parle',
  swapLanguages: 'Inverser les langues',
};

const es: Dict = {
  connected: 'Conectado',
  serverOffline: 'Servidor desconectado',
  micDenied: 'Micrófono denegado',
  micDeniedBody:
    'La aplicación no puede funcionar sin acceso al micrófono. Permítelo en Ajustes.',
  micUnavailable: 'Micrófono no disponible',
  micUnavailableBody: 'No se pudo iniciar la grabación.',
  faceToFaceEnter: 'Modo cara a cara',
  faceToFaceExit: 'Salir del modo cara a cara',
  themeToLight: 'Cambiar a modo claro',
  themeToDark: 'Cambiar a modo oscuro',
  spokenLanguage: 'Idioma hablado',
  translateTo: 'Traducir a',
  translationFailed: 'Traducción interrumpida',
  translating: 'Traduciendo',
  tapToTranslate: 'Toca para traducir',
  tapAndSpeak: 'Toca y habla',
  stopAndTranslate: 'Detener y traducir',
  startRecording: 'Iniciar grabación',
  nothingYet: 'Nada aún',
  emptyHint: 'Toca el botón, di una frase, toca de nuevo.',
  speaking: 'Habla',
  swapLanguages: 'Intercambiar idiomas',
};

const de: Dict = {
  connected: 'Verbunden',
  serverOffline: 'Server offline',
  micDenied: 'Mikrofon verweigert',
  micDeniedBody:
    'Die App funktioniert nicht ohne Mikrofonzugriff. Erlaube ihn in den Einstellungen.',
  micUnavailable: 'Mikrofon nicht verfügbar',
  micUnavailableBody: 'Die Aufnahme konnte nicht gestartet werden.',
  faceToFaceEnter: 'Gegenüber-Modus',
  faceToFaceExit: 'Gegenüber-Modus beenden',
  themeToLight: 'Zum hellen Modus wechseln',
  themeToDark: 'Zum dunklen Modus wechseln',
  spokenLanguage: 'Gesprochene Sprache',
  translateTo: 'Übersetzen nach',
  translationFailed: 'Übersetzung abgebrochen',
  translating: 'Übersetzung läuft',
  tapToTranslate: 'Tippen zum Übersetzen',
  tapAndSpeak: 'Tippen und sprechen',
  stopAndTranslate: 'Stoppen und übersetzen',
  startRecording: 'Aufnahme starten',
  nothingYet: 'Noch nichts',
  emptyHint: 'Tippe auf die Taste, sprich einen Satz, tippe erneut.',
  speaking: 'Spricht',
  swapLanguages: 'Sprachen tauschen',
};

const it: Dict = {
  connected: 'Connesso',
  serverOffline: 'Server offline',
  micDenied: 'Microfono negato',
  micDeniedBody:
    "L'app non può funzionare senza accesso al microfono. Consentilo in Impostazioni.",
  micUnavailable: 'Microfono non disponibile',
  micUnavailableBody: 'Impossibile avviare la registrazione.',
  faceToFaceEnter: 'Modalità faccia a faccia',
  faceToFaceExit: 'Esci dalla modalità faccia a faccia',
  themeToLight: 'Passa alla modalità chiara',
  themeToDark: 'Passa alla modalità scura',
  spokenLanguage: 'Lingua parlata',
  translateTo: 'Traduci in',
  translationFailed: 'Traduzione interrotta',
  translating: 'Traduzione in corso',
  tapToTranslate: 'Tocca per tradurre',
  tapAndSpeak: 'Tocca e parla',
  stopAndTranslate: 'Ferma e traduci',
  startRecording: 'Avvia registrazione',
  nothingYet: 'Ancora niente',
  emptyHint: 'Tocca il pulsante, di\u2019 una frase, tocca di nuovo.',
  speaking: 'Parla',
  swapLanguages: 'Inverti lingue',
};

const pt: Dict = {
  connected: 'Conectado',
  serverOffline: 'Servidor offline',
  micDenied: 'Microfone negado',
  micDeniedBody:
    'O app não funciona sem acesso ao microfone. Permita nos Ajustes.',
  micUnavailable: 'Microfone indisponível',
  micUnavailableBody: 'Não foi possível iniciar a gravação.',
  faceToFaceEnter: 'Modo frente a frente',
  faceToFaceExit: 'Sair do modo frente a frente',
  themeToLight: 'Mudar para modo claro',
  themeToDark: 'Mudar para modo escuro',
  spokenLanguage: 'Idioma falado',
  translateTo: 'Traduzir para',
  translationFailed: 'Tradução interrompida',
  translating: 'Traduzindo',
  tapToTranslate: 'Toque para traduzir',
  tapAndSpeak: 'Toque e fale',
  stopAndTranslate: 'Parar e traduzir',
  startRecording: 'Iniciar gravação',
  nothingYet: 'Nada ainda',
  emptyHint: 'Toque no botão, diga uma frase, toque novamente.',
  speaking: 'Fala',
  swapLanguages: 'Trocar idiomas',
};

const nl: Dict = {
  connected: 'Verbonden',
  serverOffline: 'Server offline',
  micDenied: 'Microfoon geweigerd',
  micDeniedBody:
    'De app werkt niet zonder microfoontoegang. Sta dit toe in Instellingen.',
  micUnavailable: 'Microfoon niet beschikbaar',
  micUnavailableBody: 'De opname kon niet starten.',
  faceToFaceEnter: 'Face-to-face-modus',
  faceToFaceExit: 'Face-to-face-modus verlaten',
  themeToLight: 'Schakel naar lichte modus',
  themeToDark: 'Schakel naar donkere modus',
  spokenLanguage: 'Gesproken taal',
  translateTo: 'Vertalen naar',
  translationFailed: 'Vertaling onderbroken',
  translating: 'Bezig met vertalen',
  tapToTranslate: 'Tik om te vertalen',
  tapAndSpeak: 'Tik en spreek',
  stopAndTranslate: 'Stoppen en vertalen',
  startRecording: 'Opname starten',
  nothingYet: 'Nog niets',
  emptyHint: 'Tik op de knop, zeg een zin, tik opnieuw.',
  speaking: 'Spreekt',
  swapLanguages: 'Talen wisselen',
};

const ru: Dict = {
  connected: 'Подключено',
  serverOffline: 'Сервер недоступен',
  micDenied: 'Доступ к микрофону запрещён',
  micDeniedBody:
    'Приложение не работает без доступа к микрофону. Разрешите его в настройках.',
  micUnavailable: 'Микрофон недоступен',
  micUnavailableBody: 'Не удалось начать запись.',
  faceToFaceEnter: 'Режим «лицом к лицу»',
  faceToFaceExit: 'Выйти из режима «лицом к лицу»',
  themeToLight: 'Переключить на светлую тему',
  themeToDark: 'Переключить на тёмную тему',
  spokenLanguage: 'Язык речи',
  translateTo: 'Перевести на',
  translationFailed: 'Перевод прерван',
  translating: 'Перевод…',
  tapToTranslate: 'Нажмите, чтобы перевести',
  tapAndSpeak: 'Нажмите и говорите',
  stopAndTranslate: 'Остановить и перевести',
  startRecording: 'Начать запись',
  nothingYet: 'Пока пусто',
  emptyHint: 'Нажмите кнопку, скажите фразу, нажмите снова.',
  speaking: 'Говорит',
  swapLanguages: 'Поменять языки',
};

const ar: Dict = {
  connected: 'متصل',
  serverOffline: 'الخادم غير متصل',
  micDenied: 'تم رفض الميكروفون',
  micDeniedBody:
    'لا يمكن للتطبيق العمل بدون الوصول إلى الميكروفون. اسمح به في الإعدادات.',
  micUnavailable: 'الميكروفون غير متاح',
  micUnavailableBody: 'تعذّر بدء التسجيل.',
  faceToFaceEnter: 'وضع وجهًا لوجه',
  faceToFaceExit: 'الخروج من وضع وجهًا لوجه',
  themeToLight: 'التبديل إلى الوضع الفاتح',
  themeToDark: 'التبديل إلى الوضع الداكن',
  spokenLanguage: 'لغة التحدث',
  translateTo: 'الترجمة إلى',
  translationFailed: 'توقفت الترجمة',
  translating: 'جارٍ الترجمة',
  tapToTranslate: 'اضغط للترجمة',
  tapAndSpeak: 'اضغط وتحدث',
  stopAndTranslate: 'إيقاف وترجمة',
  startRecording: 'بدء التسجيل',
  nothingYet: 'لا شيء بعد',
  emptyHint: 'اضغط الزر، قل جملة، ثم اضغط مرة أخرى.',
  speaking: 'يتحدث',
  swapLanguages: 'تبديل اللغتين',
};

const zh: Dict = {
  connected: '已连接',
  serverOffline: '服务器离线',
  micDenied: '麦克风被拒绝',
  micDeniedBody: '没有麦克风权限，应用无法运行。请在设置中允许。',
  micUnavailable: '麦克风不可用',
  micUnavailableBody: '无法开始录音。',
  faceToFaceEnter: '面对面模式',
  faceToFaceExit: '退出面对面模式',
  themeToLight: '切换到浅色模式',
  themeToDark: '切换到深色模式',
  spokenLanguage: '说话语言',
  translateTo: '翻译成',
  translationFailed: '翻译中断',
  translating: '翻译中',
  tapToTranslate: '点击翻译',
  tapAndSpeak: '点击并说话',
  stopAndTranslate: '停止并翻译',
  startRecording: '开始录音',
  nothingYet: '暂无内容',
  emptyHint: '点击按钮，说一句话，再次点击。',
  speaking: '正在说',
  swapLanguages: '交换语言',
};

const ja: Dict = {
  connected: '接続済み',
  serverOffline: 'サーバーオフライン',
  micDenied: 'マイクが拒否されました',
  micDeniedBody:
    'マイクへのアクセスがないとアプリは動作しません。設定で許可してください。',
  micUnavailable: 'マイクを利用できません',
  micUnavailableBody: '録音を開始できませんでした。',
  faceToFaceEnter: '対面モード',
  faceToFaceExit: '対面モードを終了',
  themeToLight: 'ライトモードに切り替え',
  themeToDark: 'ダークモードに切り替え',
  spokenLanguage: '話す言語',
  translateTo: '翻訳先',
  translationFailed: '翻訳が中断されました',
  translating: '翻訳中',
  tapToTranslate: 'タップして翻訳',
  tapAndSpeak: 'タップして話す',
  stopAndTranslate: '停止して翻訳',
  startRecording: '録音を開始',
  nothingYet: 'まだありません',
  emptyHint: 'ボタンをタップして話し、もう一度タップします。',
  speaking: '話し中',
  swapLanguages: '言語を入れ替え',
};

export const TRANSLATIONS: Record<string, Dict> = {
  en,
  fr,
  es,
  de,
  it,
  pt,
  nl,
  ru,
  ar,
  zh,
  ja,
};

export const FALLBACK_LOCALE = 'en';
