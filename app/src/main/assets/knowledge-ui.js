'use strict';
/* Knowledge links: notes and mistakes that share a subject and chapter / knowledge point, and text shared in from other apps. */
(function(){
 const esc=v=>E(String(v??'')),LIMIT=5;
 // Same subject, and the same knowledge point after normalising width, case and spacing; one name containing
 // the other also counts (e.g. "泰勒公式" and "泰勒公式的应用"), but only for names of two characters or more.
 function sameChapter(a,b){const x=ReviewCore.chapterKey(a),y=ReviewCore.chapterKey(b);if(!x||!y)return false;return x===y||Math.min(x.length,y.length)>=2&&(x.includes(y)||y.includes(x));}
 function related(type,subject,chapter,exceptId){
  if(!S||!['notes','mistakes'].includes(type)||!String(chapter||'').trim())return [];
  return S[type].filter(n=>n.id!==exceptId&&n.subject===subject&&sameChapter(n.chapter,chapter)).sort((a,b)=>String(b.created||'').localeCompare(String(a.created||'')));
 }
 function relatedHTML(n,type){
  if(!n||!['notes','mistakes'].includes(type)||!String(n.chapter||'').trim())return '';
  const other=type==='mistakes'?'notes':'mistakes',list=related(other,n.subject,n.chapter,n.id);
  const label=other==='notes'?'同一知识点的笔记':'同一知识点的错题';
  return `<div class="knowledge-related"><h4>${label}${list.length?' · '+list.length:''}</h4>${list.length?list.slice(0,LIMIT).map(x=>`<button class="knowledge-link" data-action="open-record" data-type="${other}" data-id="${esc(x.id)}"><span>${esc(x.title||'未命名记录')}</span><small>${other==='mistakes'&&typeof ReviewCore!=='undefined'?esc(ReviewCore.describe(x)):esc(String(x.created||'').slice(0,10))}</small></button>`).join('')+(list.length>LIMIT?`<p class="tiny">还有 ${list.length-LIMIT} 条，可在检索与问答中搜索“${esc(n.chapter)}”。</p>`:''):`<p class="tiny">还没有。${other==='notes'?'写笔记':'记错题'}时在“章节 / 知识点”填“${esc(n.chapter)}”即可关联。</p>`}</div>`;
 }

 // Drain the native FIFO only after each note is durably saved; never acknowledge unsaved content.
 let sharing=false,retryTimer=null,requested=false;
 function firstUrl(text){const m=String(text).match(/https?:\/\/[^\s<>"'，。）)]+/);return m?m[0].slice(0,500):'';}
 function titleFor(item){const subject=String(item.subject||'').trim();if(subject)return subject.slice(0,80);const line=String(item.text).split(/\r?\n/).map(s=>s.trim()).find(s=>s&&!/^https?:\/\//.test(s));return line?(line.length>40?line.slice(0,40)+'…':line):'网页摘录';}
 function blocked(){return typeof stateRestoring!=='undefined'&&stateRestoring||typeof planningIsBusy==='function'&&planningIsBusy()||typeof classificationIsBusy==='function'&&classificationIsBusy()||typeof focusIsBusy==='function'&&focusIsBusy();}
 function retry(delay=1500){if(retryTimer||document.hidden)return;retryTimer=setTimeout(async()=>{retryTimer=null;await window.appShared();},delay);}
 window.appShared=async()=>{
  if(typeof native==='undefined'||!native||!S)return;if(sharing){requested=true;return;}
  if(blocked()){retry();return;}
  sharing=true;let last=null;
  try{
   for(let count=0;count<20;count++){
    if(blocked()){retry();break;}
    const item=await call('pendingShare');if(!item||typeof item.text!=='string'||!item.text.trim())break;
    const at=Number(item.at)||0,text=item.text.slice(0,20000),sharedId=String(item.id||'').slice(0,100);
    const existing=S.notes.find(n=>sharedId&&n.sharedId===sharedId||!n.sharedId&&at&&n.sharedAt===at&&n.body===text);
    if(existing){const root=S;await persist();if(S!==root){retry();break;}await call('ackShare',{id:sharedId,at});continue;}
    const root=S,previous=S.notes,folderId=S.library?.current?.notes||'default-notes';
    const note={id:id(),title:titleFor(item),body:text,subject:'待确认',chapter:'',tags:['网页摘录'],source:firstUrl(text)||'从其他应用分享',manual:false,version:1,created:new Date().toISOString(),status:'pending',imageIds:[],folderId,order:nextOrder('notes',folderId),sharedAt:at,sharedId};
    note.routing=SubjectCore.editedRoute(note,'notes',S.study,undefined);
    const notes=previous.concat(note);S.notes=notes;
    try{await persist();}catch(e){if(S===root&&S.notes===notes)S.notes=previous;throw e;}
    if(S!==root){retry();break;}
    await call('ackShare',{id:sharedId,at});last=note;
    if(S.settings?.autoClassify&&typeof classify==='function'&&config?.hasKey&&config?.model)classify('notes',note.id,true);
    if(count===19)retry();
   }
  }catch(e){toast('摘录尚未全部保存，将自动重试：'+e.message);retry(3000);}
  finally{sharing=false;if(requested){requested=false;retry();}}
  if(last){toast('已存为笔记：'+last.title);if(typeof shell==='function'&&['notes','home'].includes(view))shell();if(!document.querySelector('#modal-root').innerHTML)openRecord('notes',last.id);}
 };
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)window.appShared();});
 const previousResume=window.appResume;window.appResume=()=>{previousResume?.();window.appShared();};
 window.knowledgeRelated=(type,subject,chapter)=>related(type,subject,chapter,'');
 window.relatedNotesHTML=relatedHTML;
})();
