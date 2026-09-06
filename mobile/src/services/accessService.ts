import { SERVER_URL } from '../constants/config';
import { getAnonymousSessionToken } from './anonymousSession';

export const PREMIUM_DAILY_LIMIT = 100;
export const PREMIUM_30_DAY_LIMIT = 1000;

export type AccessCode =
  | 'OK'
  | 'PAYWALL_REQUIRED'
  | 'FAIR_USE_DAILY_LIMIT'
  | 'FAIR_USE_30_DAY_LIMIT'
  | 'ALREADY_TRANSLATING';

export interface AccessStatus {
  allowed: boolean;
  code: AccessCode;
  premium: boolean;
  freeUsed: number;
  dailyUsed: number;
  rolling30Used: number;
}

async function requestAccess(method: 'GET' | 'POST', path: string): Promise<AccessStatus> {
  const token = await getAnonymousSessionToken();
  const response = await fetch(`${SERVER_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Vérification d’accès impossible (${response.status}).`);
  }

  return (await response.json()) as AccessStatus;
}

export function getAccessStatus(): Promise<AccessStatus> {
  return requestAccess('GET', '/api/access');
}

export function refreshAccessStatus(): Promise<AccessStatus> {
  return requestAccess('POST', '/api/access/refresh');
}
