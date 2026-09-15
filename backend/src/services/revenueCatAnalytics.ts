import { recordAnalyticsEvent } from './analyticsStore';

interface RevenueCatEvent {
  id?: string;
  type?: string;
  app_user_id?: string;
  event_timestamp_ms?: number;
  product_id?: string;
  period_type?: string;
  environment?: string;
  store?: string;
  currency?: string;
  price?: number;
  price_in_purchased_currency?: number;
  country_code?: string;
  is_trial_conversion?: boolean;
  cancel_reason?: string;
  expiration_reason?: string;
}

interface RevenueCatPayload {
  event?: RevenueCatEvent;
}

/**
 * Stocke uniquement les métadonnées commerciales dans Nevi Pulse. Audio,
 * transcription et attributs abonnés RevenueCat sont volontairement exclus.
 */
export async function recordRevenueCatAnalytics(
  payload: RevenueCatPayload,
): Promise<void> {
  const event = payload.event;
  const type = event?.type?.toLowerCase();
  const eventId = event?.id;
  const distinctId = event?.app_user_id;
  if (!type || !eventId || !distinctId) {
    throw new Error('Webhook RevenueCat incomplet.');
  }

  await recordAnalyticsEvent(`revenuecat_${type}`, distinctId, {
    $insert_id: `revenuecat:${eventId}`,
    revenuecat_event_id: eventId,
    revenue_usd: event.price ?? null,
    price_in_purchased_currency: event.price_in_purchased_currency ?? null,
    currency: event.currency ?? null,
    product_id: event.product_id ?? null,
    period_type: event.period_type ?? null,
    environment: event.environment ?? null,
    store: event.store ?? null,
    country_code: event.country_code ?? null,
    is_trial_conversion: event.is_trial_conversion ?? false,
    cancel_reason: event.cancel_reason ?? null,
    expiration_reason: event.expiration_reason ?? null,
  }, event.event_timestamp_ms ? new Date(event.event_timestamp_ms).toISOString() : undefined);
}
