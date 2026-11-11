const fs=require('fs'),crypto=require('crypto'),{Client}=require('pg');
for(const file of ['.env.local','.env'])if(fs.existsSync(file))process.loadEnvFile(file);
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
(async()=>{await db.connect();try{await db.query('BEGIN');
await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';
 CREATE TABLE IF NOT EXISTS auth_sessions(token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at TIMESTAMPTZ NOT NULL);
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS service_fee NUMERIC(15,2);
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS insurance_fee NUMERIC(15,2);
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS purchase_rejection_reason TEXT;
 ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_settled_amount NUMERIC(15,2);
 CREATE TABLE IF NOT EXISTS wallet_requests(
 id TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('TOPUP','WITHDRAW')),amount NUMERIC(15,2) NOT NULL CHECK(amount>0),
 status TEXT NOT NULL CHECK(status IN ('AWAITING_PROOF','PENDING','APPROVED','REJECTED','EXPIRED')),
 proof_url TEXT,bank_name TEXT,account_number TEXT,account_name TEXT,reason TEXT,transfer_reference TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,expires_at TIMESTAMPTZ,reviewed_at TIMESTAMPTZ,
 reviewed_by TEXT REFERENCES users(id),idempotency_key TEXT NOT NULL,UNIQUE(user_id,idempotency_key));
 CREATE INDEX IF NOT EXISTS wallet_requests_queue ON wallet_requests(status,created_at);
 CREATE TABLE IF NOT EXISTS admin_audit(id TEXT PRIMARY KEY,admin_id TEXT NOT NULL REFERENCES users(id),kind TEXT NOT NULL,target_id TEXT NOT NULL,decision TEXT NOT NULL,reason TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`);
await db.query(`UPDATE orders o SET service_fee=LEAST(2000,GREATEST(0,COALESCE(rental_total_price,total_price)-COALESCE(purchase_rent_paid,seller_income,0))),
 insurance_fee=LEAST(ROUND(p.buy_price*0.005),GREATEST(0,COALESCE(rental_total_price,total_price)-COALESCE(purchase_rent_paid,seller_income,0)-2000-CASE WHEN delivery_option='delivery' THEN 10000 ELSE 0 END))
 FROM products p WHERE p.id=o.product_id AND (o.service_fee IS NULL OR o.insurance_fee IS NULL)`);
await db.query(`UPDATE orders o SET seller_settled_amount=COALESCE((SELECT SUM(w.amount) FROM wallet_transactions w WHERE UPPER(w.type)='INCOME' AND UPPER(w.status)='SUCCESS' AND w.user_id=COALESCE(o.seller_id,(SELECT seller_id FROM products WHERE id=o.product_id)) AND (w.description LIKE '%'||o.order_id||'%' OR w.id='purchase_income_'||o.order_id)),0) WHERE seller_settled_amount IS NULL`);
await db.query('ALTER TABLE orders ALTER COLUMN seller_settled_amount SET DEFAULT 0');
const salt=crypto.randomBytes(16).toString('hex');const password=`scrypt$${salt}$${crypto.scryptSync('superadmin',salt,64).toString('hex')}`;
const exists=(await db.query("SELECT id FROM users WHERE LOWER(email)='superadmin@gmail.com'")).rows[0];
if(exists)await db.query("UPDATE users SET role='SUPERADMIN',password=$2 WHERE id=$1",[exists.id,password]);
else await db.query("INSERT INTO users(id,name,email,password,phone,avatar,is_verified,role) VALUES('usr_superadmin','Superadmin','superadmin@gmail.com',$1,'','SA',true,'SUPERADMIN')",[password]);
await db.query('COMMIT');console.log('Superadmin account and finance request schema ready.');
}catch(e){await db.query('ROLLBACK');throw e;}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1});
