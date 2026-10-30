const test=require('node:test'),assert=require('node:assert/strict');
const {createApp}=require('./helpers/planning-app.cjs');

test('exam year editing clears the old date, accepts only valid years, and preserves the draft on refresh or failed save',async()=>{const a=await createApp();try{
 assert.equal(a.$('#planning-exam-year').value,'2027');assert.equal(a.$('#planning-exam-date').value,'2026-12-19');
 a.change('#planning-exam-year','2028');assert.equal(a.$('#planning-exam-date').value,'');
 a.input('#planning-exam-date','2027-12-18');a.run("aiState={busy:true,message:'正在补齐报告'};planningRefresh()");
 assert.equal(a.$('#planning-exam-year').value,'2028');assert.equal(a.$('#planning-exam-date').value,'2027-12-18');assert.match(a.$('#planning-feedback').textContent,/补齐报告/);
 a.run("aiState={busy:false,message:''};planningRefresh()");a.fail();await a.click('[data-action="planning-save-exam"]');
 assert.match(a.$('#planning-feedback').textContent,/磁盘已满/);assert.equal(a.$('#planning-exam-date').value,'2027-12-18');assert.equal(a.run('S.planner.exam.year'),2027);
 await a.click('[data-action="planning-save-exam"]');assert.equal(a.run('S.planner.exam.year'),2028);assert.equal(a.run('S.planner.exam.date'),'2027-12-18');
 a.change('#planning-exam-year','2101');await a.click('[data-action="planning-save-exam"]');assert.match(a.$('#planning-feedback').textContent,/2000.*2100/);assert.equal(a.run('S.planner.exam.year'),2028);
 a.change('#planning-exam-year','2029');await a.click('[data-action="planning-save-exam"]');assert.equal(a.run('S.planner.exam.date'),'');assert.match(a.$('.planning-countdown').textContent,/待设置/);
 a.change('#planning-exam-year','2027');assert.equal(a.$('#planning-exam-date').value,'2026-12-19');assert.deepEqual(a.errors,[]);
 }finally{await a.close()}});

test('daily and weekly reports use the selected date, count real parts, escape model text, and flag outdated history',async()=>{const a=await createApp();try{
 const stats=[...a.w.document.querySelectorAll('.planning-periods .planning-stats')].map(el=>el.textContent);assert.match(stats[0],/共 2 项.*完成 1 项.*待完成 1 项/);
 a.hold();await a.click('[data-action="planning-daily"]');await a.click('[data-action="planning-daily"]');assert.equal(a.run('calls.daily'),1);a.release();await a.wait(()=>!!a.$('.planning-report-body'));
 assert.deepEqual(JSON.parse(a.run('JSON.stringify(lastCall)')),{kind:'daily',start:'2026-10-27',end:'2026-10-27',options:{automatic:false}});
 assert.match(a.$('.planning-report-body').textContent,/<img/);assert.equal(a.$('#modal-root img'),null);assert.equal(a.$('#modal-root script'),null);assert.match(a.$('#modal-root').textContent,/截至生成时刻/);
 a.run("closeModal();S.tasks[0].parts[1].done=true;planningRefresh()");assert.match(a.$('.planning-reports').textContent,/可能过时/);
 await a.click('[data-action="planning-report"]');assert.match(a.$('#modal-root').textContent,/完成 2 项/);assert.match(a.$('#modal-root').textContent,/当前记录/);
 a.run('closeModal()');a.change('#planning-date','2026-10-28');await a.click('[data-action="planning-weekly"]');assert.deepEqual(JSON.parse(a.run('JSON.stringify(lastCall)')),{kind:'weekly',start:'2026-10-26',end:'2026-11-01',options:{automatic:false}});assert.deepEqual(a.errors,[]);
 }finally{await a.close()}});

test('empty periods and failed generation show an actionable error while the selected date survives refresh',async()=>{const a=await createApp();try{
 a.change('#planning-date','2026-12-01');await a.click('[data-action="planning-daily"]');assert.match(a.$('#planning-feedback').textContent,/没有已记录任务/);assert.equal(a.run('calls.daily'),0);
 a.change('#planning-date','2026-10-28');a.fail('AI服务暂时不可用');await a.click('[data-action="planning-daily"]');assert.match(a.$('#planning-feedback').textContent,/AI服务暂时不可用/);assert.equal(a.$('#planning-date').value,'2026-10-28');assert.equal(a.run('S.planner.reports.length'),0);
 a.run('planningRefresh()');assert.equal(a.$('#planning-date').value,'2026-10-28');assert.equal(a.$('[data-action="planning-daily"]').disabled,false);
 }finally{await a.close()}});

test('auto reports toggle is saved atomically and rolls the control back after a failed save',async()=>{const a=await createApp();try{
 assert.equal(a.$('#planning-auto-reports').checked,true);a.fail();a.change('#planning-auto-reports',false);await a.wait(()=>a.$('#planning-feedback').textContent.includes('磁盘已满'));
 assert.equal(a.$('#planning-auto-reports').checked,true);assert.equal(a.run('S.planner.autoReports'),true);
 a.change('#planning-auto-reports',false);await a.wait(()=>a.run('S.planner.autoReports')===false);assert.equal(a.$('#planning-auto-reports').checked,false);
 }finally{await a.close()}});

test('seven-day preview can be unchecked, survives failed import and regeneration, and imports once by append',async()=>{const a=await createApp();try{
 await a.click('[data-action="planning-next"]');assert.equal(a.w.document.querySelectorAll('.planning-preview-day').length,7);assert.match(a.$('.planning-preview').textContent,/2026-11-02.*2026-11-08/s);assert.equal(a.$('.planning-preview svg'),null);assert.equal(a.$('.planning-preview b'),null);assert.equal(a.run('S.tasks.length'),2);
 a.change('[data-planning-task="0"]',false);assert.match(a.$('[data-action="planning-import"]').textContent,/6/);a.fail();await a.click('[data-action="planning-import"]');assert.match(a.$('#planning-feedback').textContent,/磁盘已满/);assert.equal(a.$('[data-planning-task="0"]').checked,false);assert.equal(a.run('S.tasks.length'),2);
 a.fail('模型返回格式错误');await a.click('[data-action="planning-next"]');assert.match(a.$('#planning-feedback').textContent,/模型返回格式错误/);assert.equal(a.w.document.querySelectorAll('.planning-preview-day').length,7);assert.equal(a.$('[data-planning-task="0"]').checked,false);
 a.hold();await a.click('[data-action="planning-import"]');await a.click('[data-action="planning-import"]');assert.equal(a.run('calls.import'),2);a.release();await a.wait(()=>!a.$('.planning-preview'));assert.equal(a.run('S.tasks.length'),8);assert.equal(a.run('S.tasks[0].parts[0].done'),true);assert.equal(a.run('S.tasks.some(t=>t.date==="2026-11-02")'),false);assert.deepEqual(a.errors,[]);
 }finally{await a.close()}});

test('changed source rejects a preview without discarding its unchecked selections',async()=>{const a=await createApp();try{
 await a.click('[data-action="planning-next"]');a.change('[data-planning-task="2"]',false);a.run('S.tasks[0].done=true');await a.click('[data-action="planning-import"]');assert.match(a.$('#planning-feedback').textContent,/重新生成预览/);assert.ok(a.$('.planning-preview'));assert.equal(a.$('[data-planning-task="2"]').checked,false);
 await a.click('[data-action="planning-select-all"]');assert.equal(a.w.document.querySelectorAll('[data-planning-task]:checked').length,7);await a.click('[data-action="planning-select-all"]');assert.equal(a.w.document.querySelectorAll('[data-planning-task]:checked').length,0);assert.equal(a.$('[data-action="planning-import"]').disabled,true);
 }finally{await a.close()}});

test('home clear uses the event date and real count, rejects stale confirmation, rolls back failure, and ignores double confirmation',async()=>{const a=await createApp();try{
 a.run("view='home';chosenDate='2026-10-28';home()");assert.match(a.$('#planning-home-card').textContent,/2027 考研/);await a.click('[data-action="planning-clear-day"]');assert.match(a.$('#modal-root').textContent,/2026-10-27.*2 项事项（1 条任务记录）/s);assert.match(a.$('#modal-root').textContent,/保留其他日期.*不会.*自动恢复/s);
 a.fail();await a.click('[data-action="planning-confirm-clear"]');assert.match(a.$('#planning-dialog-feedback').textContent,/磁盘已满/);assert.equal(a.run('S.tasks.length'),2);
 a.run("S.tasks[0].title+='；积分'");await a.click('[data-action="planning-confirm-clear"]');assert.match(a.$('#planning-dialog-feedback').textContent,/已变化/);assert.equal(a.run('S.tasks.length'),2);
 a.run('closeModal()');await a.click('[data-action="planning-clear-day"]');a.hold();await a.click('[data-action="planning-confirm-clear"]');await a.click('[data-action="planning-confirm-clear"]');assert.equal(a.run('calls.commit'),2);a.release();await a.wait(()=>a.run('S.tasks.length')===1);assert.equal(a.run('S.tasks[0].date'),'2026-10-28');assert.equal(a.run('S.planner.clearedDates.includes("2026-10-27")'),true);assert.equal(a.$('[role="dialog"]'),null);assert.deepEqual(a.errors,[]);
 }finally{await a.close()}});

test('restored exam configuration refreshes the goal draft and countdown supports past and unset dates',async()=>{const a=await createApp();try{
 a.change('#planning-exam-year','2028');a.run("S.planner.exam={year:2026,date:'2025-12-20'};planningRefresh()");assert.equal(a.$('#planning-exam-year').value,'2026');assert.match(a.$('.planning-countdown').textContent,/已过/);
 a.run("S.planner.exam={year:2029,date:''};planningRefresh()");assert.match(a.$('.planning-countdown').textContent,/待设置/);a.run("S.planner.exam={year:2027,date:'2026-10-28'};planningRefresh()");assert.match(a.$('.planning-countdown').textContent,/今天初试/);
 }finally{await a.close()}});

test('full application scripts expose the planning page, home card, and dated clear action',async()=>{
 const {createApp:createFullApp}=require('./helpers/classification-app.cjs'),a=await createFullApp();try{
 await a.wait(()=>a.run('!!S'));a.run('navigate("planning")');assert.ok(a.$('#planning-date'));assert.ok(a.$('#planning-exam-year'));
 a.change('#planning-exam-year','2028');a.change('#planning-exam-date','2027-12-18');a.run('planningNotify()');assert.equal(a.$('#planning-exam-year').value,'2028');assert.equal(a.$('#planning-exam-date').value,'2027-12-18');
 a.run('navigate("home")');assert.ok(a.$('#planning-home-card'));assert.equal(a.$('[data-action="planning-clear-day"]').dataset.date,a.run('chosenDate'));
 assert.deepEqual(a.errors,[]);
 }finally{await a.close()}
});
