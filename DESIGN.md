# Arahan Desain - Perpustakaan Kampus

## Catatan jujur (R-37)

Tidak ada `DESIGN.md` atau arahan merek dari pemilik produk sebelum proyek ini dimulai, dan karena agen bekerja tanpa bisa bertanya balik, arahan di bawah ini disusun sendiri oleh agen (opsi 2, R-37). Ini adalah peringatan jujur: arah yang dibuat agen cenderung condong ke selera default yang justru ingin dihindari oleh antislop. Untuk menahan kecenderungan itu, arah di bawah diikat ke satu motif identitas yang konkret (kartu katalog perpustakaan) dan dial liveliness diisi eksplisit, bukan dibiarkan jatuh ke default steril.

## Baca desain (Design Read)

Membaca ini sebagai: aplikasi kerja internal (line-of-business) untuk staf pustakawan dan anggota kampus, gaya bahasa visual tenang dan akademis seperti sistem katalog perpustakaan fisik, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

## Siapa penggunanya

- **Pustakawan/Admin**: bekerja cepat berulang - entri buku baru, proses pinjam/kembali via scanner barcode, cek antrean. Butuh keterbacaan tinggi dan target sentuh/klik besar karena dipakai lama tiap hari.
- **Anggota/Mahasiswa**: melihat status pinjaman sendiri, jatuh tempo, denda. Bukan aplikasi pemasaran, jadi tidak perlu meyakinkan siapa pun untuk "mendaftar".

Ini bukan landing page produk. Tidak ada hero, tidak ada CTA penjualan, tidak ada testimoni. Setiap layar ada karena staf perlu menyelesaikan satu tugas nyata di layar itu (C-3).

## Palet warna (2 inti + 1 aksen, R-29)

| Peran | Hex | Alasan |
|---|---|---|
| Inti 1 - Tinta (teks, nav, header) | `#1F2A37` | Biru-kehitaman gelap ala tinta cap perpustakaan lama, bukan hitam pekat, memberi karakter tanpa terasi keras. Kontras tinggi di atas kertas. |
| Inti 2 - Kertas (latar) | `#F6F1E7` | Warna kertas katalog krem hangat, bukan putih/abu netral AI-default, mengurangi silau untuk pekerjaan baca-lama (long-form). |
| Netral - Garis & permukaan kartu | `#FFFFFF` / `#DCD3C0` | Putih untuk permukaan kartu di atas kertas krem, garis border coklat-krem pudar untuk pembatas tanpa bayangan berlebihan. Dihitung sebagai netral, bukan bagian dari 2-3 warna inti (aturan R-29). |
| Aksen - Cap Ochre | `#B5651D` | Warna oranye-coklat seperti tinta cap tanggal ("date-due stamp") pada kartu peminjaman perpustakaan lama. Dipakai hanya untuk aksi utama, status jatuh tempo mendekati, dan penanda antrean, bukan disebar ke semua elemen. |

Warna status (bukan bagian palet inti, dipakai fungsional saja): merah `#B3261E` untuk overdue/denda, hijau tua `#3F6C4C` untuk tersedia/lunas. Keduanya sudah diuji kontras AA di atas kertas krem dan putih.

Tidak ada gradient, tidak ada glow, tidak ada glassmorphism: aplikasi kerja harian tidak butuh efek itu, dan tiga-empat warna solid dengan hierarki jelas lebih mudah dipindai staf yang memakainya berulang kali sehari (R-01, R-10, R-13).

## Tipografi

- **Judul (heading)**: `Source Serif 4` (serif). Alasan: memberi nuansa "buku/katalog akademik" yang jujur untuk konteks perpustakaan, bukan sekadar sans-serif default model (R-06). Fallback: Georgia, serif.
- **Isi & UI (body, form, tabel)**: `Inter`. Dipilih karena keterbacaan tinggi pada ukuran kecil di tabel data dan form padat, bukan karena itu default model - di sini alasannya adalah kepadatan data tabel peminjaman/anggota butuh sans yang netral dan sangat legible. Fallback: system-ui.
- **Kode/barcode**: `JetBrains Mono` khusus untuk field barcode dan nomor kode saja, karena kode perlu lebar-karakter seragam supaya angka mudah diverifikasi manual oleh staf. Bukan dipakai untuk judul (menghindari "monospace besar sebagai estetika", R-06).

Tidak ada huruf kapital semua dengan letter-spacing lebar untuk label seksi (menghindari gaya "HOW IT WORKS" ala AI).

## Motif identitas

Kartu "katalog": setiap entitas utama (buku, anggota, transaksi peminjaman) ditampilkan sebagai kartu dengan garis atas tipis 3px warna aksen ochre yang berfungsi sebagai penanda kategori kartu (bukan stripe kiri dekoratif tanpa arti - lihat larangan R-31), meniru sudut potong kartu katalog fisik. Radius kartu kecil (6px) konsisten, bukan pill-shape.

Nomor barcode selalu ditampilkan dalam font mono di dalam badge kotak bersudut tajam (radius 2px) untuk membedakannya secara visual dari data biasa - ini murni fungsional, membantu staf memindai halaman untuk menemukan kode dengan cepat.

## Dial liveliness

- **ENERGY 2 (Balanced)**: aplikasi kerja tepercaya, bukan flat pemerintahan (ENERGY 1) tapi juga bukan portofolio agensi. Ada kehangatan lewat warna kertas krem dan aksen ochre, tapi tenang dan fungsional.
- **RHYTHM 2 (Konsisten dengan beberapa variasi)**: halaman dashboard, daftar (tabel), dan form punya komposisi yang berbeda sesuai kebutuhan datanya (dashboard = kartu ringkasan + daftar terkini, tabel = daftar padat, form = kolom tunggal fokus), tapi memakai bahasa visual kartu/tabel yang sama sehingga tetap terasa satu sistem.
- **MOTION 1 (Hover states only)**: ini alat kerja harian, bukan halaman promosi. Transisi hanya pada hover/focus tombol dan baris tabel (mis. perubahan warna latar 150ms), tanpa animasi scroll-reveal atau parallax, supaya staf yang membuka aplikasi berkali-kali sehari tidak terganggu gerakan.

## Fokal & aksen per layar (satu fokal per layar)

- Dashboard: kartu ringkasan "peminjaman aktif & overdue" adalah fokal utama (warna aksen dipakai di sini untuk angka overdue).
- Form peminjaman/pengembalian: field input barcode (auto-focus) adalah fokal, dibuat besar dan menonjol karena itulah satu-satunya aksi yang dilakukan berulang di layar ini.
- Halaman antrean: posisi antrean anggota adalah fokal, ditandai aksen ochre hanya pada baris "siap diambil".

## Ruang kosong

Padding form dan tabel memakai skala 8px konsisten (8/16/24/32) sehingga renggang tapi tidak boros, memberi napas pada layar padat data tanpa terasa kosong tanpa alasan.
