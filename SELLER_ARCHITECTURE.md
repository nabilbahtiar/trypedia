# Arsitektur Sistem Manajemen Toko (Seller Center) & Sinkronisasi Pembeli-Penjual

Dokumen ini menjelaskan rancangan arsitektur, basis data PostgreSQL, alur sinkronisasi pesanan, titik temu COD, dan akun pengguna pada aplikasi TryPedia.

---

---

## 2. Skema Basis Data PostgreSQL (`trypedia_db`)

### A. Tabel `users`
Menyimpan akun autentikasi pengguna:
```sql
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(100) NOT NULL,
  phone VARCHAR(50),
  avatar VARCHAR(10),
  photo_url TEXT,
  is_verified BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### B. Tabel `stores`
Menyimpan profil toko milik pengguna:
```sql
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
```

### C. Tabel `products`
Menyimpan produk sewa-ke-beli yang diunggah oleh toko:
```sql
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
  rating NUMERIC(3, 1) DEFAULT 5.0,
  review_count INT DEFAULT 0,
  rent_count INT DEFAULT 0,
  description TEXT,
  features JSONB DEFAULT '[]'::jsonb,
  package_includes JSONB DEFAULT '[]'::jsonb,
  deposit NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### D. Tabel `seller_cod_locations`
Menyimpan titik temu resmi serah-terima COD (**Maksimal 5 Lokasi per Toko**):
```sql
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
```

### E. Tabel `orders` (Sinkronisasi Dua Arah)
```sql
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(50) UNIQUE,
  user_id VARCHAR(50) REFERENCES users(id),
  user_name VARCHAR(100),
  seller_id VARCHAR(50) REFERENCES users(id),
  seller_name VARCHAR(100),
  product_id VARCHAR(50),
  product_title VARCHAR(255),
  product_image TEXT,
  order_type VARCHAR(20),       -- 'rent' atau 'buy'
  delivery_option VARCHAR(20),  -- 'cod', 'delivery', 'pickup'
  cod_location TEXT,
  cod_date VARCHAR(20),
  cod_time VARCHAR(20),
  cod_notes TEXT,
  payment_method VARCHAR(100),
  total_price NUMERIC(15, 2),
  status VARCHAR(50),           -- 'BELUM_BAYAR', 'SEDANG_DIKEMAS', 'DIJADWALKAN_DIKIRIM', 'DISEWA', 'SELESAI', 'DIBATALKAN'
  payment_proof_url TEXT,
  payment_verified BOOLEAN DEFAULT FALSE,
  handover_pin VARCHAR(10),     -- PIN serah-terima 6 digit acak
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. Siklus Hidup Pesanan (Order Lifecycle) Dua Arah

Alur perpindahan status pesanan antara Pembeli (`/orders`) dan Penjual (`/seller`):

```
+----------------------------------------------------------------------------------------------------+
| 1. PEMBELI MEMBAYAR                                                                                |
|    - Pembeli (Khayru) checkout produk sewa/beli via Saldo TryPedia atau QRIS terverifikasi.       |
|    - Status di tabel orders = 'SEDANG_DIKEMAS'                                                     |
+----------------------------------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
| 2. PENJUAL: TAB "PERLU KONFIRMASI"                                                                 |
|    - Pesanan muncul di Seller Center Sneaker Zone pada sub-tab "Perlu Konfirmasi".                 |
|    - Penjual memeriksa jadwal COD & catatan pembeli, lalu menekan "Konfirmasi Pesanan".            |
|    - Status di tabel orders diupdate = 'DIJADWALKAN_DIKIRIM'                                       |
|    - Di sisi pembeli (/orders), pesanan otomatis pindah ke tab "Dijadwalkan / Dikirim".           |
+----------------------------------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
| 3. PENJUAL & PEMBELI: VERIFIKASI PIN SERAH TERIMA COD (6 DIGIT RANDOM)                             |
|    - Saat status 'DIJADWALKAN_DIKIRIM', sistem membuat 6 digit PIN acak unik (misal: 191654).       |
|    - Penjual menekan tombol "Tampilkan PIN Serah Terima" di halaman /seller untuk melihat PIN.     |
|    - Di lokasi COD, setelah barang diperiksa dan diserahkan, penjual memberikan PIN kepada pembeli.|
|    - Pembeli menekan tombol "Masukkan PIN Serah Terima" di halaman /orders dan memasukkan 6 digit. |
|    - API /api/orders/verify-pin memvalidasi kesesuaian PIN:                                        |
|      * Jika PIN cocok: status orders diupdate = 'DISEWA' (Masa sewa coba resmi dimulai).           |
|      * Dana sewa otomatis dicairkan ke Dompet Toko Penjual (tabel user_wallets).                   |
|      * Transaksi otomatis berpindah ke tab "Disewa" baik di akun Penjual maupun Pembeli.           |
|      * Jika PIN salah: sistem menolak dengan pesan peringatan keamanan.                            |
+----------------------------------------------------------------------------------------------------+
                                      |
                                      v
+----------------------------------------------------------------------------------------------------+
| 4. STATUS "DISEWA" MENUJU "SELESAI"                                                                |
|    - Produk sedang dalam penguasaan pembeli untuk masa sewa coba.                                  |
|    - Tab "Disewa" aktif di kedua portal: Penjual (/seller) dan Pembeli (/orders).                  |
|    - Setelah masa sewa tuntas atau pembeli memutuskan beli permanen / barang dikembalikan:         |
|      * Status berubah menjadi 'SELESAI'.                                                           |
+----------------------------------------------------------------------------------------------------+
```

---

## 4. Fitur Titik Temu COD (Maksimal 5 Lokasi)
- Penjual mengatur hingga 5 titik temu resmi di area Jember (Universitas Jember, Stasiun, Alun-Alun, Jembatan Semanggi, Geladak Kembar).
- Kuota dibatasi ketat: maksimal 5 lokasi. Jika kuota penuh, tombol tambah otomatis terkunci hingga penjual menghapus salah satu lokasi.
- **Sinkronisasi Dinamis**: Halaman Checkout pembeli (`/checkout`) memuat titik temu ini secara dinamis melalui API `/api/seller/locations?sellerName=Sneaker%20Zone%20Jember`.

---

## 5. Ringkasan API Endpoints

1. `POST /api/auth/login`: Autentikasi email dan password (`trypedia123`).
2. `GET /api/seller/store?userId=...`: Mengambil profil toko & statistik pesanan/produk.
3. `PUT /api/seller/store`: Memperbarui profil toko.
4. `GET /api/seller/orders?sellerId=...&tab=...`: Mengambil pesanan toko berdasarkan sub-tab (`PERLU_KONFIRMASI`, `DIJADWALKAN_DIKIRIM`, `DISEWA`, `SELESAI`).
5. `PATCH /api/seller/orders`: Mengonfirmasi pesanan (`CONFIRM`) atau menyelesaikan pesanan (`COMPLETE`).
6. `GET /api/seller/products?sellerId=...`: Mengambil daftar produk toko.
7. `POST /api/seller/products`: Mengunggah produk baru ke etalase toko dan database.
8. `PATCH /api/seller/products`: Mengubah status stok produk (1/0).
9. `DELETE /api/seller/products?productId=...`: Menghapus produk dari etalase.
10. `GET /api/seller/locations?sellerId=...`: Mengambil titik temu COD toko (maksimal 5).
11. `POST /api/seller/locations`: Menambahkan titik temu COD baru (validasi kuota <= 5).
12. `DELETE /api/seller/locations?id=...`: Menghapus titik temu COD.

---

## 6. Prinsip Desain UI & Penulisan Teks (Clean & Essential Rules)

1. **Dilarang Menambahkan Teks / Badge Basa-Basi yang Tidak Diminta**:
   - Dilarang keras menyisipkan stempel slogan seperti `✓ Terlindungi Rekber TryPedia`, slogan toko, atau teks dekorasi berlebih di kartu pesanan, total pembayaran, atau komponen dashboard.
   - Fokus hanya pada informasi fungsional esensial: No. Pesanan, Detail Produk, Harga/Total Pembayaran, Jadwal/Lokasi, Status, Hitungan Mundur, dan Tombol Aksi.

2. **Ringkas, Presisi & To-The-Point**:
   - Label status harus singkat (misal: `Sedang Disewa`, bukan `Sedang Disewa (Masa Coba)`).
   - Pemilihan ikon harus relevan secara semantik (gunakan `Timer` untuk sewa/durasi, `Calendar` untuk jadwal pertemuan, `CheckCircle2` untuk selesai, hindari ikon tidak relevan seperti `Sparkles`).

3. **Fokus pada Fitur Inti**:
   - Jangan menambahkan tombol switch cepat, banner dekoratif tambahan, atau teks penjelasan panjang yang tidak diminta pengguna.

