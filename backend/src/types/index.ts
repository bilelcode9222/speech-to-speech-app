/**
 * Types partagés du backend.
 * Décrivent la forme des données qui circulent dans le pipeline.
 */

/** Code de langue ISO 639-1 (ex: 'fr', 'en', 'es') */
export type LanguageCode = string;

/** Requête envoyée par l'application mobile */
export interface TranslationRequest {
  /** Audio encodé en base64 */
  audioBase64: string;
  /** Extension du fichier audio (ex: 'm4a') */
  audioFormat: string;
  /** Langue parlée */
  sourceLanguage: LanguageCode;
  /** Langue cible */
  targetLanguage: LanguageCode;
  /** Identifiant unique de la requête */
  requestId: string;
}

export interface TranscriptionResult {
  text: string;
  durationMs: number;
}

export interface TranslationResult {
  translatedText: string;
  durationMs: number;
}

export interface SpeechResult {
  /** MP3 encodé en base64, prêt à être joué par le mobile */
  audioBase64: string;
  durationMs: number;
}

/** Réponse complète renvoyée au mobile */
export interface PipelineResult {
  requestId: string;
  originalText: string;
  translatedText: string;
  audioBase64: string;
  timings: {
    stt: number;
    translation: number;
    tts: number;
    total: number;
  };
}

export type PipelineStage = 'stt' | 'translation' | 'tts' | 'unknown';

export interface PipelineErrorPayload {
  requestId: string;
  stage: PipelineStage;
  message: string;
}

/** Noms des événements WebSocket, centralisés pour éviter les fautes de frappe */
export const SOCKET_EVENTS = {
  TRANSLATE: 'translate',
  TRANSCRIPTION_READY: 'transcription_ready',
  TRANSLATION_READY: 'translation_ready',
  AUDIO_READY: 'audio_ready',
  PIPELINE_ERROR: 'pipeline_error',
} as const;

/** Erreur métier portant l'étape où elle s'est produite */
export class StageError extends Error {
  constructor(public stage: PipelineStage, message: string) {
    super(message);
    this.name = 'StageError';
  }
}
