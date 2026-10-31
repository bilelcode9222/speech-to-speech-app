import { createHash } from 'node:crypto';
import { PostHog } from 'posthog-node';
import type { AnalyticsProperties } from './analyticsStore';

let client: PostHog | undefined;
const propertyKeys = new Set([
  'revenuecat_event_id', 'revenue_usd', 'price_in_purchased_currency', 'currency',
  'product_id', 'period_type', 'environment', 'store', 'country_code',
  'is_trial_conversion', 'cancel_reason', 'expiration_reason',
  'estimated_cost_usd', 'stt_cost_usd', 'llm_cost_usd', 'tts_cost_usd', 'audio_minutes',
  'translation_input_tokens', 'translation_output_tokens', 'output_characters',
  'provider', 'tts_provider', 'translation_mode', 'model', 'cost_estimate_complete',
]);

function getClient(): PostHog | undefined {
  const enabled = process.env.POSTHOG_ENABLED === '1' || (process.env.NODE_ENV === 'production' && process.env.POSTHOG_ENABLED !== '0');
  if (!enabled) return undefined;
  if (!client) {
    client = new PostHog(process.env.POSTHOG_PROJECT_TOKEN || 'phc_AxUPsYwNbFs5YaRVRoLZAQNseQhYtN9gQGdV2GVzUkGg', {
      host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com',
      flushAt: 20, flushInterval: 5000, maxQueueSize: 1000,
      disableGeoip: true,
      enableExceptionAutocapture: false,
    });
    // SDK failures must not become unhandled errors or leak request contents.
    client.on('error', () => {});
  }
  return client;
}

export function capturePostHogServerEvent(event: string, installationId: string, properties: AnalyticsProperties, timestamp?: string): void {
  // Client events already go directly from the SDK. Forwarding them here
  // would count every action twice and split it from its native replay.
  if (event !== 'translation_cost_recorded' && !/^revenuecat_[a-z_]{1,60}$/.test(event)) return;
  if (!/^nevi_[a-zA-Z0-9_-]{1,160}$/.test(installationId)) return;
  try {
    const posthog = getClient();
    if (!posthog) return;
    const safe = Object.fromEntries(Object.entries(properties).filter(([key, value]) =>
      propertyKeys.has(key) && ((typeof value === 'string' && value.length <= 160) ||
        (typeof value === 'number' && Number.isFinite(value)) || typeof value === 'boolean' || value === null)));
    // RevenueCat retries carry the same UUID, preventing duplicate purchases.
    const hash = typeof safe.revenuecat_event_id === 'string'
      ? createHash('sha256').update(`nevi:revenuecat:${safe.revenuecat_event_id}`).digest('hex') : undefined;
    const uuid = hash ? `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-a${hash.slice(17, 20)}-${hash.slice(20, 32)}` : undefined;
    posthog.capture({
      distinctId: installationId, event, uuid,
      timestamp: timestamp ? new Date(timestamp) : undefined,
      properties: {
        ...safe,
        // Preserve RevenueCat's PRODUCTION/SANDBOX as a separate dimension.
        revenuecat_environment: safe.environment,
        environment: safe.environment === 'SANDBOX' ? 'sandbox' : (process.env.NODE_ENV || 'development'),
        source: 'nevi_backend', analytics_schema_version: 1,
      },
    });
  } catch { /* Analytics never blocks webhooks or translations. */ }
}

export async function shutdownPostHog(): Promise<void> {
  try { await client?.shutdown(5000); } catch { /* Best effort on shutdown. */ }
}

/** Operational heartbeat for each deployment, separate from customer activity. */
export function startPostHog(): void {
  try {
    const posthog = getClient();
    if (!posthog) return;
    posthog.capture({
      distinctId: 'nevi_backend', event: 'backend_started',
      properties: {
        $process_person_profile: false, environment: process.env.NODE_ENV || 'development',
        source: 'nevi_backend', analytics_schema_version: 1,
      },
    });
    void posthog.flush().catch(() => {});
  } catch { /* Deployment health must never depend on analytics. */ }
}
