const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the actual service with native/network boundaries mocked, like backend tests.
const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../src/services/revenueCat.ts`, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
}).outputText;
function load({ os = 'ios', key = 'appl_public', dev = false, attribution, login, installation, backend } = {}) {
  const calls = [];
  const premium = { entitlements: { active: { premium: {} } } };
  const purchases = {
    configure: () => calls.push('configure'),
    logIn: async id => { calls.push(`login:${id}`); await login?.(); },
    enableAdServicesAttributionTokenCollection: () => { calls.push('attribution'); return attribution?.(); },
    getCustomerInfo: async () => premium,
    checkTrialOrIntroductoryPriceEligibility: async () => ({ monthly: { status: 1 } }),
    INTRO_ELIGIBILITY_STATUS: { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 1 },
    setLogLevel: () => {},
  };
  const mocks = {
    'react-native': { Platform: { OS: os } },
    'react-native-purchases': { __esModule: true, default: purchases, LOG_LEVEL: { DEBUG: 'debug' } },
    './anonymousSession': { getInstallationId: async () => { await installation?.(); return 'install-123'; } },
    './accessService': { refreshAccessStatus: backend || (async () => ({ premium: true })) },
  };
  const exports = {};
  vm.runInNewContext(code, { exports, require: id => {
    assert.ok(id in mocks, `Unexpected dependency: ${id}`); return mocks[id];
  }, process: { env: { EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: key } }, __DEV__: dev,
  console: { log() {} }, setTimeout });
  return { service: exports, calls };
}

test('identifies before attribution; concurrent/repeated calls configure once', async () => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  const { service, calls } = load({ installation: () => gate });
  const a = service.configureRevenueCat();
  const b = service.configureRevenueCat();
  assert.deepEqual(calls, ['configure']);
  release();
  assert.deepEqual(await Promise.all([a, b]), [true, true]);
  assert.equal(await service.configureRevenueCat(), true);
  assert.deepEqual(calls, ['configure', 'login:install-123', 'attribution']);
});
for (const mode of ['throw', 'reject']) test(`attribution ${mode} preserves premium, trial and backend fallback`, async () => {
  const { service } = load({ attribution: () => {
    if (mode === 'throw') throw new Error('native unavailable');
    return Promise.reject(new Error('native unavailable'));
  }, backend: async () => { throw new Error('offline'); } });
  assert.equal(await service.configureRevenueCat(), true);
  assert.equal(service.isRevenueCatConfigured(), true);
  assert.equal(await service.hasPremiumEntitlement(), true);
  assert.equal(await service.isTrialEligible('monthly'), true);
  assert.equal(await service.syncPremiumWithBackend(), true);
});
for (const options of [{ os: 'android' }, { os: 'web' }, { key: '' }, { key: 'test_public' }]) {
  test(`unsupported platform/key skips all native calls: ${JSON.stringify(options)}`, async () => {
    const { service, calls } = load(options);
    assert.equal(await service.configureRevenueCat(), false);
    assert.deepEqual(calls, []);
  });
}
test('development Test Store still configures subscriptions without Apple attribution', async () => {
  const { service, calls } = load({ dev: true, key: 'test_public' });
  assert.equal(await service.configureRevenueCat(), true);
  assert.deepEqual(calls, ['configure', 'login:install-123']);
});
test('login failure remains retryable and never collects for the wrong customer', async () => {
  let fail = true;
  const { service, calls } = load({ login: () => { if (fail) throw new Error('offline'); } });
  assert.equal(await service.configureRevenueCat(), false);
  assert.equal(calls.includes('attribution'), false);
  fail = false;
  assert.equal(await service.configureRevenueCat(), true);
  assert.equal(calls.filter(c => c === 'attribution').length, 1);
});
test('premium backend synchronization remains available', async () => {
  const { service } = load();
  assert.equal(await service.waitForPremiumBackendSync(1, 0), true);
  assert.equal(service.customerInfoIsPremium({ entitlements: { active: {} } }), false);
});
