(function(root){
 'use strict';
 const api={resolve(type,width,height){if(type==='tablet'||type==='phone')return type;return Math.min(width||0,height||0)>=600?'tablet':'phone';}};
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root.document){let type='';try{type=root.Android?.deviceLayout?.()||'';}catch(e){}root.document.documentElement.dataset.device=api.resolve(type,root.screen?.width||root.innerWidth,root.screen?.height||root.innerHeight);root.DeviceLayout=api;}
})(typeof window==='undefined'?globalThis:window);
