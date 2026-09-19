// Local visual QA only. Never imported by the production server.
const http=require('node:http'),fs=require('node:fs'),ts=require('typescript');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {PGlite}=require(process.env.NEVI_PGLITE_MODULE||'@electric-sql/pglite');
(async()=>{
 const db=new PGlite();await db.exec('CREATE TABLE nevi_analytics_events(id BIGSERIAL PRIMARY KEY,installation_id TEXT,event_name TEXT,properties JSONB,occurred_at TIMESTAMPTZ)');
 const storePath=require.resolve('../src/services/analyticsStore.ts'),envPath=require.resolve('../src/config/env.ts');
 require.cache[storePath]={id:storePath,filename:storePath,loaded:true,exports:{queryAnalytics:async(sql,args)=>(await db.query(sql,args)).rows,analyticsStoreConfigured:()=>true}};
 require.cache[envPath]={id:envPath,filename:envPath,loaded:true,exports:{config:{unitEconomics:{storeNetRevenueShare:.7,defaultAcquisitionCostUsd:1.5},analyticsDashboard:{revenueCatWebhookAuthorization:'fixture'}}}};
 const {loadAnalyticsSnapshot,loadInstallationJourney,normalizePeriod}=require('../src/services/analyticsDashboard.ts');
 const {analyticsDashboardPage}=require('../src/admin/analyticsDashboardPage.ts');
 const locales=['fr','en','de','es','ja'];const countries=['FR','US','DE','ES','JP'];
 const add=async(id,event,props,seconds)=>db.query('INSERT INTO nevi_analytics_events(installation_id,event_name,properties,occurred_at) VALUES($1,$2,$3::jsonb,NOW()-($4::int*interval \'1 second\'))',[id,event,JSON.stringify(props),seconds]);
 for(let i=0;i<24;i++){
  const id='demo_installation_'+String(i+1).padStart(4,'0'),age=i<3?120+i*15:(i+1)*86400;
  const p={app_locale:locales[i%5],app_build:i%2?'41':'future',...(i%2?{}:{session_id:'demo_session_'+i})};
  await add(id,'app_opened',p,age+30);await add(id,'paywall_step_viewed',{...p,step:1},age+29);
  if(i%4!==0)await add(id,'paywall_step_viewed',{...p,step:2},age+28);
  if(i%3!==0)await add(id,'paywall_step_viewed',{...p,step:3},age+27);
  if(i%2===0){await add(id,'subscription_purchase_started',{...p,plan:'weekly'},age+26);await add(id,'subscription_purchased',{...p,plan:'weekly'},age+25);
   await add(id,'revenuecat_initial_purchase',{environment:'PRODUCTION',period_type:'TRIAL',country_code:countries[i%5],revenuecat_event_id:'trial-'+i,revenue_usd:0},age+24);
   if(i>3)await add(id,'revenuecat_renewal',{environment:'PRODUCTION',period_type:'NORMAL',country_code:countries[i%5],revenuecat_event_id:'paid-'+i,revenue_usd:5.99,is_trial_conversion:true},age-86400);
  }
  for(let j=0;j<i%5;j++){
   await add(id,'translation_recording_started',{...p,source_language:'fr',target_language:'en',speaker_side:'bottom'},age+20-j*4);
   await add(id,'translation_completed',{...p,source_language:'fr',target_language:'en'},age+18-j*4);
   await add(id,'translation_cost_recorded',{estimated_cost_usd:.027,cost_estimate_complete:true},age+17-j*4);
  }
  if(i%7===0)await add(id,'translation_failed',{...p,failure_stage:'timeout'},age+10);
 }
 const empty={...(await loadAnalyticsSnapshot(1))};
 const server=http.createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
   if(url.pathname.startsWith('/api/')){
    if(req.headers['x-nevi-dashboard-token']!=='demo-local'){res.writeHead(401);res.end('{}');return;}
    const period=normalizePeriod(url.searchParams.get('period'));
    const result=url.pathname.endsWith('/journey')?await loadInstallationJourney(url.searchParams.get('installation'),period):await loadAnalyticsSnapshot(period);
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
   }
   res.setHeader('Content-Type','text/html; charset=utf-8');res.end(analyticsDashboardPage().replace('<body>','<body><div style="position:fixed;bottom:0;right:0;z-index:200;background:#fff3cd;color:#694a00;padding:3px 10px;font:11px system-ui;pointer-events:none">Données de démonstration · aperçu local · code : demo-local</div>'));
  }catch(error){console.error(error);res.writeHead(500);res.end('Preview error');}
 });server.listen(4187,'127.0.0.1',()=>console.log('Local preview: http://127.0.0.1:4187 · synthetic data only'));
})();
