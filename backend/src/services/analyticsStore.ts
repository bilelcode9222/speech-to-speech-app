import { config } from '../config/env';
import { logger } from '../utils/logger';

export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

let pool: any | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): any | null {
  if (!config.databaseUrl) return null;
  if (pool) return pool;
  // pg est une dépendance runtime ; cette importation évite d'ajouter ses
  // types à chaque fichier qui lit les analytics.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseUrl.includes('localhost') ? false : { rejectUnauthorized: false },
    max: 5,
  });
  return pool;
}

async function ensureSchema(): Promise<any> {
  const db = getPool();
  if (!db) throw new Error('ANALYTICS_DATABASE_UNAVAILABLE');
  if (schemaReady) return schemaReady.then(() => db);

  schemaReady = (async () => {
    await db.query(`
      CREATE TABLE IF NOT EXISTS nevi_analytics_events (
        id BIGSERIAL PRIMARY KEY,
        installation_id TEXT NOT NULL,
        event_name TEXT NOT NULL,
        properties JSONB NOT NULL DEFAULT '{}'::jsonb,
        occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.query(
      'CREATE INDEX IF NOT EXISTS nevi_analytics_events_occurred_idx ON nevi_analytics_events (occurred_at DESC)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS nevi_analytics_events_installation_idx ON nevi_analytics_events (installation_id, occurred_at DESC)'
    );
    await db.query(
      'CREATE INDEX IF NOT EXISTS nevi_analytics_events_name_occurred_idx ON nevi_analytics_events (event_name, occurred_at DESC)'
    );
    await db.query(`CREATE UNIQUE INDEX IF NOT EXISTS nevi_analytics_client_event_idx
      ON nevi_analytics_events (installation_id, (properties->>'event_id'))
      WHERE properties ? 'event_id'`);
  })().catch((error) => {
    schemaReady = null;
    logger.error('Initialisation de Nevi Pulse impossible', error);
    throw error;
  });

  await schemaReady;
  return db;
}

export function analyticsStoreConfigured(): boolean {
  return Boolean(config.databaseUrl);
}

export async function recordAnalyticsEvent(
  eventName: string,
  installationId: string,
  properties: AnalyticsProperties,
  occurredAt?: string,
): Promise<void> {
  const db = await ensureSchema();
  await db.query(
    `INSERT INTO nevi_analytics_events (installation_id, event_name, properties, occurred_at)
     VALUES ($1, $2, $3::jsonb, COALESCE($4::timestamptz, NOW())) ON CONFLICT DO NOTHING`,
    [installationId, eventName, JSON.stringify(properties), occurredAt ?? null],
  );
}

export async function queryAnalytics<T extends Record<string, unknown>>(
  sql: string,
  values: unknown[],
): Promise<T[]> {
  const db = await ensureSchema();
  const result = await db.query(sql, values);
  return result.rows as T[];
}
