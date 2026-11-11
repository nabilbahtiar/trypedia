# Menjalankan TryPedia dan mengaktifkan Google

`npm run dev` sekarang memakai Turbopack. Restart proses development lama agar perubahan bundler berlaku. Development tetap mengompilasi route saat diperlukan; tidak ada jaminan kunjungan pertama tanpa jeda.

Untuk mencoba alur seperti deployment tanpa kompilasi saat berpindah halaman:

```powershell
npm run preview
```

Perintah tersebut membangun source terbaru ke `.next-production`, lalu menjalankannya di http://localhost:3001. Development port 3000 tidak dihentikan. Setelah mengubah kode, jalankan ulang preview untuk menghasilkan build baru. Untuk deployment biasa gunakan `npm run build` dan `npm start`.

## Login Google

Di Google Cloud, buat OAuth client bertipe Web application, siapkan consent screen, lalu masukkan redirect URI tepat:

```text
http://localhost:3000/api/auth/google/callback
http://localhost:3001/api/auth/google/callback
```

Tambahkan kredensial ke `.env.local`, jangan ke source atau chat:

```dotenv
GOOGLE_CLIENT_ID=isi_client_id_dari_google
GOOGLE_CLIENT_SECRET=isi_client_secret_dari_google
```

Restart server setelah konfigurasi. Saat deploy, set `APP_URL=https://domain-anda` dan daftarkan `https://domain-anda/api/auth/google/callback` di Google. Jika consent screen masih testing, tambahkan akun penguji sesuai konfigurasi Google Cloud.

Integrasi menggunakan authorization code, state, PKCE, pertukaran token di server, dan UserInfo Google. Tidak mempercayai email/sub yang dikirim browser. Email Google terverifikasi tidak otomatis memberi centang identitas TryPedia. Kredensial nyata belum tersedia saat implementasi, sehingga alur Google nyata belum diuji end-to-end. Tombol menampilkan keterangan bila konfigurasi belum diisi.

Email yang sudah terdaftar dengan password tidak otomatis ditautkan ke Google. Masuk dengan password untuk akun tersebut; ini mencegah penautan akun tanpa bukti kepemilikan akun sebelumnya.

## Akun dan identitas

- Pendaftaran email membuat akun USER tanpa verifikasi, saldo/koin nol, dan password scrypt. Akun lama dipertahankan.
- Profil `/settings` menyediakan pengajuan KTP/KTM. Jenis gambar JPG/PNG/WebP, maksimal 5 MB. Nomor rumah dan alamat tetap dikelola terpisah.
- Superadmin membuka menu **Verifikasi Identitas** di `/admin?tab=identity`, memeriksa foto, lalu menyetujui atau menolak dengan alasan. Pengajuan ditolak dapat diunggah ulang; pengajuan pending tidak dapat ditimpa.
- Pembelian/sewa, pembayaran checkout, konversi sewa ke beli, dan mutation produk/pesanan seller memeriksa status verifikasi di server. Menampilkan centang atau mengedit cookie browser tidak membuka akses transaksi.
- Foto tersimpan di `storage/identity`, bukan direktori public/media. Endpoint foto hanya mengizinkan pemilik dan superadmin; respons private/no-store. Folder dokumen dikecualikan dari Git. Gunakan persistent storage dengan akses terbatas dan kebijakan retensi/penghapusan saat deployment; jangan menyalin foto ke CDN publik.
- Schema dibuat lewat `node scripts/migrate-accounts.cjs`. Gunakan backup dan migration terkontrol saat deployment. Sesi profil lama yang tidak ditandatangani tidak lagi diterima; pengguna lama perlu login ulang sekali.

## Perubahan performa

Auth awal konsisten dari server, lookup sesi dideduplikasi per render, header memakai satu endpoint ringkasan dengan cache per akun dan request deduplication, polling header berhenti saat tab tersembunyi, navigasi memakai mekanisme Link bawaan, prefetch hover/focus dibatasi, dan konfirmasi seller tidak lagi mengambil ulang toko serta me-refresh seluruh route.

Pemeriksaan akun memakai fixture sementara dan mencakup pendaftaran, akses sebelum/sesudah persetujuan, privasi dokumen, penolakan/pengajuan ulang, serta penolakan cookie profil palsu. Build production dan TypeScript harus tetap lolos sebelum rilis. Ini belum menggantikan uji kapasitas deployment, pengujian browser ponsel, atau audit keamanan seluruh endpoint aplikasi.

Referensi: [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect), [Next.js Turbopack](https://nextjs.org/docs/app/api-reference/turbopack).
