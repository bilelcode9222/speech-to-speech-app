const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

function setup(env = { NODE_ENV: 'production' }, fail = false) {
  const sent = [], clients = [];
  class PostHog {
    constructor(token, options) { this.token = token; this.options = options; clients.push(this); }
    on() {}
    capture(event) { if (fail) throw Error('offline'); sent.push(event); }
    async shutdown() { this.stopped = true; }
  }
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/../src/services/posthog.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const mocks = { 'node:crypto': crypto, 'posthog-node': { PostHog } };
  vm.runInNewContext(code, { exports, require: id => mocks[id], process: { env }, Date });
  return { api: exports, sent, clients };
}

test('server telemetry excludes client events, raw content and arbitrary RevenueCat subscriber attributes', () => {
  const h = setup();
  h.api.capturePostHogServerEvent('app_opened', 'nevi_fixture', {});
  h.api.capturePostHogServerEvent('revenuecat_renewal', 'user@example.com', {});
  assert.equal(h.clients.length, 0);
  h.api.capturePostHogServerEvent('translation_cost_recorded', 'nevi_fixture', {
    estimated_cost_usd: .01, cost_estimate_complete: true,
    transcript: 'private', translatedText: 'private', audio: 'private', email: 'private',
  });
  assert.equal(h.sent.length, 1);
  const p = h.sent[0].properties;
  assert.equal(p.estimated_cost_usd, .01);
  assert.equal(p.environment, 'production');
  assert.ok(!JSON.stringify(p).includes('private'));
  assert.equal(h.clients[0].options.host, 'https://eu.i.posthog.com');
  assert.equal(h.clients[0].options.disableGeoip, true);
});

test('RevenueCat retries retain their UUID and event time; sandbox is distinguishable from production', () => {
  const h = setup(), timestamp = '2026-10-31T10:00:00Z';
  const p = { revenuecat_event_id: 'rc_fixture', period_type: 'TRIAL', revenue_usd: 0, environment: 'SANDBOX' };
  h.api.capturePostHogServerEvent('revenuecat_initial_purchase', 'nevi_fixture', p, timestamp);
  h.api.capturePostHogServerEvent('revenuecat_initial_purchase', 'nevi_fixture', p, timestamp);
  h.api.capturePostHogServerEvent('revenuecat_renewal', 'nevi_fixture', { ...p, revenuecat_event_id: 'rc_fixture_2' }, timestamp);
  assert.match(h.sent[0].uuid, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(h.sent[0].uuid, h.sent[1].uuid);
  assert.notEqual(h.sent[0].uuid, h.sent[2].uuid);
  assert.equal(h.sent[0].timestamp.toISOString(), '2026-10-31T10:00:00.000Z');
  assert.equal(h.sent[0].properties.environment, 'sandbox');
  assert.equal(h.sent[0].properties.revenuecat_environment, 'SANDBOX');
  assert.equal(h.sent[0].properties.revenue_usd, 0);
});

test('development is disabled by default and SDK failures cannot break translation cost capture', async () => {
  const disabled = setup({ NODE_ENV: 'development' });
  disabled.api.capturePostHogServerEvent('translation_cost_recorded', 'nevi_fixture', {});
  assert.equal(disabled.clients.length, 0);
  const killed = setup({ NODE_ENV: 'production', POSTHOG_ENABLED: '0' });
  killed.api.capturePostHogServerEvent('translation_cost_recorded', 'nevi_fixture', {});
  assert.equal(killed.clients.length, 0);
  const h = setup({ NODE_ENV: 'production' }, true);
  assert.doesNotThrow(() => h.api.capturePostHogServerEvent('translation_cost_recorded', 'nevi_fixture', {}));
  await h.api.shutdownPostHog();
  assert.equal(h.clients[0].stopped, true);
});

function loadBridge(file, mocks) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(__dirname + '/../src/services/' + file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => { if (!(id in mocks)) throw Error(id); return mocks[id]; }, Date });
  return exports;
}

test('translation metrics reach PostHog even when the internal analytics database is unavailable', async () => {
  const forwarded = [];
  const api = loadBridge('serverAnalytics.ts', {
    '../utils/logger': { logger: { warn() {} } },
    './analyticsStore': { recordAnalyticsEvent: async () => { throw Error('database offline'); } },
    './posthog': { capturePostHogServerEvent: (...args) => forwarded.push(args) },
  });
  await api.captureServerAnalytics('translation_cost_recorded', 'nevi_fixture', { estimated_cost_usd: .02 });
  assert.equal(forwarded.length, 1);
});

test('RevenueCat webhooks preserve real billing timestamps and exclude subscriber content before forwarding', async () => {
  const stored = [], forwarded = [];
  const api = loadBridge('revenueCatAnalytics.ts', {
    './appleAdsKeywords': { appleAdsAttributes: () => ({}) },
    './analyticsStore': { recordAnalyticsEvent: async (...args) => stored.push(args) },
    './posthog': { capturePostHogServerEvent: (...args) => forwarded.push(args) },
  });
  await api.recordRevenueCatAnalytics({ event: {
    id: 'rc_paid_fixture', type: 'RENEWAL', app_user_id: 'nevi_fixture',
    event_timestamp_ms: Date.parse('2026-10-31T10:00:00Z'),
    price: 5.99, currency: 'EUR', environment: 'PRODUCTION', is_trial_conversion: true,
    subscriber_attributes: { email: 'private@example.com' },
  } });
  assert.equal(stored.length, 1);
  assert.equal(forwarded.length, 1);
  assert.equal(forwarded[0][0], 'revenuecat_renewal');
  assert.equal(forwarded[0][1], 'nevi_fixture');
  assert.equal(forwarded[0][2].revenue_usd, 5.99);
  assert.equal(forwarded[0][2].is_trial_conversion, true);
  assert.equal(forwarded[0][3], '2026-10-31T10:00:00.000Z');
  assert.ok(!JSON.stringify(forwarded).includes('private@example.com'));
});
