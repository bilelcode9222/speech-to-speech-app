import Groq from 'groq-sdk';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { StageError, TranscriptionResult } from '../types';

const groq = new Groq({ apiKey: config.groq.apiKey });

/**
 * Transcrit un audio en texte via Whisper Large v3 Turbo sur Groq.
 *
 * @param audioBase64  Audio encodé en base64 envoyé par le mobile
 * @param format       Extension du fichier ('m4a', 'wav', 'mp3'...)
 * @param language     Langue parlée (ISO 639-1) — améliore vitesse et précision
 */
export async function transcribeAudio(
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

    // Le SDK Groq attend un objet de type File. Node 18+ fournit File globalement.
    const file = new File([new Uint8Array(buffer)], `audio.${format}`, {
      type: mimeTypeFor(format),
    });

    const transcription = await groq.audio.transcriptions.create({
      file,
      model: config.groq.sttModel,
      language,
      response_format: 'json',
      temperature: 0,
    });

    const text = (transcription.text || '').trim();
    const durationMs = Date.now() - started;
    logger.timing('STT', durationMs);

    if (!text) {
      throw new StageError('stt', "Aucune parole détectée dans l'enregistrement.");
    }

    return { text, durationMs };
  } catch (error) {
    if (error instanceof StageError) throw error;
    logger.error('Échec de la transcription', error);
    throw new StageError('stt', describeApiError(error, 'Groq (transcription)'));
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
  };
  return map[format.toLowerCase()] || 'audio/mp4';
}

function describeApiError(error: unknown, service: string): string {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes('401') || message.toLowerCase().includes('unauthorized')) {
    return `Clé API ${service} invalide. Vérifie GROQ_API_KEY dans backend/.env`;
  }
  if (message.includes('429')) {
    return `Quota ${service} atteint. Attends une minute avant de réessayer.`;
  }
  return `Erreur ${service} : ${message}`;
}
