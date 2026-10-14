const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const tick = () => new Promise(resolve => setImmediate(resolve));

function fixture() {
  let now = 0;
  const calls = [];
  const timers = new Map();
  const logs = [];
  const parent = new AbortController();
  const mocks = {
    './openaiService': { synthesizeSpeechOpenAI: (text, options) => new Promise((resolve, reject) => {
      calls.push({ text, ...options, resolve, reject });
      options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
    }) },
    '../utils/logger': { logger: { info: message => logs.push(message) } },
    '../types': { StageError: class extends Error {} },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../src/services/fastSpeech.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => mocks[id], AbortSignal, AbortController,
    Date: { now: () => now }, setTimeout: (fn, ms) => { timers.set(fn, ms); return fn; }, clearTimeout: fn => timers.delete(fn),
  });
  return { calls, timers, logs, parent,
    start: () => exports.synthesizeFastSpeech('Private test text', 'gpt-4o-mini-tts', parent.signal, 'test-id'),
    hedge: async () => {
      assert.equal(timers.size, 1);
      const [fn, ms] = [...timers][0]; assert.equal(ms, 2500);
      timers.delete(fn); now = 2500; fn(); await tick();
    },
    time: value => { now = value; },
  };
}

test('normal voice uses one AI request and clears the unused retry timer', async () => {
  const h = fixture(); const result = h.start(); await tick();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].model, 'gpt-4o-mini-tts');
  h.time(900); h.calls[0].resolve({ audioBase64: 'primary', durationMs: 800 });
  assert.equal((await result).audioBase64, 'primary');
  assert.equal(h.timers.size, 0); assert.equal(h.calls.length, 1);
  assert.ok(h.logs.every(message => !message.includes('Private test text')));
});

test('a stalled primary is rescued by the second AI voice before device fallback', async () => {
  const h = fixture(); const result = h.start(); await tick(); await h.hedge();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].text, h.calls[0].text); assert.equal(h.calls[1].model, h.calls[0].model);
  h.time(3400); h.calls[1].resolve({ audioBase64: 'second', durationMs: 900 });
  const speech = await result;
  assert.equal(speech.audioBase64, 'second'); assert.equal(speech.durationMs, 3400);
  assert.equal(h.calls[0].signal.aborted, true); assert.equal(h.timers.size, 0);
  await tick(); assert.equal(h.calls.length, 2);
});

test('the primary can still win after the retry starts and cancels the retry', async () => {
  const h = fixture(); const result = h.start(); await tick(); await h.hedge();
  h.calls[0].resolve({ audioBase64: 'primary', durationMs: 2600 });
  assert.equal((await result).audioBase64, 'primary');
  assert.equal(h.calls[1].signal.aborted, true); await tick();
});

test('a failed retry does not discard a primary that is still producing audio', async () => {
  const h = fixture(); let settled = false;
  const result = h.start().finally(() => { settled = true; }); await tick(); await h.hedge();
  h.calls[1].reject(Error('temporary failure')); await tick(); assert.equal(settled, false);
  h.calls[0].resolve({ audioBase64: 'primary', durationMs: 3000 });
  assert.equal((await result).audioBase64, 'primary');
});

for (const empty of [false, true]) test(`early ${empty ? 'empty audio' : 'provider failure'} retries immediately, at most once`, async () => {
  const h = fixture(); const result = h.start(); await tick();
  if (empty) h.calls[0].resolve({ audioBase64: '', durationMs: 10 });
  else h.calls[0].reject(Error('provider failure'));
  await tick(); assert.equal(h.calls.length, 2); assert.equal(h.timers.size, 0);
  h.calls[1].resolve({ audioBase64: 'recovered', durationMs: 500 });
  assert.equal((await result).audioBase64, 'recovered');
});

test('both failed voices reject without an unbounded retry loop', async () => {
  const h = fixture(); const result = h.start(); const rejected = assert.rejects(result);
  await tick(); h.calls[0].reject(Error('first')); await tick();
  h.calls[1].reject(Error('second')); await rejected;
  assert.equal(h.calls.length, 2); assert.equal(h.timers.size, 0);
});

for (const afterHedge of [false, true]) test(`shared deadline/disconnect cancels ${afterHedge ? 'both attempts' : 'primary and pending retry'}`, async () => {
  const h = fixture(); const result = h.start(); const rejected = assert.rejects(result, error => error.name === 'AbortError');
  await tick(); if (afterHedge) await h.hedge();
  h.parent.abort(); await rejected; await tick();
  assert.equal(h.timers.size, 0); assert.equal(h.calls.length, afterHedge ? 2 : 1);
  assert.ok(h.calls.every(call => call.signal.aborted));
});

test('an already-cancelled translation never starts cloud voice work', () => {
  const h = fixture(); h.parent.abort();
  assert.throws(h.start, error => error.name === 'AbortError');
  assert.equal(h.calls.length, 0); assert.equal(h.timers.size, 0);
});
