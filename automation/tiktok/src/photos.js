import {fetchChecked} from './http.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const USER_AGENT='NeviCarousel/1.0 (https://github.com/bilelcode9222/speech-to-speech-app)';
let previousRequest=0;
const cache=new Map();
async function commonsRequest(url) {
 const wait=Math.max(0,1500-(Date.now()-previousRequest));
 if(wait) await new Promise(resolve=>setTimeout(resolve,wait));
 previousRequest=Date.now();
 return fetchChecked(url,{headers:{'User-Agent':USER_AGENT}});
}
export const LANDMARKS=[
 'Eiffel Tower','Big Ben Westminster','Santorini Oia','Great Wall China','Mount Fuji','Colosseum Rome','Taj Mahal','Pyramids Giza','Acropolis Athens','Golden Gate Bridge','Machu Picchu','Tower Bridge','Mont Saint Michel','Hagia Sophia','Petra Jordan','Angkor Wat','Grand Canal Venice','Buda Castle','Neuschwanstein Castle','Chichen Itza','Matterhorn','Cappadocia','Lisbon Belem Tower','Seoul Gyeongbokgung',
];
const plain=s=>(s??'').replace(/<[^>]*>/g,'').replace(/&amp;/g,'&').trim();
export function eligible(page) {
 const info=page.imageinfo?.[0],meta=info?.extmetadata;
 if(!info||!meta) return null;
 const license=plain(meta.LicenseShortName?.value);
 const subject=page.title+' '+plain(meta.ImageDescription?.value)+' '+plain(meta.Categories?.value);
 if(/mosaic|mosaïque|olympic|olympiqu|artworks?|paintings?|canvas|medallion|pre.columbian art|feathered snake|looking up the center|sous la tour|museum|musée|sculptur|statue|stair|interior|intérieur|inside|underground|close[ -]?up|detail|fragment|inscription|ceiling|floor|portrait|owl|bust\b|coins?\b|relief\b/i.test(subject)) return null;
 // CC BY attribution is emitted in the public caption; share-alike/NC/ND are excluded.
 if(!['CC0','Public domain','CC BY 2.0','CC BY 3.0','CC BY 4.0'].includes(license)) return null;
 if(plain(meta.Restrictions?.value)) return null;
 const taken=plain(meta.DateTimeOriginal?.value);
 const years=[...taken.matchAll(/\b(?:18|19|20)\d{2}\b/g)].map(m=>Number(m[0]));
 if(!years.length||Math.min(...years)<2000) return null;
 if(/Eiffel/i.test(page.title)&&/night|nuit|illuminat|light show/i.test(page.title+' '+plain(meta.ImageDescription?.value))) return null;
 if(info.mime!=='image/jpeg'||info.width<1600||info.height<1440||info.width/info.height>1.9||info.width/info.height<0.55) return null;
 if(/(drawing|painting|engraving|illustration|map\b|model\b|replica|ISS\d|satellite|aerial|postcard|panorama|vintage|black.and.white)/i.test(page.title)) return null;
 // Ask the API for a standard cached thumbnail; never invent a URL or fetch the full original.
 const download=info.thumburl;
 if(!download||!download.includes('/thumb/')) return null;
 if(!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(download)) return null;
 return {id:String(page.pageid),title:page.title.replace(/^File:/,''),url:download,source:`https://commons.wikimedia.org/?curid=${page.pageid}`,author:plain(meta.Artist?.value),license,licenseUrl:license.startsWith('CC BY ')?`https://creativecommons.org/licenses/by/${license.split(' ').at(-1)}/`:'',width:info.width,height:info.height,checkedAt:new Date().toISOString(),rank:Math.max(0,30-(page.index??30))*1.5+Math.min(info.width*info.height/1e6,20)-Math.abs(info.width/info.height-.75)*3};
}
export async function candidates(landmark,{offset=0}={}) {
 const cacheKey=landmark+':'+offset;
 if(cache.has(cacheKey)) return cache.get(cacheKey);
 const params=new URLSearchParams({action:'query',format:'json',generator:'search',gsrsearch:`${landmark} filetype:bitmap`,gsrnamespace:'6',gsrlimit:'50',gsroffset:String(offset),prop:'imageinfo',iiprop:'url|extmetadata|size|mime',iiurlwidth:'1920'});
 const data=await (await commonsRequest(`https://commons.wikimedia.org/w/api.php?${params}`)).json();
 if(data.error) throw new Error('Wikimedia search failed');
 const found=Object.values(data.query?.pages??{}).map(eligible).filter(Boolean).sort((a,b)=>b.rank-a.rank);
 cache.set(cacheKey,found);return found;
}
export async function selectPhotos(ordinal,used=new Set()) {
 const selected=[];const seen=new Set(used);
 for(let index=0;index<LANDMARKS.length && selected.length<5;index++) {
  const landmark=LANDMARKS[(ordinal*5+index)%LANDMARKS.length];
  let choices=await candidates(landmark);
  let photo=choices.find(p=>!seen.has(p.id));
  if(!photo) {choices=await candidates(landmark,{offset:50});photo=choices.find(p=>!seen.has(p.id));}
  if(photo) {selected.push({...photo,landmark});seen.add(photo.id);}
 }
 if(selected.length!==5) throw new Error('Not enough unused commercially reusable landscape photos; nothing will be published');
 return selected;
}
export async function downloadPhoto(photo,{cacheDir=process.env.PHOTO_CACHE_DIR??path.join(tmpdir(),'nevi-commons-photo-cache')}={}) {
 if(!/^https:\/\/(upload|thumb)\.wikimedia\.org\//.test(photo.url)) throw new Error('Unexpected image host');
 await fs.mkdir(cacheDir,{recursive:true,mode:0o700});
 const file=path.join(cacheDir,createHash('sha256').update(photo.url).digest('hex')+'.jpg');
 try {const info=await fs.stat(file);if(Date.now()-info.mtimeMs<7*86400000) return await fs.readFile(file);} catch(error) {if(error.code!=='ENOENT') throw error;}
 const response=await commonsRequest(photo.url);
 if(!response.headers.get('content-type')?.startsWith('image/jpeg')) throw new Error('Photo source did not return a JPEG');
 if(Number(response.headers.get('content-length'))>20000000) throw new Error('Photo too large');
 const chunks=[];let size=0;
 for await(const chunk of response.body) {size+=chunk.length;if(size>20000000) throw new Error('Photo too large');chunks.push(chunk);}
 const buffer=Buffer.concat(chunks);
 const metadata=await sharp(buffer,{limitInputPixels:80000000}).metadata();
 if(metadata.format!=='jpeg'||metadata.width<1000||metadata.height<1000) throw new Error('Downloaded photo is invalid or too small');
 await fs.writeFile(file+'.tmp',buffer,{mode:0o600});await fs.rename(file+'.tmp',file);
 return buffer;
}
