const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:123@localhost:5432/trypedia_db'
});

async function setup() {
  await client.connect();
  console.log('Connected to PostgreSQL trypedia_db');

  // 1. Ensure users table has both users
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      avatar VARCHAR(10),
      photo_url TEXT,
      is_verified BOOLEAN DEFAULT TRUE,
      address TEXT,
      lat NUMERIC(10, 6),
      lng NUMERIC(10, 6),
      address_notes TEXT,
      image TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Upsert user 1: Khayru Nabiel Bahtiar
  await client.query(`
    INSERT INTO users (id, name, email, password, phone, avatar, is_verified)
    VALUES ('usr_001', 'Khayru Nabiel Bahtiar', 'khayrunabielbahtiar@gmail.com', 'trypedia123', '0813-355-313-338', 'KN', true)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password = EXCLUDED.password,
      phone = EXCLUDED.phone,
      avatar = EXCLUDED.avatar;
  `);

  // Upsert user 2: Sneaker Zone Jember
  await client.query(`
    INSERT INTO users (id, name, email, password, phone, avatar, is_verified)
    VALUES ('usr_002', 'Sneaker Zone Jember', 'sneakerzone@gmail.com', 'rrypedia123', '0812-9876-5432', 'SZ', true)
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      password = EXCLUDED.password,
      phone = EXCLUDED.phone,
      avatar = EXCLUDED.avatar;
  `);

  // 2. Stores table
  await client.query(`
    CREATE TABLE IF NOT EXISTS stores (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(50) UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      store_name VARCHAR(100) NOT NULL,
      store_slogan VARCHAR(255),
      store_avatar VARCHAR(10),
      store_description TEXT,
      address TEXT,
      district VARCHAR(100),
      distance VARCHAR(50) DEFAULT '1.2 km dari Anda',
      hours VARCHAR(100) DEFAULT '09.00 - 21.00 WIB',
      response_speed VARCHAR(50) DEFAULT '~10 Menit',
      rating NUMERIC(3, 1) DEFAULT 5.0,
      is_verified BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed Store for Sneaker Zone
  await client.query(`
    INSERT INTO stores (user_id, store_name, store_slogan, store_avatar, store_description, address, district, distance, hours, response_speed, rating, is_verified)
    VALUES (
      'usr_002',
      'Sneaker Zone Jember',
      'Spesialis Sepatu Sneaker Original Second & Preloved Berkualitas di Jember',
      'SZ',
      'Toko resmi Sneaker Zone Jember. Menyediakan layanan sewa coba sebelum beli permanen untuk sneaker hype & casual original bergaransi.',
      'Jl. Kalimantan No.84a, Krajan Timur, Sumbersari, Kec. Sumbersari, Kabupaten Jember, Jawa Timur 68121',
      'Sumbersari',
      '1.2 km dari Anda',
      '09.00 - 21.00 WIB',
      '~10 Menit',
      5.0,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      store_slogan = EXCLUDED.store_slogan,
      address = EXCLUDED.address;
  `);

  // Seed Store for Khayru (Belum ada produk)
  await client.query(`
    INSERT INTO stores (user_id, store_name, store_slogan, store_avatar, store_description, address, district, distance, hours, response_speed, rating, is_verified)
    VALUES (
      'usr_001',
      'Toko Khayru Preloved',
      'Koleksi Pribadi & Rental Preloved Khayru Bahtiar',
      'KN',
      'Toko preloved pribadi Khayru. Menyediakan berbagai barang hobi dan elektronik bekas pemakaian pribadi yang terawat.',
      'Perum PTP & Kaliurang Regency Kavling 43, Sumbersari, Jember',
      'Sumbersari',
      '0.5 km dari Anda',
      '10.00 - 20.00 WIB',
      '~15 Menit',
      5.0,
      true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      store_name = EXCLUDED.store_name,
      store_slogan = EXCLUDED.store_slogan,
      address = EXCLUDED.address;
  `);

  // 3. Products table
  await client.query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(100) PRIMARY KEY,
      seller_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      seller_name VARCHAR(100) NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      image TEXT NOT NULL,
      condition VARCHAR(100) NOT NULL,
      size VARCHAR(100),
      rent_price_daily NUMERIC(15, 2) NOT NULL,
      buy_price NUMERIC(15, 2) NOT NULL,
      stock INT DEFAULT 1,
      rating NUMERIC(3, 1) DEFAULT 0.0,
      review_count INT DEFAULT 0,
      rent_count INT DEFAULT 0,
      description TEXT,
      features JSONB DEFAULT '[]'::jsonb,
      package_includes JSONB DEFAULT '[]'::jsonb,
      deposit NUMERIC(15, 2) DEFAULT 0,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Seed New Balance 2022R for Sneaker Zone
  const nbFeatures = JSON.stringify([
    "Bisa Sewa-Milik (Rent to Own)",
    "Size 42 EUR / 26.5 cm",
    "Kondisi 95% Mulus Terawat",
    "Teknologi Sole N-ergy & ABZORB Empuk",
    "COD Area Sumbersari / UNEJ Jember"
  ]);
  const nbPackage = JSON.stringify([
    "Unit Sepatu New Balance 2022R (Kiri & Kanan)",
    "Shoe Tree Foam Pelindung Bentuk",
    "Insole Original New Balance",
    "Tali Sepatu Bawaan",
    "Replacement Box"
  ]);

  await client.query(`
    INSERT INTO products (
      id, seller_id, seller_name, name, category, image, condition, size,
      rent_price_daily, buy_price, stock, rating, review_count, rent_count,
      description, features, package_includes, deposit
    ) VALUES (
      'new-balance-2022r',
      'usr_002',
      'Sneaker Zone Jember',
      'Sepatu New Balance 2022R - Second Like New Original',
      'Fashion & Aksesori',
      '/images/new-balance-2022r.jpg',
      'Kondisi Masih sangat baik',
      'Size 42 EUR / 8.5 US / 26.5 CM',
      30000,
      1450000,
      1,
      0,
      0,
      0,
      'Dijual / Disewakan sepatu koleksi pribadi New Balance 2022R (2002R series). Pemakaian santai indoor, outsole masih sangat tebal dan grip aman tidak licin. Upper mesh dan suede bersih terawat. Cocok dicoba sewa dulu buat event, hangout, atau kuliah sebelum memutuskan beli permanen!',
      $1::jsonb,
      $2::jsonb,
      100000
    )
    ON CONFLICT (id) DO UPDATE SET
      seller_id = EXCLUDED.seller_id,
      seller_name = EXCLUDED.seller_name,
      name = EXCLUDED.name,
      image = EXCLUDED.image,
      rent_price_daily = EXCLUDED.rent_price_daily,
      buy_price = EXCLUDED.buy_price,
      stock = EXCLUDED.stock;
  `, [nbFeatures, nbPackage]);

  // 4. Seller COD Locations table
  await client.query(`
    CREATE TABLE IF NOT EXISTS seller_cod_locations (
      id SERIAL PRIMARY KEY,
      seller_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
      location_id VARCHAR(50),
      name VARCHAR(100) NOT NULL,
      address TEXT NOT NULL,
      detail VARCHAR(255),
      lat NUMERIC(10, 6) NOT NULL,
      lng NUMERIC(10, 6) NOT NULL,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Clear and seed 5 default COD locations for Sneaker Zone
  const locCount = await client.query("SELECT COUNT(*) FROM seller_cod_locations WHERE seller_id = 'usr_002'");
  if (parseInt(locCount.rows[0].count) === 0) {
    const defaultLocs = [
      {
        id: "unej",
        name: "Universitas Jember",
        address: "Jl. Kalimantan No. 37, Krajan Timur, Sumbersari, Jember",
        detail: "Area Gedung Soetardjo / Bundaran UNEJ",
        lat: -8.16441,
        lng: 113.7178
      },
      {
        id: "stasiun",
        name: "Stasiun Jember",
        address: "Jl. Wijaya Kusuma No. 1, Jemberlor, Patrang, Jember",
        detail: "Pintu Masuk Utama / Drop-Off Stasiun",
        lat: -8.1654,
        lng: 113.7032
      },
      {
        id: "alun_alun",
        name: "Alun-Alun Jember",
        address: "Jl. PB Sudirman, Kaliwates, Kp. Using, Jember",
        detail: "Depan Kantor Pemkab / Seberang Masjid Jami'",
        lat: -8.1724,
        lng: 113.7008
      },
      {
        id: "semanggi",
        name: "Jembatan Semanggi Jember",
        address: "Jl. Bengawan Solo, Sumbersari, Jember",
        detail: "Area Jembatan Semanggi Jember",
        lat: -8.1695,
        lng: 113.7152
      },
      {
        id: "geladak_kembar",
        name: "Geladak Kembar Jember",
        address: "Jl. Ahmad Yani, Kebondalem, Kepatihan, Kec. Kaliwates, Kabupaten Jember, Jawa Timur 68131",
        detail: "Area Jembatan Geladak Kembar",
        lat: -8.1722,
        lng: 113.7025
      }
    ];

    for (const loc of defaultLocs) {
      await client.query(`
        INSERT INTO seller_cod_locations (seller_id, location_id, name, address, detail, lat, lng)
        VALUES ('usr_002', $1, $2, $3, $4, $5, $6);
      `, [loc.id, loc.name, loc.address, loc.detail, loc.lat, loc.lng]);
    }
  }

  // 5. Update orders table to have seller_id
  await client.query(`
    ALTER TABLE orders ADD COLUMN IF NOT EXISTS seller_id VARCHAR(50);
  `);
  await client.query(`
    UPDATE orders SET seller_id = 'usr_002' WHERE seller_name ILIKE '%Sneaker Zone%' AND seller_id IS NULL;
  `);

  // 6. Chat tables
  await client.query(`
    CREATE TABLE IF NOT EXISTS chat_conversations (
      id VARCHAR(100) PRIMARY KEY,
      user1_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      user2_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id VARCHAR(100),
      product_id VARCHAR(100),
      last_message TEXT,
      last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user1_id, user2_id)
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      conversation_id VARCHAR(100) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
      sender_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      receiver_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_conv ON chat_messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_chat_conv_users ON chat_conversations(user1_id, user2_id);
  `);

  console.log('Database setup and seeding completed successfully!');
  await client.end();
}

setup().catch((e) => {
  console.error('Setup failed:', e);
  process.exit(1);
});

