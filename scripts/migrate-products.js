const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:123@localhost:5432/trypedia_db'
});

async function run() {
  await client.connect();
  await client.query(`UPDATE products SET condition = 'Seperti Baru' WHERE id = 'new-balance-2022r';`);
  const res = await client.query(`SELECT id, name, condition, rent_price_daily, rent_price_3d, rent_price_7d, images FROM products;`);
  console.log(res.rows[0]);
  await client.end();
}

run();
