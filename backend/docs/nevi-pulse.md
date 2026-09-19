# Nevi Pulse

Private dashboard: `/admin/analytics`. Authentication is unchanged: the existing
`ANALYTICS_DASHBOARD_TOKEN` protects both snapshot and journey endpoints.

## Data definitions

- Periods: rolling 1, 7, 14, 30 or 90 days; prior period has the same duration.
  Day buckets use UTC; the UI displays timestamps in Paris time.
- Users are pseudonymous installations, not identified people. The live metric
  means an app activity event received in the last five minutes, not presence.
- Revenue and trials require RevenueCat **PRODUCTION** events. Free trials and
  Sandbox purchases do not contribute revenue. Repeated RevenueCat event IDs
  are deduplicated at read time without deleting historical records.
- Money uses `revenue_usd`; no conversion to EUR is invented. Net proceeds and
  acquisition costs use configured estimates. CAC applies to first-observed
  installations, once. Refunds, taxes, fixed costs and hosting are not reconciled.
- The globe shows RevenueCat purchase country codes, never inferred GPS/IP or
  a user's location. Its public-domain land dots come from Natural Earth.
- The paywall funnel follows the three pages, checkout and app-confirmed access
  in chronological order for installations entering during the chosen period.
  Confirmed access can be an introductory trial or a paid subscription.

## Compatibility and upcoming mobile code

The dashboard works with the existing app. Events without session/build/duration
metadata remain readable. Missing history cannot be reconstructed. Mobile code
prepared locally adds session, screen, button, language, recording, pipeline,
authorization and purchase outcome events; it has **not been uploaded as a new
iOS build**. Build 41 and the pending App Store submission are unchanged.

The future client stores a bounded queue (300 events, up to seven days), retries
network failures and retains event IDs across retries. Server storage ignores
repeated IDs per installation. Only a metadata allowlist is accepted. Audio,
transcripts, translations and arbitrary error messages are excluded.

## Validation

`npm run check` and `npm test` validate actual SQL against PGlite/PostgreSQL:
production/Sandbox separation, webhook deduplication, CAC, ordered funnel,
journey isolation, privacy filtering, timestamps and idempotent ingestion.

`node tests/preview.cjs` starts an explicitly labeled synthetic-data preview on
127.0.0.1:4187. Code `demo-local` is for this local preview only. The production
server never imports this preview or provides a demonstration login.

## Production connection

RevenueCat project `eb8f26ff`, webhook `whintgr4bba7b8321`, sends all event types
for the Nevi AI App Store app to `/webhooks/revenuecat`. Sandbox deliveries stay
out of revenue. Synthetic `TEST` deliveries appear only in source health, never
as a customer or sale. The authorization value is held in Render environment
configuration, not in this repository. Successful deliveries return HTTP 200.
