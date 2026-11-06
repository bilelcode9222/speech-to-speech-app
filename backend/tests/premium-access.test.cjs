const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function server({ entitlement, offline = false, apiKey = 'server-test-key' } = {}) {
  const config = { databaseUrl: '', revenueCat: { apiKey, entitlementId: 'premium' } };
  let calls = 0, current = entitlement, unavailable = offline;
  const mocks = {
    '../config/env': { config },
    '../utils/logger': { logger: { warn() {}, error() {} } },
    axios: { async get(url, options) {
      calls++;
      assert.ok(url.endsWith('/installation'));
      assert.equal(options.headers.Authorization, 'Bearer server-test-key');
      if (unavailable) throw Error('RevenueCat unavailable');
      return { data: { subscriber: { entitlements: current ? { premium: current } : {} } } };
    }, isAxiosError: () => false },
  };
  function load(file) {
    const filename = path.resolve(__dirname, '../src', file);
    const mod = { exports: {} };
    const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, { module: mod, exports: mod.exports, Date, console,
      require(id) { if (id in mocks) return mocks[id]; throw Error(`Unexpected import ${id}`); },
    }, { filename });
    return mod.exports;
  }
  const rc = load('services/revenueCatService.ts');
  mocks['../services/revenueCatService'] = rc;
  const access = load('security/accessControl.ts');
  return { rc, access, calls: () => calls, set(value) { current = value; }, offline(value) { unavailable = value; } };
}
async function exhaustFree(access) {
  for (let i = 0; i < 3; i++) await access.recordSuccessfulTranslation('installation', false);
}
test('delayed server entitlement does not bypass access; refresh authorizes only after RevenueCat confirms', async () => {
  const s = server(); await exhaustFree(s.access);
  const denied = await s.access.beginTranslation('installation');
  assert.equal(denied.allowed, false); assert.equal(denied.code, 'PAYWALL_REQUIRED'); assert.equal(denied.premium, false);
  s.set({ expires_date: new Date(Date.now() + 3600000).toISOString() });
  assert.equal((await s.access.inspectAccess('installation')).premium, false, 'negative cache remains until refresh');
  s.rc.invalidateRevenueCatCache('installation');
  const allowed = await s.access.beginTranslation('installation');
  assert.equal(allowed.allowed, true); assert.equal(allowed.premium, true);
  s.access.finishTranslation('installation');
});
for (const scenario of [
  { name: 'server unavailable', offline: true },
  { name: 'missing server key', apiKey: '' },
  { name: 'expired subscription', entitlement: { expires_date: '2000-01-01T00:00:00Z' } },
  { name: 'malformed expiry', entitlement: { expires_date: 'invalid' } },
]) {
  test(`${scenario.name} cannot grant unverified premium after free quota`, async () => {
    const s = server(scenario); await exhaustFree(s.access);
    const access = await s.access.beginTranslation('installation');
    assert.equal(access.allowed, false); assert.equal(access.premium, false); assert.equal(access.code, 'PAYWALL_REQUIRED');
  });
}
test('active free trial grants server premium and keeps fair-use limits', async () => {
  const s = server({ entitlement: { expires_date: new Date(Date.now() + 3600000).toISOString() } });
  assert.equal((await s.access.inspectAccess('installation')).premium, true);
  for (let i = 0; i < s.access.PREMIUM_DAILY_LIMIT; i++) await s.access.recordSuccessfulTranslation('installation', true);
  const access = await s.access.beginTranslation('installation');
  assert.equal(access.allowed, false); assert.equal(access.code, 'FAIR_USE_DAILY_LIMIT'); assert.equal(access.freeUsed, 0);
});
test('free translations remain available without any subscription', async () => {
  const s = server();
  assert.equal((await s.access.beginTranslation('installation')).allowed, true);
  await s.access.recordSuccessfulTranslation('installation', false); s.access.finishTranslation('installation');
  assert.equal((await s.access.inspectAccess('installation')).freeUsed, 1);
});
