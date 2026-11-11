// Repair only the explicitly seeded Steven orders; preserve real users and balances.
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{Client}=require('pg');
for(const f of ['.env.local','.env'])if(fs.existsSync(f))process.loadEnvFile(f);
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
const ids=Array.from({length:11},(_,i)=>'TRY-SEED-'+(801+i));
(async()=>{await db.connect();try{
 await db.query('BEGIN');
 const orders=(await db.query("SELECT o.*,p.buy_price FROM orders o JOIN products p ON p.id=o.product_id WHERE o.order_id=ANY($1::text[]) AND o.seller_id='usr_002' AND o.status='SELESAI' AND o.user_id ~ '^usr_(rev|demo)_[0-9]+$' FOR UPDATE OF o",[ids])).rows;
 assert.equal(orders.length,11,'Expected exactly the 11 existing dummy orders');
 const transactions=(await db.query("SELECT * FROM wallet_transactions WHERE id=ANY($1::text[])",[ids.flatMap(id=>['demo_topup_'+id,'demo_payment_'+id])])).rows;
 assert.equal(transactions.length,22,'Expected matching demo topup and payment entries');
 fs.mkdirSync(path.resolve('storage/backups'),{recursive:true});
 fs.writeFileSync(path.resolve('storage/backups',`demo-insurance-${Date.now()}.json`),JSON.stringify({orders,transactions},null,2));
 for(const order of orders){
  const insurance=Math.round(Number(order.buy_price)*0.005),total=Number(order.seller_income)+2000+insurance;
  await db.query('UPDATE orders SET service_fee=2000,insurance_fee=$2,total_price=$3 WHERE order_id=$1',[order.order_id,insurance,total]);
  await db.query('UPDATE wallet_transactions SET amount=$2 WHERE id=ANY($1::text[])',[['demo_topup_'+order.order_id,'demo_payment_'+order.order_id],total]);
 }
 const totals=(await db.query('SELECT COUNT(*)::int AS count,SUM(service_fee)::numeric AS service,SUM(insurance_fee)::numeric AS insurance,SUM(total_price-seller_income-service_fee-insurance_fee)::numeric AS difference FROM orders WHERE order_id=ANY($1::text[])',[ids])).rows[0];
 assert.equal(Number(totals.difference),0);assert(Number(totals.insurance)>0);
 await db.query('COMMIT');console.log('11 dummy orders and 22 matching ledger entries repaired.',totals);
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}})().catch(error=>{console.error(error);process.exitCode=1});
