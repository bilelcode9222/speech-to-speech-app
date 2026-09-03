import * as Speech from 'expo-speech';
import { setAudioModeAsync } from 'expo-audio';

/**
 * Voix native de l'iPhone.
 *
 * Gratuite, illimitée, hors ligne, et disponible dans toutes les langues
 * installées sur le système. La qualité est en retrait par rapport à une
 * voix neuronale, mais rien ne transite par le réseau : la parole démarre
 * quasi instantanément.
 */

/**
 * iOS attend des identifiants BCP-47 ('fr-FR'), pas des codes ISO à deux
 * lettres. Sans cette correspondance, une phrase espagnole serait lue avec
 * l'accent de la langue par défaut du téléphone.
 */
const BCP47: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-PT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  ru: 'ru-RU',
  ar: 'ar-SA',
  tr: 'tr-TR',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  hi: 'hi-IN',
  id: 'id-ID',
  sv: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  no: 'nb-NO',
  cs: 'cs-CZ',
  el: 'el-GR',
  uk: 'uk-UA',
  ro: 'ro-RO',
  hu: 'hu-HU',
  vi: 'vi-VN',
  ta: 'ta-IN',
  ms: 'ms-MY',
  hr: 'hr-HR',
  sk: 'sk-SK',
  bg: 'bg-BG',
  tl: 'fil-PH',
};

export function toBcp47(code: string): string {
  return BCP47[code] || code;
}

/**
 * Prononce un texte et rend la main quand la lecture est terminée.
 * La promesse se résout aussi en cas d'erreur : une voix manquante ne doit
 * jamais bloquer l'application.
 */
export function speakText(text: string, languageCode: string): Promise<void> {
  return new Promise((resolve) => {
    // Coupe le mode enregistrement, sinon le haut-parleur reste en sourdine
    setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true })
      .catch(() => {})
      .finally(() => {
        Speech.speak(text, {
          language: toBcp47(languageCode),
          rate: 1.0,
          pitch: 1.0,
          onDone: () => resolve(),
          onStopped: () => resolve(),
          onError: (error) => {
            console.log('[voix] lecture impossible', error);
            resolve();
          },
        });
      });
  });
}

/** Interrompt la lecture en cours, par exemple si on relance un enregistrement */
export function stopSpeaking(): void {
  Speech.stop().catch(() => {});
}
