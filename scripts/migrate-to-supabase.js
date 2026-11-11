const { Pool } = require('pg');

const localPool = new Pool({
  connectionString: 'postgresql://postgres:123@localhost:5432/trypedia_db'
});

const cloudPool = new Pool({
  connectionString: 'postgresql://postgres.dylbevgpmcxwjvawfvrh:nabil221105_@aws-0-ap-south-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  console.log('--- Memulai Migrasi Database Lokal ke Supabase ---');
  const local = await localPool.connect();
  const cloud = await cloudPool.connect();

  console.log('1. Terhubung ke Database Lokal dan Supabase Cloud!');

  // Dapatkan semua nama tabel
  const qTables = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const tRes = await local.query(qTables);
  const tables = tRes.rows.map(r => r.table_name);
  console.log(`Ditemukan ${tables.length} tabel di lokal:`, tables);

  // Buat DDL / Skema untuk setiap tabel
  for (const table of tables) {
    console.log(`\nMemproses tabel: ${table}...`);

    // Dapatkan definisi kolom
    const colRes = await local.query(`
      SELECT 
        column_name, 
        data_type, 
        udt_name,
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [table]);

    // Query DDL tabel sederhana jika belum ada
    // Cara paling aman: dump atau copy per baris
  }

  local.release();
  cloud.release();
  await localPool.end();
  await cloudPool.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  process.exit(1);
});

