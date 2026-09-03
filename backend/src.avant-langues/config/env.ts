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
 * Qui transcrit et traduit.
 *
 * 'openai' : Whisper puis GPT. Deux appels, mais un service stable.
 * 'gemini' : un seul appel audio -> texte traduit. Plus rapide, mais les
 *            modèles en preview renvoient parfois des 500.
 * 'groq'   : Whisper puis Llama, chez Groq.
 */
const provider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'gemini' | 'groq';

/**
 * Qui produit la voix.
 *
 * 'openai'     : ~0,5 s, stable, 15 $ / million de caractères.
 * 'device'     : voix de l'iPhone. Gratuite, instantanée, qualité moyenne.
 * 'gemini'     : voix naturelle mais instable (503 en pic d'usage).
 * 'elevenlabs' : voix premium, douze fois le prix d'OpenAI.
 */
const ttsProvider = (process.env.TTS_PROVIDER || 'openai') as
  | 'openai'
  | 'gemini'
  | 'device'
  | 'elevenlabs';

const needsOpenAI = provider === 'openai' || ttsProvider === 'openai';

export const config = {
  port: Number(process.env.PORT) || 3000,
  provider,
  ttsProvider,

  openai: {
    apiKey: needsOpenAI ? requireEnv('OPENAI_API_KEY') : optionalEnv('OPENAI_API_KEY'),
    sttModel: process.env.OPENAI_STT_MODEL || 'whisper-1',
    llmModel: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
    // tts-1 plutôt que tts-1-hd : moitié prix, et surtout plus rapide
    ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
    // 9 voix : alloy, ash, coral, echo, fable, nova, onyx, sage, shimmer
    voice: process.env.OPENAI_VOICE || 'nova',
  },

  gemini: {
    apiKey: provider === 'gemini' ? requireEnv('GEMINI_API_KEY') : optionalEnv('GEMINI_API_KEY'),
    model: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
    ttsModel: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
    liveModel: process.env.GEMINI_LIVE_MODEL || 'gemini-3.1-flash-live-preview',
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
