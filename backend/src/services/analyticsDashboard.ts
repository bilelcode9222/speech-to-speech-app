import { config } from '../config/env';
import { analyticsStoreConfigured, queryAnalytics } from './analyticsStore';

export type AnalyticsPeriod = 7 | 14 | 30;

export interface AnalyticsSnapshot {
  period: AnalyticsPeriod;
  generatedAt: string;
  summary: {
    activeUsers: number; onboardingStarted: number; onboardingCompleted: number;
    paywallViews: number; checkoutStarts: number; trialStarts: number; purchases: number;
    revenueUsd: number; renewals: number; cancellations: number; translations: number;
    translationFailures: number;
  };
  daily: Array<{ date: string; activeUsers: number; paywallViews: number; trialStarts: number; purchases: number; translations: number }>;
  languages: Array<{ locale: string; users: number; translations: number }>;
  failures: Array<{ stage: string; count: number }>;
  recent: Array<{ timestamp: string; installationId: string; event: string; detail: string }>;
  economics: {
    grossRevenueUsd: number; estimatedNetRevenueUsd: number; technicalCostUsd: number;
    acquisitionCostUsd: number; estimatedMarginUsd: number; acquisitionCostPerUserUsd: number;
    storeNetRevenueShare: number; incompleteCostEvents: number;
  };
  customers: Array<{
    installationId: string; grossRevenueUsd: number; estimatedNetRevenueUsd: number;
    technicalCostUsd: number; acquisitionCostUsd: number; estimatedMarginUsd: number;
    translations: number; incompleteCostEvents: number;
  }>;
}

type Row = Record<string, unknown>;

function n(value: unknown): number { return Number(value) || 0; }
function s(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

const revenueEvents = "'revenuecat_initial_purchase', 'revenuecat_renewal', 'revenuecat_non_renewing_purchase'";

export async function loadAnalyticsSnapshot(period: AnalyticsPeriod): Promise<AnalyticsSnapshot> {
  const share = Math.min(1, config.unitEconomics.storeNetRevenueShare);
  const cac = config.unitEconomics.defaultAcquisitionCostUsd;
  const since = period;
  const [summaryRows, dailyRows, languageRows, failureRows, recentRows, economicsRows, customerRows] = await Promise.all([
    queryAnalytics<Row>(`
      SELECT
        COUNT(DISTINCT installation_id) AS active_users,
        COUNT(*) FILTER (WHERE event_name = 'onboarding_viewed') AS onboarding_started,
        COUNT(*) FILTER (WHERE event_name = 'onboarding_completed') AS onboarding_completed,
        COUNT(*) FILTER (WHERE event_name = 'paywall_opened') AS paywall_views,
        COUNT(*) FILTER (WHERE event_name = 'subscription_purchase_started') AS checkout_starts,
        COUNT(*) FILTER (WHERE event_name = 'subscription_purchased' AND COALESCE(properties->>'trial_eligible', 'false') = 'true') AS trial_starts,
        COUNT(*) FILTER (WHERE event_name = 'subscription_purchased' AND COALESCE(properties->>'trial_eligible', 'false') <> 'true') AS purchases,
        COALESCE(SUM((properties->>'revenue_usd')::numeric) FILTER (WHERE event_name IN (${revenueEvents}) AND properties->>'environment' = 'PRODUCTION'), 0) AS revenue_usd,
        COUNT(*) FILTER (WHERE event_name = 'revenuecat_renewal' AND properties->>'environment' = 'PRODUCTION') AS renewals,
        COUNT(*) FILTER (WHERE event_name = 'revenuecat_cancellation' AND properties->>'environment' = 'PRODUCTION') AS cancellations,
        COUNT(*) FILTER (WHERE event_name = 'translation_completed') AS translations,
        COUNT(*) FILTER (WHERE event_name = 'translation_failed') AS translation_failures
      FROM nevi_analytics_events WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day')`, [since]),
    queryAnalytics<Row>(`
      SELECT TO_CHAR(DATE(occurred_at), 'YYYY-MM-DD') AS date,
        COUNT(DISTINCT installation_id) AS active_users,
        COUNT(*) FILTER (WHERE event_name = 'paywall_opened') AS paywall_views,
        COUNT(*) FILTER (WHERE event_name = 'subscription_purchased' AND COALESCE(properties->>'trial_eligible', 'false') = 'true') AS trial_starts,
        COUNT(*) FILTER (WHERE event_name = 'subscription_purchased' AND COALESCE(properties->>'trial_eligible', 'false') <> 'true') AS purchases,
        COUNT(*) FILTER (WHERE event_name = 'translation_completed') AS translations
      FROM nevi_analytics_events WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY DATE(occurred_at) ORDER BY DATE(occurred_at)`, [since]),
    queryAnalytics<Row>(`
      SELECT COALESCE(properties->>'app_locale', 'unknown') AS locale,
        COUNT(DISTINCT installation_id) AS users,
        COUNT(*) FILTER (WHERE event_name = 'translation_completed') AS translations
      FROM nevi_analytics_events WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY 1 ORDER BY users DESC LIMIT 8`, [since]),
    queryAnalytics<Row>(`
      SELECT COALESCE(properties->>'failure_stage', properties->>'error_code', 'other') AS stage, COUNT(*) AS count
      FROM nevi_analytics_events
      WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day') AND event_name = 'translation_failed'
      GROUP BY 1 ORDER BY count DESC LIMIT 8`, [since]),
    queryAnalytics<Row>(`
      SELECT occurred_at AS timestamp, installation_id, event_name AS event,
        COALESCE(properties->>'plan', properties->>'product_id', properties->>'failure_stage', properties->>'error_code', properties->>'step', properties->>'granted', '') AS detail
      FROM nevi_analytics_events
      WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day') AND event_name IN (
        'app_opened','onboarding_viewed','onboarding_step_completed','onboarding_completed',
        'paywall_step_viewed','trial_reminder_permission','paywall_opened','subscription_plan_selected','subscription_purchase_started',
        'subscription_purchased','subscription_purchase_failed','translation_recording_started',
        'translation_completed','translation_failed','revenuecat_initial_purchase',
        'revenuecat_renewal','revenuecat_cancellation','revenuecat_expiration'
      ) ORDER BY occurred_at DESC LIMIT 80`, [since]),
    queryAnalytics<Row>(`
      SELECT
        COALESCE(SUM((properties->>'revenue_usd')::numeric) FILTER (WHERE event_name IN (${revenueEvents}) AND properties->>'environment' = 'PRODUCTION'), 0) AS gross_revenue_usd,
        COALESCE(SUM((properties->>'estimated_cost_usd')::numeric) FILTER (WHERE event_name = 'translation_cost_recorded'), 0) AS technical_cost_usd,
        COUNT(*) FILTER (WHERE event_name = 'translation_cost_recorded' AND COALESCE(properties->>'cost_estimate_complete', 'false') <> 'true') AS incomplete_cost_events
      FROM nevi_analytics_events WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day')`, [since]),
    queryAnalytics<Row>(`
      SELECT installation_id,
        COALESCE(SUM((properties->>'revenue_usd')::numeric) FILTER (WHERE event_name IN (${revenueEvents}) AND properties->>'environment' = 'PRODUCTION'), 0) AS gross_revenue_usd,
        COALESCE(SUM((properties->>'estimated_cost_usd')::numeric) FILTER (WHERE event_name = 'translation_cost_recorded'), 0) AS technical_cost_usd,
        COUNT(*) FILTER (WHERE event_name = 'translation_cost_recorded') AS translations,
        COUNT(*) FILTER (WHERE event_name = 'translation_cost_recorded' AND COALESCE(properties->>'cost_estimate_complete', 'false') <> 'true') AS incomplete_cost_events
      FROM nevi_analytics_events WHERE occurred_at >= NOW() - ($1::int * INTERVAL '1 day')
      GROUP BY installation_id
      ORDER BY (COALESCE(SUM((properties->>'revenue_usd')::numeric) FILTER (WHERE event_name IN (${revenueEvents}) AND properties->>'environment' = 'PRODUCTION'), 0) * $2::numeric - COALESCE(SUM((properties->>'estimated_cost_usd')::numeric) FILTER (WHERE event_name = 'translation_cost_recorded'), 0) - $3::numeric) ASC
      LIMIT 200`, [since, share, cac]),
  ]);

  const summary = summaryRows[0] ?? {};
  const economics = economicsRows[0] ?? {};
  const activeUsers = n(summary.active_users);
  const grossRevenueUsd = n(economics.gross_revenue_usd);
  const technicalCostUsd = n(economics.technical_cost_usd);
  const estimatedNetRevenueUsd = grossRevenueUsd * share;
  const acquisitionCostUsd = activeUsers * cac;

  return {
    period, generatedAt: new Date().toISOString(),
    summary: {
      activeUsers, onboardingStarted: n(summary.onboarding_started), onboardingCompleted: n(summary.onboarding_completed),
      paywallViews: n(summary.paywall_views), checkoutStarts: n(summary.checkout_starts), trialStarts: n(summary.trial_starts), purchases: n(summary.purchases),
      revenueUsd: n(summary.revenue_usd), renewals: n(summary.renewals), cancellations: n(summary.cancellations), translations: n(summary.translations), translationFailures: n(summary.translation_failures),
    },
    daily: dailyRows.map((row) => ({ date: s(row.date), activeUsers: n(row.active_users), paywallViews: n(row.paywall_views), trialStarts: n(row.trial_starts), purchases: n(row.purchases), translations: n(row.translations) })),
    languages: languageRows.map((row) => ({ locale: s(row.locale, 'unknown'), users: n(row.users), translations: n(row.translations) })),
    failures: failureRows.map((row) => ({ stage: s(row.stage, 'other'), count: n(row.count) })),
    recent: recentRows.map((row) => ({ timestamp: s(row.timestamp), installationId: s(row.installation_id, 'unknown'), event: s(row.event), detail: s(row.detail, '') })),
    economics: { grossRevenueUsd, estimatedNetRevenueUsd, technicalCostUsd, acquisitionCostUsd, estimatedMarginUsd: estimatedNetRevenueUsd - technicalCostUsd - acquisitionCostUsd, acquisitionCostPerUserUsd: cac, storeNetRevenueShare: share, incompleteCostEvents: n(economics.incomplete_cost_events) },
    customers: customerRows.map((row) => {
      const customerGross = n(row.gross_revenue_usd); const customerTechnical = n(row.technical_cost_usd); const customerNet = customerGross * share;
      return { installationId: s(row.installation_id, 'unknown'), grossRevenueUsd: customerGross, estimatedNetRevenueUsd: customerNet, technicalCostUsd: customerTechnical, acquisitionCostUsd: cac, estimatedMarginUsd: customerNet - customerTechnical - cac, translations: n(row.translations), incompleteCostEvents: n(row.incomplete_cost_events) };
    }),
  };
}

export function analyticsDashboardConfigured(): boolean { return analyticsStoreConfigured(); }
