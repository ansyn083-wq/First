'use strict';
/*
 Automatic light backups to a user-chosen folder (Android storage access framework).
 Runs only while the app is in the foreground: on start and when returning to it, if the chosen interval has passed.
 Content is the same as the manual light backup: records and catalogue, no original files and no API keys.
*/
(function(){
 const PERIODS={off:0,daily:86400000,weekly:7*86400000},KEEP=[3,7,14,30];
 let running=false,lastAttempt=0;
 function prefs(){const s=S?.settings||{};return {interval:Object.hasOwn(PERIODS,s.autoBackup)?s.autoBackup:'off',keep:KEEP.includes(s.autoBackupKeep)?s.autoBackupKeep:7};}
 function status(){const a=typeof config!=='undefined'&&config.autoBackup||{};return {folder:String(a.folder||''),lastAt:Number(a.lastAt)||0,lastName:String(a.lastName||'')};}
 function when(t){return t?new Date(t).toLocaleString('zh-CN',{hour12:false}):'尚未备份';}
 function settingsHTML(){
  if(!native)return '<p class="tiny">自动备份需要安卓应用。</p>';
  const p=prefs(),st=status();
  return `<div class="autobackup" id="autobackup-panel"><h3>自动备份</h3><p class="tiny">定期把轻量备份（记录与目录，不含原件和密钥）写入你选择的文件夹，例如网盘同步目录。仅在应用打开时按周期执行；只会清理本功能生成的旧备份。</p><div class="form-grid"><div class="field"><label>频率</label><select id="autobackup-interval"><option value="off" ${p.interval==='off'?'selected':''}>关闭</option><option value="daily" ${p.interval==='daily'?'selected':''}>每天</option><option value="weekly" ${p.interval==='weekly'?'selected':''}>每周</option></select></div><div class="field"><label>保留份数</label><select id="autobackup-keep">${KEEP.map(n=>`<option value="${n}" ${p.keep===n?'selected':''}>最近 ${n} 份</option>`).join('')}</select></div></div><p class="tiny">文件夹：<b>${E(st.folder||'未选择')}</b> · 上次：${E(when(st.lastAt))}${st.lastName?' · '+E(st.lastName):''}</p><div class="settings-list">${btn(st.folder?'更换文件夹':'选择文件夹','autobackup-folder','','secondary')}${btn('立即备份','autobackup-now','',st.folder?'secondary':'ghost')}${st.folder?btn('取消文件夹','autobackup-clear','','ghost'):''}</div></div>`;
 }
 function refresh(){const panel=document.querySelector('#autobackup-panel');if(panel)panel.outerHTML=settingsHTML();}
 async function run(manual){
  if(!native)throw Error('自动备份请在安卓应用使用');
  if(running){if(manual)throw Error('正在备份，请稍候');return false;}
  if(!status().folder){if(manual)throw Error('请先选择备份文件夹');return false;}
  running=true;
  try{const content=JSON.stringify(Core.backup(S),null,1);config.autoBackup=await call('autoBackup',{content,keep:prefs().keep});return true;}
  finally{running=false;refresh();}
 }
 async function maybe(){
  if(!native||!S||(typeof stateRestoring!=='undefined'&&stateRestoring)||document.hidden)return;
  const p=prefs(),st=status();if(p.interval==='off'||!st.folder)return;
  if(Date.now()-lastAttempt<10*60000||Date.now()-st.lastAt<PERIODS[p.interval])return;
  lastAttempt=Date.now();
  try{await run(false);}catch(e){toast('自动备份未完成：'+e.message);}
 }
 async function savePrefs(patch){
  const root=S,previous=S.settings,next={...previous,...patch};S.settings=next;
  try{await persist();}catch(e){if(S===root&&S.settings===next)S.settings=previous;throw e;}
 }
 document.addEventListener('click',async event=>{
  const el=event.target.closest('[data-action^="autobackup-"]');if(!el||el.disabled)return;const a=el.dataset.action;
  if(typeof stateRestoring!=='undefined'&&stateRestoring)return toast('正在恢复，请稍候');
  el.disabled=true;
  try{
   if(a==='autobackup-folder'){config.autoBackup=await call('backupFolder');toast('已选择备份文件夹');if(prefs().interval==='off')await savePrefs({autoBackup:'weekly'});await run(true);toast('备份文件夹已设置，并完成第一次备份');}
   else if(a==='autobackup-now'){await run(true);toast('备份已写入：'+status().lastName);}
   else if(a==='autobackup-clear'){if(!confirm('取消自动备份文件夹？已写入的备份文件不会删除。'))return;config.autoBackup=await call('clearBackupFolder');toast('已取消，原有备份文件保留');}
  }catch(e){toast(e.message||'操作未完成');}
  finally{el.disabled=false;refresh();}
 });
 document.addEventListener('change',async event=>{
  const el=event.target;if(el?.id!=='autobackup-interval'&&el?.id!=='autobackup-keep')return;
  try{if(el.id==='autobackup-interval')await savePrefs({autoBackup:Object.hasOwn(PERIODS,el.value)?el.value:'off'});else await savePrefs({autoBackupKeep:KEEP.includes(Number(el.value))?Number(el.value):7});toast('自动备份设置已保存');setTimeout(maybe,500);}
  catch(e){toast('设置未保存：'+e.message);refresh();}
 });
 const previousResume=window.appResume;
 window.appResume=()=>{previousResume?.();setTimeout(()=>maybe().catch(()=>{}),1500);};
 (function waitForStart(tries=0){if(typeof S!=='undefined'&&S)setTimeout(()=>maybe().catch(()=>{}),3000);else if(tries<60)setTimeout(()=>waitForStart(tries+1),1000);})();
 window.autoBackupSettingsHTML=settingsHTML;
})();
