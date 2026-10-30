const test = require('node:test');
const assert = require('node:assert/strict');
let C; try { C = require('../app/src/main/assets/core.js'); } catch { C = {}; }
test('中文检索返回相关条目并保留定位信息',()=>{
 assert.equal(typeof C.search,'function');
 const r=C.search([{id:'a',title:'极限笔记',body:'等价无穷小需要满足条件',subject:'数学',tags:[],version:2},{id:'b',title:'操作系统',body:'进程',tags:[]}],'无穷小');
 assert.equal(r.length,1);assert.equal(r[0].id,'a');assert.equal(r[0].version,2);
});
test('空查询不把所有笔记上传',()=>{assert.equal(typeof C.search,'function');assert.deepEqual(C.search([{id:'a',body:'秘密'}],''),[]);});
test('分类失败保存的原文不丢失',()=>{assert.equal(typeof C.applyClassification,'function');const n={id:'a',version:1,body:'原文',manual:false};const r=C.applyClassification(n,1,null);assert.equal(r.body,'原文');assert.equal(r.status,'failed');});
test('旧分类结果不能覆盖新内容',()=>{assert.equal(typeof C.applyClassification,'function');const n={id:'a',version:2,subject:'英语',manual:false};assert.deepEqual(C.applyClassification(n,1,{subject:'数学'}),n);});
test('人工分类不被AI覆盖',()=>{assert.equal(typeof C.applyClassification,'function');const n={id:'a',version:1,subject:'数学',manual:true};assert.deepEqual(C.applyClassification(n,1,{subject:'英语'}),n);});
test('归类不确定的科目进入待确认',()=>{assert.equal(typeof C.applyClassification,'function');assert.equal(C.applyClassification({version:1},1,{subject:'火星学',tags:['测试']}).subject,'待确认');});
test('今日统计接受零值但不据此验证非零同步',()=>{assert.equal(typeof C.parseStats,'function');const r=C.parseStats({result_code:200,data_body:{learnList:[{date:'今日',learnNum:0,reviewNum:0}]}},'2026-10-26');assert.equal(r.learn,0);assert.equal(r.review,0);assert.equal(r.verified,false);});
test('缺少今日统计不能拿历史记录冒充',()=>{assert.equal(typeof C.parseStats,'function');assert.throws(()=>C.parseStats({result_code:200,data_body:{learnList:[{date:'10-25',learnNum:40,reviewNum:2}]}},'2026-10-26'));});
test('拒绝负数和接口业务失败',()=>{assert.equal(typeof C.parseStats,'function');assert.throws(()=>C.parseStats({result_code:200,data_body:{learnList:[{date:'今日',learnNum:-1,reviewNum:0}]}},'2026-10-26'));assert.throws(()=>C.parseStats({result_code:20000,data_body:{}},'2026-10-26'));});
test('备份只包含学习数据不带密钥',()=>{assert.equal(typeof C.backup,'function');const b=C.backup({tasks:[],notes:[],mistakes:[],files:[],apiKey:'SECRET',settings:{apiKey:'SECRET'}});assert.ok(!JSON.stringify(b).includes('SECRET'));assert.equal(b.schema,1);});
test('损坏备份在恢复前拒绝',()=>{assert.equal(typeof C.restore,'function');assert.throws(()=>C.restore({schema:999,tasks:[]}));assert.throws(()=>C.restore({schema:1,tasks:'oops',notes:[],mistakes:[],files:[]}));});
test('模型JSON可接受围栏但必须有对象',()=>{assert.equal(typeof C.parseModelJSON,'function');assert.equal(C.parseModelJSON('```json\n{"subject":"数学"}\n```').subject,'数学');assert.throws(()=>C.parseModelJSON('不是JSON'));});
test('所有插入界面的用户文本被转义',()=>{assert.equal(typeof C.escape,'function');assert.equal(C.escape('<img onerror="x">&'), '&lt;img onerror=&quot;x&quot;&gt;&amp;');});
test('备份恢复保留重复任务链与手动词书进度',()=>{const b=C.backup({tasks:[{id:'t1',title:'背单词',repeat:true,series:'root',date:'2026-10-26'}],notes:[],mistakes:[],files:[],english:{manualLearned:357,lastWord:'lag',goal:40}});const r=C.restore(b);assert.equal(r.tasks[0].repeat,true);assert.equal(r.tasks[0].series,'root');assert.equal(r.english.manualLearned,357);});
