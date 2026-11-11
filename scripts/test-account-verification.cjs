const fs=require('fs'),assert=require('node:assert/strict'),{Client}=require('pg');
for(const f of ['.env.local','.env'])if(fs.existsSync(f))process.loadEnvFile(f);
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});

const key='account_'+Date.now(),email=key+'@example.invalid',otherEmail=key+'_b@example.invalid';let uid,otherId,session='',admin='';const tokens=[],files=[];
async function call(route,body,method='POST',cookie=session){const r=await fetch((process.env.TEST_ORIGIN||'http://localhost:3000')+''+route,{method,headers:{cookie,'Content-Type':'application/json','x-forwarded-for':key},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});return {status:r.status,data:await r.json(),response:r};}
async function upload(){const body=new FormData();body.set('documentType','KTM');body.set('file',new Blob([Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jZ9sAAAAASUVORK5CYII=','base64')],{type:'image/png'}),'ktm.png');const r=await fetch((process.env.TEST_ORIGIN||'http://localhost:3000')+'/api/identity',{method:'POST',headers:{cookie:session},body});const row=(await db.query('SELECT storage_name FROM identity_verifications WHERE user_id=$1',[uid])).rows[0];if(row)files.push(row.storage_name);return r.status;}
(async()=>{await db.connect();const originals=(await db.query("SELECT id,is_verified FROM users WHERE id IN ('usr_001','usr_002')")).rows;try{
 assert.equal((await call('/api/auth/register',{name:'A',email,password:'short'})).status,400);
 assert.equal((await call('/api/auth/register',{name:'Akun Uji',email,password:'testpass123'})).status,200);
 uid=(await db.query('SELECT id FROM users WHERE email=$1',[email])).rows[0].id;
 assert.equal((await call('/api/auth/register',{name:'Akun Uji',email,password:'testpass123'})).status,409);
 let login=await call('/api/auth/login',{email,password:'testpass123'});assert.equal(login.status,200);assert.equal(login.data.user.isVerified,false);session=login.response.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');
 assert.equal(Number((await db.query('SELECT balance FROM user_wallets WHERE user_id=$1',[uid])).rows[0].balance),0);
 for(const route of ['/api/orders','/api/wallet/pay','/api/checkout/validate','/api/seller/products','/api/seller/orders','/api/orders/rental-purchase','/api/orders/verify-pin']){const method=route==='/api/seller/orders'?'PATCH':'POST';assert.equal((await call(route,{},method)).status,403,route+' must block unverified user');}
 assert.equal((await call('/api/identity',null,'GET','')).status,401);
 assert.equal(await upload(),200);assert.equal(await upload(),409,'pending document cannot be replaced');
 assert.equal((await fetch((process.env.TEST_ORIGIN||'http://localhost:3000')+'/api/identity/document/'+uid)).status,403);
 const crypto=require('crypto'),token=crypto.randomBytes(32).toString('hex'),hash=crypto.createHash('sha256').update(token).digest('hex');tokens.push(hash);await db.query("INSERT INTO auth_sessions(token_hash,user_id,expires_at) SELECT $1,id,NOW()+INTERVAL '10 minutes' FROM users WHERE role='SUPERADMIN' LIMIT 1",[hash]);admin='trypedia_session='+token;
 assert.equal((await call('/api/admin/identity',{id:uid,decision:'APPROVED'})).status,403);
 assert.equal((await call('/api/admin/identity',{id:uid,decision:'REJECTED'},'POST',admin)).status,400);
 assert.equal((await call('/api/admin/identity',{id:uid,decision:'REJECTED',reason:'Foto kurang jelas'},'POST',admin)).status,200);
 assert.equal((await call('/api/auth/me',null,'GET')).data.user.isVerified,false);
 assert.equal(await upload(),200);
 const doc=await fetch((process.env.TEST_ORIGIN||'http://localhost:3000')+'/api/identity/document/'+uid,{headers:{cookie:admin}});assert.equal(doc.status,200);assert.equal(doc.headers.get('cache-control'),'private,no-store');
 assert.equal((await call('/api/admin/identity',{id:uid,decision:'APPROVED'},'POST',admin)).status,200);
 assert.equal((await call('/api/admin/identity',{id:uid,decision:'APPROVED'},'POST',admin)).status,409);
 assert.equal((await call('/api/auth/me',null,'GET')).data.user.isVerified,true,'existing session sees approval immediately');
 assert.equal((await call('/api/seller/products',{sellerId:uid})).status,400,'approved user reaches product form validation');
 const forged='trypedia_auth_user='+encodeURIComponent(JSON.stringify({id:uid,isVerified:true}));assert.equal((await call('/api/orders',{},'POST',forged)).status,401);
 const page=await fetch((process.env.TEST_ORIGIN||'http://localhost:3000')+'/settings',{headers:{cookie:session},signal:AbortSignal.timeout(60000)});assert.equal(page.status,200);assert((await page.text()).includes('Verifikasi Identitas'));
 for(const route of ['/api/auth/google','/api/auth/google/callback']){
  const removed=await fetch((process.env.TEST_ORIGIN||'http://localhost:3000')+route,{redirect:'manual',signal:AbortSignal.timeout(60000)});
  assert.equal(removed.status,404,'removed Google login route must be unavailable');
 }
 assert.deepEqual((await db.query("SELECT id,is_verified FROM users WHERE id IN ('usr_001','usr_002')")).rows,originals);
 console.log('PASS: registration validation/duplicates/hash, zero wallet, unverified transaction gates, private identity upload, pending lock, rejection/resubmission/admin approval, fresh verification state, legacy cookie rejection, settings SSR.');
}finally{if(uid){await db.query('DELETE FROM notifications WHERE user_id=$1',[uid]);await db.query('DELETE FROM identity_verifications WHERE user_id=$1',[uid]);await db.query('DELETE FROM user_wallets WHERE user_id=$1',[uid]);await db.query('DELETE FROM user_coins WHERE user_id=$1',[uid]);await db.query('DELETE FROM users WHERE id=$1',[uid]);}if(tokens.length)await db.query('DELETE FROM auth_sessions WHERE token_hash=ANY($1::text[])',[tokens]);for(const file of files)await require('fs/promises').unlink(require('path').resolve('storage/identity',file)).catch(()=>{});await db.end();}})().catch(e=>{console.error(e);process.exitCode=1});
