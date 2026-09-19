/** Browser-only code, inlined to keep this private dashboard independent of a CDN. */
export const analyticsDashboardClient = String.raw`
(function () {
'use strict';
const $ = id => document.getElementById(id);
const all = s => Array.from(document.querySelectorAll(s));
const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const count = n => new Intl.NumberFormat('fr-FR').format(Number(n) || 0);
const money = (n, precise) => new Intl.NumberFormat('fr-FR', {style:'currency', currency:'USD', minimumFractionDigits:2, maximumFractionDigits:precise && Math.abs(n) < 1 && n !== 0 ? 4 : 2}).format(Number(n) || 0);
const percent = n => new Intl.NumberFormat('fr-FR',{style:'percent',maximumFractionDigits:1}).format(n || 0);
const date = (v, timeOnly) => !v || !Number.isFinite(Date.parse(v)) ? 'Non disponible' : new Intl.DateTimeFormat('fr-FR',timeOnly ? {timeZone:'Europe/Paris',hour:'2-digit',minute:'2-digit',second:'2-digit'} : {timeZone:'Europe/Paris',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}).format(new Date(v));
const day = v => new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',weekday:'long',day:'numeric',month:'long'}).format(new Date(v));
const duration = n => Number(n) < 1000 ? count(n) + ' ms' : Number(n) < 60000 ? (Number(n)/1000).toFixed(1).replace('.',',') + ' s' : Math.floor(Number(n)/60000) + ' min ' + Math.round((Number(n)%60000)/1000) + ' s';
let regionNames, languageNames;
try { regionNames = new Intl.DisplayNames(['fr'],{type:'region'}); languageNames = new Intl.DisplayNames(['fr'],{type:'language'}); } catch (_) {}
const country = code => {try {return /^[A-Z]{2}$/.test(code) && regionNames ? regionNames.of(code) : 'Pays inconnu';} catch (_) {return 'Pays inconnu';}};
const language = code => {try {return code && code !== 'unknown' ? (languageNames ? languageNames.of(code) : code) : 'Non renseignée';} catch (_) {return String(code);}};
const person = id => 'Utilisateur · ' + String(id || '').slice(-6);
const names = {
 app_opened:'Ouvre l’application',app_resumed:'Revient dans l’application',app_backgrounded:'Quitte l’application au premier plan',session_heartbeat:'Session active',
 screen_viewed:'Consulte une page',screen_left:'Quitte une page',button_pressed:'Appuie sur un bouton',
 onboarding_viewed:'Consulte l’ancien onboarding',onboarding_step_completed:'Avance dans l’ancien onboarding',onboarding_completed:'Termine l’ancien onboarding',
 paywall_opened:'Ouvre le paywall',paywall_step_viewed:'Consulte le paywall',trial_reminder_permission:'Répond à la demande de notifications',
 subscription_plan_selected:'Sélectionne une offre',subscription_purchase_started:'Lance la demande d’achat Apple',subscription_purchased:'Accès confirmé dans l’app',
 subscription_purchase_failed:'Rencontre une erreur d’achat',subscription_purchase_cancelled:'Annule la demande d’achat',subscription_restored:'Restaure son accès',subscription_restore_started:'Lance la restauration',subscription_restore_result:'Résultat de la restauration',subscription_backend_sync_delayed:'Synchronisation de l’accès retardée',trial_eligibility_checked:'Vérifie son éligibilité à l’essai',
 translation_recording_started:'Commence un enregistrement',recording_stopped:'Termine un enregistrement',recording_cancelled:'Annule un enregistrement',translation_requested:'Envoie une demande de traduction',translation_stage_completed:'Termine une étape de traduction',translation_completed:'Reçoit une traduction',translation_failed:'Rencontre une erreur de traduction',audio_playback_started:'Lance la lecture audio',audio_playback_completed:'Termine la lecture audio',
 language_picker_opened:'Ouvre le choix des langues',language_picker_closed:'Ferme le choix des langues',language_selected:'Change une langue',languages_swapped:'Inverse les langues',theme_changed:'Change le thème',face_to_face_mode_changed:'Change le mode face à face',microphone_permission_result:'Vérifie l’accès au microphone',ai_consent_shown:'Consulte le consentement IA',ai_consent_result:'Répond au consentement IA',legal_link_opened:'Ouvre une page légale',subscription_management_opened:'Ouvre la gestion Apple des abonnements',client_error:'Rencontre un problème technique',
 revenuecat_initial_purchase:'Premier achat confirmé par RevenueCat',revenuecat_renewal:'Renouvellement confirmé',revenuecat_cancellation:'Renouvellement annulé',revenuecat_expiration:'Accès arrivé à expiration',revenuecat_billing_issue:'Problème de facturation',revenuecat_uncancellation:'Réactive le renouvellement',revenuecat_product_change:'Change d’abonnement',revenuecat_non_renewing_purchase:'Achat confirmé',revenuecat_transfer:'Transfert d’accès',revenuecat_test:'Événement de test RevenueCat'
};
const screens = {conversation:'Traduction',paywall_intro:'Présentation',paywall_reminder:'Rappel de l’essai',paywall_offers:'Offres',splash:'Démarrage'};
const values = {start_recording:'Démarrer le microphone',stop_recording:'Arrêter le microphone',microphone_settings:'Réglages du microphone',stopped:'Arrêt de l’enregistrement',background_or_cleanup:'Passage en arrière-plan ou fermeture',trial_not_confirmed:'Essai non confirmé',apple_sheet:'Fenêtre d’achat Apple',unavailable:'Service indisponible',weekly:'Hebdomadaire',annual:'Annuel',monthly:'Mensuel',source:'Langue de départ',target:'Langue d’arrivée',dark:'Sombre',light:'Clair',terms:'Conditions d’utilisation',privacy:'Confidentialité',next:'Passer à la suite',back:'Retour',retry:'Réessayer',restore:'Restaurer les achats',purchase:'Démarrer l’achat',pro:'Ouvrir les offres',cancel:'Annuler',granted:'Autorisé',denied:'Refusé',not_now:'Plus tard',confirmed:'Confirmé',cancelled:'Annulé',too_short:'Enregistrement trop court',no_access:'Accès requis',disconnected:'Connexion interrompue',timeout:'Délai dépassé',stt:'Transcription',translation:'Traduction',tts:'Synthèse vocale',transcription:'Transcription',audio:'Audio',success:'Réussi',failed:'Échec',eligible:'Éligible',ineligible:'Non éligible',unknown:'Non déterminé',no_entitlement:'Aucun accès trouvé',device_tts:'Voix de l’appareil'};
const failureNames = {timeout:'Délai de réponse dépassé',disconnect:'Connexion interrompue',disconnected:'Connexion interrompue',stt:'Transcription audio',translation:'Traduction',tts:'Création de la voix',socket_error:'Connexion au service',server:'Traitement serveur',other:'Autre problème'};
const eventTitle = e => e.event === 'revenuecat_initial_purchase' && e.properties.period_type === 'TRIAL' ? 'Début d’essai gratuit confirmé' : names[e.event] || e.event.replace(/_/g,' ');
const eventKind = e => /failed|error|issue/.test(e.event) ? 'bad' : /purchased|renewal|completed|initial_purchase/.test(e.event) ? 'good' : '';
const eventGlyph = e => /failed|error|issue/.test(e.event) ? '!' : /purchase|renewal|revenuecat/.test(e.event) ? '↗' : /translation|recording|audio/.test(e.event) ? '≋' : /paywall|screen/.test(e.event) ? '▤' : '↳';
const labelValue = v => values[v] || screens[v] || String(v);
function eventDetails(e) {
 const p=e.properties || {}, parts=[];
 if(p.step != null) parts.push('Page ' + p.step + ' · ' + ({1:'Présentation',2:'Rappel de l’essai',3:'Offres'}[p.step] || 'Parcours'));
 if(p.screen) parts.push(screens[p.screen] || p.screen);
 if(p.language) parts.push(language(p.previous_language)+' → '+language(p.language));
 if(p.theme) parts.push(labelValue(p.theme));
 if(p.button) parts.push(labelValue(p.button));
 if(p.source_language || p.target_language) parts.push(language(p.source_language) + ' → ' + language(p.target_language));
 ['plan','result','reason','stage','field'].forEach(k=>{if(p[k]!=null) parts.push(labelValue(p[k]));});
 if(p.country_code) parts.push(country(p.country_code));
 if(p.duration_ms != null) parts.push('Durée : ' + duration(p.duration_ms));
 if(p.recording_duration_ms != null) parts.push('Audio : ' + duration(p.recording_duration_ms));
 if(p.elapsed_ms != null) parts.push('Traitement : ' + duration(p.elapsed_ms));
 if(p.granted != null) parts.push(p.granted ? 'Autorisation accordée' : 'Autorisation non accordée');
 if(p.enabled != null) parts.push(p.enabled ? 'Activé' : 'Désactivé');
 if(p.trial_eligible != null) parts.push(p.trial_eligible ? 'Éligible à l’essai' : 'Essai non confirmé');
 if(p.failure_stage) parts.push(failureNames[p.failure_stage] || p.failure_stage);
 if(p.environment === 'SANDBOX') parts.push('Test Sandbox');
 return parts;
}
function metric(label, value, detail, previous, current, invert) {
 let trend='';
 if(previous != null && current != null){
  if(previous>0){const delta=(current-previous)/previous;trend='<span class="trend '+((delta>=0)!==!!invert?'positive':'negative')+'">'+(delta>0?'↗ ':delta<0?'↘ ':'')+percent(Math.abs(delta))+'</span> vs période précédente';}
  else trend=current>0?'Aucune activité sur la période précédente':'Aucune variation mesurée';
 }
 return '<article class="card metric"><div class="metric-label">'+esc(label)+'</div><div class="metric-value">'+esc(value)+'</div><div class="small muted">'+esc(detail)+'</div>'+(trend?'<div class="tiny muted" style="margin-top:9px">'+trend+'</div>':'')+'</article>';
}
let token='', data=null, page='overview', chartKey='revenueUsd', filter='all', busy=false, requestController=null, journeyController=null, activeJourney=null, journeyId=null, focusBeforeDrawer=null;
try {token=localStorage.getItem('nevi-pulse-token') || '';} catch (_) {}
const titles={overview:'Votre app, en un coup d’œil.',people:'Comprenez chaque parcours.',money:'Vos revenus et vos coûts.',quality:'Gardez une app qui fonctionne.',guide:'Tous vos chiffres, expliqués.'};
function navigate(next) {
 if(!titles[next])return;page=next;
 all('[data-page]').forEach(b=>{b.classList.toggle('active',b.dataset.page===page);b.setAttribute('aria-current',b.dataset.page===page?'page':'false');});
 all('[data-view]').forEach(s=>s.hidden=s.dataset.view!==page || !data);
 $('pageTitle').textContent=titles[page];
 if(page==='overview') requestAnimationFrame(drawGlobe);
}
function showLogin(message) {
 $('app').hidden=true;$('login').hidden=false;$('loginError').hidden=!message;$('loginError').textContent=message || '';
 $('accessCode').focus();
}
async function getJson(path, signal) {
 const response=await fetch(path,{headers:{'x-nevi-dashboard-token':token},cache:'no-store',signal});
 if(response.status===401){const error=new Error('Code d’accès incorrect ou expiré.');error.auth=true;throw error;}
 if(!response.ok)throw new Error(response.status===503?'La collecte n’est pas encore configurée sur le serveur.':'Les données sont momentanément indisponibles. Réessayez dans un instant.');
 return response.json();
}
async function refresh() {
 if(busy || !token)return;busy=true;const requestingToken=token;
 $('refresh').disabled=true;$('refresh').classList.add('spin');$('connectionLabel').textContent='Actualisation…';
 requestController=new AbortController();const controller=requestController;const timeout=setTimeout(()=>controller.abort(),25000);
 try {
  const result=await getJson('/api/admin/analytics?period='+$('period').value,controller.signal);
  if(token!==requestingToken)return;
  if(!result.summary || !Array.isArray(result.customers))throw new Error('Le serveur a renvoyé un format de données inattendu.');
  data=result;$('login').hidden=true;$('app').hidden=false;$('loading').hidden=true;$('errorBanner').hidden=true;
  try {localStorage.setItem('nevi-pulse-token',token);} catch (_) {}
  render();navigate(page);$('connectionLabel').textContent='Données synchronisées';
 } catch(error) {
  if(error.auth){token='';try {localStorage.removeItem('nevi-pulse-token');} catch (_) {}closeJourney();showLogin(error.message);}
  else if(!data)showLogin(error.name==='AbortError'?'Le serveur met trop de temps à répondre. Réessayez.':error.message);
  else {$('errorBanner').textContent=(error.name==='AbortError'?'L’actualisation a pris trop de temps.':error.message)+' Les dernières données reçues restent affichées.';$('errorBanner').hidden=false;$('connectionLabel').textContent='Actualisation interrompue';}
 } finally {clearTimeout(timeout);busy=false;$('refresh').disabled=false;$('refresh').classList.remove('spin');}
}
function render() {
 const s=data.summary,p=data.previous,e=data.economics,h=data.health;
 $('updated').textContent='Mis à jour le '+date(data.generatedAt)+' · Heure de Paris';
 const notices=[];
 if(!h.firstEventAt)notices.push('Aucun événement reçu pour le moment. Vos données apparaîtront ici après les premières utilisations.');
 else if(h.appEvents && !h.detailedEvents)notices.push('Les versions actuellement observées transmettent les actions principales. Le détail des sessions, boutons et temps passés sera disponible avec une prochaine version instrumentée.');
 else if(h.appEvents && h.detailedEvents<h.appEvents)notices.push('Les détails du parcours varient selon la version installée. Certaines actions anciennes n’ont pas de session ni de durée.');
 if(!h.webhookConfigured)notices.push('La confirmation des achats RevenueCat n’est pas configurée. Les ventes et essais ne peuvent pas encore être mesurés.');
 $('dataBanner').hidden=!notices.length;$('dataBanner').textContent=notices.join(' ');
 $('metrics').innerHTML=metric('Utilisateurs actifs',count(s.users),'Installations observées',p.users,s.users)+metric('Essais gratuits confirmés',h.webhookConfigured?count(s.trials):'—',h.webhookConfigured?'Confirmés par RevenueCat':'Connexion des achats à terminer',h.webhookConfigured?p.trials:null,s.trials)+metric('Ventes confirmées',h.webhookConfigured?money(s.revenueUsd):'—',h.webhookConfigured?count(s.charges)+' paiements · hors essais':'Connexion des achats à terminer',h.webhookConfigured?p.revenueUsd:null,s.revenueUsd)+metric('Traductions reçues',count(s.translations),'Résultats arrivés dans l’app',p.translations,s.translations);
 $('peopleStats').innerHTML=metric('Utilisateurs actifs',count(s.users),'Sur la période sélectionnée')+metric('Nouveaux utilisateurs observés',count(e.newUsers),'Première activité connue')+metric('Sessions identifiées',s.sessions?count(s.sessions):'—',s.sessions?'Sessions avec un identifiant':'Non transmises par les anciennes versions')+metric('Utilisateurs ayant payé',h.webhookConfigured?count(s.payingUsers):'—',h.webhookConfigured?'Au moins un paiement sur la période':'Confirmation des achats indisponible');
 $('liveUsers').textContent=count(data.live.users);$('countryCount').textContent=count(data.countries.filter(c=>/^[A-Z]{2}$/.test(c.code)).length);
 $('worldCountries').innerHTML=data.countries.filter(c=>/^[A-Z]{2}$/.test(c.code)).slice(0,4).map(c=>'<button class="btn" data-country="'+esc(c.code)+'">'+esc(country(c.code))+' <strong>'+count(c.users)+'</strong></button>').join('') || '<span class="small muted">Aucun pays d’achat confirmé sur cette période.</span>';
 renderChart();renderFunnel();renderPeople();renderMoney();renderQuality();renderInsights();
 $('recent').innerHTML=data.recent.slice(0,7).map(a=>'<div class="activity-item"><span class="activity-icon '+eventKind(a)+'">'+eventGlyph(a)+'</span><div class="grow"><div style="font-size:12px;font-weight:550">'+esc(eventTitle(a))+'</div><button class="who" data-person="'+esc(a.installationId)+'">'+esc(person(a.installationId))+'</button></div><time class="tiny muted" datetime="'+esc(a.timestamp)+'">'+esc(date(a.timestamp))+'</time></div>').join('') || '<div class="empty">Les prochaines actions reçues s’afficheront ici.</div>';
 drawGlobe();
}
function renderFunnel() {
 const f=data.funnel,steps=[['introduction','Présentation','Découvre la première page'],['reminder','Rappel de l’essai','Atteint la deuxième page'],['offers','Choix de l’offre','Atteint la troisième page'],['checkout','Demande d’achat','Ouvre l’achat Apple'],['access','Accès confirmé','Essai ou abonnement actif']];
 $('funnel').innerHTML=steps.map((s,i)=>{const n=f[s[0]]||0,total=f.introduction||0,prev=i?f[steps[i-1][0]]||0:total;return '<div class="funnel-step"><div class="funnel-label">'+(i+1)+'. '+s[1]+'</div><div class="funnel-number">'+count(n)+'</div><div class="funnel-bar"><i style="width:'+ (total?Math.min(100,n/total*100):0)+'%"></i></div><p class="funnel-detail">'+(total?percent(n/total)+' de l’entrée':'Aucun parcours observé')+'</p><p class="tiny muted" style="margin-top:5px">'+(i&&prev?count(Math.max(0,prev-n))+' sans étape suivante observée':s[2])+'</p></div>';}).join('');
}
function renderChart() {
 if(!data)return;
 const options={revenueUsd:['Ventes confirmées',money],trials:['Essais gratuits confirmés',count],users:['Utilisateurs actifs',count]},o=options[chartKey],rows=data.daily;
 $('chartLabel').textContent=o[0];$('chartTotal').textContent=o[1](data.summary[chartKey]);
 if(chartKey!=='users'&&!data.health.webhookConfigured){$('chartTotal').textContent='—';$('chart').innerHTML='<div class="empty-chart"><div><strong>Achats non connectés</strong><p class="small muted">Les confirmations RevenueCat ne sont pas encore disponibles.</p></div></div>';all('[data-chart]').forEach(b=>{b.classList.toggle('active',b.dataset.chart===chartKey);b.setAttribute('aria-pressed',String(b.dataset.chart===chartKey));});return;}
 all('[data-chart]').forEach(b=>{b.classList.toggle('active',b.dataset.chart===chartKey);b.setAttribute('aria-pressed',String(b.dataset.chart===chartKey));});
 if(!rows.length || rows.every(r=>!r[chartKey])) {$('chart').innerHTML='<div class="empty-chart"><div><strong>Aucune activité mesurée</strong><p class="small muted">'+(chartKey==='revenueUsd'?'Les paiements confirmés apparaîtront ici.':'Cet indicateur est à zéro sur la période sélectionnée.')+'</p></div></div>';return;}
 const w=700,h=220,left=55,right=18,top=12,bottom=35,peak=Math.max(...rows.map(r=>r[chartKey]))*1.15;
 const x=i=>left+i/Math.max(1,rows.length-1)*(w-left-right),y=v=>h-bottom-v/peak*(h-top-bottom);
 let svg='<svg viewBox="0 0 '+w+' '+h+'" width="100%" height="100%" role="img" aria-label="'+esc(o[0])+', évolution quotidienne en UTC"><defs><linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#168c61" stop-opacity=".13"/><stop offset="100%" stop-color="#168c61" stop-opacity="0"/></linearGradient></defs>';
 for(let i=0;i<4;i++){const v=peak*i/3,yy=y(v);svg+='<path d="M'+left+' '+yy+'H'+(w-right)+'" stroke="#edf0ee" stroke-dasharray="3 5"/><text x="'+(left-8)+'" y="'+(yy+4)+'" text-anchor="end" fill="#7d8881" font-size="10">'+esc(chartKey==='revenueUsd'?new Intl.NumberFormat('fr-FR',{maximumFractionDigits:1,notation:'compact'}).format(v)+' $':count(Math.round(v)))+'</text>';}
 const path=rows.map((r,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(r[chartKey]).toFixed(1)).join(' ');
 svg+='<path d="'+path+' L'+x(rows.length-1)+' '+y(0)+' L'+x(0)+' '+y(0)+' Z" fill="url(#chartFill)"/><path d="'+path+'" fill="none" stroke="#14855d" stroke-width="2.3" stroke-linejoin="round" stroke-linecap="round"/>';
 const marks=[0,Math.floor((rows.length-1)/3),Math.floor((rows.length-1)*2/3),rows.length-1];
 [...new Set(marks)].forEach(i=>{svg+='<text x="'+x(i)+'" y="'+(h-10)+'" text-anchor="middle" fill="#7d8881" font-size="10">'+esc(new Intl.DateTimeFormat('fr-FR',{timeZone:'UTC',day:'numeric',month:'short'}).format(new Date(rows[i].date)))+'</text>';});
 rows.forEach((r,i)=>{svg+='<circle tabindex="0" cx="'+x(i)+'" cy="'+y(r[chartKey])+'" r="4" fill="#168c61" opacity=".01" onfocus="this.setAttribute(\'opacity\',1)" onblur="this.setAttribute(\'opacity\',.01)" onmouseenter="this.setAttribute(\'opacity\',1)" onmouseleave="this.setAttribute(\'opacity\',.01)"><title>'+esc(r.date+' : '+o[1](r[chartKey]))+'</title></circle>';});
 $('chart').innerHTML=svg+'</svg>';$('chartPeriodNote').textContent='Jours UTC · début et fin partiels';
}
function visiblePeople() {
 if(!data)return[];const query=$('peopleSearch').value.trim().toLowerCase();
 return data.customers.filter(c=>(filter==='all'||filter==='trial'&&c.trials>0||filter==='paid'&&c.charges>0||filter==='translated'&&c.translations>0)&&(!query||[c.installationId,person(c.installationId),language(c.locale),names[c.lastEvent]||c.lastEvent].join(' ').toLowerCase().includes(query)));
}
function personButton(c){return '<button class="person" data-person="'+esc(c.installationId)+'"><span class="person-icon">'+esc(String(c.installationId).slice(-2).toUpperCase())+'</span><span>'+esc(person(c.installationId))+(c.isNew?'<small>Nouveau sur la période</small>':'<small>Installation pseudonyme</small>')+'</span></button>';}
function renderPeople() {
 const rows=visiblePeople();
 all('[data-filter]').forEach(b=>{b.classList.toggle('active',b.dataset.filter===filter);b.setAttribute('aria-pressed',String(b.dataset.filter===filter));});
 $('peopleRows').innerHTML=rows.map(c=>'<tr><td>'+personButton(c)+'</td><td>'+esc(date(c.lastSeenAt))+'<div class="tiny muted">'+esc(names[c.lastEvent]||c.lastEvent)+'</div></td><td>'+esc(language(c.locale))+'</td><td>'+count(c.events)+'</td><td>'+count(c.translations)+'</td><td>'+(c.charges?'<span class="tag good">'+count(c.charges)+' · '+money(c.grossRevenueUsd)+'</span>':c.trials?'<span class="tag">Essai confirmé</span>':'<span class="muted">'+(data.health.webhookConfigured?'Aucun reçu':'Non mesuré')+'</span>')+'</td><td><button class="btn ghost" data-person="'+esc(c.installationId)+'" aria-label="Ouvrir le parcours de '+esc(person(c.installationId))+'">Ouvrir →</button></td></tr>').join('') || '<tr><td colspan="7"><div class="empty">'+(data.customers.length?'Aucun utilisateur ne correspond à ce filtre.':'Aucune installation observée sur cette période.')+'</div></td></tr>';
 $('peopleCount').textContent=count(rows.length)+' utilisateur'+(rows.length>1?'s':'')+' affiché'+(rows.length>1?'s':'');$('exportPeople').disabled=!rows.length;
}
function renderMoney() {
 const s=data.summary,e=data.economics,connected=data.health.webhookConfigured,financial=n=>connected?money(n):'—';
 $('moneyStats').innerHTML=metric('Ventes brutes confirmées',financial(s.revenueUsd),connected?count(s.charges)+' paiements':'Achats non connectés')+metric('Net après Apple · estimé',financial(e.estimatedNetRevenueUsd),'Part conservée : '+percent(e.storeNetRevenueShare))+metric('Coût IA estimé',money(e.technicalCostUsd,true),count(e.costEvents)+' calculs reçus')+metric('Marge estimée',financial(e.estimatedMarginUsd),'Après IA et acquisition estimée');
 const row=(label,value,extra,total)=>'<div class="money-row'+(total?' total':'')+'"><div>'+label+(extra?'<p class="tiny muted">'+esc(extra)+'</p>':'')+'</div><strong class="'+(value<0?'money-negative':'')+'">'+(value==null?'—':money(value,true))+'</strong></div>';
 $('moneyBreakdown').innerHTML=row('Ventes brutes',connected?e.grossRevenueUsd:null,'Achats et renouvellements en production')+row('Part Apple · estimée',connected?e.estimatedNetRevenueUsd-e.grossRevenueUsd:null,percent(1-e.storeNetRevenueShare)+' des ventes')+row('Net estimé',connected?e.estimatedNetRevenueUsd:null,'',true)+row('Coût technique IA',-e.technicalCostUsd,'Transcription, traduction et voix mesurées')+row('Acquisition · estimée',-e.acquisitionCostUsd,count(e.newUsers)+' nouveaux utilisateurs × '+money(e.acquisitionCostPerUserUsd))+row('Marge estimée',connected?e.estimatedMarginUsd:null,'Avant autres frais et ajustements',true);
 $('costCoverage').textContent=!e.costEvents?'Aucun calcul de coût IA reçu sur cette période. Un coût à zéro ne prouve pas que le service n’a rien coûté.':e.incompleteCostEvents?count(e.incompleteCostEvents)+' calculs sur '+count(e.costEvents)+' sont partiels : les coûts et la marge restent incomplets.':count(e.costEvents)+' calculs de coût reçus, tous marqués complets par le serveur. Les tarifs restent des estimations.';
 $('moneyRows').innerHTML=data.customers.map(c=>'<tr><td>'+personButton(c)+'</td><td>'+financial(c.grossRevenueUsd)+'</td><td>'+financial(c.estimatedNetRevenueUsd)+'</td><td>'+money(c.technicalCostUsd,true)+(c.incompleteCostEvents?'<div class="tiny muted">Coût partiel</div>':'')+'</td><td>'+money(c.acquisitionCostUsd)+'</td><td class="'+(c.estimatedMarginUsd<0?'money-negative':'')+'">'+(connected?money(c.estimatedMarginUsd,true):'—')+'</td></tr>').join('') || '<tr><td colspan="6"><div class="empty">Aucune donnée financière par utilisateur pour cette période.</div></td></tr>';
}
function renderQuality() {
 const s=data.summary,h=data.health,total=s.translations+s.failures,errors=data.failures.reduce((n,r)=>n+r.count,0);
 $('qualityStats').innerHTML=metric('Traductions reçues',count(s.translations),'Résultats signalés par l’app')+metric('Erreurs de traduction',count(s.failures),'Événements d’échec reçus')+metric('Part de résultats reçus',total?percent(s.translations/total):'—','Parmi les résultats et échecs reçus')+metric('Problèmes signalés',count(errors),'Traduction, achat et technique');
 $('failureRows').innerHTML=data.failures.map(r=>'<div class="source-line"><div><strong>'+esc(failureNames[r.stage]||labelValue(r.stage))+'</strong><p class="tiny muted">'+esc(names[r.event]||r.event)+'</p></div><span class="tag bad">'+count(r.count)+'</span></div>').join('') || '<div class="empty">Aucune erreur reçue sur cette période.</div>';
 $('languageRows').innerHTML=data.languages.map(r=>'<div class="source-line"><div><strong>'+esc(language(r.locale))+'</strong><p class="tiny muted">'+count(r.translations)+' traductions reçues</p></div><span class="tag">'+count(r.users)+' utilisateurs</span></div>').join('') || '<div class="empty">Aucune langue d’interface reçue.</div>';
 const source=(label,text,status)=>'<div class="source-line"><div><strong>'+label+'</strong><p class="small muted">'+esc(text)+'</p></div><span class="tag '+status[0]+'">'+status[1]+'</span></div>';
 $('sourceHealth').innerHTML=source('Événements de l’app','Dernier reçu : '+date(h.lastAppEventAt),h.lastAppEventAt?['good','Reçus']:['warn','En attente'])+source('Achats RevenueCat','Dernier reçu : '+date(h.lastWebhookAt),!h.webhookConfigured?['warn','À configurer']:h.lastWebhookAt?['good','Reçus']:['','En attente'])+source('Détails des sessions',count(h.detailedEvents)+' événements détaillés sur '+count(h.appEvents),h.detailedEvents?['good','Disponibles']:['','Ancienne version'])+source('Événements Sandbox','Exclus des revenus et essais de production',['',count(h.sandboxEvents)])+source('Début de l’historique',date(h.firstEventAt),['','Données reçues']);
 $('countryRows').innerHTML=data.countries.map(c=>'<tr><td>'+esc(country(c.code))+'</td><td>'+count(c.users)+'</td><td>'+count(c.trials)+'</td><td>'+money(c.revenueUsd)+'</td></tr>').join('') || '<tr><td colspan="4"><div class="empty">Aucun pays transmis pour cette période.</div></td></tr>';
}
function renderInsights() {
 const s=data.summary,f=data.funnel,h=data.health,items=[];
 if(!s.users)items.push(['Premières données en attente','Le tableau se remplira à mesure que l’app enverra des événements.','']);
 else items.push([count(s.users)+' utilisateurs observés',count(data.economics.newUsers)+' sont observés pour la première fois sur cette période.','']);
 if(f.introduction)items.push([percent((f.access||0)/f.introduction)+' atteignent un accès confirmé',count(f.access||0)+' sur '+count(f.introduction)+' utilisateurs ayant commencé le paywall.','']);
 if(s.trials)items.push([count(s.trials)+' essais réellement commencés','Confirmations RevenueCat en production ; les clics seuls sont exclus.','']);
 if(s.failures)items.push([count(s.failures)+(s.failures===1?' erreur de traduction à examiner':' erreurs de traduction à examiner'),'Ouvrez Qualité de service pour identifier les étapes concernées.','warn']);
 if(data.economics.incompleteCostEvents)items.push(['Certains coûts sont incomplets','La marge affichée peut surestimer le résultat. Consultez Revenus et coûts.','warn']);
 if(!h.lastWebhookAt)items.push(['Aucun événement d’achat reçu',h.webhookConfigured?'Le webhook est configuré. Cela ne garantit pas qu’une vente ait déjà eu lieu.':'La confirmation RevenueCat doit être configurée pour mesurer les achats.','warn']);
 if(!h.detailedEvents)items.push(['Le suivi détaillé se prépare','Les actions déjà transmises sont consultables. Les données manquantes ne peuvent pas être récupérées rétroactivement.','']);
 $('insights').innerHTML=items.slice(0,5).map(i=>'<div class="insight"><span class="insight-bullet '+i[2]+'">'+(i[2]?'!':'↗')+'</span><div><h3>'+esc(i[0])+'</h3><p>'+esc(i[1])+'</p></div></div>').join('');
}
async function openJourney(id) {
 if(journeyController)journeyController.abort();journeyController=new AbortController();const controller=journeyController;
 journeyId=id;activeJourney=null;focusBeforeDrawer=document.activeElement;
 $('journeyDrawer').hidden=false;$('drawerBackdrop').hidden=false;$('app').inert=true;document.body.style.overflow='hidden';$('closeJourney').focus();
 $('journeyTitle').textContent=person(id);$('journeyCount').textContent='Chargement du parcours…';$('exportJourney').disabled=true;
 const c=data.customers.find(c=>c.installationId===id);
 $('journeyMeta').innerHTML='<p class="tiny muted" style="overflow-wrap:anywhere">'+esc(id)+'</p>'+(c?'<div class="chips"><span class="tag">'+esc(language(c.locale))+'</span><span class="tag">'+(c.build?'Build '+esc(c.build):'Build non transmis')+'</span><span class="tag">Première activité : '+esc(date(c.firstSeenAt))+'</span></div>':'');
 $('journeyBody').innerHTML='<div class="empty">Lecture des événements…</div>';
 const timeout=setTimeout(()=>controller.abort(),25000);
 try {
  const result=await getJson('/api/admin/analytics/journey?installation='+encodeURIComponent(id)+'&period='+data.period,controller.signal);
  if(journeyId!==id)return;activeJourney=result;$('exportJourney').disabled=!result.events.length;
  $('journeyCount').textContent=(result.hasMore?'500 dernières actions':count(result.events.length)+' actions')+' · plus récentes d’abord';
  let group='';const html=result.events.map(e=>{
   const current=e.sessionId||'legacy',dateGroup=e.timestamp?day(e.timestamp):'Date inconnue',key=current+dateGroup;
   let header='';if(key!==group){group=key;header='<li class="session-heading">'+esc(dateGroup)+'<p class="tiny muted">'+(e.sessionId?'Session · '+esc(e.sessionId.slice(-8)):(e.event.startsWith('revenuecat_')?'Confirmation du service d’abonnement':'Session non transmise par cette version'))+'</p></li>';}
   const details=eventDetails(e);const technical=Object.entries(e.properties).filter(([key])=>key!=='session_id').map(([key,value])=>key+' : '+value).join('\n');
   return header+'<li><time datetime="'+esc(e.timestamp)+'">'+esc(date(e.timestamp,true))+'</time><div class="event-title">'+esc(eventTitle(e))+'</div>'+(details.length?'<div class="chips">'+details.map(v=>'<span class="tag">'+esc(v)+'</span>').join(''):'')+(technical?'<details><summary>Détails techniques</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px">'+esc(technical)+'</pre></details>':'')+'</li>';
  }).join('');
  $('journeyBody').innerHTML=html?'<ol class="timeline">'+html+'</ol>'+(result.hasMore?'<p class="small muted">Limité aux 500 dernières actions de la période sélectionnée.</p>':''):'<div class="empty">Aucune action détaillée reçue pour cette installation sur la période.</div>';
 } catch(error) {if(journeyId===id){$('journeyCount').textContent='Parcours indisponible';$('journeyBody').innerHTML='<div class="empty">'+esc(error.name==='AbortError'?'La lecture a pris trop de temps. Fermez puis rouvrez ce parcours.':error.message)+'</div>';}}
 finally {clearTimeout(timeout);}
}
function closeJourney(){journeyId=null;activeJourney=null;if(journeyController)journeyController.abort();$('journeyDrawer').hidden=true;$('drawerBackdrop').hidden=true;$('app').inert=false;document.body.style.overflow='';if(focusBeforeDrawer&&document.contains(focusBeforeDrawer))focusBeforeDrawer.focus();}
function csvDownload(name, rows){
 const cell=value=>{let s=String(value==null?'':value);if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
 const csv='\uFEFF'+rows.map(row=>row.map(cell).join(';')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('exportPeople').addEventListener('click',()=>csvDownload('nevi-utilisateurs-'+data.period+'j.csv',[['Installation','Première activité UTC','Dernière activité UTC','Langue','Actions reçues','Sessions identifiées','Traductions','Essais confirmés','Paiements','Ventes USD','Coût IA estimé USD','Marge estimée USD'],...visiblePeople().map(c=>[c.installationId,c.firstSeenAt,c.lastSeenAt,c.locale,c.events,c.sessions,c.translations,data.health.webhookConfigured?c.trials:'',data.health.webhookConfigured?c.charges:'',data.health.webhookConfigured?c.grossRevenueUsd:'',c.technicalCostUsd,data.health.webhookConfigured?c.estimatedMarginUsd:''])]));
$('exportJourney').addEventListener('click',()=>{if(activeJourney)csvDownload('nevi-parcours-'+String(journeyId).replace(/[^a-zA-Z0-9_-]/g,'_')+'.csv',[['Date UTC','Installation','Session','Événement','Libellé','Propriétés techniques'],...activeJourney.events.map(e=>[e.timestamp,e.installationId,e.sessionId,e.event,eventTitle(e),JSON.stringify(e.properties)])]);});
$('loginForm').addEventListener('submit',async event=>{event.preventDefault();token=$('accessCode').value.trim();if(!token)return;const button=$('loginForm').querySelector('button');button.disabled=true;$('loginError').hidden=true;await refresh();button.disabled=false;});
function logout(){if(requestController)requestController.abort();token='';data=null;try{localStorage.removeItem('nevi-pulse-token');}catch(_){}$('accessCode').value='';showLogin();}
$('logout').addEventListener('click',logout);$('mobileLogout').addEventListener('click',logout);
$('refresh').addEventListener('click',refresh);
$('period').addEventListener('change',async()=>{if(requestController&&busy)requestController.abort();while(busy)await new Promise(resolve=>setTimeout(resolve,25));closeJourney();refresh();});
$('peopleSearch').addEventListener('input',renderPeople);
$('quickSearch').addEventListener('click',()=>{navigate('people');$('peopleSearch').focus();});
$('closeJourney').addEventListener('click',closeJourney);$('drawerBackdrop').addEventListener('click',closeJourney);
let rotation=-20, paused=matchMedia('(prefers-reduced-motion: reduce)').matches, drag=null,lastFrame=0,frame=0;
const globe=$('globe'),ctx=globe.getContext('2d');
let globeVisible=true;
if(typeof IntersectionObserver!=='undefined')new IntersectionObserver(entries=>{globeVisible=entries[0].isIntersecting;}).observe(globe);
function setPause(value){paused=value;$('globePause').textContent=paused?'▶':'Ⅱ';$('globePause').setAttribute('aria-label',paused?'Reprendre la rotation':'Mettre la rotation en pause');}
setPause(paused);
function drawGlobe(){
 if(!ctx || page!=='overview' || $('app').hidden)return;
 const box=globe.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=box.width,h=box.height;if(!w||!h)return;
 if(globe.width!==Math.round(w*dpr)||globe.height!==Math.round(h*dpr)){globe.width=Math.round(w*dpr);globe.height=Math.round(h*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);const cx=w/2,cy=h/2,r=Math.min(w*.38,h*.445),tilt=.17;
 const project=(lon,lat)=>{const la=lat*Math.PI/180,lo=(lon+rotation)*Math.PI/180;const xx=Math.cos(la)*Math.sin(lo),yy=Math.sin(la),zz=Math.cos(la)*Math.cos(lo);return [cx+r*xx,cy-r*(yy*Math.cos(tilt)-zz*Math.sin(tilt)),yy*Math.sin(tilt)+zz*Math.cos(tilt)];};
 const glow=ctx.createRadialGradient(cx,cy,r*.7,cx,cy,r*1.17);glow.addColorStop(0,'rgba(31,114,74,.17)');glow.addColorStop(1,'rgba(31,114,74,0)');ctx.fillStyle=glow;ctx.fillRect(0,0,w,h);
 ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();const ocean=ctx.createRadialGradient(cx-r*.4,cy-r*.45,0,cx,cy,r*1.2);ocean.addColorStop(0,'#164837');ocean.addColorStop(1,'#071e17');ctx.fillStyle=ocean;ctx.fillRect(cx-r,cy-r,r*2,r*2);
 ctx.strokeStyle='rgba(113,180,142,.10)';ctx.lineWidth=.5;
 function grid(points){ctx.beginPath();let visible=false;points.forEach(p=>{const q=project(p[0],p[1]);if(q[2]>0){if(visible)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1]);visible=true;}else visible=false;});ctx.stroke();}
 for(let lat=-60;lat<=60;lat+=30){const points=[];for(let lon=-180;lon<=180;lon+=3)points.push([lon,lat]);grid(points);}
 for(let lon=-180;lon<180;lon+=30){const points=[];for(let lat=-90;lat<=90;lat+=3)points.push([lon,lat]);grid(points);}
 NEVI_GLOBE.land.forEach(p=>{const q=project(p[0],p[1]);if(q[2]<=0)return;ctx.fillStyle='rgba(132,204,157,'+(.15+.6*q[2])+')';ctx.beginPath();ctx.arc(q[0],q[1],Math.max(.45,r*.0064)*(.55+.45*q[2]),0,Math.PI*2);ctx.fill();});
 if(data)data.countries.forEach(c=>{const location=NEVI_GLOBE.countries.find(p=>p.code===c.code);if(!location)return;const q=project(location.lon,location.lat);if(q[2]<0)return;ctx.fillStyle='rgba(176,255,158,.16)';ctx.beginPath();ctx.arc(q[0],q[1],8,0,Math.PI*2);ctx.fill();ctx.fillStyle='#c5ff9f';ctx.beginPath();ctx.arc(q[0],q[1],2.8,0,Math.PI*2);ctx.fill();});
 ctx.restore();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.strokeStyle='rgba(123,176,145,.35)';ctx.lineWidth=.7;ctx.stroke();
}
function animate(now){frame=requestAnimationFrame(animate);if(document.hidden||!globeVisible||page!=='overview'||$('app').hidden){lastFrame=now;return;}if(now-lastFrame<40)return;if(!paused&&!drag){rotation+=(Math.min(now-lastFrame,100)/1000)*2.6;drawGlobe();}lastFrame=now;}
frame=requestAnimationFrame(animate);
globe.addEventListener('pointerdown',event=>{drag={x:event.clientX,rotation};globe.setPointerCapture(event.pointerId);setPause(true);});
globe.addEventListener('pointermove',event=>{if(drag){rotation=drag.rotation+(event.clientX-drag.x)*.45;drawGlobe();}});
['pointerup','pointercancel'].forEach(name=>globe.addEventListener(name,()=>drag=null));
$('globePause').addEventListener('click',()=>setPause(!paused));$('globeReset').addEventListener('click',()=>{rotation=-20;drawGlobe();});
window.addEventListener('resize',drawGlobe);
document.addEventListener('click',event=>{const target=event.target.closest('button');if(!target)return;if(target.dataset.page||target.dataset.nav)navigate(target.dataset.page||target.dataset.nav);if(target.dataset.chart){chartKey=target.dataset.chart;renderChart();}if(target.dataset.filter){filter=target.dataset.filter;renderPeople();}if(target.dataset.person)openJourney(target.dataset.person);if(target.dataset.country){const c=NEVI_GLOBE.countries.find(c=>c.code===target.dataset.country);if(c){rotation=-c.lon;setPause(true);drawGlobe();}}});
document.addEventListener('keydown',event=>{if($('journeyDrawer').hidden)return;if(event.key==='Escape')closeJourney();if(event.key==='Tab'){const items=Array.from($('journeyDrawer').querySelectorAll('button:not([disabled]),summary,[tabindex="0"]'));const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}}});
setInterval(()=>{if(!document.hidden&&token&&!journeyId)refresh();},30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&token&&!journeyId)refresh();});
if(token){$('app').hidden=false;refresh();}else showLogin();
})();
`;
