const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('node:assert/strict'),{Client}=require('pg');
for(const file of ['.env.local','.env'])if(fs.existsSync(file))process.loadEnvFile(file);
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
const entries=[
 {id:'TRY-KHAYRU-DEMO-001',product:'new-balance-2022r',status:'DISEWA',duration:3},
 {id:'TRY-KHAYRU-DEMO-002',product:'prd-mwbngkuq-lxn1',status:'DISEWA',duration:3},
 {id:'TRY-KHAYRU-DEMO-003',product:'prd-mwbn1dn6-8yij',status:'SELESAI',duration:1},
];
(async()=>{await db.connect();try{
 await db.query('BEGIN');
 const users=(await db.query("SELECT id,name FROM users WHERE id IN ('usr_001','usr_002') FOR UPDATE")).rows;
 const buyer=users.find(u=>u.id==='usr_001'),seller=users.find(u=>u.id==='usr_002');assert(buyer&&seller);
 const backup={};
 for(const [key,sql] of Object.entries({orders:"SELECT * FROM orders WHERE user_id='usr_001'",wallets:"SELECT * FROM user_wallets WHERE user_id IN ('usr_001','usr_002')",ledger:"SELECT * FROM wallet_transactions WHERE user_id IN ('usr_001','usr_002')",products:"SELECT * FROM products WHERE seller_id='usr_002'"}))backup[key]=(await db.query(sql)).rows;
 fs.mkdirSync(path.resolve('storage/backups'),{recursive:true});fs.writeFileSync(path.resolve('storage/backups',`khayru-orders-${Date.now()}.json`),JSON.stringify(backup,null,2));
 const shop=(await db.query("SELECT street_address,province_city_district FROM user_addresses WHERE user_id='usr_002' AND (is_shop_address OR is_primary) ORDER BY is_shop_address DESC,is_primary DESC,updated_at DESC LIMIT 1")).rows[0];
 assert(shop,'Seller shop address required');
 for(const entry of entries){
  if((await db.query('SELECT 1 FROM orders WHERE order_id=$1',[entry.id])).rowCount)continue;
  const product=(await db.query("SELECT * FROM products WHERE id=$1 AND seller_id='usr_002' FOR UPDATE",[entry.product])).rows[0];assert(product);
  const active=(await db.query("SELECT 1 FROM orders WHERE product_id=$1 AND status IN ('BELUM_BAYAR','SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA','SELESAI_DIBELI')",[product.id])).rowCount;assert.equal(active,0,'Product already reserved');
  const income=Number(entry.duration===1?product.rent_price_daily:product.rent_price_3d),insurance=Math.round(Number(product.buy_price)*0.005),total=income+2000+insurance;
  const started=new Date(Date.now()-(entry.status==='DISEWA'?3600000:3*86400000));
  const ended=new Date(started.getTime()+entry.duration*86400000),created=new Date(started.getTime()-3600000);
  const day=new Date(started.getTime()+7*3600000).toISOString().slice(0,10),time=new Date(started.getTime()+7*3600000).toISOString().slice(11,16);
  const debit=await db.query("UPDATE user_wallets SET balance=balance-$1,updated_at=NOW() WHERE user_id='usr_001' AND balance>=$1 RETURNING balance",[total]);assert.equal(debit.rowCount,1,'Buyer balance insufficient');
  await db.query(`INSERT INTO orders(order_id,user_id,user_name,product_id,product_title,product_image,seller_id,seller_name,order_type,delivery_option,cod_location,cod_date,cod_time,cod_notes,payment_method,total_price,seller_income,status,payment_verified,handover_pin,rent_duration,rent_started_at,rent_end_at,created_at,service_fee,insurance_fee,seller_settled_amount,shipping_fee)
   VALUES($1,'usr_001',$2,$3,$4,$5,'usr_002',$6,'rent','pickup',$7,$8,$9,'','Saldo TryPedia',$10,$11,$12,true,$13,$14,$15,$16,$17,2000,$18,$19,0)`,
   [entry.id,buyer.name,product.id,product.name,product.image,seller.name,`${shop.street_address}, ${shop.province_city_district}`,day,time,total,income,entry.status,String(crypto.randomInt(100000,1000000)),entry.duration,started,ended,created,insurance,entry.status==='SELESAI'?income:0]);
  await db.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method,created_at) VALUES($1,'usr_001','PAYMENT',$2,$3,'SUCCESS','Saldo TryPedia',$4)`,['demo_payment_'+entry.id,total,'Pembayaran sewa '+product.name+' - '+entry.id,created]);
  if(entry.status==='SELESAI'){
   await db.query("UPDATE user_wallets SET balance=balance+$1,updated_at=NOW() WHERE user_id='usr_002'",[income]);
   await db.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method,created_at) VALUES($1,'usr_002','INCOME',$2,$3,'SUCCESS','Rekber TryPedia',$4)`,['demo_income_'+entry.id,income,'Hasil sewa '+product.name+' - '+entry.id,ended]);
  }else await db.query('UPDATE products SET stock=0 WHERE id=$1',[product.id]);
  await db.query(`UPDATE products SET rent_count=(SELECT COUNT(*) FROM orders WHERE product_id=$1 AND order_type='rent' AND status IN ('DISEWA','SELESAI','SELESAI_DIBELI')) WHERE id=$1`,[product.id]);
 }
 const results=(await db.query('SELECT order_id,product_title,status,total_price,rent_end_at FROM orders WHERE order_id=ANY($1::text[]) ORDER BY order_id',[entries.map(e=>e.id)])).rows;
 assert.equal(results.filter(r=>r.status==='DISEWA').length,2);assert.equal(results.filter(r=>r.status==='SELESAI').length,1);
 await db.query('COMMIT');console.log(results);
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}})().catch(error=>{console.error(error);process.exitCode=1});
