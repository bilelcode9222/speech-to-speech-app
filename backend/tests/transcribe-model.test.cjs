const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

for (const language of ['fr', 'auto']) test(`gpt-transcribe sends the supported language fields (${language})`, async () => {
  let fields;
  class FormData { constructor() { fields = []; } append(...args) { fields.push(args); } getHeaders() { return {}; } }
  const mocks = {
    axios: { post: async () => ({ data: { text: 'Bonjour.', usage: { type: 'duration', seconds: 2 } } }) },
    'form-data': FormData,
    '../config/env': { config: { openai: { apiKey: 'test', sttModel: 'gpt-transcribe' } } },
    '../utils/logger': { logger: { timing() {}, error() {} } }, '../utils/languages': {},
    './geminiService': { isHallucination: () => false }, './realtimeSpeech': {},
    '../types': { StageError: class extends Error {} },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(`${__dirname}/../src/services/openaiService.ts`, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: id => mocks[id], Buffer, Date });
  const result = await exports.transcribeOpenAI('AAA=', 'wav', language);
  assert.equal(result.text, 'Bonjour.');
  assert.equal(fields.find(([key]) => key === 'model')[1], 'gpt-transcribe');
  assert.equal(fields.some(([key]) => key === 'language' || key === 'temperature'), false);
  assert.equal(fields.find(([key]) => key === 'languages[]')?.[1], language === 'auto' ? undefined : 'fr');
});
