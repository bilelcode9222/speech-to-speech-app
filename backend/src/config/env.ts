import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === '' || value.startsWith('remplace') || value.startsWith('gsk_remplace')) {
    throw new Error(
      `Clé manquante ou non remplie : ${key}\n` +
      `   Ouvre le fichier backend/.env et remplace la valeur par ta vraie clé.`
    );
  }
  return value;
}

/** Variable optionnelle : renvoie une chaîne vide plutôt que de planter */
function optionalEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.startsWith('remplace')) return '';
  return value;
}

/**
 * 'device'     : la voix est prononcée par l'iPhone (expo-speech).
 *                Gratuit, illimité, hors ligne, aucune clé requise.
 * 'elevenlabs' : voix haute qualité, mais quota payant.
 */
const ttsProvider = (process.env.TTS_PROVIDER || 'device') as 'device' | 'elevenlabs';

export const config = {
  port: Number(process.env.PORT) || 3000,
  ttsProvider,

  groq: {
    apiKey: requireEnv('GROQ_API_KEY'),
    sttModel: 'whisper-large-v3-turbo',
    llmModel: 'openai/gpt-oss-20b',
  },

  elevenLabs: {
    // Obligatoire uniquement si TTS_PROVIDER=elevenlabs
    apiKey:
      ttsProvider === 'elevenlabs'
        ? requireEnv('ELEVENLABS_API_KEY')
        : optionalEnv('ELEVENLABS_API_KEY'),
    voiceId: process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM',
    model: 'eleven_flash_v2_5',
    baseUrl: 'https://api.elevenlabs.io/v1',
  },

  isDev: process.env.NODE_ENV !== 'production',
} as const;
