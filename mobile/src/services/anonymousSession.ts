import AsyncStorage from '@react-native-async-storage/async-storage';
import { SERVER_URL } from '../constants/config';

const INSTALLATION_ID_KEY = '@nevi/installation_id';
const SESSION_KEY = '@nevi/anonymous_session';

interface StoredSession {
  token: string;
  expiresAt: number;
}

function randomPart(): string {
  return Math.random().toString(36).slice(2);
}

function createInstallationId(): string {
  return `nevi_${Date.now().toString(36)}_${randomPart()}_${randomPart()}_${randomPart()}`;
}

export async function getInstallationId(): Promise<string> {
  const existing = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;

  const created = createInstallationId();
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, created);
  return created;
}

export async function clearAnonymousSession(): Promise<void> {
  await AsyncStorage.removeItem(SESSION_KEY);
}

export async function getAnonymousSessionToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (raw) {
      try {
        const stored = JSON.parse(raw) as StoredSession;
        // Rafraîchit un peu avant l'expiration pour éviter une coupure en plein usage.
        if (stored.token && stored.expiresAt > Date.now() + 5 * 60_000) {
          return stored.token;
        }
      } catch {
        // Valeur locale corrompue : on recrée simplement une session.
      }
    }
  }

  const installationId = await getInstallationId();
  const response = await fetch(`${SERVER_URL}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ installationId }),
  });

  if (!response.ok) {
    throw new Error(`Création de session impossible (${response.status}).`);
  }

  const data = (await response.json()) as StoredSession;
  if (!data.token || !data.expiresAt) {
    throw new Error('Réponse de session invalide.');
  }

  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(data));
  return data.token;
}
