const fs=require('fs'),assert=require('node:assert/strict'),{Client}=require('pg');
for(const f of ['.env.local','.env'])if(fs.existsSync(f))process.loadEnvFile(f);
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
const key='addrtest_'+Date.now(),a=key+'_a',b=key+'_b',addressId=key+'_address';
let cookie='';const cacheKeys=[];
async function api(path,body,method='POST',session=cookie){const r=await fetch('http://localhost:3000'+path,{method,headers:{'Content-Type':'application/json',cookie:session},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});return{status:r.status,data:await r.json(),response:r};}
async function seedCache(cacheKey,result){assert.equal((await db.query('SELECT 1 FROM address_geocoding_cache WHERE cache_key=$1',[cacheKey])).rowCount,0);cacheKeys.push(cacheKey);await db.query("INSERT INTO address_geocoding_cache(cache_key,result,expires_at) VALUES($1,$2,NOW()+INTERVAL '10 minutes')",[cacheKey,JSON.stringify(result)]);}
const pointA={latitude:0.12345,longitude:0.23456},pointB={latitude:0.12346,longitude:0.23457};
(async()=>{await db.connect();try{
 for(const id of [a,b])await db.query(`INSERT INTO users SELECT (jsonb_populate_record(NULL::users,to_jsonb(u)||$1::jsonb)).* FROM users u LIMIT 1`,[JSON.stringify({id,name:id,email:id+'@example.invalid',password:'address-test123',role:'USER'})]);
 await db.query(`INSERT INTO stores SELECT (jsonb_populate_record(NULL::stores,to_jsonb(s)||$1::jsonb||jsonb_build_object('id',nextval(pg_get_serial_sequence('stores','id'))))).* FROM stores s LIMIT 1`,[JSON.stringify({user_id:a,store_name:a})]);
 const login=await api('/api/auth/login',{email:a+'@example.invalid',password:'address-test123'},'POST','');assert.equal(login.status,200);cookie=login.response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
 const osm=(road,lat,lon)=>({lat:String(lat),lon:String(lon),address:{road,city_district:'Sumbersari',county:'Kabupaten Jember',state:'Jawa Timur',postcode:'68121',country_code:'id'}});
 await seedCache('reverse:0.12345:0.23456',osm('Jalan Jawa Uji',9,10));
 const searchStreet='Jalan Kalimantan Uji '+key,region='Sumbersari, Kabupaten Jember, Jawa Timur';
 const searchKey='search:'+`${searchStreet}, ${region}, Indonesia`.toLowerCase();
 await seedCache(searchKey,osm(searchStreet,pointB.latitude,pointB.longitude));cacheKeys.push('reverse:0.12346:0.23457');
 assert.equal((await api('/api/addresses/resolve',{mode:'reverse',...pointA},'POST','')).status,401);
 assert.equal((await api('/api/addresses',null,'GET','')).status,401);
 assert.equal((await api('/api/addresses/resolve',{mode:'reverse',latitude:100,longitude:20})).status,400);
 const reverse=await api('/api/addresses/resolve',{mode:'reverse',...pointA});assert.equal(reverse.status,200);const first=reverse.data.address;
 assert.equal(first.streetAddress,'Jalan Jawa Uji');assert.equal(first.latitude,pointA.latitude,'reverse lookup must preserve the actual selected pin');assert.equal(first.longitude,pointA.longitude);
 const body={...first,userId:a,recipientName:'Nama Uji',phone:'081234567890',addressNotes:'Rumah nomor 7, pagar hijau',label:'Rumah',isPrimary:true,isShopAddress:true};
 assert.equal((await api('/api/addresses',{...body,streetAddress:'Jalan Kalimantan'})).status,409,'different road cannot be saved with old pin');
 assert.equal((await api('/api/addresses',{...body,latitude:undefined})).status,400,'no fake default coordinate');
 const saved=await api('/api/addresses',body);assert.equal(saved.status,200,JSON.stringify(saved.data));const id=saved.data.addressId;
 let row=(await db.query('SELECT * FROM user_addresses WHERE id=$1',[id])).rows[0];assert.equal(row.street_address,first.streetAddress);assert.equal(row.latitude,first.latitude);assert.equal(row.address_notes,body.addressNotes);
 assert((await db.query('SELECT address FROM stores WHERE user_id=$1',[a])).rows[0].address.includes('Jalan Jawa Uji'));
 const searched=await api('/api/addresses/resolve',{mode:'search',streetAddress:searchStreet,provinceCityDistrict:region});assert.equal(searched.status,200);const second=searched.data.address;
 assert.equal(second.latitude,pointB.latitude);assert.equal(second.streetAddress,searchStreet);
 assert.equal((await api('/api/addresses',{...body,id,...pointB})).status,409,'stale address result cannot be saved against newer pin');
 assert.equal((await api('/api/addresses',{...body,id,...second})).status,200);
 row=(await db.query('SELECT latitude,longitude,street_address FROM user_addresses WHERE id=$1',[id])).rows[0];assert.equal(row.latitude,pointB.latitude);assert.equal(row.street_address,searchStreet);
 const owned=(await api('/api/addresses?userId='+a,null,'GET')).data.addresses;assert.equal(owned.length,1);
 assert.equal((await api('/api/addresses?userId='+b,null,'GET')).status,403);
 assert.equal((await api('/api/addresses',{...body,userId:b})).status,403);
 await db.query("INSERT INTO user_addresses(id,user_id,recipient_name,phone,street_address,province_city_district,latitude,longitude) VALUES($1,$2,'Other','0','Other','Other',0,0)",[addressId,b]);
 assert.equal((await api('/api/addresses',{...body,id:addressId})).status,403);
 assert.equal((await api('/api/addresses',{id:addressId,userId:a,action:'set_shop'},'PUT')).status,404);
 assert.equal((await api('/api/addresses?id='+addressId+'&userId='+a,null,'DELETE')).status,404);
 assert.equal((await api('/api/addresses?id='+id+'&userId='+a,null,'DELETE')).status,200);
 assert.equal((await api('/api/addresses?userId='+a,null,'GET')).data.addresses.length,0,'empty account must stay empty');
 if(process.argv.includes('--live')){const live=await api('/api/addresses/resolve',{mode:'reverse',latitude:-8.16457,longitude:113.72796});assert.equal(live.status,200,JSON.stringify(live.data));assert(live.data.address.provinceCityDistrict);assert.equal(live.data.address.latitude,-8.16457);console.log('Live reverse lookup:',live.data.address.streetAddress||'(road name unavailable)',live.data.address.provinceCityDistrict);}
 console.log('PASS: reverse autofill, preserving exact pin, forward address lookup, mismatch and stale-result rejection, saved coordinates/notes/shop sync, no fake defaults, private address ownership.');
}finally{
 await db.query('DELETE FROM address_geocoding_cache WHERE cache_key=ANY($1::text[])',[cacheKeys]);
 await db.query('DELETE FROM user_addresses WHERE user_id=ANY($1::text[])',[[a,b]]);
 await db.query('DELETE FROM stores WHERE user_id=$1',[a]);await db.query('DELETE FROM users WHERE id=ANY($1::text[])',[[a,b]]);await db.end();
}})().catch(error=>{console.error(error);process.exitCode=1});
