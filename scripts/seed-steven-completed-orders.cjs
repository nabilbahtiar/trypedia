// Explicit demo dataset: 11 completed rentals, using Steven's five existing reviews.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Client } = require('pg');
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
const db = new Client({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
const day = 86400000;

(async () => {
  await db.connect();
  try {
    await db.query('BEGIN');
    await db.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS mask_name BOOLEAN NOT NULL DEFAULT true');
    const products = (await db.query("SELECT * FROM products WHERE seller_id='usr_002' ORDER BY id FOR UPDATE")).rows;
    const reviews = (await db.query("SELECT * FROM reviews WHERE id LIKE 'rev_steven_%' AND seller_id='usr_002' ORDER BY id FOR UPDATE")).rows;
    if (products.length !== 5 || reviews.length !== 5) throw new Error('Expected five Steven products and five demo reviews.');
    const backup = {};
    for (const [key, sql] of Object.entries({
      orders: "SELECT * FROM orders WHERE seller_id='usr_002'",
      wallets: "SELECT * FROM user_wallets WHERE user_id='usr_002' OR user_id LIKE 'usr_rev_%' OR user_id LIKE 'usr_demo_%'",
      transactions: "SELECT * FROM wallet_transactions WHERE user_id='usr_002' OR user_id LIKE 'usr_rev_%' OR user_id LIKE 'usr_demo_%'",
      stores: "SELECT * FROM stores WHERE user_id='usr_002'",
    })) backup[key] = (await db.query(sql)).rows;
    backup.products = products;
    backup.reviews = reviews;
    const folder = path.resolve('storage/backups');
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(path.join(folder, `steven-demo-seed-${Date.now()}.json`), JSON.stringify(backup, null, 2));

    const names = ['Raka Pratama', 'Nadia Putri', 'Dimas Saputra', 'Alya Maharani', 'Bima Nugraha', 'Fajar Ramadhan', 'Intan Permata', 'Rizky Firmansyah', 'Salsa Aulia', 'Aditya Putra', 'Dewi Lestari'];
    for (let i = 0; i < 11; i++) {
      const review = reviews[i];
      const product = review ? products.find(p => p.id === review.product_id) : products[(i - 5) % products.length];
      if (!product) throw new Error('Review product missing');
      const orderId = review?.order_id || `TRY-SEED-${801 + i}`;
      const userId = review?.user_id || `usr_demo_${String(i + 1).padStart(3, '0')}`;
      const name = review?.reviewer_name || names[i];
      const duration = review?.rent_duration || [1, 3, 7][i % 3];
      const type = review?.order_type || 'rent';
      const income = Number(type === 'buy' ? product.buy_price : duration === 1 ? product.rent_price_daily : duration === 7 ? product.rent_price_7d : product.rent_price_3d);
      const fee = 2000;
      const insurance = Math.round(Number(product.buy_price) * 0.005);
      const total = income + fee + insurance;
      const end = review ? new Date(review.created_at).getTime() - day : Date.parse('2026-11-11T00:00:00+07:00') - (12 - i) * 10 * day;
      const started = end - duration * day;
      const created = new Date(started - day);
      await db.query(`INSERT INTO users (id,name,email,password,phone,avatar,is_verified)
        VALUES ($1,$2,$3,$4,'',$5,false) ON CONFLICT (id) DO NOTHING`,
      [userId, name, `${userId}@demo.trypedia.test`, crypto.randomBytes(24).toString('hex'), name.split(' ').map(w => w[0]).slice(0, 2).join('')]);
      const actualUser = (await db.query('SELECT name FROM users WHERE id=$1', [userId])).rows[0];
      const inserted = await db.query(`INSERT INTO orders (
        order_id,user_id,user_name,product_id,product_title,product_image,seller_id,seller_name,
        order_type,delivery_option,cod_location,cod_date,cod_time,payment_method,total_price,seller_income,
        status,payment_verified,handover_pin,rent_duration,rent_started_at,rent_end_at,created_at,service_fee,insurance_fee,seller_settled_amount)
        VALUES ($1,$2,$3,$4,$5,$6,'usr_002','Steven',$7,'pickup',$8,$9,'10:00','Saldo TryPedia',$10,$11,
          'SELESAI',true,$12,$13,$14,$15,$16,2000,$17,$11)
        ON CONFLICT (order_id) DO NOTHING RETURNING order_id`,
      [orderId, userId, actualUser.name, product.id, product.name, product.image, type,
        'Jl. Kalimantan No.84a, Sumbersari, Jember', new Date(started).toISOString().slice(0, 10), total, income,
        String(crypto.randomInt(100000, 1000000)), duration, new Date(started), new Date(end), created, insurance]);
      if (inserted.rowCount) {
        await db.query(`INSERT INTO user_wallets(user_id,balance) VALUES($1,0) ON CONFLICT(user_id) DO NOTHING`, [userId]);
        await db.query(`INSERT INTO wallet_transactions(id,user_id,type,amount,description,status,payment_method,created_at)
          VALUES($1,$2,'TOPUP',$3,$4,'SUCCESS','Saldo demo',$5),
                ($6,$2,'PAYMENT',$3,$7,'SUCCESS','Saldo TryPedia',$5),
                ($8,'usr_002','income',$9,$10,'success','Rekber TryPedia',$11)`,
        [`demo_topup_${orderId}`,userId,total,`Saldo demo untuk ${orderId}`,created,
          `demo_payment_${orderId}`,`Pembayaran pesanan ${orderId}`,
          `demo_income_${orderId}`,income,`Hasil ${type === 'rent' ? 'Sewa' : 'Penjualan'} Pesanan #${orderId} (${product.name})`,new Date(end)]);
        await db.query(`INSERT INTO user_wallets(user_id,balance) VALUES('usr_002',$1)
          ON CONFLICT(user_id) DO UPDATE SET balance=user_wallets.balance+$1,updated_at=CURRENT_TIMESTAMP`, [income]);
      }
      if (review) await db.query('UPDATE reviews SET reviewer_name=$2 WHERE id=$1', [review.id, actualUser.name]);
    }
    for (const p of products) {
      await db.query(`UPDATE products SET
        rating=COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE product_id=$1),0),
        review_count=(SELECT COUNT(*) FROM reviews WHERE product_id=$1),
        rent_count=(SELECT COUNT(*) FROM orders WHERE product_id=$1 AND order_type='rent'
          AND status IN ('DISEWA','SELESAI','SELESAI_DIBELI')) WHERE id=$1`, [p.id]);
    }
    await db.query(`UPDATE stores SET rating=COALESCE((SELECT ROUND(AVG(rating)::numeric,1) FROM reviews WHERE seller_id='usr_002'),5) WHERE user_id='usr_002'`);
    const count = (await db.query("SELECT COUNT(*)::int AS count FROM orders WHERE seller_id='usr_002' AND status='SELESAI'")).rows[0].count;
    if (count !== 11) throw new Error(`Expected 11 completed demo orders, found ${count}`);
    await db.query('COMMIT');
    console.log('Steven demo data ready: 11 completed orders, 5 linked reviews, matching wallet entries.');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { await db.end(); }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
