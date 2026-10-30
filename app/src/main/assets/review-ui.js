'use strict';
/* Home-page card for due mistakes. Scheduling rules live in review-core. */
(function(){
 const SHOWN=5;let saving=false;
 function enabled(){return !!S&&S.settings?.mistakeReview!==false;}
 function cardHTML(){
  if(!enabled()||!S.mistakes.length)return '';
  const list=ReviewCore.due(S.mistakes,day()),rows=list.slice(0,SHOWN);
  return `<section class="card review-card" id="review-home-card" aria-label="今日错题复习"><div class="section-head"><h2>今日错题复习</h2><span class="pill ${list.length?'orange':'green'}">${list.length?list.length+' 道到期':'已清空'}</span></div>${rows.length?rows.map(m=>`<div class="review-row"><button class="review-open" data-action="open-record" data-type="mistakes" data-id="${E(m.id)}"><span>${tag(m.subject)} ${E(m.title||'未命名错题')}</span><small>${E(ReviewCore.describe(m))}</small></button><div class="review-buttons">${btn('做对了','mistake-review-pass',`data-id="${E(m.id)}"`,'secondary small')}${btn('没做对','mistake-review-fail',`data-id="${E(m.id)}"`,'ghost small')}</div></div>`).join('')+(list.length>SHOWN?`<p class="tiny">还有 ${list.length-SHOWN} 道，先完成上面几道。</p>`:''):'<p class="tiny">今天没有到期的错题。新记录的错题会在第二天出现，做对后按 2、4、7、15、30 天的间隔再次出现。</p>'}</section>`;
 }
 function refresh(){const card=document.querySelector('#review-home-card');if(card)card.outerHTML=cardHTML();}
 async function record(id,correct){
  if(saving)return;
  if(typeof stateRestoring!=='undefined'&&stateRestoring)return toast('正在恢复，请稍候');
  if(typeof planningIsBusy==='function'&&planningIsBusy()||typeof classificationIsBusy==='function'&&classificationIsBusy())return toast('正在保存其他内容，请稍候');
  const root=S,previous=S.mistakes,item=previous.find(m=>m.id===id);if(!item)return refresh();
  const next={...item,...ReviewCore.advance(item,day(),correct),...ReviewCore.tally(item,correct),lastReview:new Date().toISOString()},mistakes=previous.map(m=>m===item?next:m);
  saving=true;S.mistakes=mistakes;
  try{await persist();toast(correct?(next.reviewMastered?'这道题已完成全部复习轮次':'已安排在 '+next.nextReview+' 再做一次'):'已安排明天重做');}
  catch(e){if(S===root&&S.mistakes===mistakes)S.mistakes=previous;toast('复习记录未保存：'+e.message);}
  finally{saving=false;refresh();window.focusStatsRefresh?.();}
 }
 document.addEventListener('click',event=>{const el=event.target.closest('[data-action^="mistake-review-"]');if(!el||el.disabled)return;const correct=el.dataset.action==='mistake-review-pass';record(el.dataset.id,correct);});
 window.reviewHomeHTML=cardHTML;window.reviewRefresh=refresh;
})();
