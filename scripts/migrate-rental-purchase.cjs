const fs = require('fs');
const { Client } = require('pg');
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
const client = new Client({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
(async () => {
  try {
    await client.connect();
    await client.query(`ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS rental_total_price NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS purchase_service_fee NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS purchase_payment_method TEXT,
      ADD COLUMN IF NOT EXISTS purchase_payment_status TEXT,
      ADD COLUMN IF NOT EXISTS purchase_payment_proof_url TEXT,
      ADD COLUMN IF NOT EXISTS purchase_amount NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS purchase_buy_price NUMERIC(15,2),
      ADD COLUMN IF NOT EXISTS purchase_rent_paid NUMERIC(15,2)`);
    console.log('Rental purchase payment columns ready.');
  } finally { await client.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
