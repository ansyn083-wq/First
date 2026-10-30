import {spawnSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import path from 'node:path';

const env={...process.env,YANXU_HAPPY_DOM_PATH:pathToFileURL(path.resolve('node_modules/happy-dom/lib/index.js')).href};
const checks=['compact-mobile-ui.mjs','english-providers-ui.mjs','local-options-ui.mjs','optimization-ui.mjs','subjects-ui.mjs','repair-ui.mjs'];
const jobs=checks.map(script=>({script,env}));
for(const name of ['focus','course','escaping','save','direct'])jobs.push({script:'local-options-review-ui.mjs',env:{...env,YANXU_REVIEW_CASE:name}});
for(const job of jobs){console.log('RUN',job.script,job.env.YANXU_REVIEW_CASE||'');const result=spawnSync(process.execPath,['tests/'+job.script],{env:job.env,stdio:'inherit'});if(result.error)throw result.error;if(result.status!==0)process.exit(result.status||1)}
console.log('DOM suites passed:',jobs.length);
