import {json} from './http.js';
import {CAPTION,postPayload} from './content.js';
export class Publer {
 constructor({key,workspace,account,fetchJSON=json}) {this.key=key;this.workspace=workspace;this.account=account;this.fetchJSON=fetchJSON;}
 async request(path,options={}) {
  return this.fetchJSON(`https://app.publer.com/api/v1${path}`,{...options,headers:{Authorization:`Bearer-API ${this.key}`,'Publer-Workspace-Id':this.workspace,...options.headers}});
 }
 async checkAccount() {
  const data=await this.request('/accounts');
  const accounts=Array.isArray(data)?data:data.accounts;
  if(!Array.isArray(accounts)) throw new Error('Unexpected Publer accounts response');
  const account=accounts.find(a=>a.id===this.account);
  if(!account||account.provider!=='tiktok') throw new Error('Configured account is not a connected TikTok account');
  return account;
 }
 async posts(from,to) {
  const all=[];
  for(let page=0;page<100;page++) {
   const params=new URLSearchParams({state:'all',from,to,page:String(page),'account_ids[]':this.account});
   const data=await this.request('/posts?'+params);
   if(!Array.isArray(data.posts)) throw new Error('Unexpected Publer posts response');
   all.push(...data.posts);
   if(data.posts.length===0 || (typeof data.total==='number'&&all.length>=data.total) || (typeof data.total_pages==='number'&&page+1>=data.total_pages)) return all;
  }
  throw new Error('Publer post pagination exceeded its safe limit');
 }
 async upload(buffer,name) {
  const form=new FormData();form.append('file',new Blob([buffer],{type:'image/jpeg'}),name);form.append('direct_upload','true');form.append('in_library','true');
  const media=await this.request('/media',{method:'POST',body:form});
  if(!media.id||!media.path||media.validity?.tiktok===false) throw new Error('Publer rejected a TikTok image');
  return {id:media.id,path:media.path};
 }
 async schedule(slot,media,photos) {
  // Deliberately no automatic POST retries: the request may have succeeded remotely.
  const result=await this.request('/posts/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(postPayload(this.account,slot,media,photos))});
  if(!result.job_id) throw new Error('No scheduling job ID returned; inspect Publer before retrying');
  return result.job_id;
 }
 async job(id) {
  const result=await this.request('/job_status/'+encodeURIComponent(id));
  const data=result.data??result;
  if(!data) throw new Error('Unexpected Publer job response');
  const status=data.result?.status??data.status;
  const failures=data.result?.payload?.failures??data.payload?.failures;
  if(status==='failed'||(failures&&Object.keys(failures).length)) throw new Error('Publer scheduling job failed; review it before retrying');
  if(!['working','complete','completed'].includes(status)) throw new Error('Unknown Publer job status');
  return status==='completed'?'complete':status;
 }
}
export function matchPost(posts,account,slot) {
 const matches=posts.filter(p=>p.account_id===account&&p.type==='photo'&&(p.text===CAPTION||(typeof p.text==='string'&&p.text.startsWith(CAPTION+"\n\nPhotos recadrées, texte ajouté :\n")))&&Date.parse(p.scheduled_at)===Date.parse(slot.at));
 if(matches.length>1) throw new Error('Duplicate posts found at the same slot; manual review needed');
 return matches[0];
}
export function confirmedPost(post) {
 return Boolean(post?.id) && ['scheduled','scheduled_approved','published','published_posted'].includes(post.state);
}
