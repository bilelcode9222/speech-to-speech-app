import { transcribeAudio } from '../services/sttService';
import { translateText } from '../services/translationService';
import { synthesizeSpeech } from '../services/ttsService';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { isSupported } from '../utils/languages';
import { PipelineResult, StageError, TranslationRequest } from '../types';

export interface PipelineHooks {
  onTranscription?: (text: string) => void;
  onTranslation?: (text: string) => void;
}

export async function runSpeechPipeline(
  request: TranslationRequest,
  hooks: PipelineHooks = {}
): Promise<PipelineResult> {
  const totalStart = Date.now();

  validate(request);

  logger.info(
    `Pipeline ${request.requestId} : ${request.sourceLanguage} -> ${request.targetLanguage}`
  );

  // 1. Transcription
  const stt = await transcribeAudio(
    request.audioBase64,
    request.audioFormat,
    request.sourceLanguage
  );
  hooks.onTranscription?.(stt.text);

  // 2. Traduction
  const translation = await translateText(
    stt.text,
    request.sourceLanguage,
    request.targetLanguage
  );
  hooks.onTranslation?.(translation.translatedText);

  // 3. Synthèse vocale — sautée quand c'est l'iPhone qui parle.
  //    On économise ainsi un appel réseau et le transfert du MP3 :
  //    la latence baisse en même temps que le coût.
  let audioBase64 = '';
  let ttsDuration = 0;

  if (config.ttsProvider === 'elevenlabs') {
    const tts = await synthesizeSpeech(translation.translatedText);
    audioBase64 = tts.audioBase64;
    ttsDuration = tts.durationMs;
  }

  const total = Date.now() - totalStart;
  logger.success(`Pipeline ${request.requestId} terminé en ${total}ms`);

  return {
    requestId: request.requestId,
    originalText: stt.text,
    translatedText: translation.translatedText,
    audioBase64,
    timings: {
      stt: stt.durationMs,
      translation: translation.durationMs,
      tts: ttsDuration,
      total,
    },
  };
}

function validate(request: TranslationRequest): void {
  if (!request.audioBase64) {
    throw new StageError('unknown', 'Aucun audio reçu.');
  }
  if (!isSupported(request.sourceLanguage)) {
    throw new StageError('unknown', `Langue source non supportée : ${request.sourceLanguage}`);
  }
  if (!isSupported(request.targetLanguage)) {
    throw new StageError('unknown', `Langue cible non supportée : ${request.targetLanguage}`);
  }
  if (request.sourceLanguage === request.targetLanguage) {
    throw new StageError('unknown', 'La langue source et la langue cible sont identiques.');
  }
}
