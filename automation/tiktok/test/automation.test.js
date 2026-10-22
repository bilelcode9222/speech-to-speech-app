import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DateTime} from 'luxon';
import {slots,slidesFor,appsFor,APPS,CAPTION,postPayload,photoCaption} from '../src/content.js';
import {eligible} from '../src/photos.js';
import {Publer,matchPost,confirmedPost} from '../src/publer.js';
import {spawnSync} from 'node:child_process';

test('Paris has five fixed slots across the autumn DST change',()=>{
 const result=slots(new Date('2026-10-24T00:00:00Z'),{days:3});
 for(const date of ['2026-10-24','2026-10-25','2026-10-26']) {
  const day=result.filter(s=>s.key.startsWith(date));
  assert.equal(day.length,5);
  assert.deepEqual(day.map(s=>DateTime.fromISO(s.at).setZone('Europe/Paris').hour),[9,12,15,18,21]);
 }
 assert.equal(result.find(s=>s.key==='2026-10-24-09').at,'2026-10-24T07:00:00.000Z');
 assert.equal(result.find(s=>s.key==='2026-10-25-09').at,'2026-10-25T08:00:00.000Z');
});
test('Paris keeps five slots across spring DST; no catch-up burst',()=>{
 const result=slots(new Date('2027-03-27T00:00:00Z'),{days:3});
 assert.equal(result.filter(s=>s.key.startsWith('2027-03-28')).length,5);
 assert.equal(result.find(s=>s.key==='2027-03-28-09').at,'2027-03-28T07:00:00.000Z');
 assert.ok(slots(new Date('2026-10-22T19:00:00Z')).every(s=>Date.parse(s.at)>Date.parse('2026-10-22T19:20:00Z')));
 assert.throws(()=>slots(new Date(),{hours:[9,9,12,15,18]}));
});
test('Only verified translators rotate; consecutive posts change both middle apps',()=>{
 const approved=new Set([1552407475,1514844618,1018949559,288113403,919979642,1147874819,584291439]);
 assert.ok(APPS.every(a=>approved.has(a.storeId)));
 for(let i=0;i<100;i++) {
  const a=appsFor(i),next=appsFor(i+1);
  assert.notEqual(a[0].key,a[1].key);
  assert.ok(a.every(x=>next.every(y=>x.key!==y.key)));
  const slides=slidesFor(i);
  assert.equal(slides[1].name,'Google Traduction');assert.equal(slides[4].name,'Nevi');
  assert.equal(slides[0].lines[1],'de traduction 🌍');
  assert.ok(!JSON.stringify(slides).includes('pour voyager'));
 }
});
const photo=(license='CC BY 4.0',changes={})=>({pageid:12,title:'File:Big Ben 2024.jpg',imageinfo:[{url:'https://upload.wikimedia.org/test.jpg',thumburl:'https://thumb.wikimedia.org/wikipedia/commons/thumb/test/test.jpg/1920px-test.jpg',descriptionurl:'https://commons.wikimedia.org/?curid=12',width:2400,height:3200,mime:'image/jpeg',extmetadata:{LicenseShortName:{value:license},Artist:{value:'Jane Photographer'},DateTimeOriginal:{value:'2024-04-12'},LicenseUrl:{value:'https://creativecommons.org/licenses/by/4.0/'}},...changes}]});
test('Reject NC, ND, SA, unknown licenses, historical and low-res photos',()=>{
 for(const l of ['CC BY-NC 4.0','CC BY-ND 4.0','CC BY-SA 4.0','All rights reserved','']) assert.equal(eligible(photo(l)),null);
 assert.equal(eligible(photo('CC0',{width:500})),null);
 const old=photo('Public domain');old.imageinfo[0].extmetadata.DateTimeOriginal.value='1888';assert.equal(eligible(old),null);
 assert.ok(eligible(photo('CC0')));assert.ok(eligible(photo()));
});
test('Attribution survives caption generation and public promotional carousel has no reminder',()=>{
 const credit=eligible(photo()),slot={at:'2026-10-30T08:00:00Z'};
 const media=Array.from({length:5},(_,i)=>({id:String(i),path:'https://media.example/'+i}));
 const body=postPayload('acct',slot,media,[credit]);
 const tik=body.bulk.posts[0].networks.tiktok;
 assert.ok(tik.text.includes('Jane Photographer'));assert.ok(tik.text.includes('CC BY 4.0'));
 assert.ok(tik.text.includes('commons.wikimedia.org'));assert.equal(tik.details.promotional,true);assert.equal(tik.details.reminder,false);
 assert.equal(tik.details.auto_add_music,false);assert.equal(tik.media.length,5);assert.equal(tik.title,'Je note les apps de traduction 🌍');
 assert.throws(()=>postPayload('acct',slot,media.slice(1)));
 assert.throws(()=>postPayload('acct',slot,media,Array(100).fill(credit)));
});
test('Ambiguous POST timeout is not retried',async()=>{
 let calls=0;
 const api=new Publer({account:'acct',fetchJSON:async()=>{calls++;throw new Error('timeout');}});
 await assert.rejects(api.schedule({at:'2026-11-01T08:00:00Z'},Array.from({length:5},(_,i)=>({id:String(i),path:'x'}))));
 assert.equal(calls,1);
});
test('Remote job failures and partial failures cannot be reported as success',async()=>{
 for(const result of [ {data:{status:'failed'}},{data:{status:'complete',result:{payload:{failures:{one:'invalid'}}}}},{data:{status:'other'}}]) {
  const api=new Publer({fetchJSON:async()=>result});await assert.rejects(api.job('id'));
 }
});
test('Post matching is account + timestamp + content; pending approval is not confirmation',()=>{
 const slot={at:'2026-10-30T08:00:00Z'};
 const post={id:'p',account_id:'acct',type:'photo',text:photoCaption([eligible(photo())]),scheduled_at:slot.at,state:'scheduled_pending'};
 assert.equal(matchPost([post],'acct',slot),post);assert.equal(matchPost([post],'other',slot),undefined);
 assert.equal(confirmedPost(post),false);
 assert.throws(()=>matchPost([post,post],'acct',slot));assert.equal(confirmedPost({...post,state:'scheduled_approved'}),true);
});
test('Disabled production command exits before credentials, database or network are touched',()=>{
 const result=spawnSync(process.execPath,['src/run.js'],{cwd:new URL('..',import.meta.url),env:{PATH:process.env.PATH,ENABLED:'false'},encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);assert.ok(result.stdout.includes('"event":"disabled"'));
});

test('Long source rate-limit cooldown is respected without repeated requests',async()=>{
 const {fetchChecked}=await import('../src/http.js');
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'120'}});};
  await assert.rejects(fetchChecked('https://upload.wikimedia.org/test.jpg'),/HTTP 429/);
  assert.equal(calls,1);
 } finally {globalThis.fetch=original;}
});
test('HTTP layer never retries a write even when server asks to retry',async()=>{
 const {fetchChecked}=await import('../src/http.js');
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async()=>{calls++;return new Response('',{status:503,headers:{'Retry-After':'0'}});};
  await assert.rejects(fetchChecked('https://app.publer.com/api/v1/posts/schedule',{method:'POST'}));
  assert.equal(calls,1);
 } finally {globalThis.fetch=original;}
});

test('Object closeups and interiors are excluded even when tagged as monuments',()=>{
 for(const title of ['Owl of Athena, Acropolis museum.jpg','Deesis mosaic Hagia Sophia.jpg','Olympic rings on the Eiffel Tower.jpg']) {const excluded=photo('CC0');excluded.title='File:'+title;assert.equal(eligible(excluded),null);}
 const stairs=photo('CC0');stairs.imageinfo[0].extmetadata.Categories={value:'Colosseum|CC-Zero|Stairs'};assert.equal(eligible(stairs),null);
 const original=photo('CC0');delete original.imageinfo[0].thumburl;assert.equal(eligible(original),null);
});

test('A recently photographed painting is still rejected as artwork',()=>{
 const painting=photo('Public domain');painting.imageinfo[0].extmetadata.Categories={value:'Artworks without Wikidata item|Paintings of Canal Grande|Italy photographs taken on 2024-05-08'};
 assert.equal(eligible(painting),null);
});

test('Photo requests identify the app and cache downloads instead of repeating them',async()=>{
 const {downloadPhoto}=await import('../src/photos.js');
 const fs=await import('node:fs/promises');const os=await import('node:os');const path=await import('node:path');
 const sharp=(await import('sharp')).default;
 const jpeg=await sharp({create:{width:1920,height:1440,channels:3,background:'#438bbe'}}).jpeg().toBuffer();
 const cacheDir=await fs.mkdtemp(path.join(os.tmpdir(),'nevi-photo-test-'));
 const original=globalThis.fetch;let calls=0;
 try {
  globalThis.fetch=async(url,opts)=>{calls++;assert.match(opts.headers['User-Agent'],/^NeviCarousel\/1\.0 \(https:\/\//);return new Response(jpeg,{status:200,headers:{'Content-Type':'image/jpeg'}});};
  const p={url:'https://thumb.wikimedia.org/wikipedia/commons/thumb/test.jpg/1920px-test.jpg'};
  const first=await downloadPhoto(p,{cacheDir});const second=await downloadPhoto(p,{cacheDir});
  assert.deepEqual(first,second);assert.equal(calls,1);
 } finally {globalThis.fetch=original;await fs.rm(cacheDir,{recursive:true,force:true});}
});

test('The named monument must be the image subject, not merely a search-page mention',async()=>{
 const {matchesLandmark}=await import('../src/photos.js');
 assert.equal(matchesLandmark('Light trails near Paris, 27 May 2022.jpg','Eiffel Tower'),false);
 assert.equal(matchesLandmark('Paris - Eiffelturm und Marsfeld2.jpg','Eiffel Tower'),true);
 assert.equal(matchesLandmark('GoldenGateBridge BakerBeach MC.jpg','Golden Gate Bridge'),true);
});

test('Publer accepts documented flat jobs and refuses flat partial failures',async()=>{
 for(const result of [{status:'complete',payload:{failures:{}}},{status:'completed',payload:{}},{data:{result:{status:'complete',payload:{}}}}]) {
  assert.equal(await new Publer({fetchJSON:async()=>result}).job('id'),'complete');
 }
 for(const result of [{status:'failed'},{status:'completed',payload:{failures:{one:'invalid'}}}]) {
  await assert.rejects(new Publer({fetchJSON:async()=>result}).job('id'));
 }
});
test('Photographer credit keeps the name without template instructions',()=>{
 const p={...eligible(photo()),author:'This Photo was taken by Supanut Arunoprayote.\n\nFeel free to use any of my images.'};
 const text=photoCaption([p]);assert.ok(text.includes('Supanut Arunoprayote'));assert.ok(!text.includes('Feel free'));assert.ok(text.includes('CC BY 4.0'));
});
