const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { execFileSync } = require('node:child_process');
const { mkdtemp, readFile, rm, readdir } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const ts = require('typescript');

function loader(mocks = {}, globals = {}) {
  const cache = new Map();
  function load(file) {
    const absolute = path.resolve(__dirname, '../src', file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const mod = { exports: {} }; cache.set(absolute, mod);
    const source = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    vm.runInNewContext(source, {
      module: mod, exports: mod.exports, Buffer, console, setTimeout, clearTimeout,
      AbortController, AbortSignal, __dirname: path.dirname(absolute), process,
      require(id) {
        if (id in mocks) return mocks[id];
        if (!id.startsWith('.')) return require(id);
        const resolved = path.resolve(path.dirname(absolute), id);
        return load(fs.existsSync(`${resolved}.ts`) ? `${resolved}.ts` : `${resolved}/index.ts`);
      }, ...globals,
    }, { filename: absolute });
    return mod.exports;
  }
  return load;
}

const quiet = { info() {}, warn() {}, error() {}, success() {} };
function config(mode = 'realtime') {
  return {
    translationMode: mode, provider: 'openai', ttsProvider: 'openai',
    openai: { apiKey: 'test-only' },
    gpt6Translation: { model: 'gpt-6-sol', transcriptionModel: 'gpt-4o-transcribe', speechModel: 'gpt-4o-mini-tts' },
    realtimeTranslation: { model: 'gpt-realtime-translate', transcriptionModel: 'gpt-realtime-whisper', timeoutMs: 1000 },
  };
}

function session({ timeout = 1000 } = {}) {
  let socket;
  class MockSocket extends EventEmitter {
    static CLOSED = 3;
    constructor(url, options) {
      super(); socket = this; this.url = url; this.options = options;
      this.readyState = 1; this.sent = []; this.terminated = false;
    }
    send(raw, cb) { this.sent.push(JSON.parse(raw)); queueMicrotask(() => cb()); }
    terminate() { this.readyState = 3; this.terminated = true; this.emit('close'); }
    close() { this.closing = true; }
    event(event) { this.emit('message', Buffer.from(JSON.stringify(event))); }
  }
  const cfg = config(); cfg.realtimeTranslation.timeoutMs = timeout;
  const load = loader({ ws: MockSocket, '../config/env': { config: cfg } });
  const api = load('services/realtimeTranslationService.ts');
  return { api, socket: () => socket };
}

const tick = () => new Promise(resolve => setImmediate(resolve));
async function ready(socket, language = 'en') {
  socket.emit('open');
  await tick();
  assert.equal(socket.sent.length, 1, 'do not send source audio before target language acknowledgement');
  socket.event({ type: 'session.updated', session: { audio: { output: { language } } } });
  await tick();
}

test('Realtime sends PCM frames after configuration, preserves deltas and drains audio until session.closed', async () => {
  const fixture = session();
  const pcm = Buffer.alloc(20_002, 3);
  const promise = fixture.api.translateRealtimePcm(pcm, 'en');
  const socket = fixture.socket();
  assert.match(socket.url, /\/v1\/realtime\/translations\?model=gpt-realtime-translate$/);
  await ready(socket);
  assert.equal(socket.sent[0].session.audio.input.transcription.model, 'gpt-realtime-whisper');
  assert.equal(socket.sent[0].session.audio.input.transcription.language, undefined, 'let OpenAI detect the source language');
  const frames = socket.sent.filter(e => e.type === 'session.input_audio_buffer.append');
  assert.deepEqual(frames.map(e => Buffer.from(e.audio, 'base64').length), [9600, 9600, 802]);
  assert.deepEqual(Buffer.concat(frames.map(e => Buffer.from(e.audio, 'base64'))), pcm);
  assert.equal(socket.sent.at(-1).type, 'session.close');
  assert.equal(socket.terminated, false);
  socket.event({ type: 'session.input_transcript.delta', delta: 'Bon' });
  socket.event({ type: 'session.input_transcript.delta', delta: 'jour' });
  socket.event({ type: 'session.output_transcript.delta', delta: 'Hel' });
  socket.event({ type: 'session.output_transcript.delta', delta: 'lo' });
  socket.event({ type: 'session.output_audio.delta', delta: Buffer.from([1, 0, 2, 0]).toString('base64') });
  socket.event({ type: 'session.output_audio.delta', delta: Buffer.from([3, 0]).toString('base64') });
  socket.event({ type: 'session.closed' });
  assert.equal(socket.closing, true);
  assert.equal(socket.terminated, false, 'source transcript may arrive after session.closed');
  socket.event({ type: 'session.input_transcript.delta', delta: ' !' });
  socket.readyState = 3;
  socket.emit('close');
  const result = await promise;
  assert.equal(result.originalText, 'Bonjour !'); assert.equal(result.translatedText, 'Hello');
  const wav = Buffer.from(result.audioBase64, 'base64');
  assert.equal(wav.toString('ascii', 0, 4), 'RIFF');
  assert.equal(wav.readUInt32LE(24), 24000); assert.equal(wav.readUInt16LE(22), 1);
  assert.deepEqual([...wav.subarray(44)], [1, 0, 2, 0, 3, 0]);
  assert.equal(socket.terminated, false, 'successful closure must be graceful');
});

test('Realtime rejects disconnects, provider errors, missing voice and inconsistent audio', async () => {
  for (const failure of ['disconnect', 'provider', 'empty', 'format']) {
    const fixture = session();
    const promise = fixture.api.translateRealtimePcm(Buffer.alloc(9600), 'en');
    const rejected = assert.rejects(promise, error => error.stage === 'translation');
    const socket = fixture.socket(); await ready(socket);
    if (failure === 'disconnect') socket.emit('close');
    if (failure === 'provider') socket.event({ type: 'error', error: { message: 'private', code: 'not_allowed' } });
    if (failure === 'empty') socket.event({ type: 'session.closed' });
    if (failure === 'format') socket.event({ type: 'session.output_audio.delta', delta: 'AAA=', sample_rate: 0 });
    await rejected;
    assert.equal(socket.terminated, true);
  }
});

test('Realtime abort and timeout close the connection and reject exactly once', async () => {
  for (const cancel of [true, false]) {
    const fixture = session({ timeout: 15 });
    const controller = new AbortController();
    const promise = fixture.api.translateRealtimePcm(Buffer.alloc(9600), 'fr', controller.signal);
    const rejected = assert.rejects(promise, error => error.stage === 'translation');
    if (cancel) controller.abort();
    await rejected;
    assert.equal(fixture.socket().terminated, true);
    fixture.socket().emit('error', new Error('late error'));
  }
});

test('Realtime refuses an unconfirmed target language without uploading audio', async () => {
  const fixture = session();
  const promise = fixture.api.translateRealtimePcm(Buffer.alloc(9600), 'fr');
  const rejected = assert.rejects(promise, /Langue cible/);
  const socket = fixture.socket(); socket.emit('open');
  socket.event({ type: 'session.updated', session: { audio: { output: { language: 'en' } } } });
  await rejected;
  assert.equal(socket.sent.length, 1);
});

test('real FFmpeg decodes M4A to 24kHz PCM, rejects corrupt input and removes temporary files', async () => {
  const api = loader()('services/realtimeAudio.ts');
  const directory = await mkdtemp(path.join(tmpdir(), 'nevi-test-'));
  const before = (await readdir(tmpdir())).filter(p => p.startsWith('nevi-audio-')).sort();
  try {
    const file = path.join(directory, 'source.m4a');
    execFileSync(require('ffmpeg-static'), [
      '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100',
      '-t', '0.5', '-ac', '2', '-c:a', 'aac', file,
    ]);
    const pcm = await api.decodeRealtimeAudio((await readFile(file)).toString('base64'), 'm4a');
    assert.ok(pcm.length >= 24_000 && pcm.length < 27_000);
    assert.equal(pcm.length % 2, 0);
    const wav = api.pcmToWav(pcm);
    assert.equal(wav.readUInt32LE(40), pcm.length);
    await assert.rejects(api.decodeRealtimeAudio(Buffer.from('corrupt audio').toString('base64'), 'm4a'), /Conversion/);
    await assert.rejects(api.decodeRealtimeAudio(api.pcmToWav(Buffer.alloc(62 * 48_000)).toString('base64'), 'wav'), /trop long/);
    const controller = new AbortController(); controller.abort();
    await assert.rejects(api.decodeRealtimeAudio('AA==', 'm4a', controller.signal));
    assert.deepEqual((await readdir(tmpdir())).filter(p => p.startsWith('nevi-audio-')).sort(), before);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('Realtime produces direct translated voice; classic retains the previous three stages', async () => {
  const request = { requestId: 'test', audioBase64: 'AA==', audioFormat: 'm4a', sourceLanguage: 'fr', targetLanguage: 'en' };
  for (const mode of ['realtime', 'classic']) {
    const called = [];
    const load = loader({
      '../config/env': { config: config(mode) }, '../utils/logger': { logger: quiet },
      '../services/sttService': {}, '../services/translationService': {}, '../services/ttsService': {}, '../services/geminiService': {},
      '../services/openaiService': {
        transcribeOpenAI: async () => { called.push('stt'); return { text: 'bonjour', durationMs: 1 }; },
        translateOpenAI: async () => { called.push('llm'); return { translatedText: 'hello', durationMs: 1 }; },
        synthesizeSpeechOpenAI: async () => { called.push('tts'); return { audioBase64: 'classic-mp3', durationMs: 1 }; },
      },
      '../services/realtimeAudio': { decodeRealtimeAudio: async () => { called.push('decode'); return Buffer.alloc(2); } },
      '../services/realtimeTranslationService': { translateRealtimePcm: async () => { called.push('realtime'); return { originalText: 'bonjour', translatedText: 'hello', audioBase64: 'realtime-wav' }; } },
    });
    const result = await load('pipeline/speechPipeline.ts').runSpeechPipeline(request);
    assert.deepEqual(called, mode === 'realtime' ? ['decode', 'realtime'] : ['stt', 'llm', 'tts']);
    assert.equal(result.audioFormat, mode === 'realtime' ? 'wav' : 'mp3');
  }
});

test('mode configuration defaults to GPT-6, preserves legacy model settings and rejects typos', () => {
  function read(env) {
    return loader({ dotenv: { config() {} } }, { process: { env: { ANONYMOUS_SESSION_SECRET: 'test', OPENAI_API_KEY: 'test', ...env } } })('config/env.ts').config;
  }
  assert.equal(read({}).translationMode, 'gpt6');
  assert.equal(read({ TRANSLATION_MODE: 'realtime' }).translationMode, 'realtime');
  const legacy = read({ TRANSLATION_MODE: 'classic' });
  assert.equal(legacy.openai.sttModel, 'whisper-1');
  assert.equal(legacy.openai.llmModel, 'gpt-4o-mini');
  assert.equal(legacy.openai.ttsModel, 'tts-1'); assert.equal(legacy.openai.voice, 'nova');
  assert.throws(() => read({ TRANSLATION_MODE: 'typo' }), /TRANSLATION_MODE/);
});

test('Realtime costs are explicitly unknown instead of charged at legacy model rates', async () => {
  let captured;
  const api = loader({ '../config/env': { config: config() }, './serverAnalytics': { captureServerAnalytics: async (...args) => { captured = args; } } })('services/unitEconomics.ts');
  await api.recordTranslationCost({ installationId: 'fixture', translatedText: 'secret text', recordingDurationMs: 1000 });
  assert.equal(captured[2].estimated_cost_usd, null);
  assert.equal(captured[2].cost_estimate_complete, false);
  assert.equal(JSON.stringify(captured).includes('secret text'), false);
});

test('access reservation is atomic across concurrent requests and is released after failures', async () => {
  let finish;
  let check = () => new Promise(resolve => { finish = resolve; });
  const api = loader({
    '../config/env': { config: { databaseUrl: '' } }, '../utils/logger': { logger: quiet },
    '../services/revenueCatService': { isPremiumSubscriber: () => check() },
  })('security/accessControl.ts');
  const first = api.beginTranslation('one');
  check = async () => true;
  const second = await api.beginTranslation('one');
  assert.equal(second.code, 'ALREADY_TRANSLATING');
  finish(true); assert.equal((await first).allowed, true);
  api.finishTranslation('one');
  check = async () => { throw new Error('temporary'); };
  await assert.rejects(api.beginTranslation('one'), /temporary/);
  check = async () => true;
  assert.equal((await api.beginTranslation('one')).allowed, true);
  api.finishTranslation('one');
});


test('silent recordings, DC offset and isolated clicks are rejected without rejecting a quiet voice', () => {
  const { assertAudibleAudio } = loader()('services/realtimeAudio.ts');
  const silence = Buffer.alloc(48000);
  const dc = Buffer.alloc(48000); for (let i = 0; i < dc.length; i += 2) dc.writeInt16LE(1000, i);
  const click = Buffer.alloc(48000); click.writeInt16LE(32000, 24000);
  for (const pcm of [silence, dc, click]) assert.throws(() => assertAudibleAudio(pcm), e => e.code === 'NO_SPEECH');
  const quiet = Buffer.alloc(48000);
  for (let i = 0; i < 4800; i++) quiet.writeInt16LE(Math.round(100 * Math.sin(i / 10)), i * 2);
  assert.doesNotThrow(() => assertAudibleAudio(quiet));
});

test('successful translation survives an unresponsive close handshake; abort during drain still cancels', async () => {
  for (const abort of [false, true]) {
    const fixture = session({ timeout: 100 });
    const controller = new AbortController();
    const promise = fixture.api.translateRealtimePcm(Buffer.alloc(9600), 'en', controller.signal);
    const socket = fixture.socket(); await ready(socket);
    socket.event({ type: 'session.output_transcript.delta', delta: 'Hello' });
    socket.event({ type: 'session.output_audio.delta', delta: 'AAA=' });
    socket.event({ type: 'session.closed' });
    if (abort) {
      const rejected = assert.rejects(promise, /interrompue/); controller.abort(); await rejected;
    } else assert.equal((await promise).translatedText, 'Hello');
    assert.equal(socket.terminated, true);
  }
});


test('valid short words are not mistaken for hallucinations in the classic fallback', () => {
  const { isHallucination } = loader({ '../config/env': { config: {} } })('services/geminiService.ts');
  for (const word of ['no', 'si', 'ja', 'oui', 'non', 'hi', 'はい', '是', 'لا']) assert.equal(isHallucination(word), false, word);
  assert.equal(isHallucination('...'), true);
});


test('empty Realtime results use the OpenAI fallback regardless of recording length', async () => {
  for (const scenario of ['short', 'long', 'provider', 'abort']) {
    const called = []; const controller = new AbortController(); let StageError;
    const load = loader({
      '../config/env': { config: config() }, '../utils/logger': { logger: quiet },
      '../services/sttService': {}, '../services/translationService': {}, '../services/ttsService': {}, '../services/geminiService': {},
      '../services/realtimeAudio': { PCM_BYTES_PER_SECOND: 48000, decodeRealtimeAudio: async () => Buffer.alloc(scenario === 'long' ? 48000 * 4 : 9600) },
      '../services/realtimeTranslationService': { translateRealtimePcm: async () => {
        if (scenario === 'abort') controller.abort();
        throw new StageError('translation', 'empty', scenario === 'provider' ? undefined : 'REALTIME_EMPTY_RESULT');
      } },
      '../services/openaiService': {
        transcribeOpenAI: async (_audio, _format, lang, options) => {
          called.push('stt'); assert.equal(lang, 'auto'); assert.equal(options.model, 'gpt-4o-transcribe');
          assert.equal(options.signal.aborted, false); return { text: 'Oui', durationMs: 1 };
        },
        translateOpenAI: async (text, from, to) => { called.push('translation'); assert.equal(text, 'Oui'); assert.equal(from, 'auto'); assert.equal(to, 'en'); return { translatedText: 'Yes', durationMs: 1 }; },
        synthesizeSpeechOpenAI: async (text, options) => { called.push('voice'); assert.equal(text, 'Yes'); assert.equal(options.model, 'gpt-4o-mini-tts'); return { audioBase64: 'mp3', durationMs: 1 }; },
      },
    });
    StageError = load('types/index.ts').StageError;
    const promise = load('pipeline/speechPipeline.ts').runSpeechPipeline({requestId: 'word', audioBase64: 'AA==', audioFormat: 'm4a', sourceLanguage: 'auto', targetLanguage: 'en'}, { signal: controller.signal });
    if (scenario === 'short' || scenario === 'long') {
      const result = await promise; assert.equal(result.translatedText, 'Yes'); assert.equal(result.audioFormat, 'mp3');
      assert.deepEqual(called, ['stt', 'translation', 'voice']);
    } else { await assert.rejects(promise); assert.deepEqual(called, []); }
  }
});

test('GPT-6 Responses translates untrusted text with no reasoning and parses only output text', async () => {
  let captured;
  const load = loader({
    '../config/env': { config: config('gpt6') },
    axios: { post: async (...args) => { captured = args; return { data: {
      status: 'completed', output: [{ type: 'reasoning', content: [{ type: 'output_text', text: 'hidden' }] },
        { type: 'message', content: [{ type: 'output_text', text: ' Yes. ' }] }],
      usage: { input_tokens: 15, output_tokens: 2 },
    } }; } },
  });
  const signal = new AbortController().signal;
  const result = await load('services/gpt6TranslationService.ts').translateGPT6('Oui.', 'auto', 'en', signal);
  assert.equal(result.translatedText, 'Yes.'); assert.equal(result.inputTokens, 15);
  assert.equal(captured[0], 'https://api.openai.com/v1/responses');
  assert.equal(captured[1].model, 'gpt-6-sol');
  assert.equal(captured[1].reasoning.effort, 'none'); assert.equal(captured[1].store, false);
  assert.equal(captured[1].input, 'Oui.'); assert.match(captured[1].instructions, /Détecte la langue/);
  assert.equal(captured[2].signal, signal);
});

test('GPT-6 rejects incomplete, refused or empty responses and sanitizes provider errors', async () => {
  for (const data of [{ status: 'incomplete', output: [{ type: 'message', content: [{ type: 'output_text', text: 'partial' }] }] },
    { status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] },
    { status: 'completed', output: [] }, null]) {
    const api = loader({ '../config/env': { config: config('gpt6') }, axios: { post: async () => {
      if (!data) throw new Error('secret provider detail'); return { data };
    } } })('services/gpt6TranslationService.ts');
    await assert.rejects(api.translateGPT6('Oui', 'auto', 'en'), error => error.stage === 'translation' && !error.message.includes('secret'));
  }
});

test('GPT-6 pipeline bypasses Realtime, preserves automatic source and existing mobile events', async () => {
  for (const cancel of [false, true]) {
    const calls = []; const controller = new AbortController();
    const load = loader({
      '../config/env': { config: config('gpt6') }, '../utils/logger': { logger: quiet },
      '../services/sttService': {}, '../services/translationService': {}, '../services/ttsService': {}, '../services/geminiService': {},
      '../services/realtimeTranslationService': { translateRealtimePcm: () => assert.fail('Realtime must not run') },
      '../services/realtimeAudio': { decodeRealtimeAudio: async () => calls.push('decode') },
      '../services/gpt6TranslationService': { translateGPT6: async (text, source, target) => {
        calls.push('gpt6'); assert.equal(text, 'Oui'); assert.equal(source, 'auto'); assert.equal(target, 'en');
        return { translatedText: 'Yes', durationMs: 2, inputTokens: 5, outputTokens: 1 };
      } },
      '../services/openaiService': {
        transcribeOpenAI: async (audio, format, source, options) => {
          calls.push('stt'); assert.equal(source, 'auto'); assert.equal(options.model, 'gpt-4o-transcribe');
          if (cancel) controller.abort(); return { text: 'Oui', durationMs: 1 };
        },
        synthesizeSpeechOpenAI: async (text, options) => {
          calls.push('tts'); assert.equal(text, 'Yes'); assert.equal(options.model, 'gpt-4o-mini-tts');
          return { audioBase64: 'mp3', durationMs: 3 };
        },
      },
    });
    const promise = load('pipeline/speechPipeline.ts').runSpeechPipeline({ requestId: 'word', audioBase64: 'AA==',
      audioFormat: 'm4a', sourceLanguage: 'auto', targetLanguage: 'en' }, {
      signal: controller.signal, onTranscription: () => calls.push('source-event'), onTranslation: () => calls.push('translation-event'),
    });
    if (cancel) { await assert.rejects(promise); assert.deepEqual(calls, ['decode', 'stt']); }
    else {
      const result = await promise;
      assert.deepEqual(calls, ['decode', 'stt', 'source-event', 'gpt6', 'translation-event', 'tts']);
      assert.equal(result.audioFormat, 'mp3'); assert.equal(result.originalText, 'Oui');
      assert.equal(result.usage.translationInputTokens, 5);
    }
  }
});
