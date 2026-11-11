<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:trypedia-rules -->

# TRYPEDIA — MASTER SYSTEM GUIDELINES & AGENT SPECIFICATIONS

Dokumen ini adalah pedoman arsitektur, desain, aturan bisnis, dan tata kelola kode definitif untuk platform **TryPedia**. Seluruh AI agent, pengembang, dan subagent yang berkontribusi pada repository ini **WAJIB MEMATUHI 100% ATURAN DI BAWAH INI TANPA PENYIMPANGAN, TANPA KOMPROMI, DAN TANPA ASUMSI PRIBADI**.

---

## 1. IDENTITAS & FILOSOFI BISNIS INTI TRYPEDIA

### 1.1 Hakikat Platform
TryPedia adalah **Marketplace C2C/B2C Jual-Beli & Sewa Barang Bekas Berkualitas (Second/Pre-loved)** dengan standar fungsionalitas dan estetika sekelas marketplace profesional modern terkemuka (seperti **Tokopedia**).

### 1.2 Diferensiasi Utama (The Only Core Differentiation)
**TryPedia memiliki TEPAT SATU perbedaan fundamental dari marketplace e-commerce pada umumnya**:
> **"Coba Dulu Sebelum Beli (Rent-to-Own / Sewa-Milik)"**
> 
> Pada tahap awal, pembeli diberikan kebebasan memilih untuk **Sewa Terlebih Dahulu** sebelum memutuskan membeli barang secara permanen.
> 
> Apabila pembeli menyewa barang tersebut dan kemudian merasa cocok serta ingin memilikinya, maka **seluruh uang sewa yang telah dibayarkan akan langsung memotong sisa harga beli produk** (`Sisa Bayar Beli = Harga Beli Penuh - Total Uang Sewa`).

### 1.3 Kesamaan dengan Marketplace Konvensional
**SELAIN FITUR SEWA-MILIK TERSEBUT, SELURUH MEKANISME LAINNYA ADALAH SAMA PERSIS SEPERTI MARKETPLACE PADA UMUMNYA (TOKO-PEDIA STYLE)**:
- Etalase dan katalog produk publik yang rapi, bersih, dan informatif.
- Fitur pencarian produk, filter kategori, dan sortir.
- Keranjang belanja (*cart*) dan halaman checkout transparan.
- Chat langsung (*direct messaging*) antar pembeli dan penjual berbasis order & produk.
- Manajemen toko penjual (*seller dashboard*): kelola pesanan, katalog produk, etalase, dan profil toko.
- Sistem keamanan transaksi rekber (*escrow*) berbasis Cash on Delivery (COD) serah-terima fisik di area Jember.

---

## 2. MEKANISME SEWA-MILIK (RENT-TO-OWN) SECARA MENDALAM

### 2.1 Pilihan Opsi Transaksi
Pada setiap produk di etalase, pembeli memiliki 2 opsi transaksi yang tegas:
1. **Sewa Sekarang**:
   - Pembeli memilih paket durasi sewa yang tersedia: **1 Hari**, **3 Hari**, atau **7 Hari**.
   - Biaya yang dibayar saat checkout adalah biaya sewa paket durasi yang dipilih (ditambah deposit jaminan yang akan kembali).
2. **Beli Sekarang**:
   - Pembeli langsung membeli produk secara penuh dengan `Harga Beli Penuh` seperti belanja biasa di marketplace e-commerce.

### 2.2 Rumus Kalkulasi Pemotongan Biaya Sewa-Milik
Setiap transaksi sewa yang sedang aktif memiliki status hak sewa-milik otomatis:
$$\text{Sisa Bayar Beli} = \max(0, \text{Harga Beli Penuh} - \text{Total Biaya Sewa yang Telah Dibayar})$$

**Contoh Riil**:
- Sepatu New Balance 2022R memiliki `Harga Beli Penuh = Rp 1.450.000`.
- Pembeli memilih opsi sewa 3 Hari dengan biaya sewa `Rp 84.000`.
- Saat masa sewa berjalan, jika pembeli memutuskan untuk membeli permanen:
  $$\text{Sisa Bayar Beli} = \text{Rp } 1.450.000 - \text{Rp } 84.000 = \text{Rp } 1.366.000$$
- Pembeli cukup membayar sisa `Rp 1.366.000` tanpa kehilangan uang sewa yang telah dikeluarkan sebelumnya.

### 2.3 Skenario Akhir Masa Sewa
Ketika durasi sewa berakhir, terdapat tepat dua skenario:
1. **Lanjut Beli (Sewa-Milik)**: Pembeli membayar sisa harga beli, status pesanan menjadi `SELESAI_DIBELI`, dan hak milik produk berpindah 100% ke pembeli.
2. **Kembalikan Barang**: Pembeli tidak ingin membeli permanen. Produk dikembalikan kepada penjual via titik temu COD resmi toko. Penjual memverifikasi kondisi barang fisik, melepaskan uang deposit pembeli, dan status pesanan menjadi `SELESAI_DIKEMBALIKAN`.

---

## 3. ATURAN MUTLAK ANTI "AI SLOP" (STRICT NEGATIVE CONSTRAINTS)

AI Slop adalah segala bentuk teks dekoratif palsu, penjelasan meta yang membodohi pengguna, elemen antarmuka yang tidak diminta, dan inkonsistensi visual yang merusak kesan profesionalitas web. **DILARANG KERAS MELAKUKAN HAL-HAL BERIKUT**:

### 3.1 Dilarang Menampilkan Teks Meta / Komentar Teknis pada UI
- **DILARANG** menampilkan teks penjelas seperti: `(*Tarif 3h & 7h auto-kalkulasi)`, `(Masa Coba)`, `(Fitur Otomatis)`, atau pesan sistem yang membongkar logika backend ke layar pengguna.
- Logika kalkulasi (misalnya auto-kalkulasi tarif 3 hari dan 7 hari di background) harus berjalan tenang, elegan, dan senyap tanpa perlu mencantumkan teks keterangan di layar.
- **DILARANG** menampilkan kotak peringatan / teks meta berulang yang membongkar alur teknis backend pada modal dialog (seperti `Konfirmasi Pengembalian Dana (100% Refund)` atau penjelasan alur saldo dompet). Modal aksi keputusan wajib bersih, ringkas, dan langsung berfokus pada formulir pilihan keputusan pengguna.

### 3.2 Dilarang Memodifikasi / Menambahi Nilai Data Baku (Strict Value Integrity)
- Jika nilai data yang ditentukan adalah `"Seperti Baru"`, maka teks yang ditampilkan di dropdown, badge, maupun tabel adalah **TEPAT `"Seperti Baru"`**.
- **DILARANG KERAS** menambahkan frasa embel-embel seperti:
  - ❌ `Seperti Baru (Mulus 95%+, Tanpa Cacat)`
  - ❌ `Baik (Fungsi Normal, Lecet Halus Pemakaian)`
  - ❌ `Cukup Baik (Fungsi Normal, Terlihat Bekas Pakai)`
- Gunakan teks nilai data murni yang ringkas:
  - ✅ `Seperti Baru`
  - ✅ `Baik`
  - ✅ `Cukup Baik`

### 3.3 Dilarang Mengisi Form Baru dengan Nilai Dummy / Preset (Zero Fake Defaults)
- Ketika pengguna menekan tombol **+ Tambah Produk** atau membuka modal input baru, seluruh kolom isian harga, nama, dan deskripsi **WAJIB KOSONG** (`""`).
- **DILARANG** mengisi default input angka dengan angka pura-pura (`30000`, `84000`, `174000`, `1450000`). Form baru harus bersih, siap diketik dari nol oleh penjual.
- Placeholder hanya boleh berupa angka nol netral (`placeholder="0"`) atau contoh teks panduan halus (`placeholder="Contoh: Sepatu Adidas Samba OG"`).

### 3.4 Dilarang Menambahkan Stempel & Slogan Basa-Basi
- **DILARANG KERAS** menyisipkan stempel berulang seperti:
  - ❌ `✓ Terlindungi Rekber TryPedia`
  - ❌ `100% Transaksi Aman & Terpercaya`
  - ❌ `Jaminan Uang Kembali Garansi Resmi`
  - ❌ Tagline promosi toko berulang di kartu barang atau ringkasan checkout.
- Tampilan harus mengedepankan informasi murni: Nama Produk, Harga Riil, Durasi, Lokasi COD, Status, dan Tombol Tindakan.

### 3.5 Dilarang Menggunakan Palet Warna Pelangi Acak
- **DILARANG** memberi warna badge sesuka hati (misalnya: status A diberi biru, status B diberi oranye, status C diberi kuning neon).
- Semua badge status atau nilai kondisi barang wajib menggunakan gaya netral elegan atau palet brand monokromatis yang konsisten:
  - Badge kondisi: Abu-abu netral berbingkai (`bg-gray-100 text-gray-700 border border-gray-200 font-semibold px-2 py-0.5 rounded-md`).
  - Aksi utama & highlight brand: Hijau Tokopedia (`#03AC0E`).

### 3.6 Dilarang Menampilkan Simbol Ganda / Redundan pada Tombol (Strict Zero Redundant Symbols)
- **DILARANG KERAS** menduplikasi simbol atau karakter pada tombol (misalnya sudah ada ikon grafis SVG `<Plus />`, tetapi teks di sebelahnya masih diawali tanda `+`).
- Contoh Kesalahan Fatal yang Dilarang:
  - ❌ `<Plus /> <span>+ Upload Produk Baru</span>` (Tampil di UI menjadi `+  + Upload Produk Baru`)
  - ❌ `<Plus /> <span>+ Tambah Titik Temu</span>` (Tampil di UI menjadi `+  + Tambah Titik Temu`)
  - ❌ `<Plus /> <span>+ Isi Saldo</span>`
  - ❌ `<Check /> <span>✓ Konfirmasi</span>`
- Standar Penerapan yang Benar:
  - ✅ `<Plus className="w-4 h-4" /> <span>Upload Produk Baru</span>`
  - ✅ `<Plus className="w-4 h-4" /> <span>Tambah Titik Temu</span>`
  - ✅ `<span>Top Up Saldo</span>` atau `<Plus className="w-4 h-4" /> <span>Top Up Saldo</span>`
  - ✅ `<span>Tambah Foto</span>`

### 3.7 Tata Letak Tombol Keputusan Berdampingan & Anti-Awkward Wrap (Side-by-Side Decision Actions)
- **DILARANG KERAS** membiarkan tombol keputusan (seperti `Tolak Pesanan` dan `Konfirmasi Pesanan`) terlempar atau terbungkus (*wrapped*) secara canggung ke baris baru di bawah tombol lain.
- Pasangan tombol aksi keputusan transaksi WAJIB ditata **BERDAMPINGAN SECARA HORIZONTAL (SIDE-BY-SIDE)** dalam satu baris yang sejajar dan simetris (`flex items-center gap-2 shrink-0`).
- Tombol utilitas komunikasi (`Chat Pembeli`) diposisikan di sisi kiri footer kartu pesanan, sedangkan pasangan tombol keputusan (`Tolak Pesanan` [outline merah] dan `Konfirmasi Pesanan` [hijau primer]) diposisikan berdampingan di sisi kanan footer.
- Penamaan tombol keputusan wajib ringkas dan to-the-point:
  - ✅ `Konfirmasi Pesanan`
  - ❌ `Konfirmasi Pesanan & Jadwal` (terlalu panjang sehingga berisiko wrap dan membuat layout canggung)

### 3.8 Dilarang Menampilkan Informasi Status / Countdown Ganda (Single Source of Truth)
- Informasi status pesanan dan durasi hitungan mundur sisa masa sewa (`Sedang Disewa • Sisa: ...`) **HANYA BOLEH TAMPIL TEPAT SATU KALI**, yaitu pada **Badge Header Kartu Pesanan** di sudut kanan atas header.
- **DILARANG KERAS** menambahkan kartu/banner/kotak sorotan (*highlight box*) countdown tambahan di dalam isi (*body*) kartu pesanan yang mengulang teks hitungan mundur atau durasi hari.
- Tampilan isi kartu pesanan wajib bersih, ringkas, dan fokus: hanya foto produk, nama produk, badge tipe sewa & metode bayar, serta rincian lokasi dan jadwal COD.

---

## 4. DESIGN SYSTEM & ESTETIKA VISUAL RESMI TRYPEDIA

TryPedia mengadopsi standar desain *clean, modern, minimalist e-commerce* dengan referensi visual Tokopedia:

| Elemen Desain | Standar Resmi | Contoh Penerapan |
| :--- | :--- | :--- |
| **Warna Primer Brand** | Hijau Tokopedia (`#03AC0E`) | Tombol aksi utama, tab aktif, ikon aktif |
| **Warna Hover Primer** | Hijau Tua (`#02980C`) | Keadaan hover pada tombol primer |
| **Warna Tint / Background Halus** | Hijau Pucat (`#EBF8EE`) | Kontainer ringkasan sewa, kartu aktif |
| **Warna Teks Utama** | Abu Gelap Pekat (`#111827` / `text-gray-900`) | Judul produk, nominal harga, label tebal |
| **Warna Teks Sekunder** | Abu Netral (`#4B5563` / `text-gray-600` / `text-gray-500`) | Deskripsi, keterangan waktu, label non-aktif |
| **Warna Garis Pembatas (Border)** | Abu Halus (`#E5E7EB` / `border-gray-200`) | Kartu produk, pembatas tabel, input box |
| **Warna Permukaan (Surface)** | Putih Murni (`#FFFFFF`) | Kartu, modal dialog, background navbar |
| **Radius Sudut Elemen** | Rounded Modern (`rounded-xl` / `rounded-2xl`) | Card (2xl), Button (xl), Input (xl), Badge (md) |
| **Efek Bayangan (Shadow)** | Subtle Elevation (`shadow-2xs`, `shadow-xs`, `shadow-sm`) | Hindari shadow hitam pekat berlebihan |

---

## 5. STRUKTUR & PERILAKU HALAMAN (PAGE-BY-PAGE RULES)

### 5.1 Aturan Header Global
1. **Halaman Beranda (`/`)**:
   - Menampilkan Logo TryPedia di kiri.
   - Menampilkan Search Box (pencarian produk) di tengah.
   - Menampilkan Baris Atur Lokasi / Radius COD di bawah baris pencarian.
   - Menampilkan Saldo Dompet, Koin, Ikon Pesan, Ikon Notifikasi, Keranjang, dan Menu Profil Pengguna di kanan.
2. **Halaman Non-Beranda (`/chat`, `/seller`, `/orders`, `/wallet`, `/coins`, `/settings`, `/checkout`, `/products/[id]`)**:
   - **TAMPILAN RINGKAS & BERSIH (`justify-between`)**:
     - Kiri: Hanya Logo TryPedia (dengan tautan kembali ke `/`).
     - Kanan: Menu Saldo Dompet, Koin, Keranjang, dan Dropdown Profil Pengguna.
   - **DILARANG KERAS** memunculkan search box atau pemilih lokasi radius di halaman non-beranda.

### 5.2 Satu Tempat Resmi Tombol "Keluar Akun" (Logout)
- Tombol **Keluar Akun (Logout)** HANYA ADA DI SATU TEMPAT RESMI di seluruh aplikasi: yaitu di dalam **Menu Dropdown Profil Pengguna pada Header**.
- **DILARANG KERAS** menaruh tombol logout duplikat di sidebar manajemen toko, di footer, di kartu profil, atau di halaman lain.

### 5.3 Kebijakan Transisi Halaman (Zero Blank-State Policy)
- Ketika berpindah halaman, pengguna tidak boleh melihat layar putih kosong sesaat (*zero blank-state*).
- Gunakan React `startTransition` untuk menahan tampilan halaman aktif saat ini sampai data dan komponen halaman tujuan siap ditampilkan.
- **Indikator Loading**: Hanya boleh menggunakan **garis progress bar hijau di puncak paling atas layar (*top progress bar*)**.
- **DILARANG** membuat floating box atau badge loading animasi di sudut kanan/kiri bawah layar.

### 5.4 Halaman Detail Produk (`/products/[id]`)
- **Kolom Kiri**: Galeri foto produk (foto utama resolusi tinggi + strip thumbnail clickable hingga 5 foto).
- **Kolom Tengah**:
  - Judul produk, rating toko, ulasan.
  - Komparasi harga: Sewa harian vs Beli penuh.
  - Kartu profil penjual resmi Jember (nama toko, lokasi, jam operasional).
  - Spesifikasi produk: Hanya memuat **Kategori** dan **Kondisi Barang** (menggunakan badge abu-abu netral). **TIDAK ADA TABEL UKURAN**.
  - Deskripsi produk & kelengkapan paket unit.
- **Kolom Kanan (Sticky Action Card)**:
  - Tab pilihan: **Sewa Sekarang** vs **Beli Sekarang**.
  - Jika Sewa: Pilihan paket durasi (1 Hari, 3 Hari, 7 Hari) dengan harga riil masing-masing paket.
  - Ringkasan total biaya.
  - Kotak simulasi Sewa-Milik yang menghitung sisa bayar beli permanen secara transparan.
  - Tombol CTA `Lanjut`.

### 5.5 Halaman Checkout (`/checkout`)
- Menampilkan rincian pesanan (produk, kondisi barang, paket durasi, total bayar).
- Pilihan metode pengiriman: **COD di Titik Temu Resmi Toko**.
- Pilihan titik temu dari daftar lokasi yang disediakan oleh penjual (maksimal 5 titik).
- Rincian metode pembayaran rekber (Saldo Dompet TryPedia, Transfer Virtual Account, atau QRIS).

### 5.6 Halaman Pesanan Pembeli (`/orders`)
- Menampilkan daftar transaksi yang dikelompokkan berdasarkan tab status:
  - `Menunggu Konfirmasi`
  - `Jadwal COD`
  - `Sedang Disewa` *(Gunakan istilah singkat ini, BUKAN 'Sedang Disewa (Masa Coba)')*
  - `Selesai`
- Kartu pesanan bersih tanpa teks dekoratif, menampilkan: No. Pesanan, Nama Toko, Tanggal, Item Produk, Total Bayar, Lokasi COD, dan Tombol Aksi relevan (Chat Penjual, Lihat PIN COD, atau Lanjut Beli Permanen).

### 5.7 Halaman Chat Antar Pengguna (`/chat`)
- Percakapan langsung real-time antar akun pengguna (pembeli & penjual).
- Bilah kiri: Daftar kontak percakapan yang aktif beserta indikator pesan belum dibaca.
- Bilah kanan: Jendela obrolan dengan kartu sematan pesanan terkait di bagian atas obrolan.

---

## 6. STANDAR FORM PRODUK & ETALASE SELLER

### 6.1 Hapus Total Tabel / Inputan Ukuran & Spesifikasi
- **TIDAK ADA** kolom ukuran (sepatu, pakaian, dimensi) di form tambah/edit produk maupun di tampilan detail produk.
- Produk diidentifikasi melalui Nama, Kategori, Kondisi Fisik Barang, Foto, dan Deskripsi.

### 6.2 Dropdown Kondisi Barang (Strict 3 Options)
Pilihan kondisi barang pada form seller dan penyimpanan database hanya terdiri dari 3 opsi baku:
1. `Seperti Baru`
2. `Baik`
3. `Cukup Baik`

### 6.3 Skema Tarif Sewa Berjenjang & Harga Beli Penuh
Form produk menyediakan 4 input angka:
1. **Sewa 1 Hari (Rp)**: Tarif dasar sewa harian.
2. **Sewa 3 Hari (Rp)**: Tarif sewa paket 3 hari (dihitung otomatis ~2.8x tarif 1 hari saat penjual mengetik tarif 1 hari, namun dapat disesuaikan bebas oleh penjual).
3. **Sewa 7 Hari (Rp)**: Tarif sewa paket 7 hari (dihitung otomatis ~5.8x tarif 1 hari saat penjual mengetik tarif 1 hari, namun dapat disesuaikan bebas oleh penjual).
4. **Harga Beli Penuh (Rp)**: Harga jual langsung produk jika pembeli ingin membelinya permanen.

- **Format Pemisah Ribuan (Thousand Separator Titik)**:
  - Seluruh input nominal harga WAJIB diformat dengan tanda titik pemisah ribuan standar Indonesia secara real-time saat penjual mengetik (contoh: `30.000`, `84.000`, `174.000`, `1.450.000`).
  - Menggunakan input bertipe teks numerik (`type="text" inputMode="numeric"`) tanpa atribut pembatas `step` HTML5, sehingga penjual bebas memasukkan nominal harga berapa pun tanpa terhalang tooltip error bawaan browser (*"Please enter a valid value"*).
  - Saat disimpan ke backend/database, nilai titik dibersihkan secara otomatis (`parseRawPrice`) dan disimpan sebagai angka numerik murni.

### 6.4 Upload Foto Produk (Wajib, Maksimal 5 Foto)
- Label form: `Foto Produk: *` (tanpa kata tambahan "Real").
- Minimal 1 foto wajib diunggah sebelum produk dapat disimpan.
- Menggunakan input file riil dari perangkat pengguna (`<input type="file" accept="image/*" multiple>`).
- Mendukung konversi gambar lokal ke Data URL (Base64) dan disimpan ke array JSONB pada PostgreSQL.
- Menampilkan grid pratinjau thumbnail:
  - Foto ke-1 diberi tanda badge `Utama` (otomatis menjadi foto etalase muka).
  - Tombol hapus (`X`) merah di pojok kanan atas tiap thumbnail foto.
  - Tombol slot `+ Tambah Foto (x/5)` muncul jika jumlah foto masih di bawah 5.
  - Maksimal tepat 5 foto per produk.

### 6.5 Sinkronisasi Dua Arah ke Database PostgreSQL
- Setiap produk yang diunggah atau diedit melalui dashboard penjual (`/seller`) wajib disimpan ke tabel `products` pada database PostgreSQL `trypedia_db`.
- Perubahan pada kondisi barang, harga, foto, atau status stok penjual **WAJIB LANGSUNG TERCERMIN SEKETIKA** pada:
  - Halaman Beranda (`/`)
  - Halaman Detail Produk (`/products/[id]`)
  - Halaman Checkout (`/checkout`)

### 6.6 Hak Penjual Menolak Pesanan & Batas Waktu Konfirmasi 24 Jam
- Pada tab Pesanan Toko (`Perlu Konfirmasi`), penjual memiliki hak penuh untuk memilih antara menyetujui pesanan atau **Menolak Pesanan** (`Tolak Pesanan`).
- **Opsi Alasan Penolakan Baku (Tepat 4 Pilihan)**:
  1. `Barang belum siap disewa`
  2. `Kendala operasional toko`
  3. `Jadwal tidak memungkinkan`
  4. `Alasan lainnya` (wajib memunculkan textarea bagi penjual untuk menuliskan alasan kustom).
- **Pengembalian Dana Otomatis (100% Refund)**:
  - Jika pesanan ditolak oleh penjual, sistem **WAJIB MENGEMBALIKAN DANA PEMBELI 100% SECARA OTOMATIS KE SALDO DOMPET TRYPEDIA PEMBELI** (`user_wallets` dan mutasi transaksi `wallet_transactions` tipe `REFUND`).
  - Status pesanan otomatis berubah menjadi `DIBATALKAN`, alasan penolakan dicatat (`cancellation_reason`), dan stok produk dipulihkan (`stock = 1`).
  - Pada halaman pesanan pembeli (`/orders`), pesanan berpindah ke tab `Dibatalkan` dengan notifikasi transparan bahwa pesanan ditolak dan dana telah dikembalikan 100% ke saldo dompet.
- **Batas Waktu Konfirmasi Penjual Maksimal 1 Hari (24 Jam)**:
  - Pesanan baru pada status `Perlu Konfirmasi` (`SEDANG_DIKEMAS`) memiliki batas waktu konfirmasi maksimal 24 jam sejak pesanan dibuat (`createdAt`).
  - Header kartu pesanan menampilkan hitungan mundur batas waktu konfirmasi (`Batas: Xj Xm Xd`) pada sisi penjual dan pembeli.
  - Jika melewati batas 24 jam tanpa konfirmasi dari penjual, sistem membatalkan pesanan secara otomatis (`DIBATALKAN`) dan mengembalikan dana 100% ke saldo dompet pembeli, sehingga dana pembeli tidak tertahan akibat penjual tidak aktif/offline.

### 6.7 Prinsip Pemisahan Finansial: Tampilan Total Pendapatan Penjual (Bukan Total Pembayaran Pembeli)
- Kartu pesanan pada dashboard penjual (`/seller`) **DILARANG** menampilkan label `"Total Pembayaran: Rp ..."` yang mencampuradukkan biaya admin, asuransi, dan layanan platform.
- Penjual **HANYA BERHAK** atas pendapatan murni produk: yaitu biaya paket sewa atau harga beli produk. Biaya layanan rekber platform, ongkos kirim/asuransi adalah hak operasional platform (admin).
- Tampilan kartu pesanan pada dashboard penjual **WAJIB MENAMPILKAN**:
  - Label: **`Total Pendapatan:`**
  - Nominal: **Murni `seller_income` (Biaya Paket Sewa atau Harga Beli Produk)**.
  - Sub-keterangan: Jenis transaksi (misal: `(Sewa 3 Hari)` atau `(Harga Beli Produk)`).

### 6.8 Input Dinamis Kelengkapan Paket (Dynamic Package Includes List)
- Form tambah dan edit produk (`/seller`) wajib menyediakan input dinamis untuk **Kelengkapan Paket**:
  - Kolom input teks untuk mengetik item kelengkapan (misal: "Unit HP", "Ces / Charger", "Kabel Type-C", "Box Kemasan").
  - Tombol aksi `Tambah` dengan ikon `<Plus className="w-4 h-4" />` (tanpa simbol `+` dobel) untuk memasukkan item ke daftar.
  - Setiap item kelengkapan yang ditambahkan tampil sebagai tag/chip rapi dengan tombol silang (`X`) untuk menghapus item.
  - Disimpan ke kolom `package_includes` (JSONB) pada database PostgreSQL dan disinkronisasikan langsung ke halaman detail produk (`/products/[id]`).
  - Untuk form produk baru, daftar kelengkapan paket wajib dimulai dari kosong (`[]`) tanpa preset dummy (Zero Fake Defaults).

### 6.9 Kewajiban Input Data Produk (Mandatory Fields)
- Kolom **Foto Produk** (minimal 1 foto), **Kelengkapan Paket** (minimal 1 item), dan **Deskripsi Produk** berstatus **WAJIB DIISI** (`required`).
- Penamaan label formulir menggunakan istilah ringkas baku: `Foto Produk:`, `Kelengkapan Paket:`, dan `Deskripsi Produk:` dengan tanda bintang merah (`*`).

### 6.10 Penyelarasan Nama Toko Otomatis dengan Profil Akun (Profile-Synced Store Identity)
- Nama toko secara otomatis mengikuti nama identitas pada profil akun pengguna (`user.name`), bukan diatur terpisah.
- Pada tab **Pengaturan Toko** (`/seller`), **DILARANG KERAS** menyediakan kolom inputan ubah nama toko secara mandiri/duplikat.
- Pengaturan toko hanya berfokus pada **Jam Operasional Layanan** dan **Deskripsi Lengkap Toko**.
- Di seluruh halaman aplikasi (Halaman Detail Produk, Keranjang, Checkout, Chat, dan Pesanan), nama penjual dan toko wajib tersinkronisasi 100% secara real-time dengan nama profil akun pengguna.

### 6.11 Larangan Bertransaksi pada Produk Milik Sendiri (Strict Zero Self-Purchase / Self-Cart for Owner)
- Jika pengguna yang sedang masuk (login) membuka halaman detail produk miliknya sendiri (`isOwner` / barang yang ia unggah sendiri):
  - **DILARANG KERAS** menampilkan tombol `Masukkan ke Keranjang` di bawah gambar produk.
  - **DILARANG KERAS** menampilkan widget transaksi sewa/beli pelanggan (`Sewa Sekarang`, `Beli Sekarang`, `Lanjut Sewa`, `Lanjut Beli`) di kolom kanan.
  - **WAJIB DIGANTI** dengan antarmuka manajemen pemilik produk:
    - Di bawah foto produk: Tombol `Edit Produk Ini` (`/seller?tab=products&edit=${product.id}`).
    - Di kolom kanan (Sticky Action Card): **Owner Management Card ("Produk Toko Anda")** yang menampilkan status etalase aktif/habis, kondisi fisik, kategori, daftar tarif sewa & beli aktif, serta tombol utama `Edit Informasi Produk` (tanpa tombol `Buka Katalog Seller`).
    - Di kartu profil toko: Untuk `isOwner`, tombol `Chat Penjual` disembunyikan dan cukup menampilkan tombol **`Kunjungi Toko`** yang menuju halaman publik toko (`/store/${sellerId}`), tanpa tombol `Pengaturan Toko` maupun `Katalog Seller`.
- **Halaman Profil Publik Toko (`/store/[id]`)**:
  - Menampilkan header toko (foto, nama, lokasi, rating, jam operasional), tab `Beranda` / `Produk` / `Ulasan`, sidebar `Etalase Toko`, filter `Urutkan`, dan katalog produk milik toko.
  - **DILARANG** menampilkan tombol `Follow` untuk semua pengguna (sistem tidak memiliki fitur saling follow).
  - Apabila pemilik toko (`isOwner`) membuka halaman tokonya sendiri, tombol **`Chat Penjual`** wajib disembunyikan.

### 6.12 Kalkulasi Jarak Real-Time Dinamis Berbasis Koordinat GPS / OpenStreetMap (OSM)
- Keterangan jarak toko penjual terhadap pengguna **DILARANG BERSIFAT STATIS ATAU HARDCODED** (seperti teks mati "1.2 km dari Anda").

### 6.13 Mekanisme Rating & Ulasan Produk Tokopedia-Style (Reviews System)
1. **Tata Letak Ulasan Publik (`/store/[id]?tab=ulasan` & `/products/[id]`)**:
   - **Sidebar Kiri (`Filter Ulasan`)**:
     - Accordion `Media`: Checkbox `Dengan Foto`.
     - Accordion `Rating`: Checkbox filter rating `★ 5` hingga `★ 1`.
     - Tombol `Reset Filter` otomatis muncul jika filter aktif.
   - **Feed Kanan (`Ulasan Pilihan`)**:
     - Header: Judul `ULASAN PILIHAN`, sub-teks jumlah ulasan (`Menampilkan X dari Y ulasan`), dan dropdown sortir (`Terbaru`, `Rating Tertinggi`, `Rating Terendah`, `Paling Membantu`).
     - Setiap item ulasan menampilkan: Nama reviewer tersensor standar Tokopedia (`HurufAwal***HurufAkhir`, contoh: `Raka Pratama` -> `R***a`), bintang rating, tanggal relatif (`Hari ini`, `1 hari lalu`, dsb), teks ulasan pembeli, thumbnail galeri foto (maksimal 3 foto) dengan modal lightbox pembesar saat diklik, dan tombol interaktif `Membantu` (menambah hitungan count dan persist ke PostgreSQL).
2. **Alur Pemberian Ulasan Pesanan (`/orders`)**:
   - Pengguna hanya berhak memberikan ulasan pada pesanan yang telah berstatus `SELESAI` (`order.status === "SELESAI"`).
   - Satu pesanan hanya dapat diulas tepat satu kali (`reviews_order_id_unique_idx`). Pesanan yang sudah diulas menampilkan badge `Sudah Diulas`.
   - Tombol **`Beri Ulasan`** membuka modal dialog:
     - Kartu ringkasan produk (foto, nama, toko).
     - Penilaian bintang interaktif (1 s/d 5) dengan hover state dan label kepuasan.
     - Kolom `Deskripsi Ulasan: *` (textarea wajib diisi).
     - Input `Foto Produk:` (opsional, maksimal 3 foto) dengan preview thumbnail dan tombol hapus (`X`).
3. **Penyelesaian Transaksi Sewa di Dashboard Seller (`/seller`)**:
   - Pada tab pesanan `DISEWA`, kartu pesanan menyediakan tombol tindakan **`Selesaikan Peminjaman`**.
   - Menekan tombol ini mengubah status pesanan menjadi `SELESAI` via `PATCH /api/seller/orders` (`action: "COMPLETE"`), mencairkan dana sewa ke Dompet Toko penjual, dan mengaktifkan hak pembeli untuk memberikan ulasan di halaman `/orders`.
4. **Agregasi Rating Otomatis**:
   - Setiap kali ulasan baru diterbitkan atau diubah, sistem secara otomatis menghitung rata-rata rating produk (`products.rating`, `products.review_count`, `products.rent_count`) dan rating toko (`stores.rating`) secara konsisten.
- **Sumber Lokasi Penjual**: Koordinat lokasi toko WAJIB diambil dari **Alamat Toko yang ditetapkan seller pada Pengaturan Profil** (`user_addresses` dengan `is_shop_address = true`, fallback ke `is_primary = true`), bukan dari daftar titik COD (`seller_cod_locations`). Penambahan atau perubahan alamat di `/settings` wajib menyimpan koordinat nyata dari pin peta OSM / geocoding Nominatim (dilarang hardcode koordinat statis).
- Sistem menghitung jarak secara dinamis menggunakan formula Haversine berdasarkan koordinat posisi pengguna saat ini (`trypedia_user_coords` dari `Deteksi GPS` / pin peta OSM) terhadap koordinat **Alamat Toko** penjual.
- Modal **Lokasi Saya & Radius Pencarian COD** (`LocationModal`) hanya menyediakan kontrol **`Deteksi GPS`** dan pin peta OSM (tanpa tombol `Alamat Utama` di modal), dengan 4 pilihan radius: **`2 Km`**, **`5 Km`**, **`10 Km`**, dan **`Seluruh Jember`** (menampilkan seluruh produk yang alamat toko penjualnya terdaftar di Kabupaten Jember).
- Apabila pengguna yang sedang membuka produk adalah pemilik toko itu sendiri (`isOwner`), keterangan jarak wajib menampilkan status: **`(Lokasi Toko Anda)`**.

---

## 7. SISTEM COD & REKBER ESCROW DI AREA JEMBER

Untuk memastikan keamanan transaksi barang bekas, TryPedia menggunakan model **Rekber COD Berbasis PIN Verifikasi**:
1. Pembeli melakukan pembayaran ke rekening penampungan rekber TryPedia saat checkout.
2. Penjual mengonfirmasi ketersediaan barang dan menyepakati salah satu titik temu COD resmi.
3. Pembeli dan penjual bertemu di titik temu yang disepakati di area Jember.
4. Pembeli memeriksa kondisi fisik barang secara langsung.
5. Jika barang sesuai deskripsi, pembeli memberikan **PIN 6 Digit Serah-Terima** kepada penjual untuk diinput ke sistem.
6. Input PIN yang valid secara otomatis menandai serah-terima sukses dan mencairkan uang transaksi sesuai alur rekber.
7. **Titik Temu COD Penjual**: Setiap toko dapat mendaftarkan **maksimal 5 titik temu strategis** (misal: Area UNEJ, Alun-Alun Jember, dsb).

---

## 8. SPESIFIKASI TEKNIS & DATABASE

### 8.1 Database: PostgreSQL (`trypedia_db` pada `localhost:5432`)
- **Tabel `products`**:
  - `id`: Text (Primary Key)
  - `seller_id`: Text (Foreign Key ke `stores.user_id`)
  - `seller_name`: Text
  - `name`: Text
  - `category`: Text
  - `image`: Text (Foto utama `/api/media/...`)
  - `images`: JSONB (Array string URL media terkompresi `/api/media/...` hingga 5 foto; hindari Base64 mentah)
  - `condition`: Text (`Seperti Baru`, `Baik`, `Cukup Baik`)
  - `rent_price_daily`: Numeric(15, 2)
  - `rent_price_3d`: Numeric(15, 2)
  - `rent_price_7d`: Numeric(15, 2)
  - `buy_price`: Numeric(15, 2)
  - `stock`: Integer (1 atau 0)
  - `description`: Text
  - `features`: JSONB
  - `package_includes`: JSONB
- **Tabel `stores`**: Profil toko, jam operasional, alamat.
- **Tabel `seller_locations`**: Daftar titik temu COD toko (maksimal 5 lokasi per seller).
- **Tabel `orders`**: Catatan transaksi, status sewa/beli, PIN serah-terima, tanggal sewa.
- **Tabel `chat_messages`**: Riwayat percakapan antar pengguna.

### 8.2 Arsitektur Performa Nol-Delay (SSR-First & Eksternalisasi Media)
1. **SSR-First Data Injection (`force-dynamic`)**: Seluruh halaman (`src/app/**/page.tsx`) wajib berbentuk Next.js Server Component yang mengambil data riil langsung dari PostgreSQL melalui `src/lib/queries/marketplace.ts` + `src/lib/server-auth.ts`, lalu mengirimkannya sebagai `initial*` props ke `*Client.tsx`. **DILARANG KERAS** menginisialisasi state dengan data dummy (`PRODUCTS[0]`, `"Sneaker Zone Jember"`, saldo/koin palsu) yang menyebabkan *layout flashing* sebelum API selesai.
2. **Eksternalisasi Media (`/api/media/...`)**: **DILARANG KERAS** menyimpan string Base64 mentah ke tabel PostgreSQL (`products`, `users`, `stores`, `user_addresses`, `orders`) maupun ke cookie HTTP (`trypedia_auth_user`). Unggahan gambar dari browser wajib dikompres ke WebP (`src/lib/client-image.ts`) dan diunggah ke disk `storage/media/` via `/api/media/upload`, disajikan kembali dengan cache imutabel via `/api/media/[...path]`.
3. **Zero N+1 & Per-User Cache Isolation**: `ProductCard` wajib memakai nilai `stock` dan `isStockLocked` yang sudah dihidrasi dari server tanpa memicu `fetch("/api/products/stock")` massal saat mount. Seluruh cache memori di sisi klien wajib di-key per `userId`, dan sinkronisasi header saldo/koin menggunakan endpoint ringan `?summary=1`.

---

## 9. PROTOKOL KUALITAS KODE BAGI PENGEMBANG & AI AGENT

Sebelum menyerahkan pekerjaan atau membalas instruksi pengguna, pastikan selalu:
1. **Verifikasi Bebas Eror Tipe**: Jalankan `npx tsc --noEmit` dan pastikan hasil exit code 0 (zero errors).
2. **Uji Real-World Scenario**: Pastikan data form baru selalu kosong, tidak ada tulisan meta teknis di UI, tidak ada warna pelangi acak, dan alur sewa-ke-beli terhubung mulus.
3. **Respon Lugas & To-The-Point**: Jawab pertanyaan pengguna secara ringkas, profesional, langsung pada solusi tanpa basa-basi berulang.

<!-- END:trypedia-rules -->
