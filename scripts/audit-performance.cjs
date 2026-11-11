// Read-only HTTP/SQL sampling. Creates and removes only its own temporary auth sessions.
const fs=require('fs'),path=require('path'),crypto=require('crypto'),{performance}=require('perf_hooks'),{Client}=require('pg');
for(const f of ['.env.local','.env'])if(fs.existsSync(f))process.loadEnvFile(f);
const origin=process.argv[2]||'http://localhost:3000',output=process.argv[3];
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
const percentile=(values,p)=>[...values].sort((a,b)=>a-b)[Math.max(0,Math.ceil(values.length*p)-1)];
const round=n=>Math.round(n*10)/10;
const sessions=[];
async function cookie(userId){const token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex');await db.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) VALUES($1,$2,NOW()+INTERVAL '20 minutes')",[hash,userId]);sessions.push(hash);return 'trypedia_session='+token;}
async function sample(route,cookie){const begin=performance.now();const response=await fetch(origin+route,{headers:cookie?{cookie}:{},signal:AbortSignal.timeout(60000)});const headers=performance.now();const body=await response.arrayBuffer();return{status:response.status,ttfbMs:round(headers-begin),totalMs:round(performance.now()-begin),bytes:body.byteLength};}
(async()=>{await db.connect();const report={origin,at:new Date().toISOString(),samples:5,routes:[],sql:[],concurrency:[]};try{
 const buyer=await cookie('usr_001'),seller=await cookie('usr_002');
 report.dataset=(await db.query('SELECT (SELECT COUNT(*)::int FROM products) AS products,(SELECT COUNT(*)::int FROM orders) AS orders,(SELECT COUNT(*)::int FROM users) AS users')).rows[0];
 const routes=[['/',null],['/products/new-balance-2022r',buyer],['/store/usr_002',buyer],['/orders',buyer],['/seller?tab=orders',seller],['/checkout?id=new-balance-2022r',buyer],['/api/products?summary=1',null],['/api/seller/orders?sellerId=usr_002&tab=PERLU_KONFIRMASI',seller],['/api/seller/store?userId=usr_002',seller],['/api/wallet?summary=1',buyer],['/api/activity',buyer]];
 for(const [route,session] of routes){const first=await sample(route,session),samples=[];for(let i=0;i<report.samples;i++)samples.push(await sample(route,session));const row={route,statuses:[...new Set(samples.map(s=>s.status))],firstMs:first.totalMs,medianMs:round(percentile(samples.map(s=>s.totalMs),.5)),p95Ms:round(percentile(samples.map(s=>s.totalMs),.95)),medianTtfbMs:round(percentile(samples.map(s=>s.ttfbMs),.5)),bytes:samples[0].bytes};report.routes.push(row);console.log(JSON.stringify(row));}
 for(const [name,sql,params] of [
 ['database round trip','SELECT 1',[]],
 ['buyer orders',"SELECT order_id,status,total_price FROM orders WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",['usr_001']],
 ['seller legacy name OR query',"SELECT order_id,status FROM orders WHERE (seller_id=$1 OR seller_name ILIKE $2) AND status='SEDANG_DIKEMAS' ORDER BY created_at DESC",['usr_002','%Steven Christian%']],
 ['catalog','SELECT id,name,image FROM products ORDER BY created_at DESC',[]],
 ['address lookup',"SELECT latitude,longitude FROM user_addresses WHERE user_id=$1 AND (is_shop_address OR is_primary) ORDER BY is_shop_address DESC,is_primary DESC,updated_at DESC LIMIT 1",['usr_002']]]){
  const times=[];for(let i=0;i<10;i++){const start=performance.now();await db.query(sql,params);times.push(performance.now()-start);}const explain=await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) '+sql,params);const plan=explain.rows[0]['QUERY PLAN'][0];const row={name,medianRoundTripMs:round(percentile(times,.5)),planningMs:plan['Planning Time'],executionMs:plan['Execution Time'],plan:plan.Plan};report.sql.push(row);console.log(JSON.stringify({sql:name,medianRoundTripMs:row.medianRoundTripMs,executionMs:row.executionMs}));
 }
 for(const concurrency of [1,5,10,20]){const begin=performance.now(),samples=[];let next=0;await Promise.all(Array.from({length:concurrency},async()=>{while(next++<40)samples.push(await sample('/api/products?summary=1'));}));const elapsed=performance.now()-begin;const row={concurrency,requests:samples.length,errors:samples.filter(s=>s.status!==200).length,p50Ms:round(percentile(samples.map(s=>s.totalMs),.5)),p95Ms:round(percentile(samples.map(s=>s.totalMs),.95)),rps:round(samples.length/(elapsed/1000))};report.concurrency.push(row);console.log(JSON.stringify(row));}
 report.indexes=(await db.query("SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='public' ORDER BY tablename,indexname")).rows;
 if(output){fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(report,null,2));}
}finally{if(sessions.length)await db.query('DELETE FROM auth_sessions WHERE token_hash=ANY($1::text[])',[sessions]);await db.end();}})().catch(error=>{console.error(error);process.exitCode=1;});
