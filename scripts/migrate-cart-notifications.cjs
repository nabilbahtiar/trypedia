const fs = require('fs');
const { Client } = require('pg');
for (const file of ['.env.local', '.env']) if (fs.existsSync(file)) process.loadEnvFile(file);
const db = new Client({ connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER || 'postgres'}:${encodeURIComponent(process.env.DB_PASSWORD || 'postgres')}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'trypedia_db'}` });
(async () => {
  await db.connect();
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS cart_items (
      user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id) ON DELETE CASCADE,
      mode TEXT NOT NULL DEFAULT 'rent' CHECK(mode IN ('rent','buy')),
      duration INTEGER NOT NULL DEFAULT 3 CHECK(duration IN (1,3,7)),
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY(user_id,product_id)
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      order_id VARCHAR(50) REFERENCES orders(order_id) ON DELETE CASCADE,
      title TEXT NOT NULL, message TEXT NOT NULL, href TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications(user_id,created_at DESC);
    CREATE OR REPLACE FUNCTION notify_order_change() RETURNS trigger AS $$
    DECLARE seller TEXT; label TEXT; buyer_tab TEXT; seller_tab TEXT;
    BEGIN
      IF TG_OP = 'INSERT' THEN DELETE FROM cart_items WHERE user_id=NEW.user_id AND product_id=NEW.product_id; END IF;
      IF TG_OP = 'UPDATE' THEN
        IF NEW.status IS NOT DISTINCT FROM OLD.status AND NEW.payment_verified IS NOT DISTINCT FROM OLD.payment_verified
          AND NEW.purchase_payment_status IS NOT DISTINCT FROM OLD.purchase_payment_status THEN RETURN NEW; END IF;
      END IF;
      SELECT seller_id INTO seller FROM products WHERE id=NEW.product_id;
      label := CASE NEW.status WHEN 'BELUM_BAYAR' THEN 'Menunggu pembayaran' WHEN 'SEDANG_DIKEMAS' THEN 'Menunggu konfirmasi'
        WHEN 'DIJADWALKAN_DIKIRIM' THEN 'Jadwal COD dikonfirmasi' WHEN 'DISEWA' THEN 'Barang sedang disewa'
        WHEN 'SELESAI' THEN 'Pesanan selesai' WHEN 'SELESAI_DIBELI' THEN 'Pembelian selesai' WHEN 'DIBATALKAN' THEN 'Pesanan dibatalkan' ELSE 'Pesanan diperbarui' END;
      IF NEW.purchase_payment_status='PENDING' THEN label := 'Pembayaran pembelian menunggu verifikasi'; END IF;
      buyer_tab := CASE WHEN NEW.status IN ('SELESAI','SELESAI_DIBELI') THEN 'SELESAI' ELSE NEW.status END;
      seller_tab := CASE NEW.status WHEN 'SEDANG_DIKEMAS' THEN 'PERLU_KONFIRMASI' WHEN 'DIJADWALKAN_DIKIRIM' THEN 'DIJADWALKAN_DIKIRIM'
        WHEN 'DISEWA' THEN 'DISEWA' ELSE 'SELESAI' END;
      INSERT INTO notifications(id,user_id,order_id,title,message,href) VALUES
        ('ntf_'||md5(random()::text||clock_timestamp()::text),NEW.user_id,NEW.order_id,label,
          NEW.product_title||' · '||NEW.order_id,'/orders?tab='||buyer_tab);
      IF seller IS NOT NULL AND seller<>NEW.user_id AND NEW.status IN ('SEDANG_DIKEMAS','DIJADWALKAN_DIKIRIM','DISEWA','SELESAI','SELESAI_DIBELI') THEN
        INSERT INTO notifications(id,user_id,order_id,title,message,href) VALUES
          ('ntf_'||md5(random()::text||clock_timestamp()::text),seller,NEW.order_id,label,
            NEW.product_title||' · '||NEW.order_id,'/seller?tab=orders&orderTab='||seller_tab);
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    DROP TRIGGER IF EXISTS orders_notify_change ON orders;
    CREATE TRIGGER orders_notify_change AFTER INSERT OR UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION notify_order_change();`);
    console.log('Cart and order notifications ready. Existing orders do not produce fabricated notifications.');
  } finally { await db.end(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
