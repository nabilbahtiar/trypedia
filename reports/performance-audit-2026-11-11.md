# Audit performa dan kesiapan deployment TryPedia

Tanggal: 11 November 2026. Lingkungan: Windows lokal, Next.js 16.4.5, React 19.3, PostgreSQL lokal. Dataset saat pengujian: 12 produk, 15 pesanan, 15 akun.

## Kesimpulan

Stack TypeScript/JavaScript, Next.js, dan PostgreSQL dapat dipertahankan. Tidak ditemukan alasan dari pengukuran ini untuk menulis ulang aplikasi dalam bahasa lain. Penundaan beberapa detik saat pengembangan banyak terkait kompilasi development. Ada pula masalah frontend, pengambilan data berulang, dan kesiapan transaksi yang tetap perlu diperbaiki sebelum rilis publik.

Build production dari salinan source saat audit berhasil. Pengujian production memakai port 3001 dan direktori build terpisah; server development port 3000 tetap tersedia. Server audit sudah dihentikan setelah pengukuran. Tidak ada optimasi kode aplikasi yang diterapkan dalam audit ini.

## Pengukuran

Setiap route diakses sekali, kemudian lima kali secara berurutan. Angka median mengukur respons HTTP lengkap, bukan waktu halaman siap di browser. Termasuk rendering server dan transfer HTML/JSON ke klien Node di komputer yang sama; tidak mencakup unduhan seluruh gambar/JS, hydration, kecepatan ponsel, atau jaringan internet.

| Route | Development median | Production median |
| --- | ---: | ---: |
| Beranda | 146,9 ms | 26,2 ms |
| Detail sepatu | 86,3 ms | 30,7 ms |
| Toko Steven | 97,7 ms | 26,0 ms |
| Pesanan pembeli | 113,3 ms | 27,6 ms |
| Pesanan seller | 79,5 ms | 23,5 ms |
| Checkout | 104,6 ms | 42,4 ms |
| API katalog ringkas | 21,8 ms | 15,1 ms |

Akses pertama halaman toko saat audit development: 5.061,3 ms. Akses pertama toko di production: 58,2 ms. Angka pertama ini bergantung pada route yang sudah dikompilasi, cache, dan kondisi proses, sehingga bukan perbandingan cold start yang terkontrol. Akses pertama beranda production juga masih 554,5 ms.

Lima query SELECT kecil yang diuji lewat koneksi PostgreSQL yang sudah terbuka memiliki median round trip sekitar 0,2–0,8 ms. EXPLAIN ANALYZE menunjukkan waktu eksekusi sekitar 0,007–0,047 ms pada dataset ini. Database saat ini bukan penjelasan untuk delay beberapa detik; hasil ini belum membuktikan performa pada dataset besar atau database remote.

Uji burst singkat: 40 GET katalog per tingkat concurrency. Semua respons 200.

| Request bersamaan | Dev p95 | Production p95 |
| --- | ---: | ---: |
| 1 | 39,5 ms | 20,8 ms |
| 5 | 106,2 ms | 33,3 ms |
| 10 | 176,4 ms | 137,9 ms |
| 20 | 712,1 ms | 192,1 ms |

Ini bukan uji ribuan pengguna: satu endpoint baca, data sedikit, durasi pendek, satu komputer, tanpa browser atau transaksi pembayaran. RPS yang tercatat tidak boleh dianggap kapasitas produksi. LCP, INP, CLS, memori per pengguna, kapasitas write, dan perilaku transaksi bersamaan belum diukur.

Data mentah: `storage/performance/dev-baseline.json` dan `storage/performance/production-baseline.json`. Pengukuran dapat diulang dengan `node scripts/audit-performance.cjs <origin> <output.json>` pada server lokal/staging yang memang diizinkan untuk diuji. Script menciptakan sesi audit sementara untuk dua akun lokal, menghapus sesi itu setelah selesai, dan tidak mencetak token.

## Temuan kode dan urutan perbaikan

### 1. Selaraskan auth server dan browser

`src/context/AuthContext.tsx:88` membaca localStorage pada inisialisasi state, sedangkan render server tidak memiliki localStorage. Root layout belum mengirim user server ke AuthProvider. Log development mencatat hydration mismatch pada Header: server dan browser menghasilkan elemen yang berbeda. Dampaknya: render ulang bagian antarmuka, tampilan bergeser, dan pekerjaan browser tambahan. Besarnya kontribusi ke waktu klik belum diukur dengan browser profiler.

Perbaikan: jadikan sesi server sebagai state awal AuthProvider; data identitas dan saldo yang dihidrasi harus konsisten pada render pertama. Jangan menutup gejalanya dengan `suppressHydrationWarning` atau mengganti SSR dengan data palsu.

### 2. Kurangi pekerjaan setelah tombol berhasil

`src/components/SellerClient.tsx:336` menjalankan PATCH, lalu menunggu `fetchOrders()`, kemudian `fetchStore()`, memanggil `router.refresh()`, lalu mengganti tab yang juga memicu fetchOrders. Pola serupa ada pada penolakan dan penyelesaian pesanan. Ini membuat waktu yang dirasakan pengguna lebih panjang dari waktu mutation database.

Perbaikan: response mutation mengembalikan pesanan dan count terbaru. Setelah server menyatakan berhasil, perbarui kartu/count terkait dan pindahkan tab. Pilih satu strategi refresh; jangan sekaligus mengambil semua data dan me-render ulang seluruh route. Jangan mengumumkan pembayaran berhasil sebelum server commit. Batasi update optimistis pada interaksi yang aman.

### 3. Satukan data header dan hentikan polling yang tidak perlu

`src/components/Header.tsx:77` mengambil saldo, koin, dan seluruh daftar percakapan secara paralel setiap mount dan tiap 30 detik; effect terpisah mengambil activity setiap 15 detik. Header ada di banyak komponen halaman sehingga sering remount saat navigasi. Ringkasan pesan belum memakai endpoint count khusus.

Perbaikan: header konsisten di layout bersama, satu endpoint ringkasan user, deduplikasi request, cache per user, invalidasi setelah mutation, refresh saat focus, dan pause saat tab tersembunyi. Cache harus dibersihkan ketika ganti akun. Pakai SSE/WebSocket untuk kebutuhan chat aktif jika pengukuran menunjukkan polling menjadi beban.

Contoh hitungan, bukan hasil load test: 1.000 tab pengguna yang terus terbuka menghasilkan sekitar 167 request/detik dari empat polling header saja (3/30 + 1/15 request/detik/tab). Chat aktif menambah satu polling pesan per 3,5 detik/tab. `getUserChatConversationsSSR` bahkan mempunyai fallback pembentukan percakapan dummy pada jalur baca; ini perlu dipisahkan dari ringkasan header.

### 4. Perbaiki navigasi dan pemuatan data publik

`src/components/NavigationLoader.tsx:41` menangkap seluruh klik anchor pada capture phase, menghentikan propagasi, lalu melakukan prefetch saat klik dan router.push. Semua halaman bisnis juga dynamic. Kombinasi tersebut perlu ditinjau karena prefetch saat klik belum memberi persiapan sebelum klik, dan intersepsi global mengambil alih perilaku Link.

Perbaikan: gunakan Link/navigation bawaan dengan progress bar hijau, layout bersama, dan prefetch terpilih sebelum klik (misalnya hover/focus). Tetap pertahankan halaman lama selama transisi; tidak perlu layar kosong atau badge loading tambahan. Dynamic SSR untuk data pribadi tetap dipertahankan. Cache data publik yang aman seperti deskripsi/foto/kategori dengan invalidasi saat perubahan, bukan seluruh saldo/pesanan/stok tanpa pemeriksaan ulang.

### 5. Pagination dan query harus mengikuti pertumbuhan data

Katalog saat ini mengambil seluruh produk. Seller mengambil seluruh pesanan pada tab aktif. `getAdminFinance` mengambil seluruh rincian transaksi lalu UI melakukan pagination di browser. Batas 10 baris pada tabel UI bukan pagination database. Query marketplace juga mengulang lookup alamat penjual per produk, dan seller masih memakai pencocokan nama `OR seller_name ILIKE '%...%'`.

Perbaikan: pagination/filter/sort di SQL; lookup/join alamat satu kali; ownership berdasarkan seller_id; indeks sesuai EXPLAIN pada data representatif. Pisahkan bundle dashboard menurut tab supaya pengaturan tidak perlu mengambil katalog dan daftar pesanan. Indeks dasar produk/pesanan sudah ada; menambah indeks sembarangan bukan solusi untuk delay yang sekarang terukur.

### 6. Gambar dan pekerjaan browser

`next.config.ts` memakai `images.unoptimized: true`; gambar kartu memakai img biasa tanpa ukuran responsif. Hero `banner-realistic.jpg` berukuran 690.049 byte; avatar/toko tertentu sekitar 470 KB. Upload baru memang sudah dikompres dan media punya cache immutable, yang merupakan fondasi yang baik.

Perbaikan: thumbnail WebP/AVIF dalam ukuran kartu, `srcset`/sizes atau pipeline image yang sesuai deployment, lazy loading untuk foto di bawah layar, prioritas hanya gambar utama, CDN/object storage. Pisahkan modul form/modal berat dengan dynamic import bila profiler/bundle analysis membuktikan manfaat. Ukuran source bukan ukuran JS yang diunduh: chunk khusus seller sekitar 16 KiB gzip dan checkout sekitar 20 KiB gzip, belum termasuk shared chunks. Jadi jangan menyimpulkan file source besar sebagai penyebab tunggal.

### 7. Pekerjaan terjadwal dan koneksi

Pembatalan QRIS dan batas konfirmasi dipanggil pada jalur baca pesanan. Pengecekan 24 jam ditahan timer global per proses. Lock stok juga tersimpan di memori proses. Ini tidak menjadi satu sumber state bersama jika nanti ada beberapa server. Upload masih tersimpan di disk lokal; membutuhkan persistent disk atau object storage saat deployment.

Perbaikan: reservation/stock di PostgreSQL dengan transaksi atomik dan constraint; background job terjadwal untuk expiry/refund dengan idempotensi; Redis opsional untuk cache/event/lock setelah memang dibutuhkan. Maksimum pool saat ini 20 per pool, bukan jaminan 20 koneksi untuk seluruh deployment. Tentukan pool sesuai jumlah proses/instance dan kapasitas PostgreSQL; pantau antrian, query lambat, CPU, dan memori. Simpan aplikasi dan database dekat satu sama lain secara jaringan.

## Blocker sebelum rilis publik

Ini terpisah dari latency, tetapi ditemukan ketika memeriksa kesiapan deploy:

- Terverifikasi lewat request tanpa cookie: API pesanan pembeli mengembalikan 4 pesanan; API pesanan seller mengembalikan 15 pesanan termasuk handover PIN; API alamat mengembalikan 2 alamat. Jalur tersebut belum membatasi data berdasarkan sesi server. Jangan membuka aplikasi ke publik sebelum autentikasi/ownership seluruh endpoint pribadi diperbaiki. PIN serah-terima tidak boleh diterima seller dari API daftar pesanan.
- `getServerSessionUser` masih menerima cookie profil lama yang tidak ditandatangani sebagai fallback untuk akun USER. Seluruh data/aksi pribadi harus menggunakan sesi server terverifikasi; cookie profil hanya boleh untuk tampilan, bukan bukti identitas.
- Dari review kode: pembayaran wallet dan pembuatan pesanan masih dua request terpisah; POST pesanan belum melakukan reservation produk atomik bersama debit. Ini berisiko saat order gagal setelah debit atau beberapa pembeli memesan stok yang sama. Risiko ini perlu diuji dan diperbaiki sebelum pengujian traffic transaksi. Audit ini tidak mencoba membebankan transaksi nyata untuk membuktikannya.
- Password admin demo yang diketahui harus diganti sebelum rilis. Proses registrasi/password, rate limiting, otorisasi upload, backup/restore, dan pemisahan data demo perlu pemeriksaan tersendiri. Audit performa ini bukan sertifikasi keamanan lengkap.

## Kriteria siap uji publik

1. Build production sukses dan jalankan dengan `next start`, bukan `next dev`.
2. Tidak ada hydration mismatch, data pribadi terisolasi, dan alur checkout/reservation atomik.
3. Pada staging, uji perjalanan nyata: pencarian, detail, chat, checkout, konfirmasi, top up, penarikan. Gunakan akun/data uji dan simulasi payment yang tidak mentransfer uang nyata.
4. Uji beban bertahap, misalnya 50, 100, lalu 500 pengguna virtual dengan waktu berpikir realistis dan durasi cukup. Kapasitas ditentukan dari latensi persentil, error, antrian DB, dan resource, bukan jumlah akun terdaftar.
5. Sasaran awal yang perlu divalidasi: p95 API baca di bawah 300 ms, mutation umum di bawah 500 ms pada kondisi target; ini target proyek, bukan hasil atau jaminan audit. Ukur browser ponsel dan jaringan nyata: LCP <=2,5 detik, INP <=200 ms, CLS <=0,1 pada persentil 75. INP mengukur respons visual terhadap interaksi, bukan lama transaksi server selesai.
6. Monitoring latency/error frontend dan backend, slow query, backup database, persistent media, dan pemulihan insiden tersedia sebelum traffic ditingkatkan.

## Rujukan primer

- Next.js production checklist: https://nextjs.org/docs/app/guides/production-checklist
- Next.js prefetching: https://nextjs.org/docs/app/guides/prefetching
- React hydrateRoot: https://react.dev/reference/react-dom/client/hydrateRoot
- node-postgres pool sizing: https://node-postgres.com/guides/pool-sizing
- Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals

Dokumentasi Next.js yang dibundel di `node_modules/next/dist/docs/` juga dibaca sesuai aturan repository. Angka dan detail audit adalah snapshot kondisi lokal pada waktu pengujian.
