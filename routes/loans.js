const express = require('express');
const store = require('../lib/store');
const lib = require('../lib/library');

const router = express.Router();

function noticeFromBorrowResult(result) {
  if (result.ok && (result.type === 'loan' || result.type === 'loan-from-queue')) {
    return { kind: 'sukses', text: result.message };
  }
  if (result.ok && result.type === 'queued') {
    return { kind: 'info', text: result.message };
  }
  if (!result.ok && result.type === 'already-queued') {
    return { kind: 'info', text: result.message };
  }
  return { kind: 'galat', text: result.message };
}

router.get('/peminjaman', (req, res) => {
  const notice = req.query.notice ? { kind: req.query.kind || 'info', text: req.query.notice } : null;
  res.render('loans/pinjam', {
    judulHalaman: 'Peminjaman',
    active: 'peminjaman',
    notice,
  });
});

router.post('/peminjaman', (req, res) => {
  const bookBarcode = (req.body.bookBarcode || '').trim();
  const memberBarcode = (req.body.memberBarcode || '').trim();

  if (!bookBarcode || !memberBarcode) {
    const text = 'Barcode buku dan barcode anggota wajib dipindai/diisi keduanya.';
    return res.redirect(`/peminjaman?notice=${encodeURIComponent(text)}&kind=galat`);
  }

  const result = lib.borrowBook(bookBarcode, memberBarcode);
  const notice = noticeFromBorrowResult(result);
  res.redirect(`/peminjaman?notice=${encodeURIComponent(notice.text)}&kind=${notice.kind}`);
});

router.get('/pengembalian', (req, res) => {
  const notice = req.query.notice ? { kind: req.query.kind || 'info', text: req.query.notice } : null;
  res.render('loans/kembali', {
    judulHalaman: 'Pengembalian',
    active: 'pengembalian',
    notice,
  });
});

router.post('/pengembalian', (req, res) => {
  const bookBarcode = (req.body.bookBarcode || '').trim();
  const memberBarcode = (req.body.memberBarcode || '').trim();

  if (!bookBarcode || !memberBarcode) {
    const text = 'Barcode buku dan barcode anggota wajib dipindai/diisi keduanya.';
    return res.redirect(`/pengembalian?notice=${encodeURIComponent(text)}&kind=galat`);
  }

  const result = lib.returnBook(bookBarcode, memberBarcode);
  const kind = result.ok ? 'sukses' : 'galat';
  res.redirect(`/pengembalian?notice=${encodeURIComponent(result.message)}&kind=${kind}`);
});

router.get('/antrean', (req, res) => {
  try {
    const books = store.readAll('books');
    const members = store.readAll('members');
    const reservations = store.readAll('reservations');

    const kelompok = books
      .map((book) => {
        const antrean = lib
          .queueForBook(book.id)
          .map((r) => Object.assign({}, r, { anggota: members.find((m) => m.id === r.memberId) }));
        return { book, antrean };
      })
      .filter((k) => k.antrean.length > 0)
      .sort((a, b) => a.book.judul.localeCompare(b.book.judul));

    res.render('reservations/antrean', {
      judulHalaman: 'Antrean Reservasi',
      active: 'antrean',
      kelompok,
      totalHangus: reservations.filter((r) => r.status === 'hangus').length,
      loadError: null,
    });
  } catch (err) {
    res.status(500).render('reservations/antrean', {
      judulHalaman: 'Antrean Reservasi',
      active: 'antrean',
      kelompok: [],
      totalHangus: 0,
      loadError: err.message,
    });
  }
});

module.exports = router;
