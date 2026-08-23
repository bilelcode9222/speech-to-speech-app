import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { pcmToWav } from '../utils/wav';
import { languageName } from '../utils/languages';
import { SpeechResult, StageError, TranslationResult } from '../types';

const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Résultat de l'appel unique transcription + traduction */
export interface AudioTranslationResult {
  originalText: string;
  translatedText: string;
  durationMs: number;
}

/**
 * Transcrit ET traduit en un seul appel.
 *
 * Gemini accepte l'audio nativement : on lui envoie l'enregistrement et il
 * renvoie les deux textes d'un coup. C'est un aller-retour réseau économisé
 * par rapport à la chaîne Whisper puis LLM.
 *
 * Le modèle répond en JSON pour qu'on puisse séparer proprement l'original
 * de la traduction sans découper une phrase à la main.
 */
export async function translateAudio(
  audioBase64: string,
  audioFormat: string,
  sourceLanguage: string,
  targetLanguage: string
): Promise<AudioTranslationResult> {
  const started = Date.now();
  const source = languageName(sourceLanguage);
  const target = languageName(targetLanguage);

  const prompt =
    `Cet audio contient une phrase en ${source}.\n` +
    `1. Transcris-la exactement.\n` +
    `2. Traduis-la en ${target}, en conservant le ton et le registre.\n\n` +
    `Réponds UNIQUEMENT avec un objet JSON de cette forme, sans texte autour ` +
    `et sans balises de code :\n` +
    `{"original":"la transcription","translation":"la traduction"}`;

  try {
    const response = await axios.post(
      `${BASE}/${config.gemini.model}:generateContent`,
      {
        contents: [
          {
            parts: [
              { inline_data: { mime_type: mimeTypeFor(audioFormat), data: audioBase64 } },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: {
          'x-goog-api-key': config.gemini.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const raw = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseJson(raw);

    const originalText = (parsed.original || '').trim();
    const translatedText = (parsed.translation || '').trim();

    if (!originalText || isHallucination(originalText)) {
      throw new StageError('stt', "Aucune parole détectée dans l'enregistrement.");
    }
    if (!translatedText) {
      throw new StageError('translation', 'Gemini a renvoyé une traduction vide.');
    }

    const durationMs = Date.now() - started;
    logger.timing('Gemini (transcription + traduction)', durationMs);

    return { originalText, translatedText, durationMs };
  } catch (error) {
    if (error instanceof StageError) throw error;
    logger.error('Échec Gemini (audio)', error);
    throw new StageError('stt', describeError(error));
  }
}

/**
 * Synthèse vocale.
 * Le modèle détecte seul la langue du texte : rien à lui préciser.
 */
export async function synthesizeSpeechGemini(text: string): Promise<SpeechResult> {
  const started = Date.now();

  try {
    const response = await axios.post(
      `${BASE}/${config.gemini.ttsModel}:generateContent`,
      {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: config.gemini.voice },
            },
          },
        },
      },
      {
        headers: {
          'x-goog-api-key': config.gemini.apiKey,
          'Content-Type': 'application/json',
        },
        timeout: 45000,
      }
    );

    const pcmBase64 =
      response.data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!pcmBase64) {
      throw new StageError('tts', "Gemini n'a renvoyé aucun audio.");
    }

    // L'audio arrive en PCM brut : on l'emballe en WAV pour le mobile
    const wav = pcmToWav(Buffer.from(pcmBase64, 'base64'));

    const durationMs = Date.now() - started;
    logger.timing('Gemini TTS', durationMs);

    return { audioBase64: wav.toString('base64'), durationMs };
  } catch (error) {
    if (error instanceof StageError) throw error;
    logger.error('Échec Gemini (voix)', error);
    throw new StageError('tts', describeError(error));
  }
}

function mimeTypeFor(format: string): string {
  const map: Record<string, string> = {
    m4a: 'audio/mp4',
    mp4: 'audio/mp4',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    webm: 'audio/webm',
    ogg: 'audio/ogg',
    flac: 'audio/flac',
    aac: 'audio/aac',
  };
  return map[format.toLowerCase()] || 'audio/mp4';
}

function parseJson(raw: string): { original?: string; translation?: string } {
  try {
    // Filet de sécurité si le modèle entoure sa réponse de balises Markdown
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    return {};
  }
}

function describeError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const detail = error.response?.data?.error?.message || '';

    if (status === 400 && detail.includes('API key not valid')) {
      return 'Clé Gemini invalide. Vérifie GEMINI_API_KEY.';
    }
    if (status === 403) {
      return "Accès refusé par Gemini. L'API Generative Language est-elle activée sur ton projet ?";
    }
    if (status === 404) {
      return `Modèle "${config.gemini.model}" introuvable. Liste les modèles disponibles et corrige GEMINI_MODEL.`;
    }
    if (status === 429) {
      return 'Quota Gemini atteint. Attends une minute ou active la facturation.';
    }
    return `Erreur Gemini (${status}) : ${detail || error.message}`;
  }
  return `Erreur Gemini : ${error instanceof Error ? error.message : String(error)}`;
}

/**
 * Détecte les hallucinations sur silence.
 *
 * Les modèles de transcription sont entraînés sur d'énormes corpus de vidéos
 * sous-titrées. Face à un enregistrement silencieux ou inintelligible, ils
 * produisent souvent la phrase de fin qu'ils ont vue des milliers de fois
 * dans ces données — mentions de plateformes de sous-titrage, appels à
 * l'abonnement, remerciements. Ce n'est pas de la parole : on traite ces
 * cas comme un silence plutôt que de les traduire et de les lire à voix haute.
 */
export function isHallucination(text: string): boolean {
  const normalized = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const patterns = [
    'amara org',
    'sous titres realises',
    'sous titrage',
    'merci d avoir regarde',
    'merci de votre attention',
    'abonnez vous',
    'thanks for watching',
    'thank you for watching',
    'subscribe to',
    'like and subscribe',
    'subtitles by',
    'transcription by',
  ];

  if (patterns.some((p) => normalized.includes(p))) return true;

  // Une transcription d'un seul caractère ou vide de sens
  if (normalized.length <= 2) return true;

  return false;
}
