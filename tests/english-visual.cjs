const {chromium}=require(process.env.YANXU_PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.KAOYAN_CHROME});
 const output=process.env.YANXU_SCREENSHOTS||path.resolve('screenshots');fs.mkdirSync(output,{recursive:true});
 const results=[];
 try{for(const width of [360,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:width<600?844:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({phone})=>{
   const state={schema:1,tasks:[],notes:[],mistakes:[],files:[
    {id:'reading',name:'2026年考研英语二阅读理解历年真题与解析.pdf',path:'reading.pdf',kind:'document',size:3145728,body:'阅读理解真题',status:'indexed',version:1,routing:{subject:'英语',category:'papers',tracks:['英语二'],confidence:1,source:'manual'}},
    {id:'lecture',name:'长难句分析与翻译基础讲义.pdf',path:'lecture.pdf',kind:'document',size:1468006,body:'长难句学习讲义',status:'indexed',version:1,routing:{subject:'英语',category:'lecture',tracks:[],confidence:1,source:'manual'}},
    {id:'notes',name:'阅读高频词汇与写作素材整理.pdf',path:'notes.pdf',kind:'document',size:1048576,body:'阅读和写作复习',status:'indexed',version:1,routing:{subject:'英语',category:'notes',tracks:[],confidence:1,source:'manual'}}
   ],english:{provider:'bbdc',bookName:'2027 考研英语核心词汇',total:6590,manualLearned:1680,goal:40,lastWord:'perseverance',words:[],userId:'123'},settings:{autoClassify:false},study:{onboarded:{数学:true,英语:true,专业课:true},target:{英语:'英语二'}}};
   window.Android={deviceLayout:()=>phone?'phone':'tablet',request(action,raw,key){const p=JSON.parse(raw);let data=true;if(action==='load')data={state,config:{base:'',hasKey:false,model:''},pendingBatches:{}};if(action==='stats')data={result_code:200,data_body:{learnList:[{date:'今日',learnNum:24,reviewNum:86}]}};setTimeout(()=>window.NativeResult(key,{ok:true,data}),0)}};
  },{phone:width<600});
  await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);
  await page.locator('#content').waitFor();await page.locator('#startup').waitFor({state:'detached'});await page.locator((width<600?'.mobile-nav':'.sidebar')+' [data-view="english-subject"]').click();await page.locator('#english-words-panel').waitFor();
  await page.waitForFunction(()=>document.querySelector('#english-stats')?.textContent.includes('24'));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'words overflow '+width);
  if([390,1280].includes(width))await page.screenshot({path:path.join(output,'english-words-'+(width===390?'phone':'tablet')+'.png'),fullPage:true});
  await page.locator('#english-tab-materials').click();await page.locator('#english-materials-panel').waitFor();assert.equal(await page.locator('.subject-entry').count(),3);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'materials overflow '+width);
  if([390,1280].includes(width))await page.screenshot({path:path.join(output,'english-materials-'+(width===390?'phone':'tablet')+'.png'),fullPage:true});
  await page.locator('#english-filters summary').click();await page.locator('#subject-track').selectOption('all');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'filters overflow '+width);
  await page.locator('#english-tab-words').click();await page.evaluate(()=>{S.english.bookName='这是一本用于验证长标题换行与布局稳定性的考研英语词汇复习手册'.repeat(2);S.english.total=0;english()});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'long book overflow '+width);
  await page.locator('#english-tab-materials').click();await page.evaluate(()=>{S.files=[];S.notes=[];S.mistakes=[];renderSubjects()});assert(await page.locator('.empty').count()>0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'empty overflow '+width);
  assert.deepEqual(errors,[]);results.push({width,words:true,materials:true,filters:true,longTitle:true,empty:true});await page.close();
 }}finally{await browser.close()}
 console.log('English visual checks PASS:',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
