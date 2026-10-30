'use strict';
let statsRefreshTimer=null,statsAppActive=true;
window.scheduleStatsRefresh=()=>{clearTimeout(statsRefreshTimer);statsRefreshTimer=null;if(!S||!StatsLive.eligible({view,userId:activeStatsKey(),visible:!document.hidden,active:statsAppActive,busy:statsBusy}))return;const wait=Math.max(1000,lastStatsRequest+StatsLive.delay(statsFailures)-Date.now());statsRefreshTimer=setTimeout(()=>{statsRefreshTimer=null;if(StatsLive.eligible({view,userId:activeStatsKey(),visible:!document.hidden,active:statsAppActive,busy:statsBusy}))syncStats();},wait);};
window.setStatsActive=active=>{statsAppActive=active;window.scheduleStatsRefresh();};
window.appPause=()=>window.setStatsActive(false);
document.addEventListener('visibilitychange',()=>{window.scheduleStatsRefresh();if(!document.hidden&&statsAppActive&&view==='english'&&S&&activeStatsKey()&&!statsBusy&&Date.now()-lastStatsRequest>10000)syncStats();});
