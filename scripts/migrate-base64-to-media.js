const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

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

const STORAGE_ROOT = path.resolve(__dirname, "..", "storage", "media");

function getExtFromMime(mimeType) {
  const clean = (mimeType || "").toLowerCase();
  if (clean.includes("webp")) return "webp";
  if (clean.includes("png")) return "png";
  if (clean.includes("gif")) return "gif";
  return "jpg";
}

function externalizeDataUrl(value, bucket) {
  if (!value || typeof value !== "string") return { changed: false, url: value };
  const trimmed = value.trim();
  if (!trimmed.startsWith("data:image/")) {
    return { changed: false, url: value };
  }
  const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,([\s\S]+)$/);
  if (!match) return { changed: false, url: value };

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");
  if (!buffer.length) return { changed: false, url: value };

  const ext = getExtFromMime(mimeType);
  const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 14);
  const filename = `${hash}-${buffer.length}.${ext}`;
  const dir = path.join(STORAGE_ROOT, bucket);
  fs.mkdirSync(dir, { recursive: true });
  const targetFile = path.join(dir, filename);
  if (!fs.existsSync(targetFile)) {
    fs.writeFileSync(targetFile, buffer);
  }
  return {
    changed: true,
    url: `/api/media/${bucket}/${filename}`,
    bytesSaved: trimmed.length,
  };
}

async function hasColumn(pool, tableName, columnName) {
  const res = await pool.query(
    `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`,
    [tableName, columnName]
  );
  return res.rowCount > 0;
}

async function migrate() {
  const pool = new Pool({ connectionString: getConnectionString() });
  let totalConverted = 0;
  let totalBytesRemoved = 0;

  try {
    // 1. products.image & products.images
    const prodRes = await pool.query(`SELECT id, image, images FROM products`);
    for (const row of prodRes.rows) {
      let updated = false;
      let nextImage = row.image;
      const imgConv = externalizeDataUrl(row.image, "products");
      if (imgConv.changed) {
        nextImage = imgConv.url;
        updated = true;
        totalConverted++;
        totalBytesRemoved += imgConv.bytesSaved;
      }

      let nextImages = row.images;
      if (Array.isArray(row.images)) {
        const mapped = row.images.map((item) => {
          const c = externalizeDataUrl(item, "products");
          if (c.changed) {
            updated = true;
            totalConverted++;
            totalBytesRemoved += c.bytesSaved;
          }
          return c.url;
        });
        nextImages = mapped;
      }

      if (updated) {
        await pool.query(
          `UPDATE products SET image = $1, images = $2::jsonb WHERE id = $3`,
          [nextImage, JSON.stringify(nextImages), row.id]
        );
        console.log(`Migrated product ${row.id} media -> ${nextImage}`);
      }
    }

    // 2. users.photo_url & users.image
    if (await hasColumn(pool, "users", "photo_url")) {
      const uRes = await pool.query(`SELECT id, photo_url FROM users WHERE photo_url LIKE 'data:image/%'`);
      for (const row of uRes.rows) {
        const c = externalizeDataUrl(row.photo_url, "avatars");
        if (c.changed) {
          await pool.query(`UPDATE users SET photo_url = $1 WHERE id = $2`, [c.url, row.id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
          console.log(`Migrated users.photo_url ${row.id} -> ${c.url}`);
        }
      }
    }
    if (await hasColumn(pool, "users", "image")) {
      const uImgRes = await pool.query(`SELECT id, image FROM users WHERE image LIKE 'data:image/%'`);
      for (const row of uImgRes.rows) {
        const c = externalizeDataUrl(row.image, "avatars");
        if (c.changed) {
          await pool.query(`UPDATE users SET image = $1 WHERE id = $2`, [c.url, row.id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
        }
      }
    }

    // 3. stores.photo_url & stores.front_photo_url
    if (await hasColumn(pool, "stores", "photo_url")) {
      const sRes = await pool.query(`SELECT id, photo_url FROM stores WHERE photo_url LIKE 'data:image/%'`);
      for (const row of sRes.rows) {
        const c = externalizeDataUrl(row.photo_url, "stores");
        if (c.changed) {
          await pool.query(`UPDATE stores SET photo_url = $1 WHERE id = $2`, [c.url, row.id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
          console.log(`Migrated stores.photo_url ${row.id} -> ${c.url}`);
        }
      }
    }
    if (await hasColumn(pool, "stores", "front_photo_url")) {
      const sfRes = await pool.query(`SELECT id, front_photo_url FROM stores WHERE front_photo_url LIKE 'data:image/%'`);
      for (const row of sfRes.rows) {
        const c = externalizeDataUrl(row.front_photo_url, "stores");
        if (c.changed) {
          await pool.query(`UPDATE stores SET front_photo_url = $1 WHERE id = $2`, [c.url, row.id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
          console.log(`Migrated stores.front_photo_url ${row.id} -> ${c.url}`);
        }
      }
    }

    // 4. user_addresses.front_photo_url
    if (await hasColumn(pool, "user_addresses", "front_photo_url")) {
      const aRes = await pool.query(`SELECT id, front_photo_url FROM user_addresses WHERE front_photo_url LIKE 'data:image/%'`);
      for (const row of aRes.rows) {
        const c = externalizeDataUrl(row.front_photo_url, "addresses");
        if (c.changed) {
          await pool.query(`UPDATE user_addresses SET front_photo_url = $1 WHERE id = $2`, [c.url, row.id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
          console.log(`Migrated user_addresses.front_photo_url ${row.id} -> ${c.url}`);
        }
      }
    }

    // 5. orders.product_image & orders.payment_proof_url
    if (await hasColumn(pool, "orders", "product_image")) {
      const oImgRes = await pool.query(`SELECT order_id, product_image FROM orders WHERE product_image LIKE 'data:image/%'`);
      for (const row of oImgRes.rows) {
        const c = externalizeDataUrl(row.product_image, "products");
        if (c.changed) {
          await pool.query(`UPDATE orders SET product_image = $1 WHERE order_id = $2`, [c.url, row.order_id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
        }
      }
    }
    if (await hasColumn(pool, "orders", "payment_proof_url")) {
      const oPrfRes = await pool.query(`SELECT order_id, payment_proof_url FROM orders WHERE payment_proof_url LIKE 'data:image/%'`);
      for (const row of oPrfRes.rows) {
        const c = externalizeDataUrl(row.payment_proof_url, "proofs");
        if (c.changed) {
          await pool.query(`UPDATE orders SET payment_proof_url = $1 WHERE order_id = $2`, [c.url, row.order_id]);
          totalConverted++;
          totalBytesRemoved += c.bytesSaved;
        }
      }
    }

    console.log(
      `Migration finished! Converted ${totalConverted} Base64 blobs (~${(
        totalBytesRemoved /
        1024 /
        1024
      ).toFixed(2)} MB removed from PostgreSQL rows).`
    );
  } finally {
    await pool.end();
  }
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});

