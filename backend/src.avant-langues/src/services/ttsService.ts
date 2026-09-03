import axios from 'axios';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { SpeechResult, StageError } from '../types';

/**
 * Convertit du texte en voix via ElevenLabs Flash v2.5 (~75 ms de latence).
 * Renvoie un MP3 encodé en base64, directement jouable par le mobile.
 */
export async function synthesizeSpeech(text: string): Promise<SpeechResult> {
  const started = Date.now();
  const url = `${config.elevenLabs.baseUrl}/text-to-speech/${config.elevenLabs.voiceId}`;

  try {
    const response = await axios.post(
      url,
      {
        text,
        model_id: config.elevenLabs.model,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          speed: 1.0,
        },
      },
      {
        headers: {
          'xi-api-key': config.elevenLabs.apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
        },
        responseType: 'arraybuffer',
        timeout: 30000,
      }
    );

    const audioBase64 = Buffer.from(response.data).toString('base64');
    const durationMs = Date.now() - started;
    logger.timing('TTS', durationMs);

    return { audioBase64, durationMs };
  } catch (error) {
    logger.error('Échec de la synthèse vocale', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      if (status === 401) {
        throw new StageError(
          'tts',
          'Clé ElevenLabs invalide. Vérifie ELEVENLABS_API_KEY dans backend/.env'
        );
      }
      if (status === 429) {
        throw new StageError(
          'tts',
          'Quota ElevenLabs épuisé. Vérifie ton solde de caractères sur elevenlabs.io'
        );
      }
      if (status === 422) {
        throw new StageError(
          'tts',
          `Requête refusée par ElevenLabs (voix ou modèle invalide). Voice ID utilisé : ${config.elevenLabs.voiceId}`
        );
      }
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new StageError('tts', `Erreur ElevenLabs : ${message}`);
  }
}
