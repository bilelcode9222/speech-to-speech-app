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

Open journeys refresh every 30 seconds while the page is visible, including
after returning to the tab. Manual refresh is also available. Expanded details
and the reading position are retained. The app version is shown when received;
a missing session or build identifier does not imply an outdated app version.

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

## Apple Ads keyword trials

The **Apple Ads** tab has its own inclusive UTC date range (up to 90 days).
It reports distinct production trial customers, separately from clicks and paid
renewals. Repeated RevenueCat event IDs and multiple trial events for one
customer do not inflate a keyword's trial count. Only the reserved attribution
attributes `$mediaSource`, `$campaign`, `$adGroup`, `$keyword`,
`$appleAdsCampaignId`, `$appleAdsAdGroupId`, and `$appleAdsKeywordId` are retained.
Other customer attributes, including names/emails, remain excluded.

New RevenueCat webhooks populate attribution when those attributes are present.
Missing attribution is **unknown**, never automatically organic. Search Match
can lack a keyword. Identical keyword text in different ad groups/campaigns is
kept separate. Names without IDs cannot be silently matched to report IDs.

For installs, taps, spend, and cost per trial, adapt an Apple Ads keyword report
to the downloadable CSV template. Required headers: `campaign_id`, `ad_group_id`,
`keyword_id`, `keyword`, `installs`, `taps`, `spend`, `currency`. Optional headers:
`campaign`, `ad_group`. Comma or semicolon delimiter, dot decimals, no currency
symbols; one row per ID combination with all campaign countries aggregated and
one currency per report. Report dates must match the tab's dates exactly and use
UTC. Imports are validated before persistence, atomically replace that date
range, and are protected by the existing dashboard token. No Apple Ads reporting
API credentials have been configured by this feature. Report imports do not
create trial/purchase events or change existing financial metrics.

Trials / installs is a **same-period volume ratio**, not a cohort conversion
rate. Trials can occur after installation, so the ratio may exceed 100%.
Amounts stay in the report currency; gross transaction revenue remains USD.
Missing reports and zero denominators are undefined, never fabricated as 0%.
Low sample flags are shown for fewer than 10 reported installs.

### Historical attribution recovery

The history button processes five known production customers per batch, using
RevenueCat API v2's customer attributes endpoint. It enriches previously received
transactions; it does not create historical transactions or recover attribution
that RevenueCat never collected. The default project is Nevi's `eb8f26ff`,
overridable with `REVENUECAT_PROJECT_ID`.

It uses `REVENUECAT_ATTRIBUTION_API_KEY`, falling back to the existing server key.
The key must support API v2 and `customer_information:customers:read`. Legacy or
insufficient keys produce an explicit configuration message. Secrets and raw
subscriber responses are never returned or logged. Successful checks (including
missing attribution) are cached for 24 hours. On authentication, network, or rate
limit failure, the batch stops; completed customers remain saved and the failed
customer is retryable. The existing purchase/activation flow is unchanged.
