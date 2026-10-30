const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const assets=path.resolve('app/src/main/assets');
// UI contract fixture: real task/date core with controllable persistence and AI boundaries.
exports.createApp=async function(){
 const {Window}=await import(process.env.YANXU_HAPPY_DOM_PATH||'happy-dom');
 const w=new Window({url:'http://localhost/',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}}),errors=[];
 w.document.write('<main id="content"></main><div id="modal-root"></div><div id="toast"></div>');
 w.addEventListener('error',e=>errors.push(e.error?.stack||e.message));
 const context=vm.createContext(w),run=code=>vm.runInContext(code,context),$=s=>w.document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms));
 for(const name of ['core.js','planner-core.js'])vm.runInContext(fs.readFileSync(path.join(assets,name),'utf8'),context,{filename:name});
 run(`const E=Core.escape;let view='planning',chosenDate='2026-10-27',stateRestoring=false,aiState={busy:false,message:''};
 function day(){return '2026-10-28'}
 let S={tasks:[{id:'mixed',date:'2026-10-27',subject:'数学',title:'极限；导数',done:false,parts:[{title:'极限',done:true},{title:'导数',done:false}],repeat:true},{id:'other',date:'2026-10-28',subject:'英语',title:'词汇',done:false}],planner:PlannerCore.normalize({},day())};
 function btn(text,action,extra='',cls=''){return '<button class="btn '+cls+'" data-action="'+action+'" '+extra+'>'+text+'</button>'}
 function toast(text){document.querySelector('#toast').textContent=text}
 function modal(title,body){document.querySelector('#modal-root').innerHTML='<section role="dialog" aria-label="'+E(title)+'"><h2>'+E(title)+'</h2>'+body+'</section>'}
 function closeModal(){document.querySelector('#modal-root').innerHTML=''}
 function home(){document.querySelector('#content').innerHTML=planningHomeHTML()+'<button data-action="planning-clear-day" data-date="2026-10-27">清空所选日</button>'}
 function planningAIStatus(){return aiState}function planningIsBusy(){return false}
 let calls={commit:0,daily:0,weekly:0,next:0,import:0},lastCall=null,failNext='',holdNext=false,releaseHeld=null;
 async function boundary(type){calls[type]++;if(holdNext){holdNext=false;await new Promise(resolve=>releaseHeld=resolve)}if(failNext){const text=failNext;failNext='';throw Error(text)}}
 async function planningCommit(patch){await boundary('commit');S={...S,...patch};return S}
 async function planningGenerate(kind,start,end,options){lastCall={kind,start,end,options};await boundary(kind);const r={id:'report-'+calls[kind],kind,start,end,body:'逐项总结：<img src=x onerror="alert(1)">',createdAt:'2026-10-28T01:00:00.000Z',model:'模型 <script>',signature:PlannerCore.signature(S.tasks,start,end)};S.planner={...S.planner,reports:S.planner.reports.concat(r)};return r}
 async function planningGenerateNextWeek(anchor){lastCall={anchor};await boundary('next');const range=PlannerCore.weekRange(anchor,1),days=Array.from({length:7},(_,i)=>({date:PlannerCore.addDays(range.start,i),tasks:[{title:i===0?'复习 <svg onload=alert(1)>':'下周任务'+i,subject:'数学'}]}));return {...PlannerCore.validatePlan({days,note:'<b>建议</b>'},anchor),sourceSignature:PlannerCore.signature(S.tasks)}}
 async function planningImport(preview,indices){lastCall={preview,indices};await boundary('import');if(preview.sourceSignature!==PlannerCore.signature(S.tasks))throw Error('任务已变化，请重新生成预览');const r=Core.appendPlan(S.tasks,indices.map(i=>preview.tasks[i]));S={...S,tasks:r.tasks};return {added:r.added,skipped:r.skipped}}
 document.addEventListener('click',event=>{if(event.target.closest('[data-action="close-modal"]'))closeModal()});`);
 vm.runInContext(fs.readFileSync(path.join(assets,'planning-ui.js'),'utf8'),context,{filename:'planning-ui.js'});run('renderPlanning()');
 const wait=async fn=>{for(let i=0;i<100&&!fn();i++)await sleep(10);assert.ok(fn(),$('#toast')?.textContent+' '+errors.join('\n'))};
 return {w,run,$,errors,sleep,wait,fail(message='磁盘已满'){run('failNext='+JSON.stringify(message))},hold(){run('holdNext=true')},release(){run('releaseHeld?.();releaseHeld=null')},async click(selector){const el=$(selector);assert.ok(el,'missing '+selector);el.click();await sleep(10)},change(selector,value){const el=$(selector);assert.ok(el,'missing '+selector);if(el.type==='checkbox')el.checked=value;else el.value=value;el.dispatchEvent(new w.Event('change',{bubbles:true}))},input(selector,value){const el=$(selector);assert.ok(el,'missing '+selector);el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}))},async close(){await w.happyDOM.abort()}};
};
