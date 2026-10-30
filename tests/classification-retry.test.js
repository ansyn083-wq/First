const test=require('node:test'),assert=require('node:assert/strict');
let R;try{R=require('../app/src/main/assets/classification-retry.js')}catch{}
test('failed records retry with bounded backoff and configuration errors stop',()=>{
 assert.ok(R,'retry policy exists');let n={status:'failed',version:1};assert.equal(R.due(n,1000),true);
 n={...n,...R.failure(n,Error('Read timed out'),1000)};assert.equal(n.classificationRetry.attempts,1);assert.equal(R.due(n,30999),false);assert.equal(R.due(n,31000),true);
 n={...n,...R.failure(n,Error('网络连接失败'),31000)};assert.equal(n.classificationRetry.nextAt,151000);
 n={...n,...R.failure(n,Error('timeout'),151000)};assert.equal(R.due(n,9999999),false);
 assert.equal(R.due({...n,version:2},9999999),true);
 const auth={status:'failed',version:1,...R.failure({version:1},Error('认证失败或没有权限'),1000)};assert.equal(R.due(auth,999999),false);
 assert.equal(R.due({status:'classified'},999999),false);assert.equal(R.due({status:'failed',manual:true},999999),false);
});
