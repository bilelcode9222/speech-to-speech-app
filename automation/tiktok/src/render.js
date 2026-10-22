import fs from 'node:fs/promises';
import sharp from 'sharp';
import {fileURLToPath} from 'node:url';
const assets=fileURLToPath(new URL('../assets/',import.meta.url));
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const uri=b=>`data:image/png;base64,${b.toString('base64')}`;
export async function renderSlide(slide,photo,{font=process.platform==='darwin'?'Arial':'Liberation Sans'}={}) {
 const background=await sharp(photo,{limitInputPixels:80000000}).rotate().resize(1080,1440,{fit:'cover'}).png().toBuffer();
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1080" height="1440"><defs><clipPath id="icon"><rect x="382" y="440" width="316" height="316" rx="65"/></clipPath></defs><image width="1080" height="1440" xlink:href="${uri(background)}"/><rect width="1080" height="1440" fill="#000" opacity="0.10"/>`;
 if(slide.icon) {
  const icon=await sharp(await fs.readFile(`${assets}/icons/${slide.icon}.png`)).png().toBuffer();
  svg+=`<image x="382" y="440" width="316" height="316" clip-path="url(#icon)" xlink:href="${uri(icon)}"/>`;
 }
 const text=(str,y,size,x=540)=>`<text x="${x}" y="${y}" text-anchor="middle" font-family="${esc(font)},sans-serif" font-weight="700" font-size="${size}" fill="white" stroke="#111" stroke-width="10" stroke-linejoin="round" paint-order="stroke fill">${esc(str)}</text>`;
 if(slide.score) svg+=text(slide.score,840,66);
 for(const [j,line] of slide.lines.entries()) {
  const y=(slide.score?930:680)+j*78,size=slide.score?60:68;
  if(line.endsWith(' 🌍')) {
   const label=line.slice(0,-3);
   const metrics=await sharp({text:{text:label,font:`${font} Bold ${size}`,rgba:true}}).metadata();
   const left=(1080-metrics.width-18-68)/2;
   const globe=await sharp(`${assets}/globe-apple.png`).trim().resize(68,68).png().toBuffer();
   svg+=text(label,y,size,left+metrics.width/2);
   svg+=`<image x="${left+metrics.width+18}" y="${y-59}" width="68" height="68" xlink:href="${uri(globe)}"/>`;
  } else svg+=text(line,y,size);
 }
 return sharp(Buffer.from(svg+'</svg>')).jpeg({quality:95,chromaSubsampling:'4:4:4'}).toBuffer();
}
