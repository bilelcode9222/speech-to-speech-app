const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function fetchChecked(url,options={}) {
 const readOnly=!options.method||options.method==='GET';
 for(let attempt=0;attempt<3;attempt++) {
  const response=await fetch(url,{...options,signal:options.signal??AbortSignal.timeout(90000)});
  if(response.ok) return response;
  // Respect rate limits for reads only. Never retry a potentially accepted write.
  const retry=response.headers.get('retry-after');
  const seconds=retry ? (/^\d+$/.test(retry)?Number(retry):Math.ceil((Date.parse(retry)-Date.now())/1000)) : 5*(attempt+1);
  if(readOnly&&attempt<2&&[429,502,503,504].includes(response.status)&&Number.isFinite(seconds)&&seconds>=0&&seconds<=30) {
   await response.body?.cancel();await delay(Math.max(1000,seconds*1000));continue;
  }
  const error=new Error(`HTTP ${response.status} from ${new URL(url).hostname}; no write was retried`);
  error.status=response.status;error.sourceHost=new URL(url).hostname;
  if([429,503].includes(response.status)) error.retryAt=new Date(Date.now()+Math.max(5000,Number.isFinite(seconds)?seconds*1000:300000));
  throw error;
 }
}
export async function json(url,options={}) { return (await fetchChecked(url,options)).json(); }
