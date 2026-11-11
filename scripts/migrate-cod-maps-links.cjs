const fs = require('fs');
const { Client } = require('pg');
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
const db = new Client({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
(async () => {
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query(`ALTER TABLE seller_cod_locations ADD COLUMN IF NOT EXISTS maps_url TEXT;
      ALTER TABLE seller_cod_locations ALTER COLUMN lat DROP NOT NULL;
      ALTER TABLE seller_cod_locations ALTER COLUMN lng DROP NOT NULL`);
    await db.query(`UPDATE seller_cod_locations SET maps_url = 'https://www.google.com/maps/search/?api=1&query=' || lat::text || ',' || lng::text
      WHERE maps_url IS NULL AND lat IS NOT NULL AND lng IS NOT NULL`);
    await db.query('COMMIT');
    console.log('COD Maps links ready; existing coordinates preserved.');
  } catch (error) { await db.query('ROLLBACK'); throw error; }
  finally { await db.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
