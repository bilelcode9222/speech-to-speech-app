import type { AnalyticsProperties } from './analyticsStore';
export const CLIENT_ANALYTICS_EVENTS = new Set([
 'app_opened','app_resumed','app_backgrounded','session_heartbeat','screen_viewed','screen_left','button_pressed',
 'onboarding_viewed','onboarding_step_completed','onboarding_completed','paywall_step_viewed','trial_reminder_permission','paywall_opened',
 'subscription_plan_selected','subscription_purchase_started','subscription_purchased','subscription_restored','subscription_purchase_failed','subscription_purchase_cancelled',
 'subscription_restore_started','subscription_restore_result','subscription_backend_sync_delayed','trial_eligibility_checked',
 'translation_recording_started','recording_stopped','recording_cancelled','translation_requested','translation_stage_completed','translation_completed','translation_failed',
 'audio_playback_started','audio_playback_completed','face_to_face_mode_changed','language_picker_opened','language_picker_closed','language_selected','languages_swapped','theme_changed',
 'microphone_permission_result','ai_consent_shown','ai_consent_result','legal_link_opened','subscription_management_opened','client_error',
]);
// Only product metadata. Audio, transcripts, translations and arbitrary error messages are never accepted.
const propertyKeys=new Set(['event_id','session_id','client_time','app_version','app_build','app_locale','app_platform','screen','previous_screen','duration_ms','step','total_steps','plan','product_id','period_type','granted','enabled','source_language','target_language','speaker_side','failure_stage','failure_reason','error_code','operation','button','result','reason','recording_duration_ms','request_id','elapsed_ms','trial_eligible','stage','field','previous_language','language','theme','face_to_face','is_premium','trigger','source']);
export function safeAnalyticsProperties(value:unknown):AnalyticsProperties|null {
 if(value==null)return {};
 if(typeof value!=='object'||Array.isArray(value))return null;
 const entries=Object.entries(value);if(entries.length>45)return null;
 const safe:AnalyticsProperties={};
 for(const [key,item] of entries){
  if(!propertyKeys.has(key))continue;
  if(typeof item==='string'&&item.length<=80)safe[key]=item;
  else if(typeof item==='number'&&Number.isFinite(item))safe[key]=item;
  else if(typeof item==='boolean'||item===null)safe[key]=item;
  else return null;
 }
 for(const key of ['event_id','session_id'])if(safe[key]!=null&&(typeof safe[key]!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(safe[key] as string)))return null;
 return safe;
}
export function clientEventTime(properties:AnalyticsProperties,now=Date.now()):string|undefined {
 if(typeof properties.client_time!=='string')return undefined;
 const time=Date.parse(properties.client_time);
 // Old clients use server receipt time. Future/offline timestamps stay bounded.
 return Number.isFinite(time)&&time>=now-7*86400000&&time<=now+300000?new Date(time).toISOString():undefined;
}
