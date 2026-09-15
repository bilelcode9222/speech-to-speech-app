import { config } from '../config/env';
import { captureServerAnalytics } from './serverAnalytics';

interface TranslationCostInput {
  installationId: string;
  recordingDurationMs?: number;
  translatedText: string;
  translationInputTokens?: number;
  translationOutputTokens?: number;
}

/**
 * Enregistre une estimation par traduction. Les montants, identifiants de
 * modèles et compteurs sont suffisants pour la marge ; aucun contenu parlé ou
 * traduit ne sort du pipeline.
 */
export async function recordTranslationCost(input: TranslationCostInput): Promise<void> {
  const rates = config.unitEconomics;
  const audioMinutes = Math.max(0, input.recordingDurationMs ?? 0) / 60_000;
  const outputCharacters = input.translatedText.length;
  const inputTokens = input.translationInputTokens ?? 0;
  const outputTokens = input.translationOutputTokens ?? 0;

  let sttCostUsd = 0;
  let llmCostUsd = 0;
  let ttsCostUsd = 0;
  let complete = true;

  if (config.provider === 'openai') {
    sttCostUsd = audioMinutes * rates.openaiWhisperPerMinuteUsd;
    llmCostUsd =
      (inputTokens * rates.openaiLlmInputPerMillionTokensUsd +
        outputTokens * rates.openaiLlmOutputPerMillionTokensUsd) /
      1_000_000;
    if (!input.recordingDurationMs || !inputTokens || !outputTokens) complete = false;
  } else if (config.provider === 'groq') {
    sttCostUsd = audioMinutes * rates.groqSttPerMinuteUsd;
    llmCostUsd =
      (inputTokens * rates.groqLlmInputPerMillionTokensUsd +
        outputTokens * rates.groqLlmOutputPerMillionTokensUsd) /
      1_000_000;
    if (
      !input.recordingDurationMs ||
      !inputTokens ||
      !outputTokens ||
      (!rates.groqSttPerMinuteUsd && !rates.groqLlmInputPerMillionTokensUsd && !rates.groqLlmOutputPerMillionTokensUsd)
    ) complete = false;
  } else {
    // Gemini facture selon le modèle et peut combiner audio + texte : une
    // estimation générique serait trompeuse tant que ses tarifs ne sont pas configurés.
    complete = false;
  }

  if (config.ttsProvider === 'openai') {
    ttsCostUsd = (outputCharacters * rates.openaiTtsPerMillionCharactersUsd) / 1_000_000;
  } else if (config.ttsProvider === 'elevenlabs') {
    ttsCostUsd =
      (outputCharacters * rates.elevenLabsTtsPerMillionCharactersUsd) / 1_000_000;
    if (!rates.elevenLabsTtsPerMillionCharactersUsd) complete = false;
  } else if (config.ttsProvider === 'gemini') {
    complete = false;
  }

  const estimatedCostUsd = sttCostUsd + llmCostUsd + ttsCostUsd;
  await captureServerAnalytics('translation_cost_recorded', input.installationId, {
    estimated_cost_usd: estimatedCostUsd,
    stt_cost_usd: sttCostUsd,
    llm_cost_usd: llmCostUsd,
    tts_cost_usd: ttsCostUsd,
    audio_minutes: audioMinutes,
    translation_input_tokens: inputTokens || null,
    translation_output_tokens: outputTokens || null,
    output_characters: outputCharacters,
    provider: config.provider,
    tts_provider: config.ttsProvider,
    cost_estimate_complete: complete,
  });
}
