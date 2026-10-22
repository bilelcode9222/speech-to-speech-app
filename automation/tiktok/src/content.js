import { DateTime } from 'luxon';
export const TITLE='Je note les apps de traduction 🌍';
export const CAPTION=TITLE+' #traduction #traducteur #langues #nevi';
// Verified translation apps, not language courses, travel tools, or unrelated AI apps.
export const APPS=[
 {key:'deepl',name:'DeepL',storeId:1552407475},
 {key:'apple',name:'Apple Traduire',storeId:1514844618},
 {key:'microsoft',name:'Microsoft Translator',storeId:1018949559},
 {key:'itranslate',name:'iTranslate',storeId:288113403},
 {key:'reverso',name:'Reverso Context',storeId:919979642},
 {key:'papago',name:'Papago',storeId:1147874819},
 {key:'yandex',name:'Yandex Translate',storeId:584291439},
];
export function slots(now, {zone='Europe/Paris',hours=[9,12,15,18,21],days=2}={}) {
 if(hours.length!==5 || new Set(hours).size!==5 || hours.some(h=>!Number.isInteger(h)||h<0||h>23)) throw new Error('Exactly five distinct daily hours are required');
 const start=DateTime.fromJSDate(now,{zone});
 if(!start.isValid) throw new Error('Invalid timezone');
 const result=[];
 for(let day=0;day<=days;day++) for(const hour of [...hours].sort((a,b)=>a-b)) {
  const date=start.startOf('day').plus({days:day}).set({hour});
  if(date.toMillis()>start.plus({minutes:20}).toMillis() && date.toMillis()<=start.plus({days}).toMillis())
   result.push({key:date.toFormat('yyyy-LL-dd-HH'),at:date.toUTC().toISO(),local:date.toISO(),ordinal:Math.floor(Date.UTC(date.year,date.month-1,date.day)/86400000)*5+hours.indexOf(hour)});
 }
 return result;
}
export function appsFor(ordinal) {
 // Consecutive slots have disjoint middle apps; each rotates through both positions.
 return [APPS[(ordinal*2)%APPS.length],APPS[(ordinal*2+1)%APPS.length]];
}
export function slidesFor(ordinal) {
 const [first,second]=appsFor(ordinal);
 return [
  {lines:['Je note les apps','de traduction 🌍']},
  {icon:'google',name:'Google Traduction',score:'3/10',lines:['Trop basique']},
  {icon:first.key,name:first.name,score:'6/10',lines:['C’était bien à l’époque']},
  {icon:second.key,name:second.name,score:'6/10',lines:['Utile, mais pas','la meilleure']},
  {icon:'nevi',name:'Nevi',score:'10/10',lines:['Pratique pour traduire','et discuter']},
 ];
}
export function photoCaption(photos=[]) {
 const credits=photos.map((p,i)=>`${i+1}. ${p.title} — ${p.author||"Wikimedia Commons"} — ${p.license} — ${p.source}`);
 const licenses=[...new Set(photos.filter(p=>p.license.startsWith("CC BY")).map(p=>p.licenseUrl))];
 return CAPTION+(credits.length?"\n\nPhotos recadrées, texte ajouté :\n"+credits.join("\n")+(licenses.length?"\nLicences : "+licenses.join(" "):""):"");
}
export function postPayload(accountId,slot,media,photos=[]) {
 if(media.length!==5 || media.some(m=>!m.id||!m.path)) throw new Error('Five uploaded images required');
 const caption=photoCaption(photos);
 if(caption.length>4000) throw new Error('Photo attribution exceeds TikTok caption limit');
 return {bulk:{state:'scheduled',posts:[{accounts:[{id:accountId,scheduled_at:slot.at}],networks:{tiktok:{type:'photo',title:TITLE,text:caption,media,details:{privacy:'PUBLIC_TO_EVERYONE',auto_add_music:false,comment:true,promotional:true,paid:false,reminder:false}}}}]}};
}
