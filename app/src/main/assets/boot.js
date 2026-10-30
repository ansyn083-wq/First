'use strict';
init().finally(()=>{window.finishStartup?.();setTimeout(()=>window.appShared?.(),300);setTimeout(()=>planningAutoReports().catch(()=>{}),500);});

setInterval(()=>retryFailedClassifications().catch(()=>{}),10000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)retryFailedClassifications().catch(()=>{});});
window.addEventListener('online',()=>retryFailedClassifications().catch(()=>{}));

document.addEventListener('visibilitychange',()=>{if(!document.hidden){planningCalendarTick();setTimeout(()=>planningAutoReports().catch(()=>{}),250);}});

setInterval(()=>planningCalendarTick(),60000);
