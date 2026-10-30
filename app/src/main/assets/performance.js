(function(root,factory){const x=factory();if(typeof module==='object')module.exports=x;else root.PerformanceTools=x;})(this,function(){
'use strict';
function createSaver({snapshot,write,delay=0}){let pending=[],running=false,timer=null;function schedule(){if(!running&&timer===null&&pending.length)timer=setTimeout(flush,delay);}async function flush(){timer=null;if(running||!pending.length)return;running=true;const group=pending;pending=[];try{const value=snapshot();await write(value);group.forEach(x=>x.resolve(true));}catch(e){group.forEach(x=>x.reject(e));}finally{running=false;schedule();}}return ()=>new Promise((resolve,reject)=>{pending.push({resolve,reject});schedule();});}
function createQueue(options={}){const known=new Map(),waiting=[];let running=0,completed=0,limit=Math.max(1,Math.min(4,Number(options.concurrency)||1)),pausedUntil=0,timer=null;
 function schedule(delay=0){if(timer!==null)clearTimeout(timer);timer=setTimeout(drain,delay);}
 function changed(){options.onChange?.();}
 function drain(){timer=null;if(Date.now()<pausedUntil){schedule(pausedUntil-Date.now());return;}if(options.canStart&&!options.canStart())return;while(running<limit&&waiting.length){const job=waiting.shift();running++;changed();Promise.resolve().then(job.fn).then(job.resolve,job.reject).finally(()=>{running--;completed++;known.delete(job.key);changed();schedule();});}}
 const enqueue=(key,fn)=>{if(known.has(key))return known.get(key);const p=new Promise((resolve,reject)=>waiting.push({key,fn,resolve,reject}));known.set(key,p);changed();schedule();return p;};
 enqueue.setConcurrency=n=>{limit=Math.max(1,Math.min(4,Number(n)||1));schedule();};enqueue.pauseUntil=time=>{pausedUntil=Math.max(pausedUntil,time);schedule(Math.max(0,pausedUntil-Date.now()));};enqueue.kick=()=>schedule();enqueue.stats=()=>({running,waiting:waiting.length,completed,limit,pausedUntil});return enqueue;
}
return {createSaver,createQueue};
});
