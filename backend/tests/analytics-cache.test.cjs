const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),ts=require('typescript');
const mod={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/services/analyticsSnapshotCache.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports:mod.exports,module:mod,Date,Map,Promise});
const {createSnapshotLoader}=mod.exports;
test('concurrent dashboard requests share work; periods stay isolated; expiry is measured after completion',async()=>{
let clock=0,calls=0,resolve;
const load=createSnapshotLoader(period=>{calls++;return new Promise(r=>resolve=()=>r({period,generatedAt:clock}));},()=>clock,20);
const first=load(30),second=load(30);assert.equal(first,second);await Promise.resolve();assert.equal(calls,1);
clock=50;resolve();const result=await first;assert.equal(result.generatedAt,50);assert.equal(await load(30),result);assert.equal(calls,1);
const other=load(7);await Promise.resolve();assert.equal(calls,2);resolve();assert.equal((await other).period,7);
clock=71;const renewed=load(30);await Promise.resolve();assert.equal(calls,3);resolve();await renewed;
});
test('failed dashboard requests are not cached or left stuck in-flight',async()=>{
let calls=0;const load=createSnapshotLoader(async()=>{if(++calls===1)throw Error('temporary');return 'ready'});
await assert.rejects(load(30),/temporary/);assert.equal(await load(30),'ready');assert.equal(calls,2);
});
