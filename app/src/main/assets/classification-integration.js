'use strict';
function classificationBusy(){return typeof classificationIsBusy==='function'&&classificationIsBusy();}
function classificationHasRules(){return !!S?.classificationRules?.some(r=>r&&r.enabled!==false);}
function classificationHasMatch(n,type){return typeof ClassificationCore!=='undefined'&&ClassificationCore.matchRules(n,type,S).matches.length>0;}
function classificationPrompt(cfg){return SubjectCore.prompt(cfg)+'\n可补充materialMeta对象：module（学习模块）、series（课程或教材系列）、year（明确年份整数）、edition（明确版本），没有依据的字段用空字符串。另返回evidence数组，最多2段，每段quote必须逐字摘自本次真实文字且不超过120字；如可见明确页号可填page，不得推测页号。没有可核对文字时返回[]，reason只是模型说明，不能代替证据。';}
function classificationMergeMetadata(n,value){const clean=ClassificationCore.metadata(value),next=ClassificationCore.metadata(n.materialMeta);for(const key of Object.keys(clean))if(clean[key]!=='')next[key]=clean[key];return next;}
function classificationApplyLocal(n,type){
 const match=ClassificationCore.matchRules(n,type,S);if(!match.matches.length)return false;
 n.classificationConflict=match.conflict;n.classificationCandidates=match.matches.map(r=>r.routing).filter((r,i,rows)=>rows.findIndex(x=>JSON.stringify(x)===JSON.stringify(r))===i).slice(0,2);
 if(match.conflict){n.routing=SubjectCore.validate({...n.routing,needsReview:true,reason:'命中了相互冲突的本机规则，请确认分类'},S.study);n.classificationSuggestion=n.classificationCandidates[0];}
 else{n.routing=SubjectCore.validate({...match.routing,source:'rules',confidence:1,reason:'本机规则：'+match.matches.map(r=>r.name).join('、')},S.study);n.subject=n.routing.subject;n.materialMeta=classificationMergeMetadata(n,match.materialMeta);n.classificationRuleId=match.matches.map(r=>r.id).join(',').slice(0,100);delete n.classificationSuggestion;n.classificationCandidates=[];}
 const proposal=[];for(const rule of match.matches)for(const p of ClassificationCore.textSegments(n,type,S)){if((rule.field==='filename'?p.source==='filename':p.source!=='filename')&&p.quote.includes(rule.match)){proposal.push({source:p.source,sourceId:p.sourceId,quote:rule.match,...(p.page?{page:p.page}:{})});break;}}
 n.classificationEvidence=ClassificationCore.evidence(n,type,S,proposal);n.routePending=false;setClassificationStatus(n,type,'classified');delete n.classificationError;delete n.classificationRetry;return true;
}
function classificationDecision(n,type,parsed,cfg){
 const routing=SubjectCore.validate({...parsed,source:'ai'},cfg),title=String(n.name||n.title||''),body=typeof classificationBody==='function'?classificationBody(n,type):String(n.body||''),inferred=SubjectCore.infer({name:title,body},type,cfg);
 const evidence=ClassificationCore.evidence(n,type,S,Array.isArray(parsed.evidence)?parsed.evidence:[]);
 const subjectSupported=inferred.subject!=='待确认'&&inferred.subject===routing.subject;
 const trackConflict=inferred.subject===routing.subject&&inferred.tracks?.length&&routing.tracks?.length&&!inferred.tracks.some(t=>routing.tracks.includes(t));
 const subjectConflict=inferred.subject!=='待确认'&&routing.subject!=='待确认'&&inferred.subject!==routing.subject;
 const typeConflict=/讲义|课件|真题|试卷|答案|解析|习题|作业/.test(title)&&inferred.category!=='other'&&routing.category!==inferred.category;
 const conflict=!!(trackConflict||subjectConflict||typeConflict);
 if(!subjectSupported||conflict){routing.needsReview=true;routing.reason=conflict?'本机可见标记与模型分类存在冲突，请核对：'+routing.reason:'尚缺明确的本机科目依据，请人工确认：'+routing.reason;}
 const candidates=[routing];if(conflict)candidates.push(inferred);
 return {routing,conflict,candidates,evidence,materialMeta:classificationMergeMetadata(n,parsed.materialMeta)};
}
