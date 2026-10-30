const {chromium}=require(process.env.YANXU_PLAYWRIGHT_MODULE||'playwright');
const path=require('node:path'),fs=require('node:fs'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.KAOYAN_CHROME});
 const output=process.env.YANXU_SCREENSHOTS||path.resolve('screenshots');fs.mkdirSync(output,{recursive:true});const results=[];
 try{for(const width of [360,390,768,1280]){
  const page=await browser.newPage({viewport:{width,height:width<600?844:1000},deviceScaleFactor:1});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({phone})=>{
   const state={schema:1,tasks:[],notes:[],mistakes:[],files:[
    {id:'failed',name:'2026年考研数学二高等数学基础讲义与详细解答的长文件名示例.pdf',path:'failed.pdf',version:1,status:'partial',classificationStatus:'failed',classificationError:'连接暂时中断，原件已保留',routing:{subject:'数学',category:'lecture',confidence:.4,needsReview:true,source:'ai'},materialMeta:{module:'高等数学',series:'基础课程',year:2026,edition:'修订版'},pages:[{page:3,body:'极限定义：对于任意给定的正数，存在相应的邻域。此处为用于界面测试的演示文字。'}]},
    {id:'conflict',name:'英语一阅读理解历年真题与解析.pdf',path:'conflict.pdf',version:1,classificationConflict:true,classificationCandidates:[{subject:'英语',category:'papers',tracks:['英语一'],confidence:1},{subject:'英语',category:'papers',tracks:['英语二'],confidence:1}],routing:{subject:'英语',category:'papers',confidence:.99,tracks:['英语二'],needsReview:true,source:'ai'},materialMeta:{module:'阅读',year:2025}},
    {id:'uncertain',name:'扫描件_尚无明确分类依据.pdf',path:'scan.pdf',version:1,routing:{subject:'待确认',category:'other',confidence:.2,needsReview:true,source:'ai'}}
   ],settings:{autoClassify:false},study:{onboarded:{数学:true,英语:true,专业课:true}},english:{}};
   window.Android={deviceLayout:()=>phone?'phone':'tablet',request(action,raw,key){let data=true;if(action==='load')data={state,config:{hasKey:false,model:''},pendingBatches:{}};setTimeout(()=>window.NativeResult(key,{ok:true,data}),0)}};
  },{phone:width<600});
  await page.goto(pathToFileURL(path.resolve('app/src/main/assets/index.html')).href);await page.locator('#startup').waitFor({state:'detached'});await page.evaluate(()=>openSubject('待确认'));
  const fits=async label=>assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||[...document.querySelectorAll('.modal')].some(e=>e.scrollWidth>e.clientWidth+1)),false,label+' '+width);
  await fits('review');assert.equal(await page.locator('.classification-item').count(),3);
  if([390,1280].includes(width))await page.screenshot({path:path.join(output,'classification-review-'+(width===390?'phone':'tablet')+'.png'),fullPage:true});
  await page.locator('[data-action="classification-detail"][data-key="files:failed"]').click();await page.locator('.classification-evidence').first().waitFor();await fits('evidence');assert.match(await page.locator('#modal-root').textContent(),/第 3 页/);
  if(width===390)await page.screenshot({path:path.join(output,'classification-evidence-phone.png'),fullPage:true});await page.evaluate(()=>closeModal());
  await page.locator('[data-action="classification-select-mode"]').click();await page.locator('[data-action="classification-select-all"]').click();await page.locator('[data-action="classification-batch"]').click();await page.locator('#classification-edit-series').fill('2027 考研复习资料');await page.locator('#classification-edit-year').fill('2027');await page.locator('[data-action="classification-preview"]').click();await page.locator('.classification-preview-list').waitFor();await fits('preview');
  if([390,1280].includes(width))await page.screenshot({path:path.join(output,'classification-preview-'+(width===390?'phone':'tablet')+'.png'),fullPage:true});
  await page.locator('[data-action="classification-confirm"]').click();await page.waitForFunction(()=>S.classificationUndo?.length===1&&!classificationIsBusy());assert.equal(await page.locator('.classification-item').count(),0);await fits('empty');
  await page.locator('[data-action="classification-undo"]').click();await fits('undo');await page.locator('[data-action="classification-undo-confirm"]').click();await page.waitForFunction(()=>!classificationIsBusy()&&S.classificationUndo.length===0);assert.equal(await page.locator('.classification-item').count(),3);
  await page.locator('[data-action="classification-rules"]').click();await page.locator('[data-action="classification-rule-new"]').click();await fits('rule editor');await page.locator('#classification-rule-name').fill('高数讲义');await page.locator('#classification-rule-match').fill('高等数学');await page.locator('[data-action="classification-rule-preview"]').click();await fits('rule preview');await page.locator('[data-action="classification-rule-confirm"]').click();await page.waitForFunction(()=>S.classificationRules?.length===1&&!classificationIsBusy());await page.evaluate(()=>closeModal());
  await page.locator('#classification-filter-module').selectOption('高等数学');assert.equal(await page.locator('.classification-item').count(),1);await page.locator('[data-action="classification-clear-filters"]').click();await page.locator('#classification-search').fill('邻域');assert.equal(await page.locator('.classification-item').count(),1);await fits('search');await page.locator('[data-action="classification-clear-filters"]').click();
  assert.deepEqual(errors,[]);results.push({width,review:true,evidence:true,batchPreviewApplyUndo:true,rules:true,facets:true,search:true,empty:true});await page.close();
 }}finally{await browser.close()}
 fs.writeFileSync(path.join(output,'classification-browser-checks.json'),JSON.stringify(results,null,2));console.log('Classification browser checks PASS:',JSON.stringify(results));
})().catch(e=>{console.error(e);process.exitCode=1});
