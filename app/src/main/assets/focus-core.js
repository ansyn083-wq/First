(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.FocusCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
/*
 Focus timer and study-time statistics. Pure functions only; saving and rendering belong to focus-ui.
 Time is measured from wall-clock timestamps (ms), so a timer stays correct while the WebView is paused
 or the phone is locked. A session is attributed to the local calendar day on which it started.
 State shape (S.focus):
  active:   null | {id, mode:'pomodoro'|'stopwatch', subject, minutes, taskId, taskTitle, startedAt, pausedMs, pausedAt}
  sessions: [{id, subject, start, end, minutes, mode:'pomodoro'|'stopwatch'|'manual', taskTitle, note}]
  settings: {minutes}
*/
const SUBJECTS=Object.freeze(['数学','英语','政治','专业课','其他']);
const PRESETS=Object.freeze([15,25,45,60]);
const MIN=60000,DAY=86400000,MAX_SESSIONS=5000,STOPWATCH_CAP=240,MANUAL_MAX=600,POMODORO_MAX=180;
const isTime=v=>Number.isSafeInteger(v)&&v>0;
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d));
 return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;
}
function localDay(ms){const d=new Date(ms);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function addDays(date,n){const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)+n*DAY).toISOString().slice(0,10);}
function weekStart(date){const [y,m,d]=date.split('-').map(Number),wd=new Date(Date.UTC(y,m-1,d)).getUTCDay();return addDays(date,-((wd+6)%7));}
function subject(value){return SUBJECTS.includes(value)?value:'其他';}
function text(value,max){return typeof value==='string'?value.trim().slice(0,max):'';}
// 0 means invalid; values above max are capped (callers that must reject them check before calling).
function clampMinutes(value,max){const n=Math.round(Number(value));return Number.isFinite(n)&&n>=1?Math.min(max,n):0;}
function newId(now){return 'f-'+Number(now).toString(36)+'-'+Math.random().toString(36).slice(2,8);}

function cleanActive(a){
 if(!a||typeof a!=='object'||!isTime(a.startedAt))return null;
 const mode=a.mode==='stopwatch'?'stopwatch':'pomodoro',out={id:text(a.id,100)||newId(a.startedAt),mode,subject:subject(a.subject),minutes:mode==='pomodoro'?clampMinutes(a.minutes,POMODORO_MAX)||25:0,taskId:text(a.taskId,100),taskTitle:text(a.taskTitle,200),startedAt:a.startedAt,pausedMs:Number.isSafeInteger(a.pausedMs)&&a.pausedMs>0?a.pausedMs:0,pausedAt:isTime(a.pausedAt)&&a.pausedAt>=a.startedAt?a.pausedAt:0};
 return out;
}
function cleanSession(s){
 if(!s||typeof s!=='object'||typeof s.id!=='string'||!s.id||s.id.length>100||!isTime(s.start))return null;
 const minutes=clampMinutes(s.minutes,MANUAL_MAX);if(!minutes)return null;
 const end=isTime(s.end)&&s.end>=s.start?s.end:s.start+minutes*MIN;
 return {id:s.id,subject:subject(s.subject),start:s.start,end,minutes,mode:['pomodoro','stopwatch','manual'].includes(s.mode)?s.mode:'manual',taskTitle:text(s.taskTitle,200),note:text(s.note,200)};
}
// Sanitises stored or restored data; unknown values are dropped, never guessed.
function normalize(value){
 const v=value&&typeof value==='object'?value:{},seen=new Set(),sessions=[];
 for(const raw of Array.isArray(v.sessions)?v.sessions:[]){const s=cleanSession(raw);if(s&&!seen.has(s.id)){seen.add(s.id);sessions.push(s);}}
 sessions.sort((a,b)=>a.start-b.start);
 const preset=clampMinutes(v.settings?.minutes,POMODORO_MAX);
 return {active:cleanActive(v.active),sessions:sessions.slice(-MAX_SESSIONS),settings:{minutes:preset||25}};
}

function elapsedMs(active,now){
 if(!active)return 0;
 const until=active.pausedAt||now;
 return Math.max(0,until-active.startedAt-active.pausedMs);
}
function plannedMs(active){return active&&active.mode==='pomodoro'?active.minutes*MIN:0;}
function remainingMs(active,now){return active&&active.mode==='pomodoro'?Math.max(0,plannedMs(active)-elapsedMs(active,now)):0;}
function overdue(active,now){return !!active&&active.mode==='pomodoro'&&!active.pausedAt&&elapsedMs(active,now)>=plannedMs(active);}
function clock(ms){const total=Math.max(0,Math.floor(ms/1000)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return (h?h+':'+String(m).padStart(2,'0'):String(m).padStart(2,'0'))+':'+String(s).padStart(2,'0');}

function start(focus,options,now){
 const f=normalize(focus);if(f.active)throw Error('已有正在进行的专注');
 if(!isTime(now))throw Error('时间无效');
 const mode=options?.mode==='stopwatch'?'stopwatch':'pomodoro',minutes=mode==='pomodoro'?clampMinutes(options?.minutes,POMODORO_MAX):0;
 if(mode==='pomodoro'&&!minutes)throw Error('请设置 1 到 '+POMODORO_MAX+' 分钟');
 return {...f,active:{id:newId(now),mode,subject:subject(options?.subject),minutes,taskId:text(options?.taskId,100),taskTitle:text(options?.taskTitle,200),startedAt:now,pausedMs:0,pausedAt:0},settings:mode==='pomodoro'?{...f.settings,minutes}:f.settings};
}
function pause(focus,now){const f=normalize(focus);if(!f.active||f.active.pausedAt)return f;return {...f,active:{...f.active,pausedAt:Math.max(f.active.startedAt,now)}};}
function resume(focus,now){const f=normalize(focus);if(!f.active||!f.active.pausedAt)return f;return {...f,active:{...f.active,pausedMs:f.active.pausedMs+Math.max(0,now-f.active.pausedAt),pausedAt:0}};}
/*
 Ends the active timer. A pomodoro that ran past its length (e.g. while the app was in the background) is
 recorded at its planned length, ending when it would have ended. A stopwatch is capped at STOPWATCH_CAP
 minutes so a forgotten timer cannot inflate statistics. Under one minute nothing is recorded.
 Returns {focus, session, reason}: reason is 'completed' | 'stopped' | 'capped' | 'short' | 'none'.
*/
function finish(focus,now){
 const f=normalize(focus),a=f.active;if(!a)return {focus:f,session:null,reason:'none'};
 let ms=elapsedMs(a,now),reason='stopped',end=a.pausedAt||now;
 if(a.mode==='pomodoro'&&ms>=plannedMs(a)){reason='completed';ms=plannedMs(a);end=a.startedAt+a.pausedMs+ms;}
 else if(a.mode==='stopwatch'&&ms>STOPWATCH_CAP*MIN){reason='capped';ms=STOPWATCH_CAP*MIN;end=a.startedAt+a.pausedMs+ms;}
 const minutes=Math.floor(ms/MIN),rest={...f,active:null};
 if(minutes<1)return {focus:rest,session:null,reason:'short'};
 const session={id:a.id,subject:a.subject,start:a.startedAt,end,minutes,mode:a.mode,taskTitle:a.taskTitle,note:''};
 return {focus:{...rest,sessions:rest.sessions.concat(session).sort((x,y)=>x.start-y.start).slice(-MAX_SESSIONS)},session,reason};
}
function discard(focus){return {...normalize(focus),active:null};}
// Records study time done away from the timer. Placed at 12:00 local time on the chosen day.
function addManual(focus,input,now){
 const f=normalize(focus);if(!validDate(input?.date))throw Error('请选择日期');
 if(input.date>localDay(now))throw Error('不能补记未来的日期');
 const minutes=clampMinutes(input.minutes,MANUAL_MAX);if(!minutes||Number(input.minutes)>MANUAL_MAX)throw Error('时长请填写 1 到 '+MANUAL_MAX+' 分钟');
 const [y,m,d]=input.date.split('-').map(Number),startAt=new Date(y,m-1,d,12,0,0).getTime();
 const session={id:newId(now),subject:subject(input.subject),start:startAt,end:startAt+minutes*MIN,minutes,mode:'manual',taskTitle:'',note:text(input.note,200)};
 return {...f,sessions:f.sessions.concat(session).sort((a,b)=>a.start-b.start).slice(-MAX_SESSIONS)};
}
function remove(focus,id){const f=normalize(focus);return {...f,sessions:f.sessions.filter(s=>s.id!==id)};}

// Totals between two local dates inclusive: overall, per subject (fixed order), per day.
function summary(sessions,from,to){
 if(!validDate(from)||!validDate(to))throw Error('日期无效');
 const bySubject=Object.fromEntries(SUBJECTS.map(s=>[s,0])),byDay={};let total=0,count=0;
 for(let d=from;d<=to;d=addDays(d,1))byDay[d]={total:0,subjects:{}};
 for(const s of Array.isArray(sessions)?sessions:[]){const d=localDay(s.start);if(d<from||d>to)continue;total+=s.minutes;count++;bySubject[subject(s.subject)]+=s.minutes;const day=byDay[d];day.total+=s.minutes;day.subjects[subject(s.subject)]=(day.subjects[subject(s.subject)]||0)+s.minutes;}
 return {total,count,bySubject,byDay};
}
// Consecutive days with recorded time, ending today (or yesterday when today has none yet).
function streak(sessions,today){
 if(!validDate(today))throw Error('日期无效');
 const days=new Set((Array.isArray(sessions)?sessions:[]).map(s=>localDay(s.start)));
 let d=days.has(today)?today:addDays(today,-1),n=0;while(days.has(d)){n++;d=addDays(d,-1);}
 return n;
}
function duration(minutes){const m=Math.max(0,Math.round(minutes||0)),h=Math.floor(m/60);return h?h+' 小时'+(m%60?' '+m%60+' 分':''):m+' 分钟';}

return {SUBJECTS,PRESETS,STOPWATCH_CAP,MANUAL_MAX,POMODORO_MAX,validDate,localDay,addDays,weekStart,normalize,elapsedMs,remainingMs,overdue,clock,start,pause,resume,finish,discard,addManual,remove,summary,streak,duration};
});
