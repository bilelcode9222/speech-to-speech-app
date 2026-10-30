const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const source = ts.transpileModule(fs.readFileSync(require.resolve('../src/services/appleAdsReportFile.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(source, { require, exports: moduleObject.exports, Buffer, TextDecoder });
const { readKeywordReportFile } = moduleObject.exports;
const csv = 'campaign_id,keyword\n1,« traduction 日本語 »\n';
test('plain CSV and gzip preserve Unicode regardless of extension', async () => {
  assert.equal(await readKeywordReportFile(Buffer.from(csv).toString('base64')), csv);
  assert.equal(await readKeywordReportFile(gzipSync(csv).toString('base64')), csv);
});
test('gzip UTF-16 with BOM is decoded', async () => {
  const bytes = Buffer.concat([Buffer.from([255,254]), Buffer.from(csv,'utf16le')]);
  assert.equal(await readKeywordReportFile(gzipSync(bytes).toString('base64')), csv);
});
test('invalid uploads and truncated archives fail with readable errors', async () => {
  for (const input of [null, '', '%invalid', Buffer.from([0x1f,0x8b,0]).toString('base64')]) {
    await assert.rejects(readKeywordReportFile(input), /CSV/);
  }
});
test('compressed and expanded size limits both apply', async () => {
  await assert.rejects(readKeywordReportFile(Buffer.alloc(1_000_001).toString('base64')), /volumineux/);
  await assert.rejects(readKeywordReportFile(gzipSync(Buffer.alloc(1_000_001)).toString('base64')), /décompressé/);
});
