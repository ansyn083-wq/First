'use strict';
/* Focus timer, study-time statistics and weak knowledge points. Rules live in focus-core and review-core. */
(function(){
 let busy=false,draft=null,selectedDay='',weakCache=[],alarmAt=null,autoRetryAt=0;
 const $f=s=>document.querySelector(s),esc=v=>E(String(v??'')),now=()=>Date.now(),dur=m=>FocusCore.duration(m);
 const WEEKDAYS=['周日','周一','周二','周三','周四','周五','周六'];
 function data(){return FocusCore.normalize(S?.focus);}
 // The 1-second tick only needs the running timer, not a sanitised copy of every stored session.
 function running(){return S?.focus?.active?FocusCore.normalize({active:S.focus.active}).active:null;}
 function otherBusy(){return typeof stateRestoring!=='undefined'&&stateRestoring||typeof planningIsBusy==='function'&&planningIsBusy()||typeof classificationIsBusy==='function'&&classificationIsBusy();}
 function getDraft(){if(!draft)draft={mode:'pomodoro',minutes:data().settings.minutes,subject:'数学',task:''};return draft;}
 function todayTasks(subject){return Core.groupPlans(S.tasks,day()).filter(g=>g.subject===subject).flatMap(g=>g.items).filter(p=>!p.done);}
 function clockText(a){return FocusCore.clock(a.mode==='pomodoro'?FocusCore.remainingMs(a,now()):FocusCore.elapsedMs(a,now()));}
 function progress(a){const e=FocusCore.elapsedMs(a,now());return a.mode==='pomodoro'?Math.min(1,e/(a.minutes*60000)).toFixed(4):(e%3600000/3600000).toFixed(4);}
 function dayLabel(d){const [y,m,n]=d.split('-').map(Number);return m+'月'+n+'日 '+WEEKDAYS[new Date(y,m-1,n).getDay()];}
 function stamp(ms){const t=new Date(ms);return (t.getMonth()+1)+'-'+String(t.getDate()).padStart(2,'0')+' '+String(t.getHours()).padStart(2,'0')+':'+String(t.getMinutes()).padStart(2,'0');}

 // Saves a new focus state; on failure restores the previous one unless the state was replaced meanwhile.
 async function commit(next){
  if(busy)return false;
  if(otherBusy()){toast('正在保存其他内容，请稍候');return false;}
  const root=S,previous=S.focus;S.focus=next;busy=true;
  try{await persist();return true;}
  catch(e){if(S===root&&S.focus===next)S.focus=previous;toast('专注记录未保存：'+e.message);return false;}
  finally{busy=false;refresh();}
 }
 // One pending system notification for the end of a running pomodoro; cancelled when paused or finished.
 function syncAlarm(){
  if(!S||typeof native==='undefined'||!native)return;
  const a=running(),at=a&&a.mode==='pomodoro'&&!a.pausedAt?a.startedAt+a.pausedMs+a.minutes*60000:0;
  if(at===alarmAt)return;alarmAt=at;
  call('focusAlarm',{at,title:a?a.subject+(a.taskTitle?' · '+a.taskTitle.slice(0,30):''):''}).catch(()=>{alarmAt=null;});
 }

 function badgeHTML(){const a=running();if(!a||view==='focus')return '';return `<button class="focus-badge ${a.pausedAt?'paused':''}" id="focus-badge" data-action="nav" data-view="focus" aria-label="${a.pausedAt?'专注已暂停':'正在专注'}，返回计时">${icon('focus')}<span data-focus-clock>${clockText(a)}</span></button>`;}
 function badge(){const old=$f('#focus-badge'),html=badgeHTML();if(old){if(html)old.outerHTML=html;else old.remove();}else if(html){const host=$f('.header-actions');if(host)host.insertAdjacentHTML('afterbegin',html);}}
 function homeHTML(){
  if(!S)return '';const f=data(),a=f.active,total=FocusCore.summary(f.sessions,day(),day()).total;
  return `<section class="card focus-home" id="focus-home-card" aria-label="专注计时"><div class="section-head"><h2>专注计时</h2><span class="pill ${a?(a.pausedAt?'orange':'green'):''}">${a?(a.pausedAt?'已暂停':'专注中'):'今日 '+dur(total)}</span></div>${a?`<div class="focus-home-live"><strong data-focus-clock>${clockText(a)}</strong><span>${esc(a.subject)}${a.taskTitle?' · '+esc(a.taskTitle):''}</span></div>`:'<p class="tiny">番茄钟或正计时，记下每一段真实投入的学习时间。</p>'}<button class="btn secondary focus-home-go" data-action="nav" data-view="focus">${a?'回到计时':'开始专注'} ${icon('arrow')}</button></section>`;
 }

 function timerHTML(f){
  const a=f.active;
  if(a)return `<section class="card focus-timer running" id="focus-timer" aria-label="专注计时"><div class="section-head"><h2>${a.mode==='pomodoro'?'番茄钟 · '+a.minutes+' 分钟':'正计时'}</h2><span class="pill ${a.pausedAt?'orange':'green'}">${a.pausedAt?'已暂停':'专注中'}</span></div><div class="focus-dial" style="--p:${progress(a)}"><div><strong data-focus-clock role="timer">${clockText(a)}</strong><span>${a.mode==='pomodoro'?'剩余':'已专注'}</span></div></div><p class="focus-what">${tag(a.subject)} <span>${a.taskTitle?esc(a.taskTitle):'未关联任务'}</span></p><div class="focus-actions">${a.pausedAt?btn('继续','focus-resume'):btn('暂停','focus-pause','','secondary')}${btn('结束并记录','focus-stop','',a.pausedAt?'secondary':'')}${btn('放弃','focus-discard','','ghost')}</div></section>`;
  const d=getDraft(),tasks=todayTasks(d.subject);if(d.task&&!tasks.some(p=>p.taskId+'#'+p.index===d.task))d.task='';
  return `<section class="card focus-timer" id="focus-timer" aria-label="专注计时"><div class="section-head"><h2>专注计时</h2></div><div class="focus-modes" role="group" aria-label="计时方式">${[['pomodoro','番茄钟'],['stopwatch','正计时']].map(([k,n])=>`<button class="focus-mode ${d.mode===k?'active':''}" data-action="focus-mode" data-mode="${k}" aria-pressed="${d.mode===k}">${n}</button>`).join('')}</div>${d.mode==='pomodoro'?`<div class="focus-presets">${FocusCore.PRESETS.map(m=>`<button class="focus-chip ${d.minutes===m?'active':''}" data-action="focus-preset" data-minutes="${m}" aria-pressed="${d.minutes===m}">${m} 分钟</button>`).join('')}<label class="focus-custom">自定义<input id="focus-minutes" type="number" inputmode="numeric" min="1" max="${FocusCore.POMODORO_MAX}" value="${esc(d.minutes)}">分钟</label></div>`:`<p class="tiny focus-mode-note">从开始计时到点“结束并记录”为止，单次最多记录 ${FocusCore.STOPWATCH_CAP/60} 小时。</p>`}<div class="form-grid"><div class="field"><label for="focus-subject">科目</label><select id="focus-subject">${FocusCore.SUBJECTS.map(s=>`<option ${s===d.subject?'selected':''}>${s}</option>`).join('')}</select></div><div class="field"><label for="focus-task">关联今日任务（可选）</label><select id="focus-task"><option value="">不关联</option>${tasks.map(p=>{const v=p.taskId+'#'+p.index;return `<option value="${esc(v)}" ${d.task===v?'selected':''}>${esc(p.title.length>40?p.title.slice(0,40)+'…':p.title)}</option>`;}).join('')}</select></div></div>${btn(icon('focus')+' 开始专注','focus-start','','focus-start')}<p class="tiny">按手机时钟计时，切到后台或锁屏也照常计算。番茄钟到点时发送通知（需允许通知，省电模式下可能晚几分钟），回到研序时自动记下。</p></section>`;
 }
 function tile(label,value,sub){return `<div class="focus-tile"><span>${label}</span><strong>${value}</strong><small>${sub}</small></div>`;}
 function chartHTML(f){
  const today=day(),start=FocusCore.addDays(today,-6),s=FocusCore.summary(f.sessions,start,today),days=Object.entries(s.byDay),max=Math.max(60,...days.map(([,v])=>v.total));
  if(!s.byDay[selectedDay])selectedDay=today;const pick=s.byDay[selectedDay],parts=FocusCore.SUBJECTS.filter(x=>pick.subjects[x]).map(x=>x+' '+dur(pick.subjects[x]));
  return `<section class="card focus-chart-card"><div class="section-head"><h2>近 7 天专注时长</h2><span class="tiny">合计 ${dur(s.total)}</span></div><div class="focus-chart" role="group" aria-label="近 7 天每日专注时长，点按查看当天明细"><span class="focus-scale">${dur(max)}</span>${days.map(([d,v])=>`<button class="focus-bar ${d===selectedDay?'selected':''}" data-action="focus-bar" data-date="${d}" aria-pressed="${d===selectedDay}" aria-label="${dayLabel(d)} ${dur(v.total)}"><span class="focus-bar-track"><i style="height:${v.total?Math.max(3,v.total/max*100).toFixed(1):0}%"></i></span><small>${d===today?'今天':WEEKDAYS[new Date(d+'T12:00:00').getDay()]}</small></button>`).join('')}</div><p class="focus-caption" aria-live="polite"><b>${dayLabel(selectedDay)}</b> · ${pick.total?dur(pick.total)+'（'+parts.join('，')+'）':'没有专注记录'}</p></section>`;
 }
 function subjectsHTML(week){
  const rows=FocusCore.SUBJECTS.filter(s=>week.bySubject[s]>0).sort((a,b)=>week.bySubject[b]-week.bySubject[a]),top=rows.length?week.bySubject[rows[0]]:1;
  return `<section class="card"><div class="section-head"><h2>本周各科时长</h2><span class="tiny">周一至今</span></div>${rows.length?rows.map(s=>`<div class="focus-subject-row"><span>${esc(s)}</span><div class="focus-meter"><i style="width:${(week.bySubject[s]/top*100).toFixed(1)}%"></i></div><b>${dur(week.bySubject[s])}<small>${Math.round(week.bySubject[s]/week.total*100)}%</small></b></div>`).join(''):'<p class="tiny">本周还没有专注记录。开始一次计时，或补记已经完成的学习。</p>'}</section>`;
 }
 function weakHTML(){
  const head='<div class="section-head"><h2>错题薄弱知识点</h2>'+(S.mistakes.length?'<span class="tiny">共 '+S.mistakes.length+' 道</span>':'')+'</div>';
  if(!S.mistakes.length){weakCache=[];return `<section class="card focus-weak">${head}<p class="tiny">还没有错题。记错题时填写“章节 / 知识点”，这里会按知识点汇总，找出最需要回头看的地方。</p></section>`;}
  const w=ReviewCore.weakPoints(S.mistakes,day()),open=w.points.filter(p=>p.open>0);weakCache=open.slice(0,8);const blank=w.points.find(p=>p.chapter===ReviewCore.NO_CHAPTER);
  return `<section class="card focus-weak">${head}<div class="focus-mastery">${w.subjects.map(s=>`<span>${esc(s.subject)} <b>${s.mastered}/${s.total}</b> 已掌握</span>`).join('')}</div>${weakCache.length?weakCache.map((p,i)=>`<button class="focus-weak-row" data-action="focus-weak" data-index="${i}"><span class="focus-weak-text"><b>${tag(p.subject)} ${esc(p.chapter)}</b><small>未掌握 ${p.open} / 共 ${p.total}${p.fails?' · 复习做错 '+p.fails+' 次':''}${p.due?' · 今日到期 '+p.due:''}</small></span><span class="focus-meter small" aria-hidden="true"><i style="width:${(p.mastered/p.total*100).toFixed(1)}%"></i></span></button>`).join(''):'<p class="tiny">所有错题都已完成全部复习轮次。</p>'}${blank&&blank.open?`<p class="tiny">有 ${blank.open} 道未掌握的错题没填知识点，补上后会归到对应知识点。</p>`:''}<p class="tiny focus-rule">排序依次看：未掌握数、复习做错次数、今日到期数。“已掌握”指完成全部 ${ReviewCore.MAX_STAGE} 轮间隔复习。复习做错次数从 0.15.0 开始累计。</p></section>`;
 }
 function recentHTML(f){
  const rows=f.sessions.slice(-8).reverse(),mode={pomodoro:'番茄钟',stopwatch:'正计时',manual:'补记'};
  return `<section class="card"><div class="section-head"><h2>专注记录</h2>${btn(icon('plus')+' 补记','focus-manual','','secondary small')}</div>${rows.length?rows.map(s=>`<div class="focus-session"><div><b>${tag(s.subject)} ${dur(s.minutes)}</b><small>${stamp(s.start)} · ${mode[s.mode]}${s.taskTitle?' · '+esc(s.taskTitle):''}${s.note?' · '+esc(s.note):''}</small></div>${btn('删除','focus-delete',`data-id="${esc(s.id)}" aria-label="删除这条专注记录"`,'ghost small')}</div>`).join(''):'<p class="tiny">还没有记录。没用计时器的学习，也可以点“补记”。</p>'}</section>`;
 }
 function render(){
  const c=$f('#content');if(!c||!S||view!=='focus')return;
  const f=data(),today=day(),monday=FocusCore.weekStart(today),week=FocusCore.summary(f.sessions,monday,FocusCore.addDays(monday,6)),todayTotal=FocusCore.summary(f.sessions,today,today),passed=Math.round((new Date(today+'T12:00:00')-new Date(monday+'T12:00:00'))/86400000)+1;
  c.innerHTML=`<div class="focus-page"><div class="focus-tiles">${tile('今日专注',dur(todayTotal.total),todayTotal.count+' 段记录')}${tile('本周专注',dur(week.total),'周一起累计')}${tile('本周日均',dur(Math.round(week.total/passed)),'按已过 '+passed+' 天计算')}${tile('连续学习',FocusCore.streak(f.sessions,today)+' 天','每天至少一段记录')}</div><div class="columns"><div>${timerHTML(f)}${chartHTML(f)}${subjectsHTML(week)}</div><div class="right-column">${weakHTML()}${recentHTML(f)}</div></div></div>`;
 }
 function refresh(){if(!S)return;if(view==='focus'&&$f('.focus-page'))render();else{const card=$f('#focus-home-card');if(card)card.outerHTML=homeHTML();}badge();tick();}
 function tick(){
  if(!S)return;const a=running();
  if(a&&FocusCore.overdue(a,now())&&!busy&&!otherBusy()&&now()>=autoRetryAt){finish(true);return;}
  if(a)for(const el of document.querySelectorAll('[data-focus-clock]'))el.textContent=clockText(a);
  const dial=$f('.focus-dial');if(dial&&a)dial.style.setProperty('--p',progress(a));
  syncAlarm();
 }

 async function finish(auto){
  const before=data();if(!before.active||busy)return;const result=FocusCore.finish(before,now());
  // A failed automatic save waits 30 s before retrying instead of retrying every tick.
  if(!await commit(result.focus)){if(auto)autoRetryAt=now()+30000;return;}
  toast({completed:'完成一个番茄钟，记录 '+dur(result.session?.minutes),stopped:'已记录 '+dur(result.session?.minutes),capped:'计时超过 '+FocusCore.STOPWATCH_CAP/60+' 小时，按 '+FocusCore.STOPWATCH_CAP/60+' 小时记录；如有出入可删除后补记',short:'不足 1 分钟，本次未记录'}[result.reason]||'已结束');
  if(auto&&navigator.vibrate)try{navigator.vibrate([200,120,200]);}catch{}
  if(result.session&&before.active.taskId&&!$f('#modal-root').innerHTML)offerTask(before.active);
 }
 function linkedPart(ref){const cut=String(ref||'').lastIndexOf('#'),t=cut>0&&S.tasks.find(x=>x.id===ref.slice(0,cut)),index=Number(ref.slice(cut+1));if(!t||!Number.isInteger(index))return null;const parts=Core.taskParts(t);return parts[index]?{task:t,parts,index}:null;}
 function offerTask(a){const link=linkedPart(a.taskId);if(!link||link.parts[link.index].done)return;modal('这项任务完成了吗？',`<p class="focus-modal-text">刚才的专注关联了「${esc(link.parts[link.index].title)}」。</p><div class="actions">${btn('还没完成','close-modal','','ghost')}${btn('标记完成','focus-task-done',`data-ref="${esc(a.taskId)}"`)}</div>`);}
 async function markTask(ref){
  if(otherBusy())return toast('正在保存其他内容，请稍候');
  const link=linkedPart(ref);closeModal();if(!link)return toast('这项任务已不存在');
  const parts=link.parts.map((p,i)=>i===link.index?{...p,done:true}:p),next={...link.task,parts,done:parts.every(p=>p.done)},root=S,previous=S.tasks,tasks=previous.map(t=>t===link.task?next:t);
  S.tasks=tasks;try{await persist();toast('任务已标记完成');}catch(e){if(S===root&&S.tasks===tasks)S.tasks=previous;toast('任务未保存：'+e.message);}
  if(view==='focus')render();
 }
 function manualForm(){modal('补记学习时长',`<div class="form-grid"><div class="field"><label for="focus-manual-date">日期</label><input id="focus-manual-date" type="date" max="${day()}" value="${day()}"></div><div class="field"><label for="focus-manual-minutes">时长（分钟）</label><input id="focus-manual-minutes" type="number" inputmode="numeric" min="1" max="${FocusCore.MANUAL_MAX}" placeholder="例如 90"></div></div><div class="field"><label for="focus-manual-subject">科目</label><select id="focus-manual-subject">${FocusCore.SUBJECTS.map(s=>`<option>${s}</option>`).join('')}</select></div><div class="field"><label for="focus-manual-note">备注（可选）</label><input id="focus-manual-note" maxlength="200" placeholder="例如 线代第三章习题"></div><div class="actions">${btn('取消','close-modal','','ghost')}${btn('保存','focus-manual-save')}</div>`);}
 function weakModal(p){
  const mistakes=S.mistakes.filter(m=>p.ids.includes(m.id)).sort((a,b)=>(a.reviewMastered===true)-(b.reviewMastered===true)),notes=typeof knowledgeRelated==='function'&&p.chapter!==ReviewCore.NO_CHAPTER?knowledgeRelated('notes',p.subject,p.chapter):[];
  const link=(type,n,sub)=>`<button class="focus-link" data-action="open-record" data-type="${type}" data-id="${esc(n.id)}"><span>${esc(n.title||'未命名记录')}</span><small>${esc(sub)}</small></button>`;
  modal(p.chapter,`<p class="focus-modal-text">${esc(p.subject)} · 共 ${p.total} 道错题，已掌握 ${p.mastered} 道${p.fails?'，复习中做错 '+p.fails+' 次':''}。</p><h3 class="focus-modal-head">错题</h3>${mistakes.map(m=>link('mistakes',m,ReviewCore.describe(m))).join('')}${p.chapter===ReviewCore.NO_CHAPTER?'':`<h3 class="focus-modal-head">同一知识点的笔记</h3>${notes.length?notes.map(n=>link('notes',n,String(n.created||'').slice(0,10))).join(''):'<p class="tiny">还没有这个知识点的笔记。写笔记时在“章节 / 知识点”填同样的名称即可关联。</p>'}`}`);
 }

 document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action^="focus-"]');if(!el||el.disabled||!S)return;const a=el.dataset.action,d=getDraft();
  if(a==='focus-mode'){d.mode=el.dataset.mode==='stopwatch'?'stopwatch':'pomodoro';return render();}
  if(a==='focus-preset'){d.minutes=Number(el.dataset.minutes);return render();}
  if(a==='focus-bar'){selectedDay=el.dataset.date;return render();}
  if(a==='focus-weak'){const p=weakCache[Number(el.dataset.index)];if(p)weakModal(p);return;}
  if(a==='focus-manual')return manualForm();
  if(a==='focus-task-done')return markTask(el.dataset.ref);
  if(a==='focus-start'){
   const link=d.task?linkedPart(d.task):null;let next;
   try{next=FocusCore.start(data(),{mode:d.mode,minutes:d.minutes,subject:d.subject,taskId:link?d.task:'',taskTitle:link?link.parts[link.index].title:''},now());}catch(e){return toast(e.message);}
   if(await commit(next))toast(d.mode==='pomodoro'?'开始专注 '+next.active.minutes+' 分钟':'开始正计时');return;
  }
  if(a==='focus-pause')return commit(FocusCore.pause(data(),now()));
  if(a==='focus-resume')return commit(FocusCore.resume(data(),now()));
  if(a==='focus-stop')return finish(false);
  if(a==='focus-discard'){if(!confirm('放弃本次计时？不会记录这段时间。'))return;if(await commit(FocusCore.discard(data())))toast('已放弃本次计时');return;}
  if(a==='focus-delete'){const s=data().sessions.find(x=>x.id===el.dataset.id);if(!s||!confirm('删除这条 '+dur(s.minutes)+' 的专注记录？'))return;if(await commit(FocusCore.remove(data(),s.id)))toast('已删除');return;}
  if(a==='focus-manual-save'){
   let next;try{next=FocusCore.addManual(data(),{date:$f('#focus-manual-date').value,minutes:$f('#focus-manual-minutes').value,subject:$f('#focus-manual-subject').value,note:$f('#focus-manual-note').value},now());}catch(e){return toast(e.message);}
   el.disabled=true;if(await commit(next)){closeModal();toast('已补记');}else el.disabled=false;return;
  }
 });
 document.addEventListener('change',event=>{
  const t=event.target;if(!S||!t?.id?.startsWith('focus-'))return;const d=getDraft();
  if(t.id==='focus-subject'){d.subject=FocusCore.SUBJECTS.includes(t.value)?t.value:'其他';d.task='';render();}
  else if(t.id==='focus-task')d.task=t.value;
  else if(t.id==='focus-minutes'){const m=Math.round(Number(t.value));if(m>=1&&m<=FocusCore.POMODORO_MAX){d.minutes=m;render();}else{t.value=d.minutes;toast('请填写 1 到 '+FocusCore.POMODORO_MAX+' 分钟');}}
 });
 setInterval(tick,1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)tick();});
 const previousResume=window.appResume;window.appResume=()=>{previousResume?.();tick();};
 window.renderFocus=render;window.focusHomeHTML=homeHTML;window.focusBadgeHTML=badgeHTML;window.focusStatsRefresh=()=>{if(view==='focus')render();};window.focusIsBusy=()=>busy;
})();
