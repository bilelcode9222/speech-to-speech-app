/**
 * ADRESSE DU SERVEUR — LE SEUL RÉGLAGE À MODIFIER
 *
 * Ton téléphone et ton Mac doivent être sur le MÊME réseau Wi-Fi.
 * "localhost" ne fonctionne pas depuis un téléphone : il désigne le
 * téléphone lui-même, pas ton Mac.
 *
 * Pour trouver l'adresse à mettre ici : lance le backend (npm run dev),
 * il affiche une ligne "Réseau : http://192.168.x.x:3000/health".
 * Recopie cette adresse ci-dessous, sans le "/health".
 */
export const SERVER_URL = 'https://speech-to-speech-app.onrender.com';

/** Délai avant abandon d'une traduction (ms) */
export const REQUEST_TIMEOUT_MS = 45_000;

/** Durée maximale d'un enregistrement (ms) — évite les fichiers énormes */
export const MAX_RECORDING_MS = 60_000;
