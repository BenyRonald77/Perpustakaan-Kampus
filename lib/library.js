// Logika bisnis inti sirkulasi perpustakaan: ketersediaan eksemplar, peminjaman,
// pengembalian, antrean reservasi FIFO, dan perhitungan denda. Dipakai bersama oleh
// routes (permintaan HTTP) dan lib/cron.js (job terjadwal), supaya jalur manual dan
// jalur otomatis menjalankan logika yang sama persis.

const store = require('./store');

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateStr, days) {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Selisih hari (to - from), dibulatkan ke atas, minimum 0. Dipakai untuk menghitung
// hari telat dan hari menuju jatuh tempo dari dua tanggal kalender (bukan jam).
function diffDaysCeil(fromDateStr, toDateStr) {
  const from = new Date(`${fromDateStr}T00:00:00Z`);
  const to = new Date(`${toDateStr}T00:00:00Z`);
  const ms = to.getTime() - from.getTime();
  return Math.round(ms / 86400000);
}

function findBookByBarcode(barcode) {
  return store.readAll('books').find((b) => b.barcode === barcode) || null;
}

function findMemberByNim(nim) {
  return store.readAll('members').find((m) => m.nim === nim) || null;
}

// Eksemplar tersedia = total - peminjaman aktif - alokasi antrean yang sudah
// "siap diambil" (fisik ada di rak tapi sudah dipesankan untuk anggota tertentu).
function countActiveLoans(bookId) {
  return store.readAll('loans').filter((l) => l.bookId === bookId && l.status === 'aktif').length;
}

function countHeldReservations(bookId) {
  return store
    .readAll('reservations')
    .filter((r) => r.bookId === bookId && r.status === 'siap_diambil').length;
}

function computeAvailable(book) {
  return book.totalEksemplar - countActiveLoans(book.id) - countHeldReservations(book.id);
}

function decorateBook(book) {
  return Object.assign({}, book, { eksemplarTersedia: computeAvailable(book) });
}

function listBooksDecorated() {
  return store.readAll('books').map(decorateBook);
}

// Daftar antrean aktif (menunggu + siap_diambil) untuk satu buku, terurut FIFO.
function queueForBook(bookId) {
  return store
    .readAll('reservations')
    .filter((r) => r.bookId === bookId && (r.status === 'menunggu' || r.status === 'siap_diambil'))
    .sort((a, b) => a.urutan - b.urutan);
}

function nextUrutan(bookId) {
  const all = store.readAll('reservations').filter((r) => r.bookId === bookId);
  if (all.length === 0) return 1;
  return Math.max(...all.map((r) => r.urutan)) + 1;
}

// Mengalokasikan eksemplar yang baru bebas ke entri antrean "menunggu" paling awal
// untuk sebuah buku (FIFO). Dipanggil setelah pengembalian dan saat cron menghanguskan
// alokasi yang lewat batas ambil.
function allocateNextInQueue(bookId) {
  const settings = store.getSettings();
  const waiting = store
    .readAll('reservations')
    .filter((r) => r.bookId === bookId && r.status === 'menunggu')
    .sort((a, b) => a.urutan - b.urutan);
  if (waiting.length === 0) return null;
  const next = waiting[0];
  const today = todayISODate();
  return store.update('reservations', next.id, {
    status: 'siap_diambil',
    tanggalDialokasikan: new Date().toISOString(),
    batasAmbil: addDaysISO(today, settings.batasAmbilAntreanHari),
  });
}

const ERR = {
  BOOK_NOT_FOUND: 'BOOK_NOT_FOUND',
  MEMBER_NOT_FOUND: 'MEMBER_NOT_FOUND',
  ALREADY_QUEUED: 'ALREADY_QUEUED',
  LOAN_NOT_FOUND: 'LOAN_NOT_FOUND',
};

// Memproses permintaan peminjaman dari sepasang barcode (buku + anggota).
// Urutan pengecekan: (1) anggota sedang punya alokasi antrean "siap diambil" untuk
// buku ini -> realisasikan langsung sebagai peminjaman; (2) eksemplar tersedia > 0
// -> pinjam langsung; (3) tidak tersedia -> masuk antrean FIFO (atau tampilkan posisi
// jika sudah antre).
function borrowBook(bookBarcode, memberNim) {
  const book = findBookByBarcode(bookBarcode);
  if (!book) return { ok: false, code: ERR.BOOK_NOT_FOUND, message: `Barcode buku "${bookBarcode}" tidak ditemukan.` };
  const member = findMemberByNim(memberNim);
  if (!member) return { ok: false, code: ERR.MEMBER_NOT_FOUND, message: `Barcode/NIM anggota "${memberNim}" tidak ditemukan.` };

  const settings = store.getSettings();
  const today = todayISODate();

  const heldReservation = store
    .readAll('reservations')
    .find((r) => r.bookId === book.id && r.memberId === member.id && r.status === 'siap_diambil');

  if (heldReservation) {
    const loan = store.insert('loans', {
      bookId: book.id,
      memberId: member.id,
      tanggalPinjam: today,
      tanggalJatuhTempo: addDaysISO(today, settings.durasiPinjamHari),
      tanggalKembali: null,
      status: 'aktif',
      dendaBerjalan: 0,
      dendaFinal: null,
    });
    store.update('reservations', heldReservation.id, {
      status: 'terealisasi',
      tanggalRealisasi: new Date().toISOString(),
    });
    return {
      ok: true,
      type: 'loan-from-queue',
      message: `${member.nama} berhasil meminjam "${book.judul}" dari alokasi antrean yang sudah menunggu diambil.`,
      loan,
      book,
      member,
    };
  }

  const available = computeAvailable(book);
  if (available > 0) {
    const loan = store.insert('loans', {
      bookId: book.id,
      memberId: member.id,
      tanggalPinjam: today,
      tanggalJatuhTempo: addDaysISO(today, settings.durasiPinjamHari),
      tanggalKembali: null,
      status: 'aktif',
      dendaBerjalan: 0,
      dendaFinal: null,
    });
    return {
      ok: true,
      type: 'loan',
      message: `${member.nama} berhasil meminjam "${book.judul}". Jatuh tempo ${loan.tanggalJatuhTempo}.`,
      loan,
      book,
      member,
    };
  }

  const alreadyQueued = store
    .readAll('reservations')
    .find((r) => r.bookId === book.id && r.memberId === member.id && r.status === 'menunggu');
  if (alreadyQueued) {
    const queue = queueForBook(book.id);
    const position = queue.findIndex((r) => r.id === alreadyQueued.id) + 1;
    return {
      ok: false,
      code: ERR.ALREADY_QUEUED,
      type: 'already-queued',
      message: `${member.nama} sudah ada di antrean "${book.judul}" pada posisi ${position}.`,
      position,
      book,
      member,
    };
  }

  const reservation = store.insert('reservations', {
    bookId: book.id,
    memberId: member.id,
    status: 'menunggu',
    urutan: nextUrutan(book.id),
    tanggalDaftar: new Date().toISOString(),
    tanggalDialokasikan: null,
    batasAmbil: null,
  });
  const queue = queueForBook(book.id);
  const position = queue.findIndex((r) => r.id === reservation.id) + 1;
  return {
    ok: true,
    type: 'queued',
    message: `Eksemplar "${book.judul}" sedang habis. ${member.nama} masuk antrean reservasi pada posisi ${position}.`,
    reservation,
    position,
    book,
    member,
  };
}

// Memproses pengembalian dari sepasang barcode (buku + anggota): menutup peminjaman
// aktif yang cocok, menghitung denda jika terlambat, lalu mengalokasikan eksemplar
// yang baru bebas ke antrean pertama jika ada yang menunggu.
function returnBook(bookBarcode, memberNim) {
  const book = findBookByBarcode(bookBarcode);
  if (!book) return { ok: false, code: ERR.BOOK_NOT_FOUND, message: `Barcode buku "${bookBarcode}" tidak ditemukan.` };
  const member = findMemberByNim(memberNim);
  if (!member) return { ok: false, code: ERR.MEMBER_NOT_FOUND, message: `Barcode/NIM anggota "${memberNim}" tidak ditemukan.` };

  const settings = store.getSettings();
  const loan = store
    .readAll('loans')
    .find((l) => l.bookId === book.id && l.memberId === member.id && l.status === 'aktif');
  if (!loan) {
    return {
      ok: false,
      code: ERR.LOAN_NOT_FOUND,
      message: `Tidak ditemukan peminjaman aktif untuk "${book.judul}" atas nama ${member.nama}.`,
      book,
      member,
    };
  }

  const today = todayISODate();
  const lateDays = diffDaysCeil(loan.tanggalJatuhTempo, today);
  const denda = lateDays > 0 ? lateDays * settings.dendaPerHari : 0;

  const updatedLoan = store.update('loans', loan.id, {
    status: 'dikembalikan',
    tanggalKembali: today,
    dendaBerjalan: denda,
    dendaFinal: denda,
  });

  const allocated = allocateNextInQueue(book.id);

  let message = `${member.nama} mengembalikan "${book.judul}".`;
  if (denda > 0) {
    message += ` Terlambat ${lateDays} hari, denda Rp${denda.toLocaleString('id-ID')}.`;
  } else {
    message += ' Dikembalikan tepat waktu, tidak ada denda.';
  }
  if (allocated) {
    const nextMember = store.findById('members', allocated.memberId);
    message += ` Eksemplar otomatis dialokasikan ke antrean pertama: ${nextMember ? nextMember.nama : 'anggota'} (batas ambil ${allocated.batasAmbil}).`;
  }

  return { ok: true, message, loan: updatedLoan, book, member, allocated };
}

module.exports = {
  DEFAULT_ERR: ERR,
  todayISODate,
  addDaysISO,
  diffDaysCeil,
  findBookByBarcode,
  findMemberByNim,
  computeAvailable,
  decorateBook,
  listBooksDecorated,
  queueForBook,
  nextUrutan,
  allocateNextInQueue,
  borrowBook,
  returnBook,
};
