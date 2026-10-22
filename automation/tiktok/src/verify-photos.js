import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import {selectPhotos,downloadPhoto} from './photos.js';
import {slidesFor,photoCaption} from './content.js';
import {renderSlide} from './render.js';
// Live read-only integration check. No Publer client, database, scheduling or publishing.
const output=path.resolve(process.argv[2]??'preview/live-test');
const count=Number(process.argv[3]??5);
if(!Number.isInteger(count)||count<1||count>5) throw new Error('Use 1 to 5 carousels');
await fs.mkdir(output,{recursive:true});
const used=new Set(),hashes=new Set(),report={startedAt:new Date().toISOString(),published:false,carousels:[]};
for(let batch=0;batch<count;batch++) {
 const folder=path.join(output,`carrousel-${batch+1}`);await fs.mkdir(folder,{recursive:true});
 const photos=await selectPhotos(batch,used),slides=slidesFor(batch),tiles=[],receipts=[];
 for(let i=0;i<5;i++) {
  const source=await downloadPhoto(photos[i]);
  const digest=createHash('sha256').update(source).digest('hex');
  if(hashes.has(digest)) throw new Error('Duplicate source photo bytes');
  const meta=await sharp(source).metadata();
  if(meta.format!=='jpeg'||meta.width<1000||meta.height<1000) throw new Error('Downloaded image failed validation');
  hashes.add(digest);used.add(photos[i].id);
  const jpeg=await renderSlide(slides[i],source);
  const name=`${i+1}.jpg`;
  await fs.writeFile(path.join(folder,name),jpeg);
  receipts.push({id:photos[i].id,sha256:digest,bytes:source.length,width:meta.width,height:meta.height});
  tiles.push({input:await sharp(jpeg).resize(270,360).png().toBuffer(),left:i*282,top:0});
 }
 const caption=photoCaption(photos);if(caption.length>4000) throw new Error('Caption exceeds TikTok limit');
 await fs.writeFile(path.join(folder,'manifest.json'),JSON.stringify({photos,slides,receipts,status:'local_only_not_published'},null,2));
 await fs.writeFile(path.join(folder,'legende.txt'),caption+'\n');
 await sharp({create:{width:1398,height:360,channels:3,background:'#151515'}}).composite(tiles).png().toFile(path.join(folder,'apercu.png'));
 report.carousels.push({folder,photos:receipts,captionLength:caption.length});
 await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({completedCarousels:batch+1,uniqueNewPhotos:used.size,published:false}));
}
report.completedAt=new Date().toISOString();report.uniqueNewPhotos=used.size;
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(report,null,2));
