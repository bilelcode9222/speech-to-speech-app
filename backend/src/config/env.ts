import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function optionalEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.startsWith('remplace')) return '';
  return value;
}

function requireEnv(key: string): string {
  const value = optionalEnv(key);
  if (!value.trim()) {
    throw new Error(
      `Clé manquante ou non remplie : ${key}\n` +
      `   Ajoute-la dans backend/.env (ou dans les variables Render).`
    );
  }
  return value;
}

/**
 * 'gemini' : un seul fournisseur. Transcription + traduction en un appel,
 *            puis voix Gemini. Deux appels au total.
 * 'groq'   : ancienne chaîne Whisper -> LLM -> ElevenLabs (ou voix iPhone).
 */
const provider = (process.env.AI_PROVIDER || 'gemini') as 'gemini' | 'groq';

/**
 * 'gemini'     : voix Gemini, naturelle, 70 langues.
 * 'device'     : voix de l'iPhone. Gratuite, illimitée, hors ligne.
 * 'elevenlabs' : voix premium, quota payant.
 */
const ttsProvider = (process.env.TTS_PROVIDER || 'gemini') as
  | 'gemini'
  | 'device'
  | 'elevenlabs';

export const config = {
  port: Number(process.env.PORT) || 3000,
  provider,
  ttsProvider,

  gemini: {
    apiKey: provider === 'gemini' ? requireEnv('GEMINI_API_KEY') : optionalEnv('GEMINI_API_KEY'),
    // Modèle multimodal qui accepte l'audio en entrée.
    // Vérifie le nom exact avec la commande donnée dans MIGRATION.md.
    model: process.env.GEMINI_MODEL || 'gemini-3-flash',
    liveModel: process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview',
    ttsModel: process.env.GEMINI_TTS_MODEL || 'gemini-3.1-flash-tts-preview',
    // 30 voix disponibles : Kore, Puck, Charon, Aoede, Fenrir, Leda...
    voice: process.env.GEMINI_VOICE || 'Kore',
  },

  groq: {
    apiKey: provider === 'groq' ? requireEnv('GROQ_API_KEY') : optionalEnv('GROQ_API_KEY'),
    sttModel: 'whisper-large-v3-turbo',
    llmModel: 'openai/gpt-oss-20b',
  },

  elevenLabs: {
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
