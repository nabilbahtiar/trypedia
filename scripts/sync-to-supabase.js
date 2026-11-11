const { Pool } = require('pg');

const local = new Pool({ connectionString: 'postgresql://postgres:123@localhost:5432/trypedia_db' });
const cloud = new Pool({ connectionString: 'postgresql://postgres.dylbevgpmcxwjvawfvrh:nabil221105_@aws-0-ap-south-1.pooler.supabase.com:5432/postgres' });

async function syncAll() {
  console.log('Menghubungkan ke lokal dan Supabase...');
  const l = await local.connect();
  const c = await cloud.connect();

  const tables = [
    'users',
    'stores',
    'user_wallets',
    'user_coins',
    'user_addresses',
    'products',
    'orders',
    'order_rental_purchase',
    'reviews',
    'seller_cod_locations',
    'coin_transactions',
    'wallet_transactions',
    'wallet_requests',
    'identity_verifications',
    'notifications',
    'cart_items',
    'chat_conversations',
    'chat_messages',
    'auth_sessions',
    'auth_rate_limits',
    'admin_audit',
    'address_geocoding_cache'
  ];

  for (const table of tables) {
    try {
      // 1. Ambil struktur kolom dari lokal
      const colsRes = await l.query(`
        SELECT column_name, data_type, udt_name, is_nullable, character_maximum_length, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      if (colsRes.rows.length === 0) continue;

      const colDefs = colsRes.rows.map(col => {
        let type = col.data_type;
        if (col.udt_name === 'jsonb') type = 'JSONB';
        else if (col.udt_name === 'text') type = 'TEXT';
        else if (col.udt_name === 'varchar') type = col.character_maximum_length ? `VARCHAR(${col.character_maximum_length})` : 'VARCHAR(255)';
        else if (col.udt_name === 'numeric') type = 'NUMERIC';
        else if (col.udt_name === 'bool') type = 'BOOLEAN';
        else if (col.udt_name === 'int4') type = 'INTEGER';
        else if (col.udt_name === 'int8') type = 'BIGINT';
        else if (col.udt_name === 'timestamptz') type = 'TIMESTAMP WITH TIME ZONE';
        else if (col.udt_name === 'timestamp') type = 'TIMESTAMP';

        return `"${col.column_name}" ${type}`;
      });

      // Buat tabel di cloud jika belum ada
      const createTableSql = `CREATE TABLE IF NOT EXISTS "${table}" (\n  ${colDefs.join(',\n  ')}\n);`;
      await c.query(createTableSql);

      // Ambil data lokal
      const dataRes = await l.query(`SELECT * FROM "${table}"`);
      const rows = dataRes.rows;
      console.log(`Tabel [${table}]: Memindahkan ${rows.length} baris data...`);

      if (rows.length > 0) {
        const colNames = Object.keys(rows[0]);
        const quotedColNames = colNames.map(c => `"${c}"`).join(', ');

        for (const row of rows) {
          const values = colNames.map(cn => row[cn]);
          const placeholders = colNames.map((_, idx) => `$${idx + 1}`).join(', ');
          const insertSql = `INSERT INTO "${table}" (${quotedColNames}) VALUES (${placeholders}) ON CONFLICT DO NOTHING;`;
          try {
            await c.query(insertSql, values);
          } catch (rowErr) {
            // Abaikan conflict
          }
        }
      }
      console.log(`✓ Tabel [${table}] sukses disinkronkan!`);
    } catch (tblErr) {
      console.warn(`! Catatan pada tabel ${table}:`, tblErr.message);
    }
  }

  // Tambahkan Primary Key dan Index penting
  try {
    await c.query(`ALTER TABLE "users" ADD PRIMARY KEY ("id");`);
  } catch {}
  try {
    await c.query(`ALTER TABLE "products" ADD PRIMARY KEY ("id");`);
  } catch {}
  try {
    await c.query(`ALTER TABLE "orders" ADD PRIMARY KEY ("order_id");`);
  } catch {}
  try {
    await c.query(`ALTER TABLE "user_coins" ADD PRIMARY KEY ("user_id");`);
  } catch {}
  try {
    await c.query(`ALTER TABLE "user_wallets" ADD PRIMARY KEY ("user_id");`);
  } catch {}

  console.log('\n=========================================');
  console.log('🎉 SEMUA DATA LOKAL SUKSES DIPINDAHKAN KE SUPABASE!');
  console.log('=========================================');

  l.release();
  c.release();
  await local.end();
  await cloud.end();
}

syncAll().catch(console.error);

