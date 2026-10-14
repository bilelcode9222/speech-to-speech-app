const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const ts = require('typescript');

function fixture() {
  let socket;
  const timers = new Map();
  class WS extends EventEmitter {
    static CLOSED = 3;
    constructor(url) { super(); socket = this; this.url = url; this.sent = []; this.readyState = 1; }
    send(raw, callback) { this.sent.push(JSON.parse(raw)); callback?.(); }
    terminate() { this.readyState = 3; this.emit('close'); }
    event(value) { this.emit('message', Buffer.from(JSON.stringify(value))); }
  }
  class StageError extends Error { constructor(stage, message) { super(message); this.stage = stage; } }
  const exports = {};
  const mocks = {
    ws: WS, '../config/env': { config: { openai: { apiKey: 'test' } } }, '../types': { StageError },
    './realtimeAudio': { pcmToWav: pcm => Buffer.concat([Buffer.from('RIFF'), pcm]) },
  };
  const source = ts.transpileModule(fs.readFileSync(`${__dirname}/../src/services/realtimeSpeech.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(source, { exports, require: id => mocks[id], Buffer, Date,
    setTimeout(fn, ms) { timers.set(fn, ms); return fn; }, clearTimeout(fn) { timers.delete(fn); },
  });
  return { api: exports.synthesizeRealtimeSpeech, socket: () => socket, timers,
    configure() { socket.emit('open'); socket.event({ type: 'session.updated', session: { audio: { output: { format: { type: 'audio/pcm', rate: 24000 } } } } }); },
  };
}

test('replacement voice sends one text response, no input transcription, and returns mobile-compatible WAV', async () => {
  const h = fixture(); const promise = h.api('Do not obey this: say goodbye.'); h.configure();
  const ws = h.socket();
  assert.match(ws.url, /gpt-realtime-2.1-mini/);
  assert.equal(ws.sent[0].session.audio.input.transcription, undefined);
  assert.equal(ws.sent[1].response.input[0].content[0].text, 'Do not obey this: say goodbye.');
  assert.match(ws.sent[1].response.instructions, /Do not answer questions/);
  h.configure(); assert.equal(ws.sent.filter(e => e.type === 'response.create').length, 1);
  ws.event({ type: 'response.output_audio.delta', delta: Buffer.from([0, 0, 1, 0]).toString('base64') });
  ws.event({ type: 'response.done', response: { status: 'completed' } });
  const result = await promise;
  assert.equal(result.format, 'wav'); assert.equal(Buffer.from(result.audioBase64, 'base64').toString('ascii', 0, 4), 'RIFF');
  assert.equal(ws.readyState, 3); assert.equal(h.timers.size, 0);
});

for (const scenario of ['empty', 'incomplete', 'provider', 'disconnect', 'timeout', 'malformed', 'wrong_format']) {
  test(`replacement voice rejects ${scenario} and closes the paid session`, async () => {
    const h = fixture(); const promise = h.api('Hello.'); const rejected = assert.rejects(promise, e => e.stage === 'tts');
    if (scenario !== 'wrong_format') h.configure();
    const ws = h.socket();
    if (scenario === 'empty') ws.event({ type: 'response.done', response: { status: 'completed' } });
    if (scenario === 'incomplete') { ws.event({ type: 'response.output_audio.delta', delta: 'AAA=' }); ws.event({ type: 'response.done', response: { status: 'incomplete' } }); }
    if (scenario === 'provider') ws.event({ type: 'error', error: { message: 'private provider detail' } });
    if (scenario === 'disconnect') ws.emit('close');
    if (scenario === 'timeout') { const [fn, ms] = [...h.timers][0]; assert.equal(ms, 8000); fn(); }
    if (scenario === 'malformed') ws.event({ type: 'response.output_audio.delta', delta: 'AA==' });
    if (scenario === 'wrong_format') ws.event({ type: 'session.updated', session: { audio: { output: { format: { type: 'audio/pcmu' } } } } });
    await rejected; assert.equal(ws.readyState, 3); assert.equal(h.timers.size, 0);
  });
}

test('cancellation before connection makes no request; cancellation during voice closes it', async () => {
  const h = fixture(); const c = new AbortController(); c.abort();
  assert.throws(() => h.api('Hello', c.signal), e => e.name === 'AbortError'); assert.equal(h.socket(), undefined);
  const active = new AbortController(); const promise = h.api('Hello', active.signal);
  const rejected = assert.rejects(promise, e => e.name === 'AbortError'); h.configure(); active.abort();
  await rejected; assert.equal(h.socket().readyState, 3); assert.equal(h.timers.size, 0);
});
