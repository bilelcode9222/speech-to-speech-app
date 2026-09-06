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

const provider = (process.env.AI_PROVIDER || 'openai') as 'openai' | 'gemini' | 'groq';

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

  // Secret uniquement serveur. Il signe les sessions anonymes de l'app.
  // Utilise une longue valeur aléatoire en production (Render).
  sessionSecret: requireEnv('ANONYMOUS_SESSION_SECRET'),

  // Optionnel en développement, mais requis pour un quota persistant en production.
  databaseUrl: optionalEnv('DATABASE_URL'),

  revenueCat: {
    // Clé REST V1 RevenueCat côté serveur. Ne jamais l'inclure dans l'app mobile.
    apiKey: optionalEnv('REVENUECAT_SERVER_API_KEY'),
    entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID || 'premium',
  },

  openai: {
    apiKey: needsOpenAI ? requireEnv('OPENAI_API_KEY') : optionalEnv('OPENAI_API_KEY'),
    sttModel: process.env.OPENAI_STT_MODEL || 'whisper-1',
    llmModel: process.env.OPENAI_LLM_MODEL || 'gpt-4o-mini',
    ttsModel: process.env.OPENAI_TTS_MODEL || 'tts-1',
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
