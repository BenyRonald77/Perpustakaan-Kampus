// Menulis ulang seluruh data/*.json dengan data contoh awal (dummy demonstrasi,
// bukan data mahasiswa/koleksi sungguhan). Jalankan dengan `npm run seed`.
// PERINGATAN: skrip ini menimpa seluruh isi folder data/.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function write(name, data) {
  fs.writeFileSync(path.join(DATA_DIR, `${name}.json`), JSON.stringify(data, null, 2) + '\n', 'utf8');
}

const now = new Date().toISOString();

const books = [
  { id: crypto.randomUUID(), judul: 'Pemrograman Dasar dengan Python', barcode: 'BK-00001', totalEksemplar: 3, createdAt: now },
  { id: crypto.randomUUID(), judul: 'Struktur Data dan Algoritma', barcode: 'BK-00002', totalEksemplar: 2, createdAt: now },
  { id: crypto.randomUUID(), judul: 'Pengantar Basis Data Relasional', barcode: 'BK-00003', totalEksemplar: 1, createdAt: now },
  { id: crypto.randomUUID(), judul: 'Metodologi Penelitian Kuantitatif', barcode: 'BK-00004', totalEksemplar: 2, createdAt: now },
  { id: crypto.randomUUID(), judul: 'Ekonomi Mikro Pengantar', barcode: 'BK-00005', totalEksemplar: 1, createdAt: now },
  { id: crypto.randomUUID(), judul: 'Sejarah Pemikiran Modern', barcode: 'BK-00006', totalEksemplar: 2, createdAt: now },
];

const members = [
  { id: crypto.randomUUID(), nama: 'Ayu Lestari', nim: 'MHS-1001', createdAt: now },
  { id: crypto.randomUUID(), nama: 'Bagus Prakoso', nim: 'MHS-1002', createdAt: now },
  { id: crypto.randomUUID(), nama: 'Citra Ramadhani', nim: 'MHS-1003', createdAt: now },
  { id: crypto.randomUUID(), nama: 'Dimas Saputra', nim: 'MHS-1004', createdAt: now },
  { id: crypto.randomUUID(), nama: 'Eka Wulandari', nim: 'MHS-1005', createdAt: now },
];

const settings = {
  dendaPerHari: 1000,
  durasiPinjamHari: 7,
  batasAmbilAntreanHari: 2,
};

write('books', books);
write('members', members);
write('loans', []);
write('reservations', []);
write('notifikasi', []);
write('settings', settings);

console.log(`Seed selesai: ${books.length} buku, ${members.length} anggota ditulis ke ${DATA_DIR}`);
