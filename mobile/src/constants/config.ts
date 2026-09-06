/** Backend de production Nevi. */
export const SERVER_URL = 'https://speech-to-speech-app.onrender.com';

/** Pages publiques utilisées dans le paywall et App Store Connect. */
export const TERMS_URL = `${SERVER_URL}/terms`;
export const PRIVACY_URL = `${SERVER_URL}/privacy`;

/** Délai avant abandon d'une traduction (ms). */
export const REQUEST_TIMEOUT_MS = 45_000;

/** Durée maximale d'un enregistrement (ms). */
export const MAX_RECORDING_MS = 60_000;

/** Politique d'usage raisonnable Nevi Pro — identique au backend. */
export const PREMIUM_DAILY_LIMIT = 100;
export const PREMIUM_30_DAY_LIMIT = 1000;
