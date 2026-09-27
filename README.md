# Perpustakaan Kampus

Aplikasi web internal untuk sirkulasi perpustakaan kampus: manajemen master buku dan anggota, peminjaman/pengembalian lewat pemindaian barcode, antrean reservasi otomatis, denda keterlambatan yang dihitung job harian, dan pengingat jatuh tempo in-app.

Detail kebutuhan ada di [`PRD.md`](./PRD.md), arah visual dan alasannya ada di [`DESIGN.md`](./DESIGN.md), dan catatan pengujian manual ada di [`VERIFICATION.md`](./VERIFICATION.md).

## Stack

- Node.js 22 + Express, tampilan EJS, CSS murni (custom properties, tanpa framework CSS), JavaScript vanilla di sisi klien (tanpa bundler).
- Data disimpan sebagai berkas JSON sinkron di folder `data/` (lihat `lib/store.js`), bukan basis data server.
- Job harian dijadwalkan dengan `node-cron`.

## Instalasi dan menjalankan

```bash
npm install
npm run seed      # menulis ulang data/*.json dengan data contoh (lihat peringatan di bawah)
npm start         # menjalankan server di http://localhost:3000
```

Port bisa diubah lewat variabel lingkungan `PORT`, misalnya `PORT=4000 npm start`.

### Menata ulang data (reseed)

`npm run seed` menimpa seluruh isi folder `data/` dengan data contoh (6 judul buku, 5 anggota, pengaturan denda/durasi pinjam, dan koleksi transaksi kosong). Jalankan ini kapan saja aplikasi perlu dikembalikan ke kondisi awal untuk demo atau pengujian. Data contoh ini murni untuk demonstrasi, bukan koleksi atau data mahasiswa sungguhan.

### Memicu job harian secara manual (untuk pengujian)

Job harian sesungguhnya berjalan otomatis satu kali sehari (pukul 00:05 waktu server) lewat `node-cron`, mengerjakan:

1. memperbarui denda berjalan pada peminjaman aktif yang sudah lewat jatuh tempo;
2. membuat notifikasi pengingat H-2 (dua hari sebelum jatuh tempo);
3. membuat notifikasi saat sebuah peminjaman baru pertama kali terdeteksi overdue;
4. menghanguskan alokasi antrean "siap diambil" yang lewat batas waktu ambil, lalu meneruskan eksemplar ke antrean berikutnya.

Karena menunggu 24 jam tidak praktis untuk pengujian, tersedia dua cara memicunya kapan saja, keduanya menjalankan fungsi yang persis sama (`lib/cron.js:runDailyJob`):

```bash
npm run cron:jalankan-sekali
```

atau lewat endpoint (juga dipakai oleh tombol "Jalankan Pengecekan Sekarang" di halaman Notifikasi):

```bash
curl -X POST http://localhost:3000/cron/jalankan-sekali
```

Untuk benar-benar melihat efeknya tanpa menunggu tanggal asli berjalan, ubah dulu `tanggalJatuhTempo` sebuah peminjaman di `data/loans.json` (atau `batasAmbil` di `data/reservations.json`) ke tanggal yang sudah lewat, lalu jalankan salah satu perintah di atas dan lihat perubahan di halaman Laporan dan Notifikasi.

## Struktur singkat

```
server.js              titik masuk Express, penjadwalan node-cron, endpoint pemicu manual
lib/store.js            penyimpanan JSON sinkron (baca/tulis/insert/update/remove)
lib/library.js          logika bisnis: ketersediaan eksemplar, peminjaman, pengembalian, antrean FIFO
lib/cron.js             logika job harian (denda berjalan, notifikasi, penghangusan antrean)
routes/                 handler Express per area (buku, anggota, peminjaman/pengembalian, laporan)
views/                  template EJS, partial header/footer/notice/state dipakai ulang di semua halaman
public/css/style.css    seluruh styling, custom properties sesuai DESIGN.md
public/js/scanner.js    auto-focus dan submit-on-enter untuk form pemindaian, keadaan memuat yang nyata
data/*.json             data aplikasi (buku, anggota, peminjaman, reservasi, notifikasi, pengaturan)
scripts/seed.js         menulis ulang data/*.json dengan data contoh
scripts/cronOnce.js     memicu job harian satu kali dari command line
```

## Catatan jujur tentang batasan

- **Tidak ada email/SMS sungguhan.** Seluruh "pengingat jatuh tempo" adalah entri pada koleksi `notifikasi` yang ditampilkan di halaman Notifikasi. Sistem ini tidak terhubung ke layanan pengiriman apa pun, dan tidak ada tempat di aplikasi ini yang mengklaim pesan sudah "terkirim".
- **Barcode berarti input teks.** Scanner USB standar berperilaku seperti keyboard (mengetik karakter lalu Enter), jadi seluruh field barcode di aplikasi ini adalah `<input type="text">` biasa yang auto-focus dan submit-on-enter. Tidak ada pemindaian lewat kamera.
- **Tidak ada login/otentikasi.** Aplikasi ini adalah alat kerja internal satu-akses untuk staf sirkulasi, bukan sistem multi-pengguna dengan peran terautentikasi (lihat bagian Batasan di `PRD.md`).
- **Tema tetap terang, tanpa toggle gelap.** Motif identitas aplikasi ini adalah "kertas katalog perpustakaan" (lihat `DESIGN.md`); latar kertas krem hangat adalah bagian dari identitas visual, bukan sekadar keputusan teknis yang bisa ditukar tanpa mengubah karakter aplikasi.
