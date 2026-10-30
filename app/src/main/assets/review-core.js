(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ReviewCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
/*
 Spaced review for mistakes. Pure functions only; saving belongs to review-ui.
 A mistake is first due one day after it was recorded (or last redone). Each correct redo moves it to the next
 interval; a wrong redo starts over tomorrow. After the last interval it counts as mastered and is no longer due.
 Fields on a mistake: reviewStage (0..INTERVALS.length), nextReview (YYYY-MM-DD), reviewMastered (true when done).
*/
const INTERVALS=Object.freeze([1,2,4,7,15,30]),MAX_STAGE=INTERVALS.length,DAY=86400000;
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const [y,m,d]=value.split('-').map(Number),t=new Date(Date.UTC(y,m-1,d));
 return t.getUTCFullYear()===y&&t.getUTCMonth()===m-1&&t.getUTCDate()===d;
}
function addDays(date,n){
 if(!validDate(date)||!Number.isSafeInteger(n))throw Error('日期无效');
 const [y,m,d]=date.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)+n*DAY).toISOString().slice(0,10);
}
// Records store timestamps as ISO strings or Date#toString(); compare by the user's local calendar day.
function localDay(value){
 if(validDate(value))return value;
 const t=new Date(typeof value==='string'?value:NaN);if(!Number.isFinite(t.getTime()))return '';
 return t.getFullYear()+'-'+String(t.getMonth()+1).padStart(2,'0')+'-'+String(t.getDate()).padStart(2,'0');
}
function stage(item){return Number.isInteger(item?.reviewStage)&&item.reviewStage>=0?Math.min(MAX_STAGE,item.reviewStage):0;}
function dueDate(item){
 if(!item||item.reviewMastered===true)return '';
 if(validDate(item.nextReview))return item.nextReview;
 const base=localDay(item.lastReview)||localDay(item.created);
 return base?addDays(base,INTERVALS[0]):'';
}
function isDue(item,today){const due=dueDate(item);return !!due&&validDate(today)&&due<=today;}
function due(mistakes,today){
 if(!validDate(today))throw Error('日期无效');
 return (Array.isArray(mistakes)?mistakes:[]).filter(m=>m&&typeof m.id==='string'&&isDue(m,today))
  .sort((a,b)=>dueDate(a).localeCompare(dueDate(b))||String(a.created||'').localeCompare(String(b.created||'')));
}
// Returns only the scheduling fields to merge into the mistake.
function advance(item,today,correct){
 if(!validDate(today))throw Error('日期无效');
 if(!correct)return {reviewStage:0,nextReview:addDays(today,INTERVALS[0]),reviewMastered:false};
 const next=Math.min(MAX_STAGE,stage(item)+1);
 return next>=MAX_STAGE?{reviewStage:MAX_STAGE,nextReview:'',reviewMastered:true}:{reviewStage:next,nextReview:addDays(today,INTERVALS[next]),reviewMastered:false};
}
function describe(item){
 if(item?.reviewMastered===true)return '已完成全部复习轮次';
 const s=stage(item),d=dueDate(item);return (s?'已连续做对 '+s+' 次':'尚未复习')+(d?' · 下次 '+d:'');
}
const count=v=>Number.isSafeInteger(v)&&v>0?Math.min(v,100000):0;
// Lifetime redo outcomes, kept separately from scheduling so a wrong answer's history survives the reset.
function tally(item,correct){return correct?{reviewPasses:count(item?.reviewPasses)+1}:{reviewFails:count(item?.reviewFails)+1};}
// Sanitises scheduling fields from backups or older data; unknown values are dropped, never guessed.
function clean(source){
 const out={};if(!source||typeof source!=='object')return out;
 if(Number.isInteger(source.reviewStage)&&source.reviewStage>=0&&source.reviewStage<=MAX_STAGE)out.reviewStage=source.reviewStage;
 if(validDate(source.nextReview))out.nextReview=source.nextReview;
 if(source.reviewMastered===true)out.reviewMastered=true;
 for(const k of ['reviewPasses','reviewFails'])if(count(source[k]))out[k]=count(source[k]);
 return out;
}
const NO_CHAPTER='未填写知识点';
function chapterKey(value){return String(value||'').normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();}
/*
 Groups mistakes by subject and chapter / knowledge point and orders them weakest first:
 most not-yet-mastered, then most wrong redos, then most due today, then most mistakes.
 Only recorded facts are counted; nothing is inferred about mastery beyond the review schedule.
*/
function weakPoints(mistakes,today){
 if(!validDate(today))throw Error('日期无效');
 const groups=new Map(),subjects=new Map();
 for(const m of Array.isArray(mistakes)?mistakes:[]){
  if(!m||typeof m.id!=='string')continue;
  const subject=String(m.subject||'待确认'),label=String(m.chapter||'').trim()||NO_CHAPTER,key=subject+'\u0000'+(label===NO_CHAPTER?'':chapterKey(label));
  if(!groups.has(key))groups.set(key,{key,subject,chapter:label,total:0,mastered:0,due:0,fails:0,passes:0,ids:[]});
  const g=groups.get(key),done=m.reviewMastered===true;
  g.total++;if(done)g.mastered++;if(isDue(m,today))g.due++;g.fails+=count(m.reviewFails);g.passes+=count(m.reviewPasses);g.ids.push(m.id);
  if(!subjects.has(subject))subjects.set(subject,{subject,total:0,mastered:0,due:0});
  const s=subjects.get(subject);s.total++;if(done)s.mastered++;if(isDue(m,today))s.due++;
 }
 const points=[...groups.values()].map(g=>({...g,open:g.total-g.mastered})).sort((a,b)=>b.open-a.open||b.fails-a.fails||b.due-a.due||b.total-a.total||a.chapter.localeCompare(b.chapter,'zh-CN'));
 return {points,subjects:[...subjects.values()].sort((a,b)=>b.total-a.total)};
}
return {INTERVALS,MAX_STAGE,NO_CHAPTER,validDate,addDays,localDay,dueDate,isDue,due,advance,describe,clean,tally,chapterKey,weakPoints};
});
