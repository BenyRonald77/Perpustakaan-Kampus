# Catatan Verifikasi Manual (R-35)

Verifikasi dijalankan dengan menjalankan server sungguhan (`node server.js`) dan mengirim permintaan HTTP nyata lewat `curl`, plus pemeriksaan langsung terhadap isi berkas `data/*.json` sebelum dan sesudah setiap aksi. Tidak ada langkah yang diklaim "lulus" tanpa bukti konkret di bawah. Interaksi mouse/keyboard di browser tidak dapat direkam langsung di lingkungan ini (tidak ada browser dengan tampilan grafis), jadi perilaku fokus/keyboard/CSS diverifikasi lewat inspeksi kode (dicatat di bagian akhir) sebagaimana diizinkan R-35 untuk bagian yang tidak bisa diklik langsung, sementara seluruh alur data dan HTTP dijalankan sungguhan, bukan hanya dibaca dari kode.

Lingkungan: Node.js v22.22.2, `npm install` bersih (78 paket), data direset ke kondisi seed (`npm run seed`) sebelum pengujian dan sesudahnya.

## 1. Instalasi dan halaman utama

```
npm install            -> 78 packages, tanpa error fatal
npm run seed            -> "Seed selesai: 6 buku, 5 anggota ditulis ke .../data"
```

Seluruh halaman merespons 200 OK:

| Rute | Status |
|---|---|
| `/` (dashboard) | 200 |
| `/buku` | 200 |
| `/anggota` | 200 |
| `/peminjaman` | 200 |
| `/pengembalian` | 200 |
| `/antrean` | 200 |
| `/laporan` | 200 |
| `/notifikasi` | 200 |
| `/buku/baru` | 200 |
| `/anggota/baru` | 200 |

## 2. CRUD master data

- Tambah buku baru (`POST /buku`) -> redirect dengan notice sukses.
- Tambah buku dengan barcode yang sudah dipakai -> status 400, pesan "sudah dipakai buku lain" tampil di form (barcode tetap unik).
- Ubah buku: menurunkan `totalEksemplar` di bawah jumlah yang sedang dipinjam/dialokasikan ditolak dengan pesan "Total eksemplar tidak boleh kurang dari 1" (nilai batas dihitung otomatis dari transaksi aktif).
- Hapus buku yang masih punya peminjaman aktif -> ditolak: "Buku ... tidak bisa dihapus karena masih ada peminjaman aktif atau antrean berjalan."
- Hapus anggota yang masih punya peminjaman aktif -> ditolak dengan pesan setara.
- Submit form anggota kosong -> status 400, dua pesan "wajib diisi" (nama dan NIM) tampil, data tidak tersimpan.

## 3. Peminjaman sampai stok habis, lalu antrean FIFO

Buku uji: `BK-00003` ("Pengantar Basis Data Relasional"), total eksemplar = 1.

1. `POST /peminjaman` barcode buku `BK-00003` + barcode anggota `MHS-1001` (Ayu Lestari) -> **berhasil**, pesan: "Ayu Lestari berhasil meminjam ... Jatuh tempo 2026-10-04."
2. Cek `/buku`: baris `BK-00003` menampilkan lencana **Habis** (eksemplar tersedia terhitung otomatis jadi 0).
3. `POST /peminjaman` barcode `BK-00003` + `MHS-1002` (Bagus Prakoso) -> **masuk antrean posisi 1** (bukan error, karena ini alur normal yang diharapkan): "Eksemplar ... sedang habis. Bagus Prakoso masuk antrean reservasi pada posisi 1."
4. `POST /peminjaman` barcode `BK-00003` + `MHS-1003` (Citra Ramadhani) -> masuk antrean posisi 2.
5. Cek `/antrean`: kedua nama muncul dengan lencana **Menunggu**, urutan FIFO sesuai posisi.

## 4. Pengembalian mengalokasikan antrean pertama secara otomatis

1. `POST /pengembalian` barcode `BK-00003` + `MHS-1001` -> berhasil, pesan mencantumkan: "Eksemplar otomatis dialokasikan ke antrean pertama: Bagus Prakoso (batas ambil 2026-09-29)."
2. Cek `/antrean`: entri Bagus Prakoso berubah dari **Menunggu** menjadi lencana **Siap diambil**, dengan tanggal batas ambil terisi (hari ini + 2 hari sesuai `batasAmbilAntreanHari`). Entri Citra Ramadhani tetap **Menunggu** di posisi berikutnya.

## 5. Simulasi overdue, trigger cron manual, denda berjalan bertambah

1. `POST /peminjaman` barcode `BK-00001` + `MHS-1004` (Dimas Saputra) -> berhasil, jatuh tempo tercatat 2026-10-04.
2. Data dimundurkan langsung di `data/loans.json` (mensimulasikan waktu berlalu tanpa menunggu 7 hari sungguhan): `tanggalJatuhTempo` diubah menjadi `2026-09-22` (5 hari sebelum tanggal sistem berjalan, 2026-09-27).
3. Sebelum cron dijalankan: halaman `/laporan` sudah menampilkan lencana **Overdue 5 hari** (status ini dihitung langsung dari tanggal, bukan menunggu cron), tetapi kolom denda masih kosong karena `dendaBerjalan` belum diperbarui.
4. Trigger cron manual: `curl -X POST http://localhost:.../cron/jalankan-sekali`. Respons:
   ```json
   {"dijalankanPada":"2026-09-27T08:18:28.167Z","tanggalAcuan":"2026-09-27",
    "loansDiperbarui":1,"notifikasiDibuat":1,"reservasiHangus":0,
    "rincian":["Denda peminjaman ... diperbarui menjadi Rp5.000 (5 hari telat).",
               "Notifikasi overdue dibuat untuk peminjaman ..."]}
   ```
5. Setelah cron: halaman `/laporan` menampilkan **Rp5.000** pada kolom denda berjalan dan pada tabel "Total denda berjalan per anggota" untuk Dimas Saputra (perhitungan: 5 hari x Rp1.000/hari sesuai `settings.dendaPerHari`).
6. Halaman `/notifikasi` menampilkan 1 entri baru berlencana **Overdue**, dengan teks yang menegaskan ini notifikasi in-app ("tidak ada pesan yang benar-benar terkirim").
7. Menjalankan pengembalian sesungguhnya juga menghitung denda yang sama: `POST /pengembalian` untuk peminjaman yang sudah terlambat 7 hari (kasus terpisah pada percobaan sebelumnya) menghasilkan pesan "Terlambat 7 hari, denda Rp7.000", cocok dengan `dendaPerHari x hari telat`.

## 6. Pengingat H-2 dan penghangusan alokasi antrean (cascade FIFO)

1. Peminjaman baru disisipkan langsung ke data dengan `tanggalJatuhTempo` = hari ini + 2 hari (memenuhi ambang pengingat H-2).
2. `batasAmbil` pada alokasi antrean "siap diambil" milik Bagus Prakoso (dari bagian 4) diundurkan langsung ke `2020-01-01` untuk mensimulasikan lewat batas ambil.
3. Trigger cron manual dijalankan sekali. Respons:
   ```json
   {"notifikasiDibuat":1,"reservasiHangus":1,
    "rincian":["Notifikasi pengingat H-2 dibuat untuk peminjaman ...",
               "Alokasi antrean ... hangus (lewat batas ambil 2020-01-01).",
               "Antrean berikutnya untuk buku ... dialokasikan (batas ambil baru 2026-09-29)."]}
   ```
4. Halaman `/notifikasi` bertambah 1 entri berlencana **Pengingat H-2**.
5. `data/reservations.json` menunjukkan entri Bagus Prakoso berubah status menjadi `hangus`, dan entri Citra Ramadhani (antrean berikutnya) otomatis berubah menjadi `siap_diambil` dengan `batasAmbil` baru terisi. Halaman `/antrean` menampilkan lencana **Siap diambil** untuk Citra dan ringkasan teks "1 alokasi antrean sebelumnya sudah hangus ... diteruskan ke antrean berikutnya."

## 7. Bug ditemukan dan diperbaiki selama verifikasi

Saat memeriksa HTML yang sungguhan dirender (bukan hanya status code), ditemukan bahwa atribut `aria-current="page"` pada tautan navigasi aktif ter-escape oleh EJS (`<%= %>` meng-escape HTML) menjadi teks literal `aria-current=&#34;page&#34;`, sehingga atribut tersebut rusak dan tidak berfungsi secara semantik/aksesibilitas. Diperbaiki dengan mengganti ke `<%- %>` (unescaped) pada seluruh tautan navigasi di `views/partials/header.ejs`. Setelah perbaikan, `curl` terhadap halaman aktif menunjukkan atribut valid: `<a href="/buku" aria-current="page">Buku</a>`.

Pada perbaikan yang sama, warna aksen (`--aksen`) diuji dengan rumus kontras WCAG (relative luminance) dan ditemukan hanya mencapai rasio ~3.85:1 terhadap latar kertas untuk teks normal (di bawah ambang 4.5:1). Warna diganti ke varian yang lebih gelap (`#8F4F16`, rasio >=4.5:1 terhadap kertas maupun putih, dan >=4.5:1 untuk teks putih di atasnya), sementara nada terang aslinya (`#B5651D`) dipertahankan sebagai `--aksen-dekor` khusus untuk elemen non-teks (garis atas kartu). Warna lencana status "Menunggu" (`--status-tunggu`) juga digelapkan sedikit (`#8A6D1F` -> `#7D631C`) karena rasio awalnya 4.15:1, di bawah ambang. Nilai kontras akhir (dihitung dengan skrip Node lokal, rumus WCAG 2.x):

| Pasangan | Rasio |
|---|---|
| Teks tinta di atas kertas | 12.91:1 |
| Aksen (teks/tautan) di atas kertas | 5.66:1 |
| Teks putih di atas tombol aksen | 6.37:1 |
| Lencana status tunggu (teks di atas latar lembutnya) | 4.84:1 |
| Lencana status bahaya (teks di atas latar lembutnya) | 5.29:1 |
| Lencana status baik (teks di atas latar lembutnya) | 5.07:1 |

Semua di atas ambang minimum WCAG AA untuk teks normal (4.5:1).

## 8. Verifikasi lewat inspeksi kode (bagian yang tidak bisa diklik di lingkungan ini)

- **Keyboard/fokus**: `public/css/style.css` mendefinisikan `:focus-visible` dengan outline 3px warna aksen pada seluruh elemen interaktif (`a`, `button`, `input`, `select`, `textarea`, `[tabindex]`); tidak ada `outline: none`/`outline: 0` di mana pun dalam berkas ini.
- **Auto-focus dan submit-on-Enter untuk scanner**: `public/js/scanner.js` memasang `[data-autofocus]` untuk fokus awal dan `[data-scan-next]` untuk memindahkan fokus ke field berikutnya saat Enter, atau men-submit form saat field terakhir menerima Enter tanpa target berikutnya (dipakai di form Peminjaman dan Pengembalian).
- **Responsif mobile**: `public/css/style.css` memakai pendekatan mobile-first dengan `@media (min-width: 640px)`, `(min-width: 720px)`, dan `(max-width: 719px)`; seluruh kontrol interaktif memakai `min-height: 44px` untuk target sentuh.
- **Tiga keadaan (empty/loading/error)**: setiap halaman data (`/buku`, `/anggota`, `/peminjaman` implisit lewat notice, `/antrean`, `/laporan`, `/notifikasi`) membungkus pembacaan data dengan try/catch untuk keadaan galat aktionable (pesan + tombol "coba muat ulang"), memeriksa panjang array untuk keadaan kosong dengan pesan dan aksi lanjutan, dan keadaan memuat direalisasikan secara nyata (bukan hiasan) lewat `data-loading-label` pada form pemindaian (tombol dinonaktifkan + spinner saat submit sungguhan sedang berlangsung) dan lewat `data-cron-trigger`/`data-cron-result` pada tombol pemicu cron manual di halaman Notifikasi (status memuat, sukses, dan galat berdasarkan hasil `fetch()` yang sungguhan, termasuk keadaan galat jika permintaan gagal).

## 9. Setelah pengujian

`npm run seed` dijalankan ulang untuk mengembalikan `data/*.json` ke kondisi seed awal sebelum kode dikomit, dan proses server dihentikan.
