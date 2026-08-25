export interface Exchange {
  id: string;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string | null;
  translatedText: string | null;
  status: 'recording' | 'transcribing' | 'translating' | 'speaking' | 'done' | 'error';
  errorMessage?: string;
  timings?: {
    stt: number;
    translation: number;
    tts: number;
    total: number;
  };
}

export interface PipelineResult {
  requestId: string;
  originalText: string;
  translatedText: string;
  audioBase64: string;
  audioFormat?: 'wav' | 'mp3';
  timings: { stt: number; translation: number; tts: number; total: number };
}

export interface PipelineErrorPayload {
  requestId: string;
  stage: 'stt' | 'translation' | 'tts' | 'unknown';
  message: string;
}

export const SOCKET_EVENTS = {
  TRANSLATE: 'translate',
  TRANSCRIPTION_READY: 'transcription_ready',
  TRANSLATION_READY: 'translation_ready',
  AUDIO_READY: 'audio_ready',
  PIPELINE_ERROR: 'pipeline_error',
} as const;
