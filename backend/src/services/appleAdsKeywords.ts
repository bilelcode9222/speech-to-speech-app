import { queryAnalytics } from './analyticsStore';

type Row = Record<string, any>;
export type KeywordReportRow = {
  campaign_id: string; ad_group_id: string; keyword_id: string; keyword: string;
  campaign: string; ad_group: string; installs: number; taps: number; spend: number; currency: string;
};
const attributeKeys: Record<string, string> = {
  '$mediaSource': 'ads_media_source', '$campaign': 'ads_campaign', '$adGroup': 'ads_ad_group', '$keyword': 'ads_keyword',
  '$appleAdsCampaignId': 'ads_campaign_id', '$appleAdsAdGroupId': 'ads_ad_group_id', '$appleAdsKeywordId': 'ads_keyword_id',
};
// Never copy arbitrary subscriber attributes (email, name, phone, etc.).
export function appleAdsAttributes(attributes: unknown): Record<string, string> {
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes)) return {};
  const output: Record<string, string> = {};
  for (const [source, target] of Object.entries(attributeKeys)) {
    const entry = (attributes as Row)[source];
    const value = entry && typeof entry === 'object' ? entry.value : undefined;
    if ((typeof value === 'string' || typeof value === 'number') && String(value).trim().length <= 200) {
      output[target] = String(value).trim();
    }
  }
  const apple = /^(apple ads|apple search ads|apple_search_ads|apple_searchads)$/i.test(output.ads_media_source || '');
  const appleId = ['ads_campaign_id','ads_ad_group_id','ads_keyword_id'].some(k => /^\d+$/.test(output[k] || ''));
  if (!apple && !appleId) return {};
  output.ads_media_source = 'Apple Ads';
  return output;
}
export function reportWindow(start: unknown, end: unknown) {
  const valid = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
  if (!valid(start) || !valid(end) || start > end || Date.parse(end)-Date.parse(start)>89*86400000 || end>new Date().toISOString().slice(0,10)) throw new Error('Choisissez une période valide de 1 à 90 jours, sans date future.');
  return {start, end};
}
function csvRecords(csv: string): string[][] {
  const delimiter=csv.split(/\r?\n/,1)[0].includes(';')?';':',';
  const rows: string[][] = []; let row: string[] = [], value = '', quoted = false;
  for (let i=0;i<csv.length;i++) {
    const c=csv[i];
    if(c==='"') {if(quoted && csv[i+1]==='"'){value+='"';i++;}else if(quoted || value==='')quoted=!quoted;else throw new Error('CSV invalide.');}
    else if(c===delimiter&&!quoted){row.push(value);value='';}
    else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&csv[i+1]==='\n')i++;row.push(value);if(row.some(v=>v.trim()))rows.push(row);row=[];value='';}
    else value+=c;
  }
  if(quoted)throw new Error('CSV invalide : guillemet non fermé.');
  row.push(value);if(row.some(v=>v.trim()))rows.push(row);return rows;
}
export function parseKeywordReport(csv: unknown): KeywordReportRow[] {
  if(typeof csv!=='string'||csv.length>1_000_000)throw new Error('CSV absent ou trop volumineux (1 Mo maximum).');
  const records=csvRecords(csv.replace(/^\uFEFF/,''));
  const headers=records.shift()?.map(v=>v.trim().toLowerCase())||[];
  const required=['campaign_id','ad_group_id','keyword_id','keyword','installs','taps','spend','currency'];
  if(new Set(headers).size!==headers.length||required.some(k=>!headers.includes(k)))throw new Error('Utilisez les colonnes du modèle CSV.');
  if(!records.length||records.length>2000)throw new Error('Importez entre 1 et 2 000 lignes.');
  const keys=new Set<string>();let reportCurrency:string|undefined;
  return records.map((values,index)=>{
    if(values.length!==headers.length)throw new Error(`Ligne ${index+2} : nombre de colonnes invalide.`);
    const row=Object.fromEntries(headers.map((h,i)=>[h,values[i].trim()]));
    for(const k of ['campaign_id','ad_group_id','keyword_id'])if(!/^\d{1,30}$/.test(row[k]))throw new Error(`Ligne ${index+2} : identifiant Apple Ads invalide.`);
    for(const k of ['installs','taps','spend'])if(!/^\d+(\.\d+)?$/.test(row[k])||!Number.isFinite(Number(row[k]))||Number(row[k])>1e12||(k!=='spend'&&!Number.isSafeInteger(Number(row[k]))))throw new Error(`Ligne ${index+2} : nombre ${k} invalide (point décimal).`);
    if(!row.keyword||row.keyword.length>200||!['EUR','USD','GBP','CAD','AUD','JPY','CHF','CNY','KRW','NZD','MXN','SEK','NOK','DKK','INR','BRL','PLN'].includes(row.currency))throw new Error(`Ligne ${index+2} : mot-clé ou devise invalide.`);
    if(reportCurrency && reportCurrency!==row.currency)throw new Error('Utilisez une seule devise par rapport.');reportCurrency=row.currency;
    const key=[row.campaign_id,row.ad_group_id,row.keyword_id].join(':');
    if(keys.has(key))throw new Error('Une seule ligne par campagne, groupe et mot-clé : agrégez les pays avant import.');keys.add(key);
    return {campaign_id:row.campaign_id,ad_group_id:row.ad_group_id,keyword_id:row.keyword_id,keyword:row.keyword,campaign:(row.campaign||'').slice(0,200),ad_group:(row.ad_group||'').slice(0,200),installs:Number(row.installs),taps:Number(row.taps),spend:Number(row.spend),currency:row.currency};
  });
}
export type CampaignReportRow = {campaign_id:string;campaign:string;installs:number;taps:number;spend:number;currency:string};
/** Apple exports include a metadata preamble and a grand total. */
export function parseAppleAdsReport(csv: unknown) {
  if(typeof csv!=='string'||csv.length>1_000_000)throw new Error('CSV absent ou trop volumineux (1 Mo maximum).');
  const records=csvRecords(csv.replace(/^\uFEFF/,''));
  const canonical=(s:string)=>s.trim().toLowerCase().replace(/[^a-z0-9]/g,'');
  const headerIndex=records.findIndex(row=>row.some(v=>canonical(v)==='campaignid')&&row.some(v=>canonical(v)==='spend'));
  if(headerIndex<0 || records[headerIndex].some(v=>v.trim()==='campaign_id'))return {scope:'keyword' as const,rows:parseKeywordReport(csv),start:null,end:null,timeZone:null};
  const headers=records[headerIndex].map(canonical);
  if(new Set(headers).size!==headers.length)throw new Error('CSV : colonnes dupliquées.');
  const metadata=records.slice(0,headerIndex).map(r=>r.join(',')).join('\n');
  const meta=(name:string)=>metadata.split('\n').find(v=>v.toLowerCase().startsWith(name.toLowerCase()+':'))?.slice(name.length+1).trim();
  const iso=(value:string|undefined)=>{const n=value?Date.parse(value+' UTC'):NaN;return Number.isFinite(n)?new Date(n).toISOString().slice(0,10):null;};
  const currency=meta('Currency')||'';
  const start=iso(meta('Start Date')),end=iso(meta('End Date')),timeZone=meta('Time Zone');
  if(!start||!end||timeZone!=='UTC')throw new Error('CSV : exportez le rapport Apple Ads avec ses dates et le fuseau UTC.');
  const keyword=headers.includes('keywordid');
  const scope=keyword?'keyword' as const:'campaign' as const;
  const required=['campaignid','campaignname','spend','taps'];
  if(!headers.includes('installstotal')&&!headers.includes('installs'))throw new Error('CSV : colonne Installs (Total) manquante.');
  if(required.some(k=>!headers.includes(k))||(keyword&&['adgroupid','keyword'].some(k=>!headers.includes(k))))throw new Error('CSV : colonnes Apple Ads manquantes (identifiants, noms ou dépenses).');
  const data=records.slice(headerIndex+1).filter(row=>row.some(v=>v.trim()));
  const rows:CampaignReportRow[]=[];const keywordRows:KeywordReportRow[]=[];const ids=new Set<string>();
  const encode=(v:unknown)=>'"'+String(v??'').replace(/"/g,'""')+'"';
  for(const values of data){
    if(values.length!==headers.length)throw new Error('CSV : nombre de colonnes invalide dans le rapport Apple Ads.');
    const r=Object.fromEntries(headers.map((h,i)=>[h,values[i].trim()]));
    if(!r.campaignid&&!r.keywordid&&!r.adgroupid)continue;
    const installs=r.installstotal??r.installs;
    if(keyword){
      const h=['campaign_id','ad_group_id','keyword_id','keyword','installs','taps','spend','currency','campaign','ad_group'];
      const v=[r.campaignid,r.adgroupid,r.keywordid,r.keyword,installs,r.taps,r.spend,currency,r.campaignname,r.adgroupname||''];
      keywordRows.push(...parseKeywordReport(h.join(',')+'\n'+v.map(encode).join(',')));
    }else{
      // Reuse strict numeric/currency validation without storing a fictional keyword.
      parseKeywordReport('campaign_id,ad_group_id,keyword_id,keyword,installs,taps,spend,currency\n'+[r.campaignid,'0','0','validation',installs,r.taps,r.spend,currency].map(encode).join(','));
      rows.push({campaign_id:r.campaignid,campaign:r.campaignname.slice(0,200),installs:Number(installs),taps:Number(r.taps),spend:Number(r.spend),currency});
    }
    const id=keyword?[r.campaignid,r.adgroupid,r.keywordid].join(':'):r.campaignid;
    if(ids.has(id))throw new Error('CSV : plusieurs lignes pour le même identifiant ; exportez les totaux de la période, tous pays agrégés.');ids.add(id);
  }
  if(!ids.size||ids.size>2000)throw new Error('Importez entre 1 et 2 000 lignes.');
  return scope==='keyword'?{scope,rows:keywordRows,start,end,timeZone}:{scope,rows,start,end,timeZone};
}

export async function ensureReports() {
  await queryAnalytics(`CREATE TABLE IF NOT EXISTS nevi_apple_ads_attribution (installation_id TEXT PRIMARY KEY,properties JSONB NOT NULL DEFAULT '{}'::jsonb,checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,[]);
  await queryAnalytics(`CREATE TABLE IF NOT EXISTS nevi_apple_ads_campaign_reports (start_date DATE NOT NULL,end_date DATE NOT NULL,rows JSONB NOT NULL,imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(start_date,end_date))`,[]);
  await queryAnalytics(`CREATE TABLE IF NOT EXISTS nevi_apple_ads_reports (start_date DATE NOT NULL,end_date DATE NOT NULL,rows JSONB NOT NULL,imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),PRIMARY KEY(start_date,end_date))`,[]);
}
export async function saveKeywordReport(start: unknown,end: unknown,csv: unknown) {
  const window=reportWindow(start,end),report=parseAppleAdsReport(csv);
  if(report.start&&(report.start!==window.start||report.end!==window.end))throw new Error(`CSV : ce rapport couvre le ${report.start} au ${report.end}. Sélectionnez ces mêmes dates dans Pulse.`);
  await ensureReports();
  const table=report.scope==='campaign'?'nevi_apple_ads_campaign_reports':'nevi_apple_ads_reports';
  await queryAnalytics(`INSERT INTO ${table} (start_date,end_date,rows) VALUES ($1,$2,$3::jsonb) ON CONFLICT(start_date,end_date) DO UPDATE SET rows=EXCLUDED.rows,imported_at=NOW()`,[window.start,window.end,JSON.stringify(report.rows)]);
  return {rows:report.rows.length,scope:report.scope,...window};
}
const keyOf=(r:Row) => r.campaign_id && r.ad_group_id && r.keyword_id ? `id:${r.campaign_id}:${r.ad_group_id}:${r.keyword_id}` : JSON.stringify(['name',r.campaign||'',r.ad_group||'',r.keyword||'']);
export async function loadKeywordPerformance(start: unknown,end: unknown) {
  const window=reportWindow(start,end);await ensureReports();
  const [events,reports,campaignReports]=await Promise.all([
    queryAnalytics<Row>(`WITH dedup AS (
      SELECT DISTINCT ON(properties->>'revenuecat_event_id') * FROM nevi_analytics_events
      WHERE event_name LIKE 'revenuecat_%' AND properties->>'environment'='PRODUCTION' AND NULLIF(properties->>'revenuecat_event_id','') IS NOT NULL
      ORDER BY properties->>'revenuecat_event_id',id
    ), attribution AS (
      SELECT DISTINCT ON(installation_id) installation_id,properties AS ads FROM (
        SELECT installation_id,properties,occurred_at,id FROM dedup WHERE properties->>'ads_media_source'='Apple Ads'
        UNION ALL SELECT installation_id,properties,checked_at AS occurred_at,0 AS id FROM nevi_apple_ads_attribution WHERE properties->>'ads_media_source'='Apple Ads'
      ) sources ORDER BY installation_id,occurred_at DESC,id DESC
    ) SELECT d.installation_id,d.event_name,d.properties,a.ads FROM dedup d LEFT JOIN attribution a USING(installation_id)
      WHERE d.occurred_at>=($1::date::timestamp AT TIME ZONE 'UTC') AND d.occurred_at<(($2::date+INTERVAL '1 day') AT TIME ZONE 'UTC')
      AND d.event_name IN ('revenuecat_initial_purchase','revenuecat_renewal','revenuecat_non_renewing_purchase')`,[window.start,window.end]),
    queryAnalytics<Row>('SELECT rows,imported_at FROM nevi_apple_ads_reports WHERE start_date=$1 AND end_date=$2',[window.start,window.end]),
    queryAnalytics<Row>('SELECT rows,imported_at FROM nevi_apple_ads_campaign_reports WHERE start_date=$1 AND end_date=$2',[window.start,window.end]),
  ]);
  const grouped=new Map<string,any>();const unattributed=new Set<string>(),attributed=new Set<string>();
  const create=(r:Row): {campaignId:string|null;adGroupId:string|null;keywordId:string|null;keyword:string;campaign:string;adGroup:string;trialIds:Set<string>;paidIds:Set<string>;revenueUsd:number;report:KeywordReportRow|null}=>({campaignId:r.campaign_id||null,adGroupId:r.ad_group_id||null,keywordId:r.keyword_id||null,keyword:r.keyword||'Mot-clé non communiqué (Search Match possible)',campaign:r.campaign||'Campagne non communiquée',adGroup:r.ad_group||'Groupe non communiqué',trialIds:new Set<string>(),paidIds:new Set<string>(),revenueUsd:0,report:null});
  for(const r of (reports[0]?.rows||[]) as KeywordReportRow[]){const key=keyOf(r);const item=create(r);item.report=r;grouped.set(key,item);}
  for(const e of events){
    const trial=e.event_name==='revenuecat_initial_purchase'&&e.properties.period_type==='TRIAL';
    if(!e.ads){if(trial)unattributed.add(e.installation_id);continue;}
    if(trial)attributed.add(e.installation_id);
    const a=e.ads,r={campaign_id:a.ads_campaign_id,ad_group_id:a.ads_ad_group_id,keyword_id:a.ads_keyword_id,keyword:a.ads_keyword,campaign:a.ads_campaign,ad_group:a.ads_ad_group};
    const key=keyOf(r);if(!grouped.has(key))grouped.set(key,create(r));const item=grouped.get(key);
    if(trial)item.trialIds.add(e.installation_id);
    else {const amount=Number(e.properties.revenue_usd);if(Number.isFinite(amount)&&amount>0){item.paidIds.add(e.installation_id);item.revenueUsd+=amount;}}
  }
  const campaignRows=((campaignReports[0]?.rows||[]) as CampaignReportRow[]).map(r=>{
    const trials=new Set<string>(),paid=new Set<string>();
    for(const e of events){if(e.ads?.ads_campaign_id!==r.campaign_id)continue;
      if(e.event_name==='revenuecat_initial_purchase'&&e.properties.period_type==='TRIAL')trials.add(e.installation_id);
      else if(Number(e.properties.revenue_usd)>0)paid.add(e.installation_id);
    }
    return {...r,trials:trials.size,payingUsers:paid.size,trialRate:r.installs>0?trials.size/r.installs:null,costPerTrial:trials.size?r.spend/trials.size:null};
  });
  return {...window,campaignImportedAt:campaignReports[0]?.imported_at||null,campaignRows,importedAt:reports[0]?.imported_at||null,attributedTrials:attributed.size,unattributedTrials:unattributed.size,
    rows:[...grouped.values()].map(r=>({campaignId:r.campaignId,adGroupId:r.adGroupId,keywordId:r.keywordId,keyword:r.keyword,campaign:r.campaign,adGroup:r.adGroup,trials:r.trialIds.size,payingUsers:r.paidIds.size,revenueUsd:r.revenueUsd,
      installs:r.report?.installs??null,taps:r.report?.taps??null,spend:r.report?.spend??null,currency:r.report?.currency??null,
      trialRate:r.report?.installs>0?r.trialIds.size/r.report.installs:null,costPerTrial:r.report&&r.trialIds.size?r.report.spend/r.trialIds.size:null,
      sampleLow:!r.report||r.report.installs<10,
    })).sort((a,b)=>b.trials-a.trials)};
}
