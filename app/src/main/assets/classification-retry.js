(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.ClassificationRetry=api;})(this,function(){
'use strict';
function due(n,now=Date.now()){if(!n||n.manual||!['failed','pending'].includes(n.status))return false;const r=n.classificationRetry;if(n.status==='pending'&&!r)return false;if(!r||r.version!==n.version)return true;return !r.blocked&&r.attempts<3&&now>=(r.nextAt||0);}
function failure(n,error,now=Date.now()){const message=String(error?.message||error||'分类未完成').slice(0,300),previous=n.classificationRetry,attempts=(previous?.version===n.version?Number(previous.attempts)||0:0)+1,blocked=/认证|权限|额度不足|Key|HTTP (?:400|401|403|404|413)|模型不存在|model.*(?:not found|does not exist)|insufficient_quota/i.test(message);return {classificationError:message,classificationRetry:{version:n.version,attempts,blocked,nextAt:now+([30000,120000,300000][Math.min(attempts-1,2)])}};}
function label(n){if(n.status==='classifying')return '分类中';if(n.status!=='failed')return '';const r=n.classificationRetry;if(r?.blocked)return '分类暂停 · 请检查AI配置';if(r?.attempts>=3)return '分类未完成 · 可手动重试';return '分类未完成 · 等待自动重试';}
return {due,failure,label};
});
