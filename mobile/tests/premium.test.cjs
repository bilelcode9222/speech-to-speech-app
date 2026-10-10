const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, mocks, globals = {}) {
  const filename = path.resolve(__dirname, '../src', file);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} };
  vm.runInNewContext(source, { module: mod, exports: mod.exports,
    require(id) { if (id in mocks) return mocks[id]; throw new Error(`Unexpected import: ${id}`); },
    console: { log() {} }, process: { env: { EXPO_PUBLIC_REVENUECAT_IOS_API_KEY: 'appl_test' } },
    __DEV__: false, setTimeout: fn => { queueMicrotask(fn); }, ...globals,
  }, { filename });
  return mod.exports;
}
const info = (active = true) => ({ entitlements: { active: active ? { premium: { isActive: true } } : {} } });
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
function service(refresh, initial = info()) {
  let listener, current = initial;
  const purchases = { configure() {}, logIn: async () => {}, getCustomerInfo: async () => current,
    addCustomerInfoUpdateListener(fn) { listener = fn; }, removeCustomerInfoUpdateListener() {}, };
  const api = load('services/revenueCat.ts', {
    'react-native': { Platform: { OS: 'ios' } }, 'react-native-purchases': purchases,
    './anonymousSession': { getInstallationId: async () => 'installation' },
    './accessService': { refreshAccessStatus: refresh },
  });
  return { api, purchases, emit(value) { current = value; listener(value); }, set(value) { current = value; } };
}

test('SDK premium unlocks status without waiting for an unavailable or delayed server', async () => {
  for (const refresh of [() => new Promise(() => {}), async () => ({ premium: false }), async () => { throw Error('offline'); }]) {
    const { api } = service(refresh);
    assert.equal(await api.syncPremiumWithBackend(), true);
  }
});
test('listener delivers premium immediately and ignores a stale negative server result', async () => {
  const old = deferred(), latest = deferred(); let calls = 0;
  const s = service(() => (++calls === 1 ? old.promise : latest.promise));
  const statuses = []; s.api.subscribePremiumStatus(value => statuses.push(value));
  s.emit(info(false)); s.emit(info(true));
  assert.deepEqual(statuses, [false, true]);
  old.resolve({ premium: false }); latest.resolve({ premium: false }); await tick();
  assert.equal(statuses.at(-1), true);
});
test('expiration and unsubscribe cannot be overwritten by an older premium result', async () => {
  const old = deferred(); let calls = 0;
  const s = service(() => ++calls === 1 ? old.promise : Promise.reject(Error('offline')));
  const statuses = []; const unsubscribe = s.api.subscribePremiumStatus(value => statuses.push(value));
  s.emit(info(true)); s.emit(info(false)); old.resolve({ premium: true }); await tick();
  assert.equal(statuses.at(-1), false);
  unsubscribe(); const length = statuses.length; await tick(); assert.equal(statuses.length, length);
});
test('an in-flight recheck does not overwrite a newly verified purchase', async () => {
  const pending = deferred(); const s = service(() => pending.promise, info(false));
  const result = s.api.syncPremiumWithBackend(); await tick(); s.set(info(true));
  pending.resolve({ premium: false }); assert.equal(await result, true);
});
test('no entitlement and no server verification do not grant premium', async () => {
  const { api } = service(async () => ({ premium: false }), info(false));
  assert.equal(await api.syncPremiumWithBackend(), false);
});
test('backend polling retries delayed/failed sync and never fabricates server approval', async () => {
  let calls = 0;
  const { api } = service(async () => { calls++; if (calls === 1) throw Error('offline'); return { premium: calls === 3 }; });
  assert.equal(await api.waitForPremiumBackendSync(3, 0), true); assert.equal(calls, 3);
  const unavailable = service(async () => { throw Error('offline'); });
  assert.equal(await unavailable.api.waitForPremiumBackendSync(2, 0), false);
});

function paywall({ result = info(), fail, packaged = true, sync = () => new Promise(() => {}) } = {}) {
  const product = { identifier: 'neviai.pro.yearly', priceString: '10 €', price: 10 };
  const pkg = { identifier: '$rc_annual', product };
  let state = 0; const alerts = [], events = [], calls = [];
  const react = { createElement(type, props, ...children) { return { type, props: props || {}, children: children.flat(Infinity) }; },
    useCallback: fn => fn, useEffect() {}, useMemo: fn => fn(),
    useState(initial) { const values = [packaged ? [pkg] : [], [product], {}, 'annual', false, false]; return [values[state++] ?? initial, () => {}]; }, };
  const rn = Object.fromEntries(['ActivityIndicator','Modal','Pressable','ScrollView','Text','View'].map(x => [x, x]));
  const purchases = {};
  for (const method of ['purchasePackage', 'purchaseStoreProduct', 'restorePurchases']) {
    purchases[method] = async () => { calls.push(method); if (fail) throw fail; return method === 'restorePurchases' ? result : { customerInfo: result }; };
  }
  const copy = new Proxy({}, { get: (_, key) => key });
  const api = load('components/Paywall.tsx', {
    react, 'react-native': { ...rn, Alert: { alert: (...args) => alerts.push(args) }, Linking: {}, StyleSheet: { create: x => x } },
    'react-native-purchases': purchases, 'react-native-safe-area-context': { SafeAreaView: 'SafeAreaView', useSafeAreaInsets: () => ({ top: 0 }) },
    '../theme/ThemeProvider': { useTheme: () => ({ colors: {} }) }, '../constants/config': {},
    '../i18n/useTranslation': { useTranslation: () => ({ locale: 'fr' }) },
    '../i18n/paywallTranslations': { getPaywallCopy: () => copy, fill: x => x },
    '../services/revenueCat': { configureRevenueCat: async () => true,
      customerInfoIsPremium: service(async () => ({ premium: false })).api.customerInfoIsPremium,
      waitForPremiumBackendSync: sync },
  });
  const tree = api.Paywall({ visible: true, onPremiumActivated: () => events.push('premium'), onClose: () => events.push('close') });
  const buttons = [];
  function walk(node) { if (!node || typeof node !== 'object') return; if (node.type === 'Pressable') buttons.push(node); node.children?.forEach(walk); }
  walk(tree);
  return { alerts, events, calls,
    async purchase() { buttons.find(x => 'disabled' in x.props && x.props.hitSlop === undefined).props.onPress(); await tick(); },
    async restore() { buttons.find(x => x.props.hitSlop === 8).props.onPress(); await tick(); }, };
}
for (const operation of ['purchase', 'restore']) {
  for (const backend of ['pending', 'negative', 'offline']) {
    test(`${operation}: verified premium completes when backend is ${backend}`, async () => {
      const p = paywall({ sync: backend === 'pending' ? () => new Promise(() => {}) : backend === 'negative' ? async () => false : async () => { throw Error('offline'); } });
      await p[operation](); assert.deepEqual(p.events, ['premium', 'close']);
      assert.deepEqual(p.alerts.map(x => x[0]), operation === 'restore' ? ['restoreSuccessTitle'] : []);
    });
  }
  test(`${operation}: no active entitlement keeps the paywall`, async () => {
    const p = paywall({ result: info(false) }); await p[operation]();
    assert.deepEqual(p.events, []); assert.equal(p.alerts.length, 1);
  });
  test(`${operation}: store failure never unlocks`, async () => {
    const p = paywall({ fail: Error('store unavailable') }); await p[operation](); assert.deepEqual(p.events, []); assert.equal(p.alerts.length, 1);
  });
}
test('cancelled purchase is silent and never unlocks', async () => {
  const p = paywall({ fail: { userCancelled: true } }); await p.purchase(); assert.deepEqual(p.events, []); assert.deepEqual(p.alerts, []);
});
test('direct StoreKit product fallback still completes', async () => {
  const p = paywall({ packaged: false }); await p.purchase(); assert.deepEqual(p.calls, ['purchaseStoreProduct']); assert.deepEqual(p.events, ['premium', 'close']);
});

test('a failed in-flight backend recheck retains a newly confirmed purchase', async () => {
  const pending = deferred(); const s = service(() => pending.promise, info(false));
  const result = s.api.syncPremiumWithBackend(); await tick(); s.set(info(true));
  pending.reject(Error('offline')); assert.equal(await result, true);
});
test('free-trial eligibility uses the SDK and fails closed on unavailable eligibility', async () => {
  const s = service(async () => ({ premium: false }));
  s.purchases.INTRO_ELIGIBILITY_STATUS = { INTRO_ELIGIBILITY_STATUS_ELIGIBLE: 2 };
  s.purchases.checkTrialOrIntroductoryPriceEligibility = async ids => {
    assert.deepEqual(Array.from(ids), ['neviai.pro.yearly']);
    return { 'neviai.pro.yearly': { status: 2 } };
  };
  assert.equal(await s.api.isTrialEligible('neviai.pro.yearly'), true);
  s.purchases.checkTrialOrIntroductoryPriceEligibility = async () => ({ 'neviai.pro.yearly': { status: 1 } });
  assert.equal(await s.api.isTrialEligible('neviai.pro.yearly'), false);
  s.purchases.checkTrialOrIntroductoryPriceEligibility = async () => { throw Error('offline'); };
  assert.equal(await s.api.isTrialEligible('neviai.pro.yearly'), false);
});
