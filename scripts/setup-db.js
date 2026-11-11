const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

// Auto-read .env.local if present
try {
  const envPath = path.resolve(__dirname, "..", ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
        const [k, ...v] = trimmed.split("=");
        process.env[k.trim()] = v.join("=").trim();
      }
    });
  }
} catch (e) {
  console.warn("Could not read .env.local:", e.message);
}

const DB_USER = process.env.DB_USER || "postgres";
const DB_PASSWORD = process.env.DB_PASSWORD || "123";
const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = process.env.DB_PORT || 5432;
const TARGET_DB = process.env.DB_NAME || "trypedia_db";

async function setupDatabase() {
  console.log(`Connecting to PostgreSQL as ${DB_USER}@${DB_HOST}:${DB_PORT}...`);

  // Step 1: Connect to default postgres DB to check/create database
  const adminClient = new Client({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: "postgres",
  });

  try {
    await adminClient.connect();
    console.log("Connected to PostgreSQL successfully!");

    const checkDbRes = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [TARGET_DB]
    );

    if (checkDbRes.rowCount === 0) {
      console.log(`Creating database "${TARGET_DB}"...`);
      await adminClient.query(`CREATE DATABASE "${TARGET_DB}"`);
      console.log(`Database "${TARGET_DB}" created successfully!`);
    } else {
      console.log(`Database "${TARGET_DB}" already exists.`);
    }
  } catch (err) {
    console.error("Error during admin connection/database creation:", err.message);
    throw err;
  } finally {
    await adminClient.end();
  }

  // Step 2: Connect to the target database and create tables
  console.log(`Connecting to database "${TARGET_DB}"...`);
  const appClient = new Client({
    user: DB_USER,
    password: DB_PASSWORD,
    host: DB_HOST,
    port: DB_PORT,
    database: TARGET_DB,
  });

  try {
    await appClient.connect();

    // Table: users
    console.log("Creating table 'users' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        avatar VARCHAR(10) NOT NULL,
        photo_url TEXT,
        is_verified BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default user if not exists
    console.log("Seeding default user 'pengguna@gmail.com' if not exists...");
    await appClient.query(`
      INSERT INTO users (id, name, email, password, phone, avatar, photo_url, is_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING;
    `, [
      "usr_001",
      "Khayru Nabiel Bahtiar",
      "pengguna@gmail.com",
      "trypedia123",
      "0813-355-313-338",
      "KN",
      null,
      true,
    ]);

    // Table: orders
    console.log("Creating table 'orders' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) REFERENCES users(id),
        user_name VARCHAR(255) NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        product_title VARCHAR(255) NOT NULL,
        order_type VARCHAR(20) NOT NULL,
        delivery_option VARCHAR(20) NOT NULL,
        cod_location TEXT,
        cod_date VARCHAR(50),
        cod_time VARCHAR(50),
        cod_notes TEXT,
        payment_method VARCHAR(50) NOT NULL,
        total_price NUMERIC NOT NULL,
        status VARCHAR(50) DEFAULT 'PAID_REKBER',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table: user_addresses
    console.log("Creating table 'user_addresses' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS user_addresses (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        recipient_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        province_city_district VARCHAR(255) NOT NULL,
        street_address TEXT NOT NULL,
        address_notes TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        label VARCHAR(50) DEFAULT 'Rumah',
        is_primary BOOLEAN DEFAULT FALSE,
        is_shop_address BOOLEAN DEFAULT FALSE,
        is_return_address BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS is_shop_address BOOLEAN DEFAULT FALSE;
      ALTER TABLE user_addresses ADD COLUMN IF NOT EXISTS is_return_address BOOLEAN DEFAULT FALSE;
    `);

    // Seed default address for usr_001 if none exists
    const checkAddr = await appClient.query(
      `SELECT id FROM user_addresses WHERE user_id = $1`,
      ["usr_001"]
    );
    if (checkAddr.rowCount === 0) {
      console.log("Seeding default address for 'Khayru Nabiel Bahtiar'...");
      await appClient.query(`
        INSERT INTO user_addresses (
          id, user_id, recipient_name, phone, province_city_district,
          street_address, address_notes, latitude, longitude, label, is_primary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        "addr_001",
        "usr_001",
        "Khayru Nabiel Bahtiar",
        "(+62) 813 3553 1338",
        "SUMBER SARI, KAB. JEMBER, JAWA TIMUR, ID, 68121",
        "Perum PTP & Kaliurang Regency Kavling 43, Krajan Barat, Sumbersari, Kecamatan Sumbersari, Kabupaten Jember, Jawa Timur 68121",
        "AR KOST PUTRA",
        -8.16441,
        113.72780,
        "Rumah",
        true,
      ]);
    }

    // Table: user_wallets
    console.log("Creating table 'user_wallets' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance NUMERIC(15, 2) DEFAULT 1000000.00,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table: wallet_transactions
    console.log("Creating table 'wallet_transactions' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount NUMERIC(15, 2) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        payment_method VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial balance for usr_001 if none exists
    const checkWallet = await appClient.query(
      `SELECT user_id, balance FROM user_wallets WHERE user_id = $1`,
      ["usr_001"]
    );
    if (checkWallet.rowCount === 0) {
      console.log("Seeding initial wallet balance (Rp 1.000.000) for usr_001...");
      await appClient.query(`
        INSERT INTO user_wallets (user_id, balance, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, ["usr_001", 1000000.00]);
    }

    // Seed initial transaction for usr_001 if none exists
    const checkTx = await appClient.query(
      `SELECT id FROM wallet_transactions WHERE user_id = $1`,
      ["usr_001"]
    );
    if (checkTx.rowCount === 0) {
      console.log("Seeding initial wallet transaction for usr_001...");
      await appClient.query(`
        INSERT INTO wallet_transactions (id, user_id, type, amount, description, status, payment_method, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      `, [
        "tx_init_001",
        "usr_001",
        "TOPUP",
        1000000.00,
        "Berhasil top up sejumlah Rp 1.000.000",
        "SUCCESS",
        "Sistem (Saldo Awal)",
      ]);
    }

    // Table: user_coins
    console.log("Creating table 'user_coins' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS user_coins (
        user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        balance INTEGER DEFAULT 10000,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Table: coin_transactions
    console.log("Creating table 'coin_transactions' if not exists...");
    await appClient.query(`
      CREATE TABLE IF NOT EXISTS coin_transactions (
        id VARCHAR(50) PRIMARY KEY,
        user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        amount INTEGER NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Seed initial coins (10.000) for usr_001 if none exists
    const checkCoin = await appClient.query(
      `SELECT user_id, balance FROM user_coins WHERE user_id = $1`,
      ["usr_001"]
    );
    if (checkCoin.rowCount === 0) {
      console.log("Seeding initial coin balance (10.000 Koin) for usr_001...");
      await appClient.query(`
        INSERT INTO user_coins (user_id, balance, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, ["usr_001", 10000]);
    }

    // Seed initial coin transaction for usr_001 if none exists
    const checkCoinTx = await appClient.query(
      `SELECT id FROM coin_transactions WHERE user_id = $1`,
      ["usr_001"]
    );
    if (checkCoinTx.rowCount === 0) {
      console.log("Seeding initial coin transaction (+10.000 Koin) for usr_001...");
      await appClient.query(`
        INSERT INTO coin_transactions (id, user_id, type, amount, description, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
      `, [
        "coin_tx_init_001",
        "usr_001",
        "BONUS",
        10000,
        "Bonus Pengguna Baru Trypedia",
        "SUCCESS",
      ]);
    }

    console.log("=== PostgreSQL Database Setup Complete! ===");
    console.log(`Database: ${TARGET_DB}`);
    console.log("Tables created: users, orders, user_addresses, user_wallets, wallet_transactions, user_coins, coin_transactions");
    console.log("Default User Seeded: pengguna@gmail.com / trypedia123");
  } catch (err) {
    console.error("Error setting up tables:", err.message);
    throw err;
  } finally {
    await appClient.end();
  }
}

setupDatabase().catch((e) => {
  process.exit(1);
});

