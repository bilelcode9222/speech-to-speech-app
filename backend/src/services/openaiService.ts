import axios from 'axios';
import FormData from 'form-data';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { languageName } from '../utils/languages';
import { isHallucination } from './geminiService';
import {
  SpeechResult,
  StageError,
  TranscriptionResult,
  TranslationResult,
} from '../types';

const BASE = 'https://api.openai.com/v1';

/**
 * Transcription via Whisper chez OpenAI.
 *
 * Contrairement à Gemini, OpenAI ne sait pas transcrire ET traduire en un seul
 * appel : GPT n'accepte pas d'audio en entrée. Il faut donc deux étapes.
 */
export async function transcribeOpenAI(
  audioBase64: string,
  format: string,
  language: string
): Promise<TranscriptionResult> {
  const started = Date.now();

  try {
    const buffer = Buffer.from(audioBase64, 'base64');
    if (buffer.length === 0) {
      throw new StageError('stt', "L'audio reçu est vide.");
    }

    const form = new FormData();
    form.append('file', buffer, { filename: `audio.${format}`, contentType: mime(format) });
    form.append('model', config.openai.sttModel);
    form.append('language', language);
    form.append('response_format', 'json');
    // Whisper renvoie parfois une transcription vide sur un énoncé très
    // court (un mot isolé) : sans contexte, il préfère ne rien produire
    // plutôt que de risquer une erreur. Un prompt d'amorce et une
    // température nulle le rendent nettement plus déterministe.
    form.append('temperature', '0');
    form.append('prompt', 'Phrase courte de conversation courante.');

    const response = await axios.post(`${BASE}/audio/transcriptions`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${config.openai.apiKey}`,
      },
      timeout: 45000,
      maxBodyLength: Infinity,
    });

    const text = (response.data?.text || '').trim();
    const durationMs = Date.now() - started;
    logger.timing('OpenAI STT', durationMs);

    if (!text || isHallucination(text)) {
      throw new StageError('stt', "Aucune parole détectée dans l'enregistrement.");
    }

    return { text, durationMs };
  } catch (error) {
    if (error instanceof StageError) throw error;
    logger.error('Échec OpenAI (transcription)', error);
    throw new StageError('stt', describe(error, 'transcription'));
  }
}

/**
 * Traduction via GPT.
 *
 * Le prompt est strict : le modèle ne doit renvoyer QUE la traduction, sinon
 * la voix lirait à haute voix des phrases parasites du type "Voici la
 * traduction :".
 */
export async function translateOpenAI(
  text: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<TranslationResult> {
  const started = Date.now();
  const source = languageName(sourceLanguage);
  const target = languageName(targetLanguage);

  try {
    const response = await axios.post(
      `${BASE}/chat/completions`,
      {
        model: config.openai.llmModel,
        temperature: 0.2,
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content:
              `Tu es un traducteur professionnel. Traduis le message depuis ` +
              `${source} vers ${target}.\n` +
              `Règles strictes :\n` +
              `- Réponds UNIQUEMENT avec la traduction.\n` +
              `- Aucun commentaire, aucune explication, aucun guillemet ajouté.\n` +
              `- Conserve le ton, le registre et le niveau de langue d'origine.\n` +
              `- Traduis même les phrases incomplètes ou familières.`,
          },
          { role: 'user', content: text },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      }
    );

    const translatedText = (response.data?.choices?.[0]?.message?.content || '').trim();
    const durationMs = Date.now() - started;
    logger.timing('OpenAI traduction', durationMs);

    if (!translatedText) {
      throw new StageError('translation', 'Le modèle a renvoyé une traduction vide.');
    }

    return { translatedText, durationMs };
  } catch (error) {
    if (error instanceof StageError) throw error;
    logger.error('Échec OpenAI (traduction)', error);
    throw new StageError('translation', describe(error, 'traduction'));
  }
}

/**
 * Synthèse vocale.
 * tts-1 est le plus rapide : environ 0,5 s avant le premier octet.
 */
export async function synthesizeSpeechOpenAI(text: string): Promise<SpeechResult> {
  const started = Date.now();

  try {
    const response = await axios.post(
      `${BASE}/audio/speech`,
      {
        model: config.openai.ttsModel,
        voice: config.openai.voice,
        input: text,
        response_format: 'mp3',
        speed: 1.0,
      },
      {
        headers: {
          Authorization: `Bearer ${config.openai.apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );

    const audioBase64 = Buffer.from(response.data).toString('base64');
    const durationMs = Date.now() - started;
    logger.timing('OpenAI TTS', durationMs);

    return { audioBase64, durationMs };
  } catch (error) {
    logger.error('Échec OpenAI (voix)', error);
    throw new StageError('tts', describeBinary(error));
  }
}

function mime(format: string): string {
  const map: Record<string, string> = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
  };
  return map[format.toLowerCase()] || 'audio/mp4';
}

function describe(error: unknown, stage: string): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || '';

    if (status === 401) return 'Clé OpenAI invalide. Vérifie OPENAI_API_KEY.';
    if (status === 429) {
      return 'Quota OpenAI atteint, ou crédit épuisé sur platform.openai.com.';
    }
    if (status === 400) return `Requête refusée par OpenAI (${stage}) : ${detail}`;
    return `Erreur OpenAI ${stage} (${status}) : ${detail || error.message}`;
  }
  return `Erreur OpenAI ${stage} : ${error instanceof Error ? error.message : String(error)}`;
}

/** La réponse TTS arrive en binaire : il faut la décoder pour lire l'erreur */
function describeBinary(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    let detail = '';
    try {
      const raw = Buffer.from(error.response?.data || []).toString('utf8');
      detail = JSON.parse(raw)?.error?.message || '';
    } catch {
      detail = error.message;
    }

    if (status === 401) return 'Clé OpenAI invalide. Vérifie OPENAI_API_KEY.';
    if (status === 429) return 'Quota OpenAI atteint ou crédit épuisé.';
    return `Erreur OpenAI voix (${status}) : ${detail}`;
  }
  return `Erreur OpenAI voix : ${error instanceof Error ? error.message : String(error)}`;
}
