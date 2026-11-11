// Separate production output keeps the development server/cache intact.
const {spawn}=require('child_process'),path=require('path');
const next=path.resolve('node_modules/next/dist/bin/next');
const env={...process.env,TRYPEDIA_DIST_DIR:'.next-production',NEXT_TELEMETRY_DISABLED:'1'};
function run(args){return new Promise((resolve,reject)=>{const child=spawn(process.execPath,[next,...args],{stdio:'inherit',env,windowsHide:true});child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error('Next.js exited '+code)));});}
(async()=>{await run(['build','--webpack']);await run(['start','-p',process.env.PORT||'3001']);})().catch(error=>{console.error(error.message);process.exitCode=1;});
