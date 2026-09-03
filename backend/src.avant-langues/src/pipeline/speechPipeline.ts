import { transcribeAudio } from '../services/sttService';
import { translateText } from '../services/translationService';
import { synthesizeSpeech } from '../services/ttsService';
import {
  transcribeOpenAI,
  translateOpenAI,
  synthesizeSpeechOpenAI,
} from '../services/openaiService';
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
    `Pipeline ${request.requestId} : ${request.sourceLanguage} -> ${request.targetLanguage} ` +
    `(${config.provider} + ${config.ttsProvider})`
  );

  let originalText: string;
  let translatedText: string;
  let sttMs = 0;
  let translationMs = 0;

  if (config.provider === 'openai') {
    const stt = await transcribeOpenAI(
      request.audioBase64,
      request.audioFormat,
      request.sourceLanguage
    );
    originalText = stt.text;
    sttMs = stt.durationMs;
    hooks.onTranscription?.(originalText);

    const translation = await translateOpenAI(
      originalText,
      request.sourceLanguage,
      request.targetLanguage
    );
    translatedText = translation.translatedText;
    translationMs = translation.durationMs;
    hooks.onTranslation?.(translatedText);
  } else if (config.provider === 'gemini') {
    const result = await translateAudio(
      request.audioBase64,
      request.audioFormat,
      request.sourceLanguage,
      request.targetLanguage
    );
    originalText = result.originalText;
    translatedText = result.translatedText;
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

  const speech = await produceSpeech(translatedText);

  const total = Date.now() - totalStart;
  logger.success(`Pipeline ${request.requestId} terminé en ${total}ms`);

  return {
    requestId: request.requestId,
    originalText,
    translatedText,
    audioBase64: speech.audioBase64,
    audioFormat: speech.format,
    timings: { stt: sttMs, translation: translationMs, tts: speech.durationMs, total },
  };
}

/**
 * Produit la voix, avec repli automatique.
 *
 * Si le fournisseur échoue, on renvoie une chaîne vide plutôt qu'une erreur :
 * le mobile prononce alors lui-même. Le texte est déjà affiché à ce stade —
 * mieux vaut une voix dégradée qu'un échec complet.
 */
async function produceSpeech(
  text: string
): Promise<{ audioBase64: string; format: 'wav' | 'mp3'; durationMs: number }> {
  if (config.ttsProvider === 'device') {
    return { audioBase64: '', format: 'mp3', durationMs: 0 };
  }

  try {
    if (config.ttsProvider === 'openai') {
      const tts = await synthesizeSpeechOpenAI(text);
      return { audioBase64: tts.audioBase64, format: 'mp3', durationMs: tts.durationMs };
    }
    if (config.ttsProvider === 'gemini') {
      const tts = await synthesizeSpeechGemini(text);
      return { audioBase64: tts.audioBase64, format: 'wav', durationMs: tts.durationMs };
    }
    if (config.ttsProvider === 'elevenlabs') {
      const tts = await synthesizeSpeech(text);
      return { audioBase64: tts.audioBase64, format: 'mp3', durationMs: tts.durationMs };
    }
  } catch {
    logger.warn(
      `Voix indisponible (${config.ttsProvider}) — repli sur la voix du téléphone`
    );
  }

  return { audioBase64: '', format: 'mp3', durationMs: 0 };
}

function validate(request: TranslationRequest): void {
  if (!request.audioBase64) {
    throw new StageError('unknown', 'Aucun audio reçu.');
  }
  if (!isSupported(request.sourceLanguage)) {
    throw new StageError('unknown', `Langue source non supportée : ${request.sourceLanguage}`);
  }
  if (request.targetLanguage === 'auto') {
    throw new StageError('unknown', 'La langue cible doit être explicite.');
  }
  if (!isSupported(request.targetLanguage)) {
    throw new StageError('unknown', `Langue cible non supportée : ${request.targetLanguage}`);
  }
  if (request.sourceLanguage === request.targetLanguage) {
    throw new StageError('unknown', 'La langue source et la langue cible sont identiques.');
  }
}
