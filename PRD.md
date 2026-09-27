# PRD - Sistem Perpustakaan Kampus

## 1. Ringkasan

Perpustakaan Kampus adalah aplikasi web internal untuk mengelola operasional harian sebuah perpustakaan kampus: master data buku dan anggota, proses peminjaman dan pengembalian melalui pemindaian barcode, antrean reservasi untuk buku yang stoknya habis, perhitungan denda keterlambatan otomatis, dan pengingat jatuh tempo. Aplikasi ini dipakai oleh staf pustakawan di meja sirkulasi dan oleh anggota (mahasiswa) untuk memantau status pinjaman mereka sendiri.

## 2. Latar Belakang

Proses sirkulasi buku secara manual (mencatat di buku besar atau spreadsheet) rawan salah hitung eksemplar tersedia, lupa mencatat antrean saat buku dipinjam semua orang, dan telat menagih denda karena tidak ada pengingat otomatis. Sistem ini dibangun agar seluruh alur - dari input master data sampai penagihan denda - tercatat di satu tempat dan sebagian besar pekerjaan rutin (menghitung denda berjalan, mengingatkan jatuh tempo) berjalan otomatis lewat penjadwal harian.

## 3. Tujuan

- Staf dapat mengelola data buku dan anggota tanpa duplikasi barcode.
- Proses pinjam dan kembali bisa dilakukan hanya dengan memindai barcode buku dan barcode anggota, tanpa mengetik manual.
- Ketika eksemplar buku habis, anggota otomatis masuk antrean FIFO, dan begitu ada eksemplar kembali, antrean pertama otomatis mendapat alokasi.
- Denda keterlambatan terhitung otomatis berbasis jumlah hari telat dan tarif per hari, diperbarui otomatis setiap hari lewat job terjadwal.
- Anggota dan staf mendapat pengingat jatuh tempo (H-2) dan pemberitahuan saat mulai terlambat, dalam bentuk notifikasi in-app (bukan email nyata).

## 4. Peran Pengguna

| Peran | Deskripsi | Akses |
|---|---|---|
| Pustakawan/Admin | Staf meja sirkulasi dan pengelola data | CRUD buku, CRUD anggota, proses pinjam/kembali, lihat laporan, jalankan pemicu cron manual |
| Anggota/Mahasiswa | Peminjam buku | Lihat status pinjaman sendiri, posisi antrean, riwayat denda (melalui halaman laporan yang bisa disaring per anggota) |

Catatan batasan: versi ini belum memiliki sistem login/autentikasi terpisah per peran (lihat Batasan, bagian 8). Seluruh halaman dapat diakses dari satu antarmuka staf; pemisahan peran bersifat fungsional/menu, bukan otentikasi.

## 5. Ruang Lingkup

**Termasuk dalam ruang lingkup:**
- Manajemen master buku (judul, barcode, total eksemplar, eksemplar tersedia terhitung otomatis)
- Manajemen master anggota (nama, NIM/barcode anggota)
- Peminjaman via input barcode (buku + anggota), dengan auto-focus dan submit saat Enter
- Antrean reservasi FIFO ketika eksemplar habis, dengan alokasi otomatis saat buku dikembalikan
- Pengembalian buku dengan perhitungan denda otomatis
- Job terjadwal (cron) harian untuk pembaruan denda berjalan dan notifikasi pengingat, plus mekanisme pemicu manual untuk pengujian
- Halaman laporan: peminjaman aktif/overdue, antrean reservasi, notifikasi pengingat
- Dashboard ringkas

**Tidak termasuk dalam ruang lingkup:**
- Login/otentikasi/otorisasi bertingkat
- Pengiriman email/SMS sungguhan
- Pemindaian barcode via kamera (cukup input teks dari scanner USB)
- Pembayaran denda online

## 6. User Stories

1. Sebagai pustakawan, saya ingin menambah buku baru dengan barcode unik, supaya buku bisa langsung dipinjamkan lewat pemindaian.
2. Sebagai pustakawan, saya ingin menambah anggota baru dengan NIM/barcode unik, supaya anggota bisa langsung meminjam.
3. Sebagai pustakawan, saya ingin memindai barcode buku dan barcode anggota di satu form, supaya proses peminjaman cepat tanpa mengetik manual.
4. Sebagai anggota, saya ingin otomatis masuk antrean saat buku yang saya mau sedang habis, supaya saya tahu posisi antrean saya tanpa harus tanya ke staf.
5. Sebagai pustakawan, saya ingin eksemplar yang baru dikembalikan otomatis dialokasikan ke antrean pertama, supaya saya tidak perlu mengecek antrean secara manual satu per satu.
6. Sebagai pustakawan, saya ingin denda keterlambatan terhitung otomatis saat buku dikembalikan, supaya tidak ada selisih hitung manual.
7. Sebagai pustakawan, saya ingin denda berjalan pada peminjaman yang overdue diperbarui setiap hari meski buku belum dikembalikan, supaya laporan tunggakan selalu akurat saat dilihat kapan pun.
8. Sebagai anggota, saya ingin mendapat pengingat 2 hari sebelum jatuh tempo, supaya saya bisa mengembalikan tepat waktu.
9. Sebagai pustakawan, saya ingin melihat daftar semua peminjaman aktif, overdue, dan antrean reservasi dalam satu halaman laporan, supaya saya bisa mengambil keputusan operasional harian.
10. Sebagai penguji/staf teknis, saya ingin memicu job cron secara manual, supaya saya bisa memverifikasi logika denda dan notifikasi tanpa menunggu 24 jam.

## 7. Functional Requirements

### Master Data
- FR-1: Sistem harus dapat menambah, mengubah, menghapus, dan menampilkan daftar buku (judul, barcode unik, total eksemplar).
- FR-2: Barcode buku harus unik; sistem menolak penyimpanan jika barcode sudah dipakai buku lain.
- FR-3: Eksemplar tersedia untuk sebuah buku dihitung otomatis = total eksemplar dikurangi jumlah peminjaman berstatus aktif (dipinjam/belum dikembalikan) untuk buku tersebut. Nilai ini tidak disimpan sebagai input manual terpisah yang bisa menyimpang dari data transaksi.
- FR-4: Sistem harus dapat menambah, mengubah, menghapus, dan menampilkan daftar anggota (nama, NIM/barcode anggota unik).
- FR-5: Barcode/NIM anggota harus unik.
- FR-6: Buku atau anggota yang sedang punya peminjaman aktif atau antrean tidak dapat dihapus (mencegah data transaksi menjadi yatim); sistem menampilkan pesan penolakan yang jelas.

### Peminjaman & Antrean
- FR-7: Form peminjaman menerima dua input berurutan: barcode buku dan barcode anggota, dengan focus otomatis berpindah dan submit saat Enter ditekan pada input terakhir (meniru perilaku scanner USB).
- FR-8: Jika eksemplar tersedia buku > 0 saat peminjaman diajukan, sistem mengurangi eksemplar tersedia, mencatat tanggal pinjam (hari ini) dan tanggal jatuh tempo (tanggal pinjam + durasi pinjam default dari pengaturan).
- FR-9: Jika eksemplar tersedia = 0, anggota dimasukkan ke antrean reservasi FIFO untuk buku tersebut, dan sistem menampilkan posisi antrean anggota tersebut saat itu juga.
- FR-10: Sistem mencegah anggota yang sama masuk antrean dua kali untuk buku yang sama secara bersamaan.
- FR-11: Saat sebuah eksemplar buku dikembalikan dan ada antrean menunggu untuk buku itu, sistem otomatis mengalokasikan eksemplar tersebut ke entri antrean pertama (FIFO), mengubah statusnya menjadi "siap diambil", dan mencatat batas waktu pengambilan (2 hari sejak dialokasikan).
- FR-12: Jika batas waktu pengambilan pada status "siap diambil" terlampaui tanpa peminjaman direalisasikan, job cron harian menghanguskan alokasi tersebut dan meneruskan eksemplar ke antrean berikutnya.

### Pengembalian & Denda
- FR-13: Form pengembalian menerima barcode buku dan barcode anggota untuk mencocokkan peminjaman aktif yang akan ditutup.
- FR-14: Saat pengembalian diproses, jika tanggal pengembalian melewati tanggal jatuh tempo, sistem menghitung denda = jumlah hari telat x tarif denda per hari dari pengaturan, dibulatkan ke hari penuh berikutnya untuk hari berjalan.
- FR-15: Saat pengembalian diproses, eksemplar tersedia buku bertambah kembali sebelum dicek terhadap antrean (lihat FR-11).
- FR-16: Sistem menyimpan status peminjaman: aktif, dikembalikan, dengan tanggal kembali aktual dan nominal denda final tersimpan pada riwayat.

### Job Terjadwal (Cron)
- FR-17: Sistem menjalankan job terjadwal harian (node-cron) yang: (a) memperbarui nominal denda berjalan pada seluruh peminjaman aktif yang sudah melewati tanggal jatuh tempo dan belum dikembalikan, (b) membuat entri notifikasi pengingat H-2 untuk peminjaman yang jatuh tempo dalam 2 hari ke depan dan belum punya notifikasi H-2 tersebut, (c) membuat entri notifikasi saat sebuah peminjaman baru pertama kali terdeteksi overdue, (d) menghanguskan alokasi antrean "siap diambil" yang lewat batas waktu ambil dan meneruskan ke antrean berikutnya (FR-12).
- FR-18: Sistem menyediakan cara memicu job cron secara manual tanpa menunggu jadwal harian, melalui skrip (`npm run cron:jalankan-sekali`) dan/atau endpoint, untuk keperluan verifikasi dan pengujian.
- FR-19: Job cron tidak boleh mengirim email atau notifikasi eksternal sungguhan; seluruh pengingat tersimpan sebagai entri pada koleksi `notifikasi` dan ditampilkan in-app, karena sistem ini tidak terhubung ke layanan email.

### Laporan & Notifikasi
- FR-20: Sistem menampilkan halaman laporan peminjaman berisi: daftar peminjaman aktif, daftar peminjaman overdue beserta denda berjalan, dan total denda per anggota.
- FR-21: Sistem menampilkan halaman antrean reservasi per buku, termasuk status tiap entri (menunggu/siap diambil/hangus/terealisasi) dan posisi urut.
- FR-22: Sistem menampilkan halaman daftar notifikasi pengingat (H-2 dan overdue) sebagai notifikasi in-app, dengan keterangan eksplisit bahwa ini bukan email yang benar-benar terkirim.
- FR-23: Sistem menampilkan dashboard ringkas berisi jumlah peminjaman aktif, jumlah overdue, total antrean menunggu, dan total denda belum lunas.

## 8. Data Model

### `books` (buku)
| Field | Tipe | Keterangan |
|---|---|---|
| id | string (uuid) | primary key |
| judul | string | judul buku |
| barcode | string | unik, kode barcode buku |
| totalEksemplar | number | jumlah total eksemplar fisik |
| createdAt | ISO datetime | |
| updatedAt | ISO datetime | |

Catatan: `eksemplarTersedia` bukan field tersimpan tetap, melainkan dihitung (`totalEksemplar - jumlah loans aktif untuk barcode ini - jumlah alokasi antrean "siap diambil" yang belum direalisasikan`), dijelaskan lebih lanjut di lib/store.js.

### `members` (anggota)
| Field | Tipe | Keterangan |
|---|---|---|
| id | string (uuid) | primary key |
| nama | string | nama anggota |
| nim | string | unik, dipakai juga sebagai barcode kartu anggota |
| createdAt | ISO datetime | |

### `loans` (peminjaman)
| Field | Tipe | Keterangan |
|---|---|---|
| id | string (uuid) | primary key |
| bookId | string | relasi ke books.id |
| memberId | string | relasi ke members.id |
| tanggalPinjam | ISO date | |
| tanggalJatuhTempo | ISO date | tanggalPinjam + durasi default |
| tanggalKembali | ISO date atau null | null jika masih aktif |
| status | enum | `aktif` \| `dikembalikan` |
| dendaBerjalan | number | rupiah, diperbarui cron selama aktif dan overdue |
| dendaFinal | number atau null | rupiah, dihitung saat dikembalikan |
| createdAt | ISO datetime | |

### `reservations` (antrean reservasi)
| Field | Tipe | Keterangan |
|---|---|---|
| id | string (uuid) | primary key |
| bookId | string | relasi ke books.id |
| memberId | string | relasi ke members.id |
| status | enum | `menunggu` \| `siap_diambil` \| `hangus` \| `terealisasi` |
| urutan | number | urutan FIFO masuk antrean |
| tanggalDaftar | ISO datetime | |
| tanggalDialokasikan | ISO datetime atau null | diisi saat status jadi siap_diambil |
| batasAmbil | ISO date atau null | tanggalDialokasikan + 2 hari |

### `notifikasi`
| Field | Tipe | Keterangan |
|---|---|---|
| id | string (uuid) | primary key |
| loanId | string | relasi ke loans.id |
| memberId | string | relasi ke members.id |
| tipe | enum | `pengingat_h2` \| `overdue` |
| pesan | string | isi pengingat |
| dibuatPada | ISO datetime | |
| dibaca | boolean | status baca in-app |

### `settings` (pengaturan)
| Field | Tipe | Keterangan |
|---|---|---|
| dendaPerHari | number | rupiah, tarif denda per hari telat |
| durasiPinjamHari | number | jumlah hari default masa pinjam |
| batasAmbilAntreanHari | number | jumlah hari batas ambil setelah dialokasikan |

## 9. Non-Functional Requirements

- **Akurasi denda**: perhitungan hari telat memakai selisih tanggal kalender (bukan jam), dihitung ulang secara deterministik dari `tanggalJatuhTempo` dan tanggal berjalan/tanggal kembali aktual, sehingga hasil selalu bisa direproduksi dari data tersimpan.
- **Penjadwalan cron**: job harian dijadwalkan lewat `node-cron` dengan ekspresi yang berjalan sekali sehari pada dini hari server; tersedia jalur pemicu manual (skrip dan endpoint) yang menjalankan logika job yang sama persis, supaya perilaku terverifikasi identik antara jalur terjadwal dan jalur manual.
- **Aksesibilitas**: seluruh elemen interaktif dapat dijangkau dan dioperasikan lewat keyboard, indikator focus terlihat jelas, target sentuh minimal 44px, kontras teks memenuhi WCAG AA (4.5:1 teks normal, 3:1 teks besar).
- **Ketahanan tampilan**: setiap halaman yang menampilkan data menyediakan tiga keadaan: kosong (empty), memuat (loading), dan gagal (error) yang menjelaskan penyebab serta langkah lanjutan.
- **Kejujuran data**: sistem tidak menampilkan klaim terkirimnya email/SMS karena tidak ada layanan pengiriman yang benar-benar terhubung; seluruh pengingat eksplisit berlabel notifikasi in-app.

## 10. Batasan

- Tidak ada autentikasi/login; sistem ini adalah alat internal satu-akses untuk staf, bukan aplikasi multi-tenant publik.
- Data tersimpan sebagai file JSON lokal (`lib/store.js`), bukan basis data server terpisah; cocok untuk skala satu unit perpustakaan kampus, bukan untuk beban lintas kampus besar secara bersamaan.
- Pemindaian barcode mengandalkan scanner USB yang berperilaku sebagai keyboard (tidak ada dukungan pemindaian lewat kamera perangkat).
- Tidak ada pengiriman email/SMS sungguhan; seluruh "pengingat" adalah entri in-app yang tampil di halaman notifikasi.
- Denda tidak mendukung pembayaran online; pelunasan dicatat sebagai proses administratif terpisah di luar ruang lingkup versi ini.
