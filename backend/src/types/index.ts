/**
 * Types partagés du backend.
 */

export type LanguageCode = string;

export interface TranslationRequest {
  audioBase64: string;
  audioFormat: string;
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
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
  audioBase64: string;
  durationMs: number;
}

export interface PipelineResult {
  requestId: string;
  originalText: string;
  translatedText: string;
  audioBase64: string;
  /** Gemini renvoie du WAV, ElevenLabs du MP3 — le mobile doit le savoir */
  audioFormat: 'wav' | 'mp3';
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
  code?: string;
}

export const SOCKET_EVENTS = {
  TRANSLATE: 'translate',
  TRANSCRIPTION_READY: 'transcription_ready',
  TRANSLATION_READY: 'translation_ready',
  AUDIO_READY: 'audio_ready',
  PIPELINE_ERROR: 'pipeline_error',
} as const;

export class StageError extends Error {
  constructor(public stage: PipelineStage, message: string) {
    super(message);
    this.name = 'StageError';
  }
}
