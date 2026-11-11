const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

function getConnectionString() {
  try {
    const envPath = path.resolve(__dirname, "..", ".env.local");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      content.split("\n").forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...v] = trimmed.split("=");
          if (!process.env[k.trim()]) {
            process.env[k.trim()] = v.join("=").trim();
          }
        }
      });
    }
  } catch {}
  return (
    process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER || "postgres"}:${encodeURIComponent(
      process.env.DB_PASSWORD || "123"
    )}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${
      process.env.DB_NAME || "trypedia_db"
    }`
  );
}

async function addIndexes() {
  const pool = new Pool({ connectionString: getConnectionString() });
  try {
    const statements = [
      `CREATE INDEX IF NOT EXISTS idx_products_created_at ON products (created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_products_seller_created ON products (seller_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_products_category ON products (category)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders (user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_seller_status_created ON orders (seller_id, status, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_product_status ON orders (product_id, status)`,
      `CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_cod_locations_seller_id ON seller_cod_locations (seller_id, id ASC)`,
      `CREATE INDEX IF NOT EXISTS idx_user_addresses_lookup ON user_addresses (user_id, is_primary DESC, is_shop_address DESC, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_wallet_tx_user_created ON wallet_transactions (user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_coin_tx_user_created ON coin_transactions (user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_conv_users ON chat_conversations (user1_id, user2_id, last_message_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_created ON chat_messages (conversation_id, created_at ASC)`,
      `CREATE INDEX IF NOT EXISTS idx_chat_msg_unread ON chat_messages (conversation_id, receiver_id, is_read)`,
    ];

    for (const sql of statements) {
      try {
        await pool.query(sql);
        console.log("OK:", sql);
      } catch (err) {
        console.warn("Skip index:", err.message);
      }
    }
    console.log("All performance indexes ensured.");
  } finally {
    await pool.end();
  }
}

addIndexes().catch((err) => {
  console.error(err);
  process.exit(1);
});

