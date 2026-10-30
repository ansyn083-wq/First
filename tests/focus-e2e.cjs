// End-to-end check of 0.15.0 focus / stats / knowledge features in real Chromium (browser preview mode).
// Usage: node tests/focus-e2e.cjs [assets/index.html] [screenshot-dir]
const {chromium}=require(process.env.YANXU_PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
const indexPath=process.argv[2]||path.join(__dirname,'../app/src/main/assets/index.html'),shots=process.argv[3]||process.env.YANXU_SCREENSHOTS||path.resolve('screenshots');require('node:fs').mkdirSync(shots,{recursive:true});
const url='file://'+path.resolve(indexPath);
const at=(d,h,m=0)=>new Date(`${d}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00+08:00`).getTime();
const seed={schema:1,
 tasks:[{id:'t1',title:'线代第三章习题；高数泰勒公式',subject:'数学',date:'2026-10-29',done:false}],
 notes:[{id:'n1',title:'泰勒公式要点',body:'带佩亚诺余项与拉格朗日余项的区别。',subject:'数学',chapter:'泰勒公式',created:'2026-10-20T08:00:00.000Z',status:'classified',version:1,tags:[]},
        {id:'n2',title:'长难句拆分方法',body:'先找谓语。',subject:'英语',chapter:'长难句',created:'2026-10-21T08:00:00.000Z',status:'classified',version:1,tags:[]}],
 mistakes:[{id:'m1',title:'泰勒展开求极限',body:'题目……',subject:'数学',chapter:'泰勒公式',created:'2026-10-20T08:00:00.000Z',status:'classified',version:1,tags:[],reviewStage:0,nextReview:'2026-10-29',reviewFails:2},
           {id:'m2',title:'泰勒公式求高阶导',body:'题目……',subject:'数学',chapter:'泰勒公式',created:'2026-10-01T08:00:00.000Z',status:'classified',version:1,tags:[],reviewStage:6,reviewMastered:true,reviewPasses:6},
           {id:'m3',title:'定积分换元',body:'题目……',subject:'数学',chapter:'定积分',created:'2026-10-25T08:00:00.000Z',status:'classified',version:1,tags:[],reviewStage:1,nextReview:'2026-10-31'},
           {id:'m4',title:'定语从句嵌套',body:'题目……',subject:'英语',chapter:'长难句',created:'2026-10-26T08:00:00.000Z',status:'classified',version:1,tags:[]},
           {id:'m5',title:'矛盾的同一性',body:'题目……',subject:'政治',chapter:'',created:'2026-10-27T08:00:00.000Z',status:'classified',version:1,tags:[]}],
 files:[],settings:{autoClassify:false,reminder:false,reminderTime:'20:00'},
 focus:{sessions:[
  {id:'s1',subject:'数学',start:at('2026-10-23',9),minutes:50,mode:'pomodoro'},
  {id:'s2',subject:'英语',start:at('2026-10-24',14),minutes:45,mode:'pomodoro'},
  {id:'s3',subject:'数学',start:at('2026-10-26',9),minutes:90,mode:'stopwatch'},
  {id:'s4',subject:'政治',start:at('2026-10-27',20),minutes:30,mode:'manual',note:'肖秀荣精讲'},
  {id:'s5',subject:'专业课',start:at('2026-10-28',10),minutes:120,mode:'stopwatch'},
  {id:'s6',subject:'数学',start:at('2026-10-28',15),minutes:25,mode:'pomodoro'}],settings:{minutes:25}}};

(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.KAOYAN_CHROME});
 const errors=[];
 async function open(viewport){
  const ctx=await browser.newContext({viewport,timezoneId:'Asia/Shanghai',locale:'zh-CN',deviceScaleFactor:viewport.width<500?2:1});
  const page=await ctx.newPage();
  page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  page.on('dialog',d=>d.accept());
  await page.clock.install({time:at('2026-10-29',9)});
  await ctx.addInitScript(s=>{if(!localStorage.getItem('kaoyan-preview'))localStorage.setItem('kaoyan-preview',s);},JSON.stringify(seed));
  await page.goto(url);await page.waitForSelector('#focus-home-card');
  return {ctx,page};
 }
 const state=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kaoyan-preview')));
 const toastText=page=>page.textContent('#toast');

 // ---- desktop
 let {ctx,page}=await open({width:1366,height:900});
 assert.match(await page.textContent('#focus-home-card'),/今日 0 分钟/);
 await page.click('.sidebar [data-view="focus"]');
 await page.waitForSelector('.focus-page');
 const tiles=await page.$$eval('.focus-tile strong',n=>n.map(x=>x.textContent));
 // week Mon 10-26 .. today 10-29: 90+30+120+25 = 265 min; 4 days passed -> 66 per day; streak: 10-28,27,26 (10-25 none) -> 3
 assert.deepEqual(tiles,['0 分钟','4 小时 25 分','1 小时 6 分','3 天']);
 assert.match(await page.textContent('.focus-caption'),/10月29日 周四.*没有专注记录/);
 await page.click('.focus-bar[data-date="2026-10-28"]');
 assert.match(await page.textContent('.focus-caption'),/10月28日 周三 · 2 小时 25 分（数学 25 分钟，专业课 2 小时）/);
 const weak=await page.$$eval('.focus-weak-row .focus-weak-text b',n=>n.map(x=>x.textContent.trim()));
 // open desc then fails: 泰勒公式 open1 fails2 ; 定积分 open1 ; 长难句 open1 ; 未填写 open1 -> fails decide first
 assert.equal(weak[0],'数学 泰勒公式');assert.equal(weak.length,4);
 await page.screenshot({path:shots+'/desktop-focus.png',fullPage:true});

 // weak point modal -> related notes -> open mistake reader -> related notes inside reader
 await page.click('.focus-weak-row[data-index="0"]');
 assert.match(await page.textContent('#modal-root'),/泰勒公式要点/);
 await page.screenshot({path:shots+'/desktop-weak-modal.png'});
 await page.click('#modal-root [data-type="mistakes"][data-id="m1"]');
 await page.waitForSelector('#modal-root .knowledge-related');
 assert.match(await page.textContent('#modal-root .knowledge-related'),/同一知识点的笔记 · 1.*泰勒公式要点/);
 await page.screenshot({path:shots+'/desktop-reader-related.png'});
 await page.click('[data-action="close-modal"]');

 // pomodoro linked to a task, finishes while "in background" (clock jumps), auto-record + task offer
 await page.click('.focus-chip[data-minutes="25"]');
 await page.selectOption('#focus-task','t1#1');
 await page.click('[data-action="focus-start"]');
 await page.waitForSelector('.focus-timer.running');
 assert.equal((await state(page)).focus.active.taskId,'t1#1');
 await page.clock.runFor(10*60*1000);
 assert.match(await page.textContent('.focus-dial strong'),/^(15:00|14:59)$/);
 await page.click('[data-action="focus-pause"]');await page.waitForSelector('[data-action="focus-resume"]');
 const pausedAt=await page.textContent('.focus-dial strong');
 await page.clock.runFor(5*60*1000);
 assert.equal(await page.textContent('.focus-dial strong'),pausedAt,'paused time must not count');
 await page.click('[data-action="focus-resume"]');await page.waitForSelector('[data-action="focus-pause"]');
 await page.clock.fastForward(40*60*1000);await page.clock.runFor(1500);
 await page.waitForSelector('[data-action="focus-task-done"]');
 let st=await state(page);assert.equal(st.focus.active,null);
 const last=st.focus.sessions.at(-1);assert.equal(last.minutes,25);assert.equal(last.taskTitle,'高数泰勒公式');
 assert.ok(Math.abs(last.end-last.start-30*60*1000)<3000,'end = start + pause + planned length');
 await page.click('[data-action="focus-task-done"]');await page.waitForTimeout(100);
 st=await state(page);assert.deepEqual(st.tasks[0].parts.map(p=>p.done),[false,true]);
 assert.match(await page.textContent('.focus-tile strong'),/25 分钟/);

 // stopwatch under one minute is discarded; then a real one
 await page.click('[data-action="focus-mode"][data-mode="stopwatch"]');
 await page.selectOption('#focus-subject','英语');
 await page.click('[data-action="focus-start"]');await page.waitForSelector('.focus-timer.running');
 await page.clock.runFor(30*1000);await page.click('[data-action="focus-stop"]');await page.waitForTimeout(100);
 assert.match(await toastText(page),/不足 1 分钟/);
 await page.click('[data-action="focus-start"]');await page.waitForSelector('.focus-timer.running');
 // badge appears on other pages while running
 await page.click('.sidebar [data-view="home"]');await page.waitForSelector('#focus-badge');
 await page.clock.runFor(42*60*1000+5000);
 assert.match(await page.textContent('#focus-badge span'),/^42:0[4-6]$/);
 assert.match(await page.textContent('#focus-home-card .focus-home-live strong'),/^42:0[4-6]$/);
 await page.screenshot({path:shots+'/desktop-home-running.png'});
 await page.click('#focus-badge');await page.waitForSelector('.focus-timer.running');
 await page.click('[data-action="focus-stop"]');await page.waitForTimeout(100);
 assert.match(await toastText(page),/已记录 42 分钟/);

 // manual entry: future date rejected, valid saved, then delete
 await page.click('[data-action="focus-manual"]');
 await page.fill('#focus-manual-date','2026-10-30');await page.fill('#focus-manual-minutes','60');
 await page.click('[data-action="focus-manual-save"]');assert.match(await toastText(page),/不能补记未来/);
 await page.fill('#focus-manual-date','2026-10-29');await page.selectOption('#focus-manual-subject','政治');await page.fill('#focus-manual-note','真题选择题');
 await page.click('[data-action="focus-manual-save"]');await page.waitForTimeout(100);
 st=await state(page);assert.equal(st.focus.sessions.filter(s=>s.mode==='manual').length,2);
 assert.match((await page.$$eval('.focus-tile strong',n=>n.map(x=>x.textContent)))[0],/2 小时 7 分/);// 25+42+60
 const manualId=st.focus.sessions.find(s=>s.note==='真题选择题').id;
 await page.click(`[data-action="focus-delete"][data-id="${manualId}"]`);await page.waitForTimeout(100);
 st=await state(page);assert.ok(!st.focus.sessions.some(s=>s.id===manualId));

 // mistake review buttons keep lifetime counters; stats refresh
 await page.click('.sidebar [data-view="home"]');await page.waitForSelector('#review-home-card');
 await page.click('[data-action="mistake-review-fail"][data-id="m1"]');await page.waitForTimeout(100);
 st=await state(page);const m1=st.mistakes.find(m=>m.id==='m1');assert.equal(m1.reviewFails,3);assert.equal(m1.nextReview,'2026-10-30');

 // backup round trip keeps sessions and counters, never the running timer; restore keeps this device's timer
 await page.click('.sidebar [data-view="focus"]');await page.click('[data-action="focus-mode"][data-mode="pomodoro"]');
 await page.click('[data-action="focus-start"]');await page.waitForSelector('.focus-timer.running');
 const round=await page.evaluate(()=>{const b=Core.backup(S),json=JSON.parse(JSON.stringify(b)),r=Core.restore(json),next=restoredState(S,r);return {backupActive:b.focus.active,sessions:r.focus.sessions.length,live:S.focus.sessions.length,fails:r.mistakes.find(m=>m.id==='m1').reviewFails,keepsTimer:!!next.focus.active};});
 assert.deepEqual(round,{backupActive:null,sessions:round.live,live:round.live,fails:3,keepsTimer:true});
 await page.click('[data-action="focus-discard"]');await page.waitForTimeout(100);
 assert.equal((await state(page)).focus.active,null);
 await page.screenshot({path:shots+'/desktop-focus-after.png',fullPage:true});
 await ctx.close();

 // ---- phone: layout, more-menu entry, no horizontal scroll, running timer
 ({ctx,page}=await open({width:390,height:844}));
 await page.click('[data-action="mobile-more"]');await page.click('.mobile-more-grid [data-view="focus"]');
 await page.waitForSelector('.focus-page');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
 assert.equal(overflow,0,'no horizontal scroll on phone');
 await page.screenshot({path:shots+'/phone-focus.png',fullPage:true});
 await page.click('[data-action="focus-start"]');await page.waitForSelector('.focus-timer.running');await page.clock.runFor(7*60*1000);
 await page.screenshot({path:shots+'/phone-running.png'});
 await page.click('.mobile-nav [data-view="home"]');
 await page.waitForSelector('#focus-home-card .focus-home-live');
 await page.screenshot({path:shots+'/phone-home.png',fullPage:true});
 await ctx.close();
 await browser.close();
 assert.deepEqual(errors,[],'console / page errors');
 console.log('E2E PASS');
})().catch(e=>{console.error(e);process.exit(1);});
