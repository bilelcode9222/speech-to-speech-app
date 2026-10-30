const {test,before,after,beforeEach}=require('node:test');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const {PGlite}=require('@electric-sql/pglite');
function load(file,mocks){const mod={exports:{}};const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;vm.runInNewContext(code,{module:mod,exports:mod.exports,require:n=>{if(n in mocks)return mocks[n];throw Error(n)},Date,console,Buffer,Set,Map,process:{env:{}}},{filename:file});return mod.exports;}
let db,ads;
const header='campaign_id,ad_group_id,keyword_id,keyword,installs,taps,spend,currency,campaign,ad_group';
const csv=header+'\n1,2,3,"voice, translator",20,40,12.50,EUR,USA,Exact';
const attr={ads_media_source:'Apple Ads',ads_campaign_id:'1',ads_ad_group_id:'2',ads_keyword_id:'3',ads_keyword:'voice, translator',ads_campaign:'USA',ads_ad_group:'Exact'};
async function event(user,id,props={},name='revenuecat_initial_purchase',at='2026-10-20T12:00:00Z'){await db.query('INSERT INTO nevi_analytics_events(installation_id,event_name,properties,occurred_at) VALUES($1,$2,$3::jsonb,$4)',[user,name,JSON.stringify({environment:'PRODUCTION',period_type:'TRIAL',revenuecat_event_id:id,...props}),at]);}
before(async()=>{db=new PGlite();await db.exec('CREATE TABLE nevi_analytics_events(id BIGSERIAL PRIMARY KEY,installation_id TEXT,event_name TEXT,properties JSONB,occurred_at TIMESTAMPTZ)');ads=load('services/appleAdsKeywords.ts',{'./analyticsStore':{queryAnalytics:async(sql,args)=>(await db.query(sql,args)).rows}});});
after(()=>db.close());
beforeEach(async()=>{await db.exec('TRUNCATE nevi_analytics_events');await db.exec('DROP TABLE IF EXISTS nevi_apple_ads_reports');await db.exec('DROP TABLE IF EXISTS nevi_apple_ads_attribution');});
test('stores only whitelisted Apple Ads attributes; never private or other network attributes',()=>{
const a=ads.appleAdsAttributes({'$mediaSource':{value:'Apple Search Ads'},'$keyword':{value:'voice translator'},'$appleAdsKeywordId':{value:'3'},'$email':{value:'private@example.com'},secret:{value:'private'}});
assert.equal(a.ads_media_source,'Apple Ads');assert.equal(a.ads_keyword,'voice translator');assert.equal(a.ads_keyword_id,'3');assert.equal(Object.keys(a).length,3);
assert.equal(Object.keys(ads.appleAdsAttributes({'$mediaSource':{value:'Facebook'},'$keyword':{value:'voice'}})).length,0);
});
test('UTC dates, bounds, strict CSV, quoted cells, semicolon template and duplicate validation',()=>{
assert.equal(ads.reportWindow('2026-10-01','2026-10-30').end,'2026-10-30');
for(const start of ['bad','2026-99-99','2026-02-30'])assert.throws(()=>ads.reportWindow(start,'2026-10-30'),/Choisissez/);
assert.throws(()=>ads.reportWindow('2026-01-01','2026-10-30'),/Choisissez/);
assert.equal(ads.parseKeywordReport(csv)[0].keyword,'voice, translator');
assert.equal(ads.parseKeywordReport(header.replaceAll(',',';')+'\n1;2;3;voice;20;40;12.50;EUR;USA;Exact')[0].installs,20);
assert.throws(()=>ads.parseKeywordReport(csv+'\n'+csv.split('\n')[1]),/Une seule/);
assert.throws(()=>ads.parseKeywordReport(csv.replace('20,40','-1,40')),/nombre/);
assert.throws(()=>ads.parseKeywordReport(csv.replace('12.50','NaN')),/nombre/);
assert.throws(()=>ads.parseKeywordReport(header+'\n1,2,3,"unterminated'),/CSV/);
});
test('production trials deduplicate by event and installation, sandbox and paid purchases are excluded; unmatched source stays unknown',async()=>{
await event('one','trial-1',attr);await event('one','trial-1',attr);await event('one','trial-again',attr);await event('two','trial-2',attr);
await event('sandbox','test',{...attr,environment:'SANDBOX'});
await event('unknown','unknown-trial');
await event('one','paid',{...attr,period_type:'NORMAL',revenue_usd:6.99},'revenuecat_renewal');
await event('one','paid',{...attr,period_type:'NORMAL',revenue_usd:6.99},'revenuecat_renewal');
let result=await ads.loadKeywordPerformance('2026-10-20','2026-10-20');
assert.equal(result.attributedTrials,2);assert.equal(result.unattributedTrials,1);assert.equal(result.rows.length,1);assert.equal(result.rows[0].trials,2);assert.equal(result.rows[0].payingUsers,1);assert.equal(result.rows[0].revenueUsd,6.99);assert.equal(result.rows[0].trialRate,null);
await ads.saveKeywordReport('2026-10-20','2026-10-20',csv);
result=await ads.loadKeywordPerformance('2026-10-20','2026-10-20');assert.equal(result.rows[0].trialRate,.1);assert.equal(result.rows[0].costPerTrial,6.25);assert.equal(result.rows[0].currency,'EUR');
await ads.saveKeywordReport('2026-10-20','2026-10-20',csv.replace('20,40','40,80'));
result=await ads.loadKeywordPerformance('2026-10-20','2026-10-20');assert.equal(result.rows[0].trialRate,.05);assert.equal((await db.query('SELECT COUNT(*) n FROM nevi_apple_ads_reports')).rows[0].n,1);
result=await ads.loadKeywordPerformance('2026-10-19','2026-10-20');assert.equal(result.importedAt,null);assert.equal(result.rows[0].trialRate,null);
});
test('late attribution enriches trial; same keyword text with different IDs never merges; missing keyword stays visible',async()=>{
await event('late','first');await event('late','later',{...attr,period_type:'NORMAL',revenue_usd:6},'revenuecat_renewal','2026-10-22T12:00:00Z');
await event('different','other',{...attr,ads_keyword_id:'4'});
await event('search-match','search',{ads_media_source:'Apple Ads',ads_campaign_id:'1',ads_ad_group_id:'2'});
await ads.saveKeywordReport('2026-10-20','2026-10-20',csv);
const result=await ads.loadKeywordPerformance('2026-10-20','2026-10-20');assert.equal(result.attributedTrials,3);assert.equal(result.unattributedTrials,0);assert.equal(result.rows.length,3);assert.equal(result.rows.find(r=>r.keywordId==='3').trials,1);assert.equal(result.rows.find(r=>r.keywordId==='4').installs,null);assert.match(result.rows.find(r=>r.keywordId===null).keyword,/non communiqué/);
});
test('UTC boundary remains correct with non-UTC database timezone and zero denominators stay undefined',async()=>{
await db.exec("SET TIME ZONE 'Pacific/Honolulu'");
await event('in','in',attr,'revenuecat_initial_purchase','2026-10-20T00:01:00Z');
await event('out','out',attr,'revenuecat_initial_purchase','2026-10-21T00:00:00Z');
await ads.saveKeywordReport('2026-10-20','2026-10-20',csv.replace('20,40','0,0'));
const r=await ads.loadKeywordPerformance('2026-10-20','2026-10-20');assert.equal(r.attributedTrials,1);assert.equal(r.rows[0].trialRate,null);assert.equal(r.rows[0].sampleLow,true);await db.exec("SET TIME ZONE 'UTC'");
});
test('webhook integration retains advertising fields but never arbitrary subscriber attributes',async()=>{
let stored;const ingest=load('services/revenueCatAnalytics.ts',{'./analyticsStore':{recordAnalyticsEvent:async(...args)=>{stored=args}},'./appleAdsKeywords':ads});
await ingest.recordRevenueCatAnalytics({event:{id:'webhook',type:'INITIAL_PURCHASE',app_user_id:'one',environment:'PRODUCTION',period_type:'TRIAL',subscriber_attributes:{'$mediaSource':{value:'Apple Search Ads'},'$keyword':{value:'translate'},'$email':{value:'private@example.com'}}}});
assert.equal(stored[2].ads_keyword,'translate');assert.equal(stored[2].subscriber_attributes,undefined);assert.equal(JSON.stringify(stored).includes('private@example.com'),false);
});
test('historical recovery joins existing trials without inventing events, resumes batches and never stores personal attributes',async()=>{
await event('historic','historic-trial');
const countBefore=(await db.query('SELECT COUNT(*) n FROM nevi_analytics_events')).rows[0].n;
const axios={get:async()=>({data:{items:[{name:'$mediaSource',value:'Apple Search Ads'},{name:'$campaign',value:'USA'},{name:'$adGroup',value:'Exact'},{name:'$keyword',value:'voice'},{name:'$appleAdsCampaignId',value:'1'},{name:'$appleAdsAdGroupId',value:'2'},{name:'$appleAdsKeywordId',value:'3'},{name:'$email',value:'private@example.com'}],next_page:null}}),isAxiosError:()=>false};
const history=load('services/appleAdsHistory.ts',{'axios':axios,'../config/env':{config:{revenueCat:{apiKey:'test-secret'}}},'./analyticsStore':{queryAnalytics:async(sql,args)=>(await db.query(sql,args)).rows},'./appleAdsKeywords':ads});
let result=await history.recoverAppleAdsHistory('2026-10-20','2026-10-20');assert.equal(result.checked,1);assert.equal(result.recovered,1);assert.equal(result.hasMore,false);
result=await ads.loadKeywordPerformance('2026-10-20','2026-10-20');assert.equal(result.attributedTrials,1);assert.equal(result.rows[0].keywordId,'3');assert.equal((await db.query('SELECT COUNT(*) n FROM nevi_analytics_events')).rows[0].n,countBefore);
assert.equal(JSON.stringify((await db.query('SELECT * FROM nevi_apple_ads_attribution')).rows).includes('private@example.com'),false);
result=await history.recoverAppleAdsHistory('2026-10-20','2026-10-20');assert.equal(result.checked,0);
});
test('historical recovery stops on credential errors and leaves the customer retryable',async()=>{
await event('historic','historic-trial');
const axios={get:async()=>{throw {response:{status:403}}},isAxiosError:()=>true};
const history=load('services/appleAdsHistory.ts',{'axios':axios,'../config/env':{config:{revenueCat:{apiKey:'test-secret'}}},'./analyticsStore':{queryAnalytics:async(sql,args)=>(await db.query(sql,args)).rows},'./appleAdsKeywords':ads});
await assert.rejects(history.recoverAppleAdsHistory('2026-10-20','2026-10-20'),/RevenueCat refuse/);
assert.equal((await db.query('SELECT COUNT(*) n FROM nevi_apple_ads_attribution')).rows[0].n,0);
});
