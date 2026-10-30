(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.StatsLive=api;})(this,function(){
return {delay:failures=>Math.min(300000,30000*2**Math.min(4,Math.max(0,failures))),eligible:s=>s.view==='english'&&!!s.userId&&s.visible&&s.active&&!s.busy};
});
