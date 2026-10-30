(function(root,factory){
 if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));
 else root.PlannerCore=factory(root.Core);
})(typeof globalThis!=='undefined'?globalThis:this,function(Core){
'use strict';
if(!Core||typeof Core.taskParts!=='function')throw Error('学习规划需要Core');
// Verified first exam days, keyed by admission year (考研年份 Y sits its exam in December of Y-1).
// Add a row only after the Ministry of Education announcement; unknown years are never guessed.
const OFFICIAL_DATES=Object.freeze({2027:'2026-12-19'}),FALLBACK_YEAR=2027,DAY=86400000;
const object=value=>value&&typeof value==='object'&&!Array.isArray(value)?value:{};
const string=(value,max)=>typeof value==='string'?value.slice(0,max):'';
function dateValue(value){
 const [year,month,day]=value.split('-').map(Number),d=new Date(0);
 d.setUTCFullYear(year,month-1,day);d.setUTCHours(0,0,0,0);return d;
}
function validDate(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||value.slice(0,4)==='0000')return false;
 return dateValue(value).toISOString().slice(0,10)===value;
}
function officialDate(year){return Object.prototype.hasOwnProperty.call(OFFICIAL_DATES,year)?OFFICIAL_DATES[year]:'';}
function defaultYear(today){
 // The nearest exam that has not passed yet. Unknown dates assume the exam is over after 27 December.
 if(!validDate(today))return FALLBACK_YEAR;const year=Number(today.slice(0,4))+1,known=officialDate(year);
 return (known?today>known:today.slice(5)>'12-27')?year+1:year;
}
function requireDate(value){if(!validDate(value))throw Error('日期格式或日期无效');return value;}
function addDays(date,n){
 requireDate(date);if(!Number.isSafeInteger(n))throw Error('天数必须为整数');
 const value=dateValue(date).getTime()+n*DAY;
 if(!Number.isFinite(value)||Math.abs(value)>8640000000000000)throw Error('日期超出范围');
 const next=new Date(value).toISOString().slice(0,10);requireDate(next);return next;
}
function weekRange(anchor,offset=0){
 requireDate(anchor);if(!Number.isSafeInteger(offset))throw Error('周偏移必须为整数');
 const start=addDays(anchor,-((dateValue(anchor).getUTCDay()+6)%7)+offset*7);
 return {start,end:addDays(start,6)};
}
function period(start,end){
 requireDate(start);requireDate(end);if(start>end)throw Error('结束日期不能早于开始日期');
}
function reportPeriod(r){
 if(!validDate(r.start)||!validDate(r.end))return false;
 if(r.kind==='daily')return r.start===r.end;
 if(r.kind==='weekly')return dateValue(r.start).getUTCDay()===1&&(dateValue(r.end).getTime()-dateValue(r.start).getTime())===6*DAY;
 return false;
}
function repeatRevision(t){return Number.isSafeInteger(t.repeatUpdatedAt)&&t.repeatUpdatedAt>=0?t.repeatUpdatedAt:0;}
function atLeastAsNew(a,b){return repeatRevision(a)>repeatRevision(b)||repeatRevision(a)===repeatRevision(b)&&a.date>=b.date;}
function repeatSeeds(value){
 const seeds=new Map();
 for(const raw of Array.isArray(value)?value:[]){
  if(!raw||typeof raw.repeat!=='boolean'||typeof raw.id!=='string'||!raw.id.trim()||raw.id.length>100||!validDate(raw.date)||!Core.subjects.includes(raw.subject)||typeof raw.title!=='string'||!raw.title.trim())continue;
  if(raw.series!==undefined&&(typeof raw.series!=='string'||raw.series.length>100))continue;
  const seed={id:raw.id,title:raw.title.slice(0,60000),subject:raw.subject,date:raw.date,repeat:raw.repeat};
  if(raw.series)seed.series=raw.series;
  if(typeof raw.repeatTitle==='string')seed.repeatTitle=raw.repeatTitle.slice(0,60000);
  if(Number.isSafeInteger(raw.repeatUpdatedAt)&&raw.repeatUpdatedAt>=0)seed.repeatUpdatedAt=raw.repeatUpdatedAt;
  const key=seed.series||seed.id,old=seeds.get(key);
  if(!old||atLeastAsNew(seed,old)){seeds.delete(key);seeds.set(key,seed);}
 }
 return [...seeds.values()].slice(-200);
}
function normalize(value,today=''){
 const v=object(value),e=object(v.exam),year=Number.isInteger(e.year)&&e.year>=2000&&e.year<=2100?e.year:defaultYear(today),official=officialDate(year);
 const date=validDate(e.date)?e.date:!Object.prototype.hasOwnProperty.call(e,'date')&&official&&validDate(today)&&today<=official?official:'';
 const reports=(Array.isArray(v.reports)?v.reports:[]).filter(r=>r&&typeof r==='object'&&reportPeriod(r)&&typeof r.body==='string'&&r.body.trim()).slice(-120).map(r=>({
  id:string(r.id,100),kind:r.kind,start:r.start,end:r.end,body:string(r.body,20000),
  model:string(r.model,200),createdAt:string(r.createdAt,100),signature:string(r.signature,200)
 }));
 const clearedDates=[...new Set((Array.isArray(v.clearedDates)?v.clearedDates:[]).filter(validDate))].slice(-400);
 return {exam:{year,date},autoReports:v.autoReports!==false,reports,clearedDates,repeatSeeds:repeatSeeds(v.repeatSeeds)};
}
function countdown(exam,today){
 requireDate(today);const e=normalize({exam},today).exam;
 if(!e.date)return {...e,days:null,phase:'unset'};
 const days=(dateValue(e.date).getTime()-dateValue(today).getTime())/DAY;
 return {...e,days,phase:days>0?'before':days<0?'past':'today'};
}
function sourceTasks(tasks,start,end){
 if(start!==undefined||end!==undefined)period(start,end);
 return (Array.isArray(tasks)?tasks:[]).filter(t=>t&&typeof t==='object'&&(start===undefined||validDate(t.date)&&t.date>=start&&t.date<=end));
}
function signature(tasks,start,end){
 // Canonical full source, including fields not sent in a bounded report payload.
 const rows=sourceTasks(tasks,start,end).map(t=>JSON.stringify([
  String(t.id||''),String(t.date||''),String(t.title||''),String(t.subject||''),t.done===true,t.repeat===true,
  String(t.repeatTitle||''),Number.isSafeInteger(t.repeatUpdatedAt)?t.repeatUpdatedAt:0,String(t.series||''),
  (Array.isArray(t.parts)?t.parts:[]).filter(p=>p&&typeof p==='object').map(p=>JSON.stringify([String(p.title||''),p.done===true])).sort()
 ])).sort();
 const canonical=JSON.stringify([start||'',end||'',rows]);
 let a=2166136261,b=2246822507;
 for(let i=0;i<canonical.length;i++){const c=canonical.charCodeAt(i);a=Math.imul(a^c,16777619);b=Math.imul(b^c,3266489909);}
 return 'planner-v1-'+(a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0')+'-'+canonical.length;
}
function snapshot(tasks,start,end){
 period(start,end);const input=sourceTasks(tasks,start,end),bySubject={},days=[],dayMap=new Map();
 for(let date=start;;date=addDays(date,1)){const day={date,tasks:[]};days.push(day);dayMap.set(date,day);if(date===end)break;}
 let total=0,done=0,sent=0,truncated=false;
 function bounded(value,max){const raw=String(value||'');if(raw.length>max)truncated=true;return raw.slice(0,max);}
 const ordered=input.slice().sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.id||'').localeCompare(String(b.id||''))||String(a.title||'').localeCompare(String(b.title||'')));
 for(const t of ordered){
  const subject=Core.subjects.includes(t.subject)?t.subject:'其他';
  for(const part of Core.taskParts(t)){
   total++;if(part.done)done++;
   if(!Object.prototype.hasOwnProperty.call(bySubject,subject))bySubject[subject]={total:0,done:0,pending:0};
   const stats=bySubject[subject];stats.total++;stats.done+=part.done?1:0;stats.pending+=part.done?0:1;
   if(sent>=500){truncated=true;continue;}
   dayMap.get(t.date).tasks.push({id:bounded(t.id,100),title:bounded(part.title,240),subject:bounded(t.subject||'其他',80),done:part.done,repeat:t.repeat===true});sent++;
  }
 }
 return {start,end,total,done,pending:total-done,bySubject,days,truncated,signature:signature(tasks,start,end)};
}
function dueReports(planner,tasks,today){
 requireDate(today);const p=normalize(planner,today);if(!p.autoReports)return [];
 const dates=new Set((Array.isArray(tasks)?tasks:[]).filter(t=>t&&validDate(t.date)&&Core.taskParts(t).length).map(t=>t.date)),due=[];
 const exists=(kind,start,end)=>p.reports.some(r=>r.kind===kind&&r.start===start&&r.end===end);
 for(let offset=1;offset<=7;offset++){
  const date=addDays(today,-offset);if(!dates.has(date))continue;
  if(!exists('daily',date,date))due.push({kind:'daily',start:date,end:date});break;
 }
 for(let offset=1;offset<=4;offset++){
  const range=weekRange(today,-offset);let hasTasks=false;
  for(let day=0;day<7;day++)if(dates.has(addDays(range.start,day))){hasTasks=true;break;}
  if(!hasTasks)continue;
  if(!exists('weekly',range.start,range.end))due.push({kind:'weekly',...range});break;
 }
 return due;
}
function clearDay(state,date){
 requireDate(date);const source=object(state),planner=normalize(source.planner);
 const tasks=Array.isArray(source.tasks)?source.tasks:[],removed=tasks.filter(t=>t&&t.date===date);
 const seedKeys=new Set(planner.repeatSeeds.map(t=>t.series||t.id));
 const templates=removed.filter(t=>t.repeat===true||seedKeys.has(t.series||t.id)||typeof t.series==='string'&&t.series||Number.isSafeInteger(t.repeatUpdatedAt)&&t.repeatUpdatedAt>=0).map(t=>({...t,repeat:t.repeat===true}));
 // A cancelled chain needs a tombstone after its last visible task is cleared.
 planner.repeatSeeds=repeatSeeds(planner.repeatSeeds.concat(templates));
 planner.clearedDates=[...planner.clearedDates.filter(d=>d!==date),date].slice(-400);
 return {...source,tasks:tasks.filter(t=>!t||t.date!==date),planner};
}
function validatePlan(parsed,anchor){
 const data=object(parsed),range=weekRange(anchor,1);
 if(!Array.isArray(data.days)||data.days.length!==7)throw Error('计划必须包含下一周的完整7天');
 const note=data.note===undefined?'':data.note;
 if(typeof note!=='string'||note.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(note))throw Error('计划说明格式无效或过长');
 const seen=new Set(),days=[];
 for(const day of data.days){
  if(!day||!validDate(day.date)||day.date<range.start||day.date>range.end||seen.has(day.date))throw Error('计划日期重复、无效或不在下一周');
  seen.add(day.date);
  if(!Array.isArray(day.tasks)||day.tasks.length>12)throw Error('每日任务必须为数组且最多12条');
  let partsCount=0;
  const tasks=day.tasks.map(raw=>{
   if(!raw||typeof raw.title!=='string'||!raw.title.trim()||raw.title.length>240||/[\u0000-\u001f\u007f]/.test(raw.title))throw Error('任务标题无效或超过240字');
   if(!Core.subjects.includes(raw.subject)||raw.subject==='待确认')throw Error('任务科目无效');
   if(raw.repeat!==undefined&&raw.repeat!==false)throw Error('下周任务不可自动重复');
   if(raw.date!==undefined&&raw.date!==day.date)throw Error('任务日期与所在日不一致');
   const count=Core.taskParts(raw).length;partsCount+=count;
   if(!count||partsCount>12)throw Error('每日任务必须有内容且最多12个事项');
   return {date:day.date,title:raw.title.trim(),subject:raw.subject,repeat:false};
  });
  days.push({date:day.date,tasks});
 }
 days.sort((a,b)=>a.date.localeCompare(b.date));
 return {...range,days,tasks:days.flatMap(day=>day.tasks),note:note.trim()};
}
return {validDate,addDays,weekRange,officialDate,defaultYear,officialDates:OFFICIAL_DATES,normalize,countdown,signature,snapshot,dueReports,clearDay,validatePlan};
});
