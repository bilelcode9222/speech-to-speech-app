import { config } from '../config/env';
import { logger } from '../utils/logger';
import { isPremiumSubscriber } from '../services/revenueCatService';

export const FREE_TRANSLATION_LIMIT = 3;
export const PREMIUM_DAILY_LIMIT = 100;
export const PREMIUM_30_DAY_LIMIT = 1000;

export type AccessCode =
  | 'OK'
  | 'PAYWALL_REQUIRED'
  | 'FAIR_USE_DAILY_LIMIT'
  | 'FAIR_USE_30_DAY_LIMIT'
  | 'ALREADY_TRANSLATING';

export interface AccessDecision {
  allowed: boolean;
  code: AccessCode;
  premium: boolean;
  freeUsed: number;
  dailyUsed: number;
  rolling30Used: number;
}

interface MemoryUsage {
  freeUsed: number;
  premiumEvents: number[];
}

const memory = new Map<string, MemoryUsage>();
const active = new Set<string>();
let pool: any | null = null;
let schemaReady: Promise<void> | null = null;

function memoryUsage(installationId: string): MemoryUsage {
  const existing = memory.get(installationId);
  if (existing) return existing;
  const created: MemoryUsage = { freeUsed: 0, premiumEvents: [] };
  memory.set(installationId, created);
  return created;
}

function getPool(): any | null {
  if (!config.databaseUrl) return null;
  if (pool) return pool;

  // require() évite d'imposer les types pg au compilateur. Le module est une
  // dépendance runtime et Render l'installe avec le backend.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5,
  });
  return pool;
}

async function ensureSchema(): Promise<void> {
  const db = getPool();
  if (!db) return;
  if (schemaReady) return schemaReady;

  schemaReady = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS nevi_usage (
        installation_id TEXT PRIMARY KEY,
        free_used INTEGER NOT NULL DEFAULT 0
      )
    `);
    await db.query(`
      CREATE TABLE IF NOT EXISTS nevi_translation_events (
        id BIGSERIAL PRIMARY KEY,
        installation_id TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(
      'CREATE INDEX IF NOT EXISTS nevi_translation_events_installation_created_idx ON nevi_translation_events (installation_id, created_at DESC)'
    );
  })().catch((error) => {
    schemaReady = null;
    logger.error('Initialisation du stockage quota impossible', error);
    throw error;
  });

  return schemaReady;
}

async function readUsage(installationId: string): Promise<{
  freeUsed: number;
  dailyUsed: number;
  rolling30Used: number;
}> {
  const db = getPool();
  if (!db) {
    const usage = memoryUsage(installationId);
    const now = Date.now();
    usage.premiumEvents = usage.premiumEvents.filter(
      (timestamp) => now - timestamp < 30 * 24 * 60 * 60_000
    );
    return {
      freeUsed: usage.freeUsed,
      dailyUsed: usage.premiumEvents.filter(
        (timestamp) => now - timestamp < 24 * 60 * 60_000
      ).length,
      rolling30Used: usage.premiumEvents.length,
    };
  }

  await ensureSchema();
  const result = await db.query(
    `SELECT
       COALESCE((SELECT free_used FROM nevi_usage WHERE installation_id = $1), 0)::int AS free_used,
       (SELECT COUNT(*)::int FROM nevi_translation_events WHERE installation_id = $1 AND created_at > NOW() - INTERVAL '24 hours') AS daily_used,
       (SELECT COUNT(*)::int FROM nevi_translation_events WHERE installation_id = $1 AND created_at > NOW() - INTERVAL '30 days') AS rolling_30_used`,
    [installationId]
  );
  const row = result.rows[0] || {};
  return {
    freeUsed: Number(row.free_used || 0),
    dailyUsed: Number(row.daily_used || 0),
    rolling30Used: Number(row.rolling_30_used || 0),
  };
}

export async function inspectAccess(installationId: string): Promise<AccessDecision> {
  const [premium, usage] = await Promise.all([
    isPremiumSubscriber(installationId),
    readUsage(installationId),
  ]);

  if (premium) {
    if (usage.dailyUsed >= PREMIUM_DAILY_LIMIT) {
      return { allowed: false, code: 'FAIR_USE_DAILY_LIMIT', premium, ...usage };
    }
    if (usage.rolling30Used >= PREMIUM_30_DAY_LIMIT) {
      return { allowed: false, code: 'FAIR_USE_30_DAY_LIMIT', premium, ...usage };
    }
    return { allowed: true, code: 'OK', premium, ...usage };
  }

  if (usage.freeUsed >= FREE_TRANSLATION_LIMIT) {
    return { allowed: false, code: 'PAYWALL_REQUIRED', premium, ...usage };
  }

  return { allowed: true, code: 'OK', premium, ...usage };
}

export async function beginTranslation(installationId: string): Promise<AccessDecision> {
  if (active.has(installationId)) {
    const usage = await readUsage(installationId);
    const premium = await isPremiumSubscriber(installationId);
    return {
      allowed: false,
      code: 'ALREADY_TRANSLATING',
      premium,
      ...usage,
    };
  }

  const access = await inspectAccess(installationId);
  if (access.allowed) active.add(installationId);
  return access;
}

export function finishTranslation(installationId: string): void {
  active.delete(installationId);
}

export async function recordSuccessfulTranslation(
  installationId: string,
  premium: boolean
): Promise<void> {
  const db = getPool();
  if (!db) {
    const usage = memoryUsage(installationId);
    if (premium) usage.premiumEvents.push(Date.now());
    else usage.freeUsed = Math.min(FREE_TRANSLATION_LIMIT, usage.freeUsed + 1);
    return;
  }

  await ensureSchema();
  if (premium) {
    await db.query(
      'INSERT INTO nevi_translation_events (installation_id) VALUES ($1)',
      [installationId]
    );
    return;
  }

  await db.query(
    `INSERT INTO nevi_usage (installation_id, free_used)
     VALUES ($1, 1)
     ON CONFLICT (installation_id)
     DO UPDATE SET free_used = LEAST($2, nevi_usage.free_used + 1)`,
    [installationId, FREE_TRANSLATION_LIMIT]
  );
}

export function accessMessage(code: AccessCode): string {
  switch (code) {
    case 'PAYWALL_REQUIRED':
      return 'Tes 3 traductions gratuites sont utilisées. Passe à Nevi Pro pour continuer.';
    case 'FAIR_USE_DAILY_LIMIT':
      return `Limite d’usage raisonnable atteinte (${PREMIUM_DAILY_LIMIT} traductions sur 24 h). Réessaie plus tard.`;
    case 'FAIR_USE_30_DAY_LIMIT':
      return `Limite d’usage raisonnable atteinte (${PREMIUM_30_DAY_LIMIT} traductions sur 30 jours).`;
    case 'ALREADY_TRANSLATING':
      return 'Une traduction est déjà en cours sur cette installation.';
    default:
      return 'Accès autorisé.';
  }
}
