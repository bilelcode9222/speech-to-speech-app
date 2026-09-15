import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function optionalEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.startsWith('remplace')) return '';
  return value;
}

function firstEnv(keys: string[]): string {
  for (const key of keys) {
    const value = optionalEnv(key);
    if (value) return value;
  }
  return '';
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

function nonNegativeNumberEnv(key: string, fallback: number): number {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
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

  // Contact public affiché sur les pages Support/Privacy lorsqu'il est défini.
  supportEmail: optionalEnv('SUPPORT_EMAIL'),

  // Secret uniquement serveur. Il signe les sessions anonymes de l'app.
  // Utilise une longue valeur aléatoire en production (Render).
  sessionSecret: requireEnv('ANONYMOUS_SESSION_SECRET'),

  // Optionnel en développement, mais requis pour un quota persistant en production.
  databaseUrl: optionalEnv('DATABASE_URL'),

  revenueCat: {
    // Réutilise une éventuelle clé REST RevenueCat déjà présente sur Render.
    // La clé publique iOS EXPO_PUBLIC_REVENUECAT_IOS_API_KEY n'est volontairement
    // jamais utilisée ici : la validation d'abonnement appartient au serveur.
    apiKey: firstEnv([
      'REVENUECAT_SERVER_API_KEY',
      'REVENUECAT_SECRET_API_KEY',
      'REVENUECAT_API_KEY',
    ]),
    entitlementId: process.env.REVENUECAT_ENTITLEMENT_ID?.trim() || 'nevi_pro',
  },

  analyticsDashboard: {
    dashboardToken: optionalEnv('ANALYTICS_DASHBOARD_TOKEN'),
    revenueCatWebhookAuthorization: optionalEnv(
      'REVENUECAT_WEBHOOK_AUTHORIZATION',
    ),
  },

  // Les tarifs restent configurables : le tableau de bord ne dépend jamais
  // d'un prix codé en dur si un fournisseur ou son tarif évolue.
  unitEconomics: {
    defaultAcquisitionCostUsd: nonNegativeNumberEnv('UNIT_ECONOMICS_CAC_USD', 1.5),
    // RevenueCat remonte le prix payé. Ce coefficient donne une estimation
    // prudente de la part réellement reversée après commission de l'App Store.
    storeNetRevenueShare: nonNegativeNumberEnv('UNIT_ECONOMICS_STORE_NET_REVENUE_SHARE', 0.7),
    openaiWhisperPerMinuteUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_OPENAI_WHISPER_PER_MINUTE_USD',
      0.006,
    ),
    openaiLlmInputPerMillionTokensUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_OPENAI_LLM_INPUT_PER_MILLION_TOKENS_USD',
      0.15,
    ),
    openaiLlmOutputPerMillionTokensUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_OPENAI_LLM_OUTPUT_PER_MILLION_TOKENS_USD',
      0.6,
    ),
    openaiTtsPerMillionCharactersUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_OPENAI_TTS_PER_MILLION_CHARACTERS_USD',
      15,
    ),
    // Configure ces tarifs si Gemini, Groq ou ElevenLabs deviennent actifs.
    // À zéro, la ligne est explicitement marquée comme incomplète dans Pulse.
    groqSttPerMinuteUsd: nonNegativeNumberEnv('UNIT_ECONOMICS_GROQ_STT_PER_MINUTE_USD', 0),
    groqLlmInputPerMillionTokensUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_GROQ_LLM_INPUT_PER_MILLION_TOKENS_USD',
      0,
    ),
    groqLlmOutputPerMillionTokensUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_GROQ_LLM_OUTPUT_PER_MILLION_TOKENS_USD',
      0,
    ),
    elevenLabsTtsPerMillionCharactersUsd: nonNegativeNumberEnv(
      'UNIT_ECONOMICS_ELEVENLABS_TTS_PER_MILLION_CHARACTERS_USD',
      0,
    ),
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
