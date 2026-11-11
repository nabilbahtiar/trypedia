const fs=require('fs'),{Client}=require('pg');
for(const file of ['.env.local','.env'])if(fs.existsSync(file))process.loadEnvFile(file);
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
(async()=>{await db.connect();try{
 const result=await db.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method,created_at)
 SELECT 'tx_'||id,user_id,'TOPUP',amount,
 CASE WHEN status='EXPIRED' THEN 'Top up gagal: waktu pembayaran habis' ELSE 'Top up gagal: '||COALESCE(reason,'Bukti pembayaran ditolak') END,
 'FAILED','QRIS',created_at FROM wallet_requests WHERE kind='TOPUP' AND status IN ('REJECTED','EXPIRED')
 ON CONFLICT(id) DO NOTHING`);
 console.log('Failed top ups added to transaction history:',result.rowCount);
}finally{await db.end();}})().catch(error=>{console.error(error);process.exitCode=1});
