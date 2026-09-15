import axios from 'axios';

import { config } from '../config/env';

export type AnalyticsPeriod = 7 | 14 | 30;

export interface AnalyticsSnapshot {
  period: AnalyticsPeriod;
  generatedAt: string;
  summary: {
    activeUsers: number;
    onboardingStarted: number;
    onboardingCompleted: number;
    paywallViews: number;
    checkoutStarts: number;
    trialStarts: number;
    purchases: number;
    revenueUsd: number;
    renewals: number;
    cancellations: number;
    translations: number;
    translationFailures: number;
  };
  daily: Array<{
    date: string;
    activeUsers: number;
    paywallViews: number;
    trialStarts: number;
    purchases: number;
    translations: number;
  }>;
  languages: Array<{ locale: string; users: number; translations: number }>;
  failures: Array<{ stage: string; count: number }>;
  recent: Array<{
    timestamp: string;
    installationId: string;
    event: string;
    detail: string;
  }>;
}

interface HogQLResponse {
  results?: unknown[][];
}

function configured(): boolean {
  return Boolean(
    config.analyticsDashboard.posthogProjectId &&
      config.analyticsDashboard.posthogPersonalApiKey,
  );
}

function number(value: unknown): number {
  return typeof value === 'number' ? value : Number(value) || 0;
}

function string(value: unknown, fallback = '—'): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

async function hogql(query: string): Promise<unknown[][]> {
  if (!configured()) {
    throw new Error('POSTHOG_DASHBOARD_NOT_CONFIGURED');
  }

  const host = config.analyticsDashboard.posthogHost.replace(/\/$/, '');
  const { data } = await axios.post<HogQLResponse>(
    `${host}/api/projects/${config.analyticsDashboard.posthogProjectId}/query/`,
    { query: { kind: 'HogQLQuery', query } },
    {
      headers: {
        Authorization: `Bearer ${config.analyticsDashboard.posthogPersonalApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 12_000,
    },
  );

  return data.results ?? [];
}

function interval(period: AnalyticsPeriod): string {
  return `INTERVAL ${period} DAY`;
}

export async function loadAnalyticsSnapshot(
  period: AnalyticsPeriod,
): Promise<AnalyticsSnapshot> {
  const since = interval(period);
  const [summaryRows, dailyRows, languageRows, recentRows, failureRows] = await Promise.all([
    hogql(`
      SELECT
        count(DISTINCT distinct_id),
        countIf(event = 'onboarding_viewed'),
        countIf(event = 'onboarding_completed'),
        countIf(event = 'paywall_opened'),
        countIf(event = 'subscription_purchase_started'),
        countIf(event = 'subscription_purchased' AND properties.trial_eligible = true),
        countIf(event = 'subscription_purchased' AND properties.trial_eligible != true),
        sumIf(toFloat(properties.revenue_usd), event IN ('revenuecat_initial_purchase', 'revenuecat_renewal', 'revenuecat_non_renewing_purchase') AND properties.environment = 'PRODUCTION'),
        countIf(event = 'revenuecat_renewal' AND properties.environment = 'PRODUCTION'),
        countIf(event = 'revenuecat_cancellation' AND properties.environment = 'PRODUCTION'),
        countIf(event = 'translation_completed'),
        countIf(event = 'translation_failed')
      FROM events
      WHERE timestamp >= now() - ${since}
    `),
    hogql(`
      SELECT
        toDate(timestamp),
        count(DISTINCT distinct_id),
        countIf(event = 'paywall_opened'),
        countIf(event = 'subscription_purchased' AND properties.trial_eligible = true),
        countIf(event = 'subscription_purchased' AND properties.trial_eligible != true),
        countIf(event = 'translation_completed')
      FROM events
      WHERE timestamp >= now() - ${since}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
    hogql(`
      SELECT
        coalesce(properties.app_locale, 'unknown'),
        count(DISTINCT distinct_id),
        countIf(event = 'translation_completed')
      FROM events
      WHERE timestamp >= now() - ${since}
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 8
    `),
    hogql(`
      SELECT
        timestamp,
        distinct_id,
        event,
        coalesce(
          properties.plan,
          properties.product_id,
          properties.failure_stage,
          properties.error_code,
          ''
        )
      FROM events
      WHERE timestamp >= now() - ${since}
        AND event IN (
          'app_opened', 'onboarding_viewed', 'onboarding_step_completed',
          'onboarding_completed', 'paywall_opened', 'subscription_plan_selected',
          'subscription_purchase_started', 'subscription_purchased',
          'subscription_purchase_failed', 'translation_recording_started',
          'translation_completed', 'translation_failed',
          'revenuecat_initial_purchase', 'revenuecat_renewal',
          'revenuecat_cancellation', 'revenuecat_expiration'
        )
      ORDER BY timestamp DESC
      LIMIT 80
    `),
    hogql(`
      SELECT
        coalesce(properties.failure_stage, properties.error_code, 'other'),
        count()
      FROM events
      WHERE timestamp >= now() - ${since} AND event = 'translation_failed'
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 8
    `),
  ]);

  const summary = summaryRows[0] ?? [];
  return {
    period,
    generatedAt: new Date().toISOString(),
    summary: {
      activeUsers: number(summary[0]),
      onboardingStarted: number(summary[1]),
      onboardingCompleted: number(summary[2]),
      paywallViews: number(summary[3]),
      checkoutStarts: number(summary[4]),
      trialStarts: number(summary[5]),
      purchases: number(summary[6]),
      revenueUsd: number(summary[7]),
      renewals: number(summary[8]),
      cancellations: number(summary[9]),
      translations: number(summary[10]),
      translationFailures: number(summary[11]),
    },
    daily: dailyRows.map((row) => ({
      date: string(row[0]),
      activeUsers: number(row[1]),
      paywallViews: number(row[2]),
      trialStarts: number(row[3]),
      purchases: number(row[4]),
      translations: number(row[5]),
    })),
    languages: languageRows.map((row) => ({
      locale: string(row[0], 'unknown'),
      users: number(row[1]),
      translations: number(row[2]),
    })),
    failures: failureRows.map((row) => ({
      stage: string(row[0], 'other'),
      count: number(row[1]),
    })),
    recent: recentRows.map((row) => ({
      timestamp: string(row[0]),
      installationId: string(row[1], 'unknown'),
      event: string(row[2]),
      detail: string(row[3], ''),
    })),
  };
}

export function analyticsDashboardConfigured(): boolean {
  return configured();
}
