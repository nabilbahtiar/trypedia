const fs=require('fs'),{Client}=require('pg');process.loadEnvFile('.env.local');
const db=new Client({connectionString:process.env.DATABASE_URL||`postgresql://${process.env.DB_USER||'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD||'postgres')}@${process.env.DB_HOST||'localhost'}:${process.env.DB_PORT||5432}/${process.env.DB_NAME||'trypedia_db'}`});
(async()=>{await db.connect();try{await db.query(`
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_unique ON users(LOWER(email));
CREATE TABLE IF NOT EXISTS identity_verifications(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,document_type TEXT NOT NULL CHECK(document_type IN ('KTP','KTM')),storage_name TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')),reason TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),reviewed_at TIMESTAMPTZ,reviewed_by TEXT REFERENCES users(id));
CREATE TABLE IF NOT EXISTS auth_rate_limits(key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires_at TIMESTAMPTZ NOT NULL);
`);console.log('Registration and private verification schema ready.');}finally{await db.end();}})().catch(e=>{console.error(e.message);process.exitCode=1});
