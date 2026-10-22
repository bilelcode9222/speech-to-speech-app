import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {slidesFor,photoCaption} from './content.js';
import {selectPhotos,downloadPhoto} from './photos.js';
import {renderSlide} from './render.js';
// This command has no Publer import and cannot publish or schedule anything.
const output=path.resolve(process.argv[2]??'preview');
const ordinal=Number(process.argv[3]??0);
const fixture=process.argv[4];
await fs.mkdir(output,{recursive:true});
const fixtureNames=['paris','londres','santorin','muraille','fuji'];
const photos=fixture?JSON.parse(await fs.readFile(path.join(fixture,'stock-sources.json'),'utf8')):await selectPhotos(ordinal);
await fs.writeFile(path.join(output,'photos.json'),JSON.stringify(photos,null,2));
const slides=slidesFor(ordinal),tiles=[];
for(let i=0;i<5;i++) {
 const jpeg=await renderSlide(slides[i],fixture?await fs.readFile(path.join(fixture,fixtureNames[i]+'.jpg')):await downloadPhoto(photos[i]));
 await fs.writeFile(path.join(output,`${String(i+1).padStart(2,'0')}.jpg`),jpeg);
 tiles.push({input:await sharp(jpeg).resize(270,360).png().toBuffer(),left:i*282,top:0});
}
await sharp({create:{width:1398,height:360,channels:3,background:'#151515'}}).composite(tiles).png().toFile(path.join(output,'apercu.png'));
await fs.writeFile(path.join(output,'manifest.json'),JSON.stringify({status:'preview_only_not_published',photos,slides},null,2));
await fs.writeFile(path.join(output,'legende.txt'),photoCaption(photos)+'\n');
console.log('Preview saved: '+output);
