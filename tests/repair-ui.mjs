import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';

const assets=path.resolve('app/src/main/assets'),html=fs.readFileSync(assets+'/index.html','utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
async function boot(){
 const errors=[],actions=[];
 let state={schema:1,tasks:[],notes:[{id:'old',title:'原有笔记',body:'原有正文',tags:[]}],mistakes:[],files:[],settings:{autoClassify:false},english:{provider:'maimemo',bookName:'自定义100词书',total:100,manualLearned:50,goal:40}};
 const backup={schema:1,tasks:[],notes:[{id:'restored',title:'备份笔记',body:'备份正文'}],mistakes:[],files:[],english:{provider:'none',bookName:'恢复词书',total:80,manualLearned:20}};
 let config={base:'https://old.example/v1',model:'m',hasKey:true},failRestore=false,restoring=false;
 const w=new Window({url:'http://localhost/',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}});
 w.confirm=()=>true;w.scrollTo=()=>{};w.addEventListener('error',e=>errors.push(e.error?.message||e.message));
 w.Android={request(action,raw,key){const p=JSON.parse(raw);actions.push(action);let result=true,error;
  if(action==='load')result={state:copy(state),config:copy(config),pendingBatches:{}};
  else if(action==='restore'){restoring=true;result=copy(backup)}
  else if(action==='restoreFull'){restoring=true;result={token:'token',fileCount:0,state:copy(backup)}}
  else if(action==='checkOriginals')result=[];
  else if(action==='save'||action==='commitFullRestore'){if(restoring&&failRestore&&p.state.notes.some(n=>n.id==='restored'))error='disk full';else state=copy(p.state);if(action==='commitFullRestore')result=copy(state)}
  else if(action==='config'){config={...config,base:p.base,model:p.model};result=copy(config)}
  else if(action==='searchIndex')result=[];
  else if(['stats','memoStats','chat','models'].includes(action))error='Unexpected external request';
  setTimeout(()=>w.NativeResult(key,error?{ok:false,error}:{ok:true,data:result}),0);
 }};
 w.document.write(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));const context=vm.createContext(w);
 for(const m of html.matchAll(/<script src="([^"]+)"/g))vm.runInContext(fs.readFileSync(path.join(assets,m[1]),'utf8'),context,{filename:m[1]});
 const run=s=>vm.runInContext(s,context),wait=async predicate=>{for(let i=0;i<200&&!predicate();i++)await new Promise(r=>setTimeout(r,5));assert(predicate(),'Timed out; '+w.document.querySelector('#toast')?.textContent)};
 await wait(()=>w.document.querySelector('#content'));
 return {w,run,actions,errors,wait,get state(){return state},set failRestore(v){failRestore=v},click(selector){const node=w.document.querySelector(selector);assert(node,selector);node.click()},async close(){assert.deepEqual(errors,[]);await w.happyDOM.abort()}};
}
for(const action of ['restore','restore-full'])for(const failure of [false,true]){
 const h=await boot();try{h.failRestore=failure;h.run("navigate('settings')");h.click(`[data-action="${action}"]`);await h.wait(()=>h.w.document.querySelector('#toast').textContent.includes(failure?'disk full':action==='restore'?'已恢复记录':'恢复完成'));assert.equal(h.state.notes[0].id,failure?'old':'restored');assert.equal(h.run('S.notes[0].id'),failure?'old':'restored');assert.equal(h.run('stateRestoring'),false)}finally{await h.close()}
}
{
 const h=await boot();try{
  assert(h.w.document.querySelector('#content').textContent.includes('50 / 100'));
  assert(h.w.document.querySelector('#content').textContent.includes('墨墨背单词'));
  h.run("navigate('settings')");h.w.document.querySelector('#api-base').value='https://new.example/v1';h.click('[data-action="get-models"]');await h.wait(()=>h.w.document.querySelector('#toast').textContent.includes('重新填写'));assert(!h.actions.includes('config'));assert(!h.actions.includes('models'));assert.equal(h.run('config.base'),'https://old.example/v1');
  h.w.document.querySelector('#api-key').value='replacement-key';h.click('[data-action="save-api"]');await h.wait(()=>h.w.document.querySelector('#toast').textContent.includes('API配置已保存'));
  h.run("chosenDate='2026-10-27';S.tasks=[{id:'partial',title:'A；B',date:chosenDate,subject:'数学',done:false,parts:[{title:'A',done:true},{title:'B',done:false}]}];navigate('home')");h.click('[data-action="summary"]');await h.wait(()=>h.w.document.querySelector('[data-action="postpone"]'));h.click('[data-action="postpone"]');await h.wait(()=>h.state.tasks.some(t=>t.date==='2026-10-28'));assert.equal(h.state.tasks.find(t=>t.date==='2026-10-27').title,'A');assert.equal(h.state.tasks.find(t=>t.date==='2026-10-28').title,'B');
  h.run("S.tasks=[{id:'s',title:'40词',subject:'英语',date:'2026-10-26',repeat:true},{id:'latest',series:'s',title:'40词',subject:'英语',date:'2026-10-27',repeat:true}];taskEditor(S.tasks[1])");h.w.document.querySelector('#task-repeat').checked=false;h.w.document.querySelector('#task-title').value='60词';h.click('[data-action="save-task"]');await h.wait(()=>h.state.tasks.some(t=>t.id==='latest'&&!t.repeat));h.run("day=()=> '2026-10-28';generateDaily()");assert.equal(h.run("S.tasks.filter(t=>t.date==='2026-10-28').length"),0);
 }finally{await h.close()}
}
console.log('Repair DOM PASS: both restores succeed/rollback, configured home progress, API host guard, partial postpone, cancel repeat');
