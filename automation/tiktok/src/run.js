import {DateTime} from 'luxon';
import {slots,slidesFor} from './content.js';
import {selectPhotos,downloadPhoto} from './photos.js';
import {renderSlide} from './render.js';
import {Publer,matchPost,confirmedPost} from './publer.js';
import {State} from './state.js';
const env=process.env;
const log=(event,details={})=>console.log(JSON.stringify({event,...details}));
async function main() {
 if(env.ENABLED!=='true') {log('disabled',{message:'No publication: ENABLED must explicitly equal true'});return;}
 for(const key of ['PUBLER_API_KEY','PUBLER_WORKSPACE_ID','PUBLER_ACCOUNT_ID','DATABASE_URL']) if(!env[key]) throw new Error(`Missing ${key}`);
 const account=env.PUBLER_ACCOUNT_ID;
 const publer=new Publer({key:env.PUBLER_API_KEY,workspace:env.PUBLER_WORKSPACE_ID,account});
 const state=new State(env.DATABASE_URL,account);
 try {
  await state.open();await publer.checkAccount();log('connected');
  const now=new Date();
  const range={from:DateTime.fromJSDate(now).minus({days:7}).toISODate(),to:DateTime.fromJSDate(now).plus({days:4}).toISODate()};
  let posts=await publer.posts(range.from,range.to);
  // Reconcile every uncertain previous write before starting any new scheduling.
  for(const row of await state.unresolved()) {
   const post=matchPost(posts,account,{at:row.scheduled_at.toISOString()});
   if(confirmedPost(post)) {await state.update(row.slot,{state:post.state.startsWith('published')?'published':'scheduled',post_id:post.id});continue;}
   if(row.job_id) await publer.job(row.job_id);
   throw new Error(`Uncertain scheduling result at ${row.slot}; inspect Publer before retrying`);
  }
  for(const row of await state.recentScheduled()) {
   const post=posts.find(p=>p.id===row.post_id);
   if(post?.state?.startsWith('published')) {await state.update(row.slot,{state:'published'});log('published',{slot:row.slot,url:post.post_link});}
   else throw new Error(`Publication not confirmed at ${row.slot}; review the Publer calendar`);
  }
  const deferred=await state.photosDeferredUntil();
  if(deferred) {log('photos_deferred',{retryAfter:deferred.toISOString()});return;}
  const plan=slots(now,{zone:env.POST_TIMEZONE??'Europe/Paris',hours:(env.POST_HOURS??'9,12,15,18,21').split(',').map(Number)});
  const used=await state.usedPhotos();
  for(const slot of plan) {
   let row=await state.get(slot);
   if(['scheduled','published','occupied'].includes(row.state)) continue;
   const existing=posts.filter(p=>p.account_id===account&&Date.parse(p.scheduled_at)===Date.parse(slot.at));
   if(existing.length) {await state.update(slot.key,{state:'occupied'});log('occupied',{slot:slot.key});continue;}
   if(!row.manifest) {
    log('selecting_photos',{slot:slot.key});
    const photos=await selectPhotos(slot.ordinal,used);
    row.manifest={slot,slides:slidesFor(slot.ordinal),photos,editorial:'Owner-selected promotional opinions; not independent tests or App Store ratings.'};
    await state.update(slot.key,{manifest:row.manifest});
    photos.forEach(p=>used.add(p.id));
   }
   const media=[...row.media];
   for(let i=media.length;i<5;i++) {
    const jpeg=await renderSlide(row.manifest.slides[i],await downloadPhoto(row.manifest.photos[i]));
    media.push(await publer.upload(jpeg,`nevi-${slot.key}-${i+1}.jpg`));
    await state.update(slot.key,{media});
    log('image_ready',{slot:slot.key,image:i+1});
   }
   // Durable write-ahead state: a crash/timeout after this point cannot resubmit the post.
   await state.update(slot.key,{state:'submitting'});
   const job=await publer.schedule(slot,media,row.manifest.photos);
   await state.update(slot.key,{job_id:job});
   let complete=false;
   for(let attempt=0;attempt<15;attempt++) {
    if(await publer.job(job)==='complete') {complete=true;break;}
    await new Promise(resolve=>setTimeout(resolve,2000));
   }
   if(!complete) throw new Error(`Scheduling job still running for ${slot.key}; next run will reconcile it`);
   posts=await publer.posts(range.from,range.to);
   const post=matchPost(posts,account,slot);
   if(!confirmedPost(post)) throw new Error(`Scheduling not confirmed in Publer calendar for ${slot.key}`);
   await state.update(slot.key,{state:'scheduled',post_id:post.id});
   log('scheduled',{slot:slot.key,local:slot.local,postId:post.id,apps:row.manifest.slides.filter(s=>s.name).map(s=>s.name)});
  }
  log('complete',{upcomingSlots:plan.length});
 } catch(error) {
  if(error.retryAt&&/(^|\.)wikimedia\.org$/.test(error.sourceHost??'')) await state.deferPhotos(error.retryAt);
  throw error;
 } finally {await state.close().catch(()=>{});}
}
main().catch(error=>{console.error(JSON.stringify({event:'failed',message:error.message.replace(/(?:postgres(?:ql)?:\/\/|Bearer-API )\S+/g,'[redacted]')}));process.exitCode=1;});
