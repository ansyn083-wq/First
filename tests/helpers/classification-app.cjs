const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const assets=path.resolve('app/src/main/assets');
exports.createApp=async function(){
 const {Window}=await import(process.env.YANXU_HAPPY_DOM_PATH||'happy-dom');
 const w=new Window({url:'http://localhost/',settings:{disableJavaScriptFileLoading:true,disableCSSFileLoading:true}}),errors=[];
 let saved=null,fail=false,held=null,hold=false,saves=0;
 w.confirm=()=>true;w.scrollTo=()=>{};w.addEventListener('error',e=>errors.push(e.error?.stack||e.message));
 w.Android={request(action,raw,key){const p=JSON.parse(raw),reply=data=>setTimeout(()=>w.NativeResult(key,{ok:true,data}),0);if(action==='load')reply({state:{schema:1,tasks:[],notes:[],mistakes:[],files:[],settings:{autoClassify:false},english:{}},config:{hasKey:false},pendingBatches:{}});else if(action==='save'){saves++;const done=()=>{if(fail){fail=false;w.NativeResult(key,{ok:false,error:'磁盘已满'})}else{saved=structuredClone(p.state);w.NativeResult(key,{ok:true,data:true})}};if(hold){held=done;hold=false}else setTimeout(done,0)}else if(action==='pdfPage')reply({page:p.page,totalPages:8,image:'data:image/png;base64,AAAA'});else reply(true)}};
 const html=fs.readFileSync(path.join(assets,'index.html'),'utf8');w.document.write(html.replace(/<script[^>]*>[\s\S]*?<\/script>/g,''));const context=vm.createContext(w),loaded=new Set();
 for(const m of html.matchAll(/<script src="([^"]+)"/g)){vm.runInContext(fs.readFileSync(path.join(assets,m[1]),'utf8'),context,{filename:m[1]});loaded.add(m[1])}
 for(const name of ['classification-core.js','classification-workbench-ui.js'])if(!loaded.has(name)&&fs.existsSync(path.join(assets,name)))vm.runInContext(fs.readFileSync(path.join(assets,name),'utf8'),context,{filename:name});
 const run=code=>vm.runInContext(code,context),$=s=>w.document.querySelector(s),sleep=ms=>new Promise(r=>setTimeout(r,ms)),wait=async fn=>{for(let i=0;i<150&&!fn();i++)await sleep(15);assert.ok(fn(),$('#toast')?.textContent+' '+errors.join('\n'))};
 await wait(()=>!!$('#content'));return {w,run,$,errors,sleep,wait,get saved(){return saved},get saves(){return saves},fail(){fail=true},hold(){hold=true},release(){held?.();held=null},async click(s){assert.ok($(s),'missing '+s);$(s).click();await sleep(15)},change(s,value){assert.ok($(s),'missing '+s);const e=$(s);if(e.type==='checkbox')e.checked=value;else e.value=value;e.dispatchEvent(new w.Event('change',{bubbles:true}))},async close(){await w.happyDOM.abort()}};
};
