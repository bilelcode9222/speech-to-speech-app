const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const { PGlite } = require(process.env.NEVI_PGLITE_MODULE || '@electric-sql/pglite');
let db, analytics;
function load(file, mocks) {
 const mod={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{exports:mod.exports,module:mod,require:name=>{if(name in mocks)return mocks[name];throw Error('Unexpected dependency '+name);},Date,console,Buffer},{filename:file});
 return mod.exports;
}
async function add(user,event,properties={},agoHours=1){await db.query('INSERT INTO nevi_analytics_events (installation_id,event_name,properties,occurred_at) VALUES ($1,$2,$3::jsonb,NOW()-($4::float*interval \'1 hour\'))',[user,event,JSON.stringify(properties),agoHours]);}
before(async()=>{
 db=new PGlite();await db.exec('CREATE TABLE nevi_analytics_events (id BIGSERIAL PRIMARY KEY, installation_id TEXT NOT NULL,event_name TEXT NOT NULL,properties JSONB NOT NULL,occurred_at TIMESTAMPTZ NOT NULL)');
 analytics=load('services/analyticsDashboard.ts',{'../config/env':{config:{unitEconomics:{storeNetRevenueShare:.7,defaultAcquisitionCostUsd:1.5},analyticsDashboard:{revenueCatWebhookAuthorization:'fixture'}}},'./analyticsStore':{analyticsStoreConfigured:()=>true,queryAnalytics:async(sql,args)=>(await db.query(sql,args)).rows}});
});
after(async()=>db.close());
test('Money uses production charges, excludes free trials and sandbox, and deduplicates webhook retries',async()=>{
 await db.exec('TRUNCATE nevi_analytics_events');
 await add('returning','app_opened',{},40*24);
 await add('returning','app_opened',{app_locale:'fr',app_build:'41'});
 await add('new','app_opened',{session_id:'session-A'});
 await add('new','subscription_purchased',{trial_eligible:true});
 const rc={environment:'PRODUCTION',revenuecat_event_id:'trial-1',period_type:'TRIAL',revenue_usd:5.99,country_code:'FR'};
 await add('new','revenuecat_initial_purchase',rc);await add('new','revenuecat_initial_purchase',rc);
 await add('returning','revenuecat_renewal',{...rc,revenuecat_event_id:'paid-1',period_type:'NORMAL',revenue_usd:5.99,is_trial_conversion:true});
 await add('returning','revenuecat_renewal',{...rc,revenuecat_event_id:'paid-1',period_type:'NORMAL',revenue_usd:5.99,is_trial_conversion:true});
 await add('sandbox','revenuecat_initial_purchase',{...rc,revenuecat_event_id:'sandbox',environment:'SANDBOX',period_type:'NORMAL',revenue_usd:999});
 await add('returning','translation_completed',{});
 await add('returning','translation_cost_recorded',{estimated_cost_usd:.12,cost_estimate_complete:true});
 await add('returning','translation_cost_recorded',{estimated_cost_usd:'not-a-number'});
 const s=await analytics.loadAnalyticsSnapshot(30);
 assert.equal(s.summary.revenueUsd,5.99);assert.equal(s.summary.trials,1);assert.equal(s.summary.charges,1);assert.equal(s.summary.trialConversions,1);
 assert.equal(s.summary.users,2);assert.equal(s.summary.sessions,1);assert.equal(s.economics.newUsers,1);assert.equal(s.economics.acquisitionCostUsd,1.5);
 assert.equal(s.economics.technicalCostUsd,.12);assert.equal(s.economics.incompleteCostEvents,1);
 assert.equal(s.customers.find(c=>c.installationId==='returning').acquisitionCostUsd,0);
 assert.equal(s.customers.find(c=>c.installationId==='returning').incompleteCostEvents,1);
 assert.match(s.customers.find(c=>c.installationId==='returning').lastSeenAt,/T/);
 assert.equal(s.countries.length,1);assert.equal(s.countries[0].code,'FR');assert.equal(s.countries[0].revenueUsd,5.99);
 assert.equal(s.daily.reduce((sum,d)=>sum+d.revenueUsd,0),5.99);assert.equal(s.previous.users,1);
 assert.equal(s.health.sandboxEvents,1);
});
test('Funnel follows chronological steps and includes all three paywall pages',async()=>{
 await db.exec('TRUNCATE nevi_analytics_events');
 for(const u of ['complete','skipped','reversed']){
  await add(u,'paywall_step_viewed',{step:1},5);await add(u,'paywall_opened',{},5);
  if(u!=='skipped')await add(u,'paywall_step_viewed',{step:2},u==='reversed'?1:4);
  await add(u,'paywall_step_viewed',{step:3},3);await add(u,'subscription_purchase_started',{},2);await add(u,'subscription_purchased',{},1);
 }
 const s=await analytics.loadAnalyticsSnapshot(7);
 assert.equal(s.funnel.introduction,3);assert.equal(s.funnel.reminder,2);assert.equal(s.funnel.offers,1);assert.equal(s.funnel.checkout,1);assert.equal(s.funnel.access,1);
});
test('Journey is isolated to an installation and period and never exposes conversation properties',async()=>{
 await db.exec('TRUNCATE nevi_analytics_events');
 await add('one','app_opened',{session_id:'s1',app_locale:'fr',transcript:'private speech',audio:'private audio'},48);
 await add('two','translation_completed',{},1);
 await add('one','screen_viewed',{session_id:'s1',screen:'paywall_intro'},.5);
 await add('one','session_heartbeat',{session_id:'s1'},.25);
 let j=await analytics.loadInstallationJourney('one',1);
 assert.equal(j.events.length,1);assert.equal(j.events[0].event,'screen_viewed');assert.equal(j.events[0].sessionId,'s1');assert.equal(j.hasMore,false);
 j=await analytics.loadInstallationJourney('one',7);assert.equal(j.events.length,2);
 assert.equal(j.events[1].properties.transcript,undefined);assert.equal(j.events[1].properties.audio,undefined);
 assert.equal((await analytics.loadInstallationJourney("one' OR true --",30)).events.length,0);
});
test('Empty database remains empty; period defaults are bounded',async()=>{
 await db.exec('TRUNCATE nevi_analytics_events');const s=await analytics.loadAnalyticsSnapshot(1);
 assert.equal(s.summary.users,0);assert.equal(s.customers.length,0);assert.equal(s.health.firstEventAt,null);assert.equal(s.funnel.introduction,0);
 for(const invalid of ['0','-1','365','NaN',undefined])assert.equal(analytics.normalizePeriod(invalid),30);
 assert.equal(analytics.normalizePeriod('7'),7);assert.equal(analytics.normalizePeriod('90'),90);
});
test('ingestion accepts existing app metadata, drops conversation data and bounds offline timestamps',()=>{
 const c=load('services/clientAnalytics.ts',{});
 const props=c.safeAnalyticsProperties({app_version:'1.0.2',step:1,trial_eligible:true,source_language:'fr',transcript:'private',audio:'secret',text:'private',event_id:'e_valid',client_time:'2026-09-18T00:00:00Z'});
 assert.equal(props.app_version,'1.0.2');assert.equal(props.transcript,undefined);assert.equal(props.audio,undefined);assert.equal(props.text,undefined);
 assert.equal(c.safeAnalyticsProperties({event_id:'bad id'}),null);assert.equal(c.safeAnalyticsProperties({duration_ms:Infinity}),null);
 assert.equal(c.clientEventTime(props,Date.parse('2026-09-19T00:00:00Z')),'2026-09-18T00:00:00.000Z');
 assert.equal(c.clientEventTime(props,Date.parse('2026-10-19T00:00:00Z')),undefined);
 assert.equal(c.clientEventTime({client_time:'2026-09-20T00:00:00Z'},Date.parse('2026-09-19T00:00:00Z')),undefined);
 assert.equal(c.CLIENT_ANALYTICS_EVENTS.has('translation_completed'),true);assert.equal(c.CLIENT_ANALYTICS_EVENTS.has('screen_left'),true);assert.equal(c.CLIENT_ANALYTICS_EVENTS.has('revenuecat_renewal'),false);
});
test('persisted event IDs are idempotent per installation and old clients still work',async()=>{
 await db.exec('TRUNCATE nevi_analytics_events');
 const store=load('services/analyticsStore.ts',{'../config/env':{config:{databaseUrl:'postgres://localhost/fixture'}},'../utils/logger':{logger:{error(){}}},pg:{Pool:class{query(sql,args){return db.query(sql,args);}}}});
 await store.recordAnalyticsEvent('app_opened','one',{event_id:'e_repeat'});
 await store.recordAnalyticsEvent('app_opened','one',{event_id:'e_repeat'});
 await store.recordAnalyticsEvent('app_opened','two',{event_id:'e_repeat'});
 await store.recordAnalyticsEvent('app_opened','one',{});await store.recordAnalyticsEvent('app_opened','one',{});
 assert.equal((await db.query('SELECT COUNT(*) AS n FROM nevi_analytics_events')).rows[0].n,4);
});
test('RevenueCat connection tests update source health without inventing users or sales',async()=>{
 await db.exec('TRUNCATE nevi_analytics_events');
 await add('test-webhook-user','revenuecat_test',{revenuecat_event_id:'test-connection',environment:'SANDBOX',revenue_usd:100});
 const s=await analytics.loadAnalyticsSnapshot(30);assert.equal(s.customers.length,0);assert.equal(s.summary.users,0);assert.equal(s.summary.revenueUsd,0);assert.equal(s.recent.length,0);assert.ok(s.health.lastWebhookAt);
});
