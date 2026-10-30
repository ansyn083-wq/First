const test = require('node:test');
const assert = require('node:assert/strict');
let P; try { P = require('../app/src/main/assets/planner-core.js'); } catch { P = {}; }
const task = (date, extra={}) => ({id:date,title:'复习',subject:'数学',date,done:false,repeat:false,...extra});
const model = () => ({days:Array.from({length:7},(_,i)=>({date:`2026-11-${String(2+i).padStart(2,'0')}`,tasks:[{title:'复习',subject:'数学'}]})),note:'根据已记录任务安排'});

test('严格检查公历日期，闰日与非法日期',()=>{
 assert.equal(typeof P.validDate,'function');
 for(const d of ['2024-02-29','2000-02-29','2026-12-31'])assert.equal(P.validDate(d),true);
 for(const d of ['2025-02-29','2100-02-29','2026-04-31','2026-1-01','2026-01-01T00:00:00Z',null,20261028])assert.equal(P.validDate(d),false);
});
test('按日历跨年与闰日加减，不受夏令时影响',()=>{
 assert.equal(P.addDays('2026-12-31',1),'2027-01-01');
 assert.equal(P.addDays('2024-03-01',-1),'2024-02-29');
 assert.equal(P.addDays('2026-03-08',1),'2026-03-09');
 assert.throws(()=>P.addDays('2026-02-30',1));assert.throws(()=>P.addDays('2026-02-20',.5));
});
test('周范围以周一开头，周一周日及跨年一致',()=>{
 assert.deepEqual(P.weekRange('2026-12-28'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(P.weekRange('2027-01-03'),{start:'2026-12-28',end:'2027-01-03'});
 assert.deepEqual(P.weekRange('2027-01-03',1),{start:'2027-01-04',end:'2027-01-10'});
});
test('旧数据默认打开自动补报且仅有效today可补官方日期',()=>{
 assert.deepEqual(P.normalize(undefined,'2026-10-28'),{exam:{year:2027,date:'2026-12-19'},autoReports:true,reports:[],clearedDates:[],repeatSeeds:[]});
 assert.equal(P.normalize({},'2026-12-20').exam.date,'');
 assert.equal(P.normalize({},'2026-12-19').exam.date,'2026-12-19');
 assert.equal(P.normalize({}).exam.date,'');
});
test('未知考研年份不猜日期，自定义日期与明确关闭开关保留',()=>{
 assert.equal(P.normalize({exam:{year:2028}},'2026-10-28').exam.date,'');
 assert.deepEqual(P.normalize({exam:{year:2028,date:'2027-12-18'},autoReports:false},'2026-10-28').exam,{year:2028,date:'2027-12-18'});
 assert.equal(P.normalize({autoReports:false},'2026-10-28').autoReports,false);
 assert.equal(P.normalize({exam:{year:2027,date:''}},'2026-10-28').exam.date,'');
 assert.equal(P.normalize({exam:{year:2101,date:'2026-02-30'}},'2026-10-28').exam.year,2027);
});
test('倒计时区分未来、当日、已过和未设置',()=>{
 assert.deepEqual(P.countdown({year:2027,date:'2026-12-19'},'2026-12-18'),{year:2027,date:'2026-12-19',days:1,phase:'before'});
 assert.equal(P.countdown({year:2027,date:'2026-12-19'},'2026-12-19').phase,'today');
 assert.deepEqual(P.countdown({year:2027,date:'2026-12-19'},'2026-12-20'),{year:2027,date:'2026-12-19',days:-1,phase:'past'});
 assert.equal(P.countdown({year:2028,date:''},'2026-10-28').phase,'unset');
 assert.throws(()=>P.countdown({},'invalid'));
});
test('报告恢复拒绝非法kind与日期区间，周报必须完整周',()=>{
 const base={id:'r',kind:'daily',start:'2026-10-27',end:'2026-10-27',body:'正文',createdAt:'2026-10-28T10:00:00Z',model:'m',signature:'s'};
 const reports=[base,{...base,id:'w',kind:'weekly',start:'2026-10-19',end:'2026-10-25'},...[
  {kind:'other'},{end:'2026-10-28'},{start:'2026-02-30'},{kind:'weekly',start:'2026-10-20',end:'2026-10-26'},{kind:'weekly',start:'2026-10-19',end:'2026-10-24'}
 ].map(x=>({...base,...x}))];
 assert.deepEqual(P.normalize({reports},'2026-10-28').reports.map(r=>r.id),['r','w']);
});
test('净化备份限制报告与清空日数量和字符串，不携带未知密钥',()=>{
 const reports=Array.from({length:130},(_,i)=>({id:'r'+i,kind:'daily',start:'2026-10-27',end:'2026-10-27',body:'长'.repeat(22000),model:'m'.repeat(1000),signature:'s'.repeat(1000),createdAt:'x'.repeat(1000),apiKey:'SECRET'}));
 const clearedDates=Array.from({length:410},(_,i)=>P.addDays('2025-01-01',i));
 const n=P.normalize({reports,clearedDates:[null,'invalid',...clearedDates,...clearedDates],apiKey:'SECRET'},'2026-10-28');
 assert.equal(n.reports.length,120);assert.equal(n.reports[0].body.length,20000);
 assert.ok(n.reports[0].model.length<=200);assert.ok(n.reports[0].signature.length<=200);assert.ok(n.reports[0].createdAt.length<=100);
 assert.equal(n.clearedDates.length,400);assert.equal(new Set(n.clearedDates).size,400);assert.ok(!JSON.stringify(n).includes('SECRET'));
});
test('snapshot逐事项保留部分完成真实统计',()=>{
 const tasks=[task('2026-10-27',{title:'极限；导数；积分',parts:[{title:'极限',done:true},{title:'导数',done:false}]}),task('2026-10-28',{id:'b',title:'词汇；阅读',subject:'英语',done:true}),task('2026-10-29')];
 const s=P.snapshot(tasks,'2026-10-27','2026-10-28');
 assert.equal(s.total,5);assert.equal(s.done,3);assert.equal(s.pending,2);
 assert.deepEqual(s.bySubject,{'数学':{total:3,done:1,pending:2},'英语':{total:2,done:2,pending:0}});
 assert.equal(s.days.length,2);assert.equal(s.days[0].tasks.length,3);assert.equal(s.days[0].tasks[0].done,true);assert.equal(s.days[0].tasks[1].done,false);assert.equal(s.truncated,false);
 assert.ok(s.days[0].tasks.every(t=>Object.keys(t).sort().join(',')==='done,id,repeat,subject,title'));
});
test('snapshot未完成不虚构统计，无效任务日期不计入',()=>{
 const s=P.snapshot([task('2026-10-28'),task('invalid'),null],'2026-10-28','2026-10-29');
 assert.equal(s.total,1);assert.equal(s.done,0);assert.equal(s.pending,1);assert.equal(s.days[1].tasks.length,0);
 assert.throws(()=>P.snapshot([],'2026-10-29','2026-10-28'));
});
test('snapshot限制500事项并明示截断，signature仍覆盖未发送内容',()=>{
 const tasks=Array.from({length:501},(_,i)=>task('2026-10-28',{id:String(i),title:'任务'+i}));
 const s=P.snapshot(tasks,'2026-10-28','2026-10-28');
 assert.equal(s.total,501);assert.equal(s.days[0].tasks.length,500);assert.equal(s.truncated,true);assert.equal(s.signature,P.signature(tasks,'2026-10-28','2026-10-28'));
 tasks[500].title='最后任务改变';assert.notEqual(s.signature,P.signature(tasks,'2026-10-28','2026-10-28'));
});
test('snapshot字符串有界，截断长标题时明示',()=>{
 const s=P.snapshot([task('2026-10-28',{title:'长'.repeat(100000),id:'i'.repeat(100000),subject:'s'.repeat(100000)})],'2026-10-28','2026-10-28');
 assert.equal(s.truncated,true);assert.ok(JSON.stringify(s).length<10000);
});
test('signature稳定于属性与任务数组顺序，对完成及重复设置敏感',()=>{
 const a=task('2026-10-28',{id:'a'}),b=task('2026-10-28',{id:'b',title:'词汇',subject:'英语'});
 assert.equal(P.signature([a,b]),P.signature([b,{repeat:false,done:false,date:a.date,subject:a.subject,title:a.title,id:a.id}]));
 for(const patch of [{done:true},{parts:[{title:'复习',done:true}]},{repeat:true},{repeatTitle:'新模板'},{repeatUpdatedAt:12},{series:'new'},{title:'变化'},{subject:'政治'},{date:'2026-10-29'}])assert.notEqual(P.signature([a]),P.signature([{...a,...patch}]));
 assert.equal(P.signature([a,b],'2026-10-28','2026-10-28'),P.signature([a,b,task('2026-10-29')],'2026-10-28','2026-10-28'));
});
test('自动报告只取最近一个有任务的结束日和完整周',()=>{
 const tasks=['2026-10-28','2026-10-27','2026-10-26','2026-10-25','2026-10-19'].map(d=>task(d));
 assert.deepEqual(P.dueReports({},tasks,'2026-10-28'),[{kind:'daily',start:'2026-10-27',end:'2026-10-27'},{kind:'weekly',start:'2026-10-19',end:'2026-10-25'}]);
});
test('自动报告已有候选不再补更旧日，关闭与空任务不生成',()=>{
 const tasks=['2026-10-27','2026-10-26','2026-10-25'].map(d=>task(d));
 const reports=[{kind:'daily',start:'2026-10-27',end:'2026-10-27',body:'ok'},{kind:'weekly',start:'2026-10-19',end:'2026-10-25',body:'ok'}];
 assert.deepEqual(P.dueReports({reports},tasks,'2026-10-28'),[]);
 assert.deepEqual(P.dueReports({autoReports:false},tasks,'2026-10-28'),[]);assert.deepEqual(P.dueReports({},[],'2026-10-28'),[]);
});
test('自动报告窗口严格限定7个结束日及4个完整周',()=>{
 assert.deepEqual(P.dueReports({},[task('2026-10-20'),task('2026-09-27')],'2026-10-28'),[{kind:'weekly',start:'2026-10-19',end:'2026-10-25'}]);
 assert.deepEqual(P.dueReports({},[task('2026-09-27')],'2026-10-28'),[]);
 assert.deepEqual(P.dueReports({},[task('2026-10-05')],'2026-10-28'),[{kind:'weekly',start:'2026-10-05',end:'2026-10-11'}]);
});
test('周一允许上一完整周，周日仍不得把本周当完整周',()=>{
 assert.deepEqual(P.dueReports({},[task('2027-01-03')],'2027-01-04'),[{kind:'daily',start:'2027-01-03',end:'2027-01-03'},{kind:'weekly',start:'2026-12-28',end:'2027-01-03'}]);
 assert.deepEqual(P.dueReports({},[task('2027-01-03')],'2027-01-03'),[]);
});
test('clearDay只清选日并记录抑制，返回新状态且原数据不变',()=>{
 const state={tasks:[task('2026-10-27',{repeat:true,series:'s'}),task('2026-10-28',{repeat:true,series:'s'})],planner:{exam:{year:2028,date:''},autoReports:false,reports:[],clearedDates:['2026-10-26']},notes:[{id:'n'}]};
 const before=JSON.stringify(state),n=P.clearDay(state,'2026-10-27');
 assert.equal(JSON.stringify(state),before);assert.notEqual(n,state);assert.notEqual(n.tasks,state.tasks);assert.notEqual(n.planner,state.planner);
 assert.deepEqual(n.tasks,[state.tasks[1]]);assert.deepEqual(n.planner.clearedDates,['2026-10-26','2026-10-27']);assert.equal(n.notes,state.notes);
 assert.deepEqual(P.clearDay(n,'2026-10-27').planner.clearedDates,n.planner.clearedDates);assert.throws(()=>P.clearDay(state,'invalid'));
});
test('七日模型输出对应所选周的下一周，可接受乱序日期并输出有序',()=>{
 const input=model();input.days.reverse();const result=P.validatePlan(input,'2026-11-01');
 assert.equal(result.start,'2026-11-02');assert.equal(result.end,'2026-11-08');assert.equal(result.days.length,7);assert.equal(result.days[0].date,'2026-11-02');assert.equal(result.tasks.length,7);
 assert.deepEqual(result.tasks[0],{date:'2026-11-02',title:'复习',subject:'数学',repeat:false});assert.equal(result.note,input.note);
});
test('七日模型支持空日且不改变输入',()=>{
 const m=model();m.days[0].tasks=[];const before=JSON.stringify(m),r=P.validatePlan(m,'2026-10-28');assert.equal(r.tasks.length,6);assert.equal(JSON.stringify(m),before);
});
test('七日模型拒绝缺失、重复、越界、非法日期',()=>{
 assert.equal(typeof P.validatePlan,'function');
 for(const mutate of [m=>m.days.pop(),m=>m.days.push(m.days[0]),m=>m.days[1].date=m.days[0].date,m=>m.days[0].date='2026-11-01',m=>m.days[0].date='2026-02-30']){const m=model();mutate(m);assert.throws(()=>P.validatePlan(m,'2026-10-28'));}
});
test('七日模型拒绝超量、超长、空白标题、不明科目与非法内容，不静默截断',()=>{
 assert.equal(typeof P.validatePlan,'function');
 for(const mutate of [m=>m.days[0].tasks=Array.from({length:13},()=>({title:'学',subject:'数学'})),m=>m.days[0].tasks[0].title='长'.repeat(241),m=>m.days[0].tasks[0].title=' ',m=>m.days[0].tasks[0].title=23,m=>m.days[0].tasks[0].subject='待确认',m=>m.days[0].tasks[0].subject='未知',m=>m.days[0].tasks[0].title='a\u0000b',m=>m.days[0].tasks[0].repeat=true,m=>m.note='长'.repeat(2001),m=>m.days[0].tasks={title:'x'}]){const m=model();mutate(m);assert.throws(()=>P.validatePlan(m,'2026-10-28'));}
});
test('七日跨年与闰日计划日期精确',()=>{
 for(const [anchor,start] of [['2026-12-27','2026-12-28'],['2024-02-25','2024-02-26']]){
  const m={days:Array.from({length:7},(_,i)=>({date:P.addDays(start,i),tasks:[]}))};assert.equal(P.validatePlan(m,anchor).start,start);
 }
});
test('损坏的极限年份周报被丢弃而非导致整个备份失败',()=>{
 assert.deepEqual(P.normalize({reports:[{kind:'weekly',start:'9999-12-27',end:'9999-12-31',body:'损坏'}]},'2026-10-28').reports,[]);
});
test('七日计划拒绝只有分隔符的空事项及拆分后超过12项',()=>{
 const m=model();m.days[0].tasks[0].title='；；';assert.throws(()=>P.validatePlan(m,'2026-10-28'));
 m.days[0].tasks=[{title:Array.from({length:13},(_,i)=>'事项'+i).join('；'),subject:'数学'}];assert.throws(()=>P.validatePlan(m,'2026-10-28'));
});
test('浏览器UMD加载实际Core并导出同一契约',()=>{
 const fs=require('node:fs'),vm=require('node:vm'),context={};vm.createContext(context);
 vm.runInContext(fs.readFileSync(require.resolve('../app/src/main/assets/core.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('../app/src/main/assets/planner-core.js'),'utf8'),context);
 assert.equal(context.PlannerCore.addDays('2024-02-28',1),'2024-02-29');
 assert.deepEqual(Object.keys(context.PlannerCore).sort(),Object.keys(P).sort());
});
test('清空唯一重复模板时保留纯种子，任务统计不混入种子',()=>{
 const repeated=task('2026-10-28',{id:'only',series:'chain',title:'复习；习题',repeat:true,repeatTitle:'复习',repeatUpdatedAt:42,done:true,parts:[{title:'复习',done:true}],apiKey:'SECRET'});
 const state={tasks:[repeated],planner:{}};const before=JSON.stringify(state),cleared=P.clearDay(state,'2026-10-28');
 assert.equal(JSON.stringify(state),before);assert.deepEqual(cleared.tasks,[]);
 assert.deepEqual(cleared.planner.repeatSeeds,[{id:'only',series:'chain',title:'复习；习题',subject:'数学',date:'2026-10-28',repeat:true,repeatTitle:'复习',repeatUpdatedAt:42}]);
 assert.deepEqual(cleared.planner.clearedDates,['2026-10-28']);
 assert.equal(P.snapshot(cleared.tasks,'2026-10-28','2026-10-28').total,0);
 assert.deepEqual(P.dueReports(cleared.planner,cleared.tasks,'2026-10-29'),[]);
 assert.ok(!JSON.stringify(cleared).includes('SECRET'));
});
test('重复清空不扩增种子，同series先按更新时间再按日期选最新模板',()=>{
 const seed=task('2026-10-25',{id:'old',series:'chain',repeat:true,repeatUpdatedAt:4});
 const state={planner:{repeatSeeds:[seed]},tasks:[task('2026-10-28',{id:'new',series:'chain',repeat:true,repeatUpdatedAt:5,title:'新模板'}),task('2026-10-29',{id:'future'})]};
 const first=P.clearDay(state,'2026-10-28'),second=P.clearDay(first,'2026-10-28');
 assert.deepEqual(first.planner.repeatSeeds,second.planner.repeatSeeds);assert.equal(first.planner.repeatSeeds.length,1);assert.equal(first.planner.repeatSeeds[0].id,'new');
 assert.equal(first.tasks[0],state.tasks[1]);
 const normalized=P.normalize({repeatSeeds:[...first.planner.repeatSeeds,{...seed,id:'later-date',date:'2026-10-30',repeatUpdatedAt:5},{...seed,id:'old-stamp',date:'2026-10-31',repeatUpdatedAt:3}]});
 assert.equal(normalized.repeatSeeds.length,1);assert.equal(normalized.repeatSeeds[0].id,'later-date');
});
test('种子恢复按id去重且只允许有效日期科目及纯重复模板',()=>{
 const seed=task('2026-10-28',{id:'single',repeat:true,parts:[{title:'复习',done:true}],done:true,apiKey:'SECRET',routing:{secret:true},repeatUpdatedAt:8});
 const invalid=[null,{...seed,id:''},{...seed,id:'x'.repeat(101)},{...seed,id:'bad-date',date:'2026-02-30'},{...seed,id:'bad-subject',subject:'火星学'},{...seed,id:'off',repeat:'false'},{...seed,id:'empty',title:'  '},{...seed,id:'bad-title',title:123}];
 const n=P.normalize({repeatSeeds:[seed,{...seed,title:'替换',date:'2026-10-29'},...invalid]});
 assert.deepEqual(n.repeatSeeds,[{id:'single',title:'替换',subject:'数学',date:'2026-10-29',repeat:true,repeatUpdatedAt:8}]);
 assert.ok(!JSON.stringify(n).includes('SECRET'));
 assert.deepEqual(P.normalize({repeatSeeds:'invalid'}).repeatSeeds,[]);
});
test('种子最多200个，模板文本最多60000字且无效时间戳不保留',()=>{
 const seeds=Array.from({length:205},(_,i)=>task('2026-10-28',{id:String(i),repeat:true}));
 const n=P.normalize({repeatSeeds:seeds});assert.equal(n.repeatSeeds.length,200);assert.equal(new Set(n.repeatSeeds.map(t=>t.series||t.id)).size,200);
 const bounded=P.normalize({repeatSeeds:[task('2026-10-28',{repeat:true,title:'长'.repeat(60001),repeatTitle:'模'.repeat(60001),repeatUpdatedAt:-2})]}).repeatSeeds[0];
 assert.equal(bounded.title.length,60000);assert.equal(bounded.repeatTitle.length,60000);assert.equal(bounded.repeatUpdatedAt,undefined);
});
test('清空较新的取消重复记录保留取消墓碑，旧取消记录不撤销新seed',()=>{
 const seed=task('2026-10-27',{id:'seed',series:'chain',repeat:true,repeatUpdatedAt:8});
 const cancellation=task('2026-10-28',{id:'off',series:'chain',repeat:false,repeatUpdatedAt:9});
 const cancelled=P.clearDay({planner:{repeatSeeds:[seed]},tasks:[cancellation]},'2026-10-28');assert.equal(cancelled.planner.repeatSeeds.length,1);assert.equal(cancelled.planner.repeatSeeds[0].repeat,false);assert.equal(cancelled.planner.repeatSeeds[0].repeatUpdatedAt,9);
 const newer={...seed,date:'2026-10-29',repeatUpdatedAt:10};
 const result=P.clearDay({planner:{repeatSeeds:[newer]},tasks:[cancellation]},'2026-10-28');assert.equal(result.planner.repeatSeeds.length,1);assert.equal(result.planner.repeatSeeds[0].date,'2026-10-29');
});
test('旧重复历史留在其他日时，清空取消日仍以false墓碑压制旧模板',()=>{
 const old=task('2026-10-26',{id:'old',series:'chain',repeat:true,repeatUpdatedAt:4});
 const cancellation=task('2026-10-28',{id:'off',series:'chain',repeat:false,repeatUpdatedAt:5});
 const state={tasks:[old,cancellation,task('2026-10-29')]},before=JSON.stringify(state),cleared=P.clearDay(state,'2026-10-28');
 assert.equal(JSON.stringify(state),before);assert.deepEqual(cleared.tasks,[state.tasks[0],state.tasks[2]]);assert.equal(cleared.tasks[0].repeat,true);
 assert.deepEqual(cleared.planner.repeatSeeds,[{id:'off',series:'chain',title:'复习',subject:'数学',date:'2026-10-28',repeat:false,repeatUpdatedAt:5}]);
 assert.deepEqual(P.normalize(cleared.planner).repeatSeeds,cleared.planner.repeatSeeds);
});
test('清空常规无重复任务不存种子，已有id种子的取消仍保留',()=>{
 const normal=task('2026-10-28');assert.deepEqual(P.clearDay({tasks:[normal]},normal.date).planner.repeatSeeds,[]);
 const former={...normal,repeat:true},cleared=P.clearDay({tasks:[normal],planner:{repeatSeeds:[former]}},normal.date);
 assert.equal(cleared.planner.repeatSeeds.length,1);assert.equal(cleared.planner.repeatSeeds[0].repeat,false);
 assert.equal(P.normalize(cleared.planner).repeatSeeds[0].repeat,false);
});
