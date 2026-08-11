import { transcribeAudio } from '../services/sttService';
import { translateText } from '../services/translationService';
import { synthesizeSpeech } from '../services/ttsService';
import { translateAudio, synthesizeSpeechGemini } from '../services/geminiService';
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
    `Pipeline ${request.requestId} : ${request.sourceLanguage} -> ${request.targetLanguage} (${config.provider})`
  );

  let originalText: string;
  let translatedText: string;
  let sttMs = 0;
  let translationMs = 0;

  if (config.provider === 'gemini') {
    // Un seul appel : l'audio entre, les deux textes sortent
    const result = await translateAudio(
      request.audioBase64,
      request.audioFormat,
      request.sourceLanguage,
      request.targetLanguage
    );
    originalText = result.originalText;
    translatedText = result.translatedText;
    // Les deux étapes sont fusionnées : on attribue la durée à la traduction
    translationMs = result.durationMs;

    hooks.onTranscription?.(originalText);
    hooks.onTranslation?.(translatedText);
  } else {
    const stt = await transcribeAudio(
      request.audioBase64,
      request.audioFormat,
      request.sourceLanguage
    );
    originalText = stt.text;
    sttMs = stt.durationMs;
    hooks.onTranscription?.(originalText);

    const translation = await translateText(
      originalText,
      request.sourceLanguage,
      request.targetLanguage
    );
    translatedText = translation.translatedText;
    translationMs = translation.durationMs;
    hooks.onTranslation?.(translatedText);
  }

  // Synthèse vocale — sautée si c'est l'iPhone qui parle
  let audioBase64 = '';
  let audioFormat: 'wav' | 'mp3' = 'mp3';
  let ttsMs = 0;

  if (config.ttsProvider === 'gemini') {
    const tts = await synthesizeSpeechGemini(translatedText);
    audioBase64 = tts.audioBase64;
    audioFormat = 'wav';
    ttsMs = tts.durationMs;
  } else if (config.ttsProvider === 'elevenlabs') {
    const tts = await synthesizeSpeech(translatedText);
    audioBase64 = tts.audioBase64;
    audioFormat = 'mp3';
    ttsMs = tts.durationMs;
  }

  const total = Date.now() - totalStart;
  logger.success(`Pipeline ${request.requestId} terminé en ${total}ms`);

  return {
    requestId: request.requestId,
    originalText,
    translatedText,
    audioBase64,
    audioFormat,
    timings: { stt: sttMs, translation: translationMs, tts: ttsMs, total },
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
