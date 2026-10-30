import axios from 'axios';
import { config } from '../config/env';
import { queryAnalytics } from './analyticsStore';
import { appleAdsAttributes, ensureReports, reportWindow } from './appleAdsKeywords';
let running = false;
/** Enrich existing production transactions, never invent transactions or installation dates. */
export async function recoverAppleAdsHistory(start: unknown,end: unknown) {
  const window=reportWindow(start,end);
  if(running)throw new Error('Une récupération est déjà en cours.');
  const project=process.env.REVENUECAT_PROJECT_ID?.trim() || 'eb8f26ff';
  const key=process.env.REVENUECAT_ATTRIBUTION_API_KEY?.trim() || config.revenueCat.apiKey;
  if(!key)throw new Error('Configurez une clé RevenueCat API v2 avec la permission customer_information:customers:read.');
  if(!/^[a-zA-Z0-9_-]{1,100}$/.test(project))throw new Error('Configurez REVENUECAT_PROJECT_ID avec un identifiant de projet valide.');
  running=true;
  try {
    await ensureReports();
    const candidates=await queryAnalytics<{installation_id:string}>(`SELECT DISTINCT e.installation_id FROM nevi_analytics_events e
      LEFT JOIN nevi_apple_ads_attribution a USING(installation_id)
      WHERE e.event_name IN ('revenuecat_initial_purchase','revenuecat_renewal','revenuecat_non_renewing_purchase') AND e.properties->>'environment'='PRODUCTION'
      AND e.occurred_at>=($1::date::timestamp AT TIME ZONE 'UTC') AND e.occurred_at<(($2::date+INTERVAL '1 day') AT TIME ZONE 'UTC')
      AND (a.checked_at IS NULL OR a.checked_at<NOW()-INTERVAL '1 day') ORDER BY e.installation_id LIMIT 6`,[window.start,window.end]);
    let recovered=0,missing=0;
    // Sequential and bounded: first auth/rate-limit failure stops the batch.
    for(const c of candidates.slice(0,5)){
      let response;
      try {response=await axios.get(`https://api.revenuecat.com/v2/projects/${encodeURIComponent(project)}/customers/${encodeURIComponent(c.installation_id)}/attributes`,{headers:{Authorization:`Bearer ${key}`,Accept:'application/json'},params:{limit:100},timeout:4000});}
      catch(error){const status=axios.isAxiosError(error)?error.response?.status:undefined;
        if(status===401||status===403)throw new Error('RevenueCat refuse cette clé : utilisez une clé API v2 autorisée à lire les clients (REVENUECAT_ATTRIBUTION_API_KEY).');
        if(status===429)throw new Error('Limite RevenueCat atteinte. Réessayez plus tard ; les clients déjà récupérés sont conservés.');
        throw new Error('Récupération RevenueCat interrompue. Vérifiez le projet et réessayez ; les clients déjà récupérés sont conservés.');
      }
      if(!Array.isArray(response.data?.items)||response.data.next_page)throw new Error('Réponse RevenueCat incomplète. Aucun attribut de ce client n’a été enregistré.');
      const attributes:Record<string,{value:unknown}>={};
      for(const item of response.data.items)if(typeof item?.name==='string')attributes[item.name]={value:item.value};
      const safe=appleAdsAttributes(attributes);
      await queryAnalytics(`INSERT INTO nevi_apple_ads_attribution(installation_id,properties) VALUES($1,$2::jsonb) ON CONFLICT(installation_id) DO UPDATE SET properties=EXCLUDED.properties,checked_at=NOW()`,[c.installation_id,JSON.stringify(safe)]);
      if(safe.ads_media_source)recovered++;else missing++;
    }
    return {checked:Math.min(5,candidates.length),recovered,missing,hasMore:candidates.length>5};
  } finally {running=false;}
}
