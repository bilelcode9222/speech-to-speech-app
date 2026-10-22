import pg from 'pg';
export class State {
 constructor(url,account) {this.client=new pg.Client({connectionString:url,connectionTimeoutMillis:15000,statement_timeout:15000});this.account=account;}
 async open() {
  await this.client.connect();
  const lock=await this.client.query('SELECT pg_try_advisory_lock(hashtext($1)) AS locked',['nevi-tiktok:'+this.account]);
  if(!lock.rows[0].locked) throw new Error('Another automation run already holds the account lock');
  await this.client.query(`CREATE SCHEMA IF NOT EXISTS nevi_marketing;
   CREATE TABLE IF NOT EXISTS nevi_marketing.carousel_runs (
    account_id text NOT NULL, slot text NOT NULL, scheduled_at timestamptz NOT NULL,
    state text NOT NULL DEFAULT 'preparing', manifest jsonb, media jsonb NOT NULL DEFAULT '[]',
    job_id text,post_id text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY(account_id,slot));
   CREATE TABLE IF NOT EXISTS nevi_marketing.source_cooldowns (source text PRIMARY KEY,retry_at timestamptz NOT NULL);`);
 }
 async photosDeferredUntil() {return (await this.client.query("SELECT retry_at FROM nevi_marketing.source_cooldowns WHERE source='wikimedia' AND retry_at>now()")).rows[0]?.retry_at;}
 async deferPhotos(until) {await this.client.query("INSERT INTO nevi_marketing.source_cooldowns(source,retry_at) VALUES('wikimedia',$1) ON CONFLICT(source) DO UPDATE SET retry_at=GREATEST(nevi_marketing.source_cooldowns.retry_at,excluded.retry_at)",[until]);}
 async close() {await this.client.end();}
 async get(slot) {
  await this.client.query('INSERT INTO nevi_marketing.carousel_runs(account_id,slot,scheduled_at) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[this.account,slot.key,slot.at]);
  return (await this.client.query('SELECT * FROM nevi_marketing.carousel_runs WHERE account_id=$1 AND slot=$2',[this.account,slot.key])).rows[0];
 }
 async update(key,fields) {
  const allowed=['state','manifest','media','job_id','post_id'];
  if(Object.keys(fields).some(k=>!allowed.includes(k))) throw new Error('Invalid state field');
  const entries=Object.entries(fields),values=entries.map(([k,v])=>['manifest','media'].includes(k)?JSON.stringify(v):v);
  await this.client.query(`UPDATE nevi_marketing.carousel_runs SET ${entries.map(([k],i)=>`${k}=$${i+3}`).join(',')},updated_at=now() WHERE account_id=$1 AND slot=$2`,[this.account,key,...values]);
 }
 async unresolved() {return (await this.client.query("SELECT * FROM nevi_marketing.carousel_runs WHERE account_id=$1 AND state IN ('submitting','blocked') ORDER BY scheduled_at",[this.account])).rows;}
 async usedPhotos() {
  const result=await this.client.query("SELECT manifest FROM nevi_marketing.carousel_runs WHERE account_id=$1 AND created_at>now()-interval '60 days' AND manifest IS NOT NULL",[this.account]);
  return new Set(result.rows.flatMap(r=>r.manifest.photos.map(p=>p.id)));
 }
 async recentScheduled() {return (await this.client.query("SELECT * FROM nevi_marketing.carousel_runs WHERE account_id=$1 AND state='scheduled' AND scheduled_at<now()-interval '30 minutes' AND scheduled_at>now()-interval '7 days'",[this.account])).rows;}
}
