const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:123@localhost:5432/trypedia_db'
});

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL...");

  // 1. Add seller_income and cancellation_reason to orders table
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_income NUMERIC(15, 2);
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
  `);
  console.log("Added seller_income and cancellation_reason columns to orders table.");

  // 2. Populate seller_income for existing orders based on products table
  await client.query(`
    UPDATE orders o
    SET seller_income = (
      CASE 
        WHEN o.order_type = 'buy' THEN p.buy_price
        WHEN o.rent_duration = 1 THEN p.rent_price_daily
        WHEN o.rent_duration = 7 THEN p.rent_price_7d
        ELSE p.rent_price_3d
      END
    )
    FROM products p
    WHERE o.product_id = p.id AND o.seller_income IS NULL;
  `);

  // Fallback for orders without matching product
  await client.query(`
    UPDATE orders 
    SET seller_income = (
      CASE 
        WHEN order_type = 'rent' THEN 84000 
        ELSE total_price * 0.9 
      END
    )
    WHERE seller_income IS NULL;
  `);
  console.log("Populated seller_income for all existing orders.");

  const check = await client.query(`SELECT order_id, product_title, order_type, total_price, seller_income, status FROM orders;`);
  console.log("Updated orders:", check.rows);

  await client.end();
}

run().catch(console.error);

