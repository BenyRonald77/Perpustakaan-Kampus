const express = require('express');
const store = require('../lib/store');
const lib = require('../lib/library');

const router = express.Router();

router.get('/', (req, res) => {
  try {
    const books = store.readAll('books');
    const members = store.readAll('members');
    const loans = store.readAll('loans');
    const reservations = store.readAll('reservations');

    const peminjamanAktif = loans.filter((l) => l.status === 'aktif');
    const today = lib.todayISODate();
    const overdue = peminjamanAktif.filter((l) => l.tanggalJatuhTempo < today);
    const antreanMenunggu = reservations.filter((r) => r.status === 'menunggu');
    const totalDendaBerjalan = peminjamanAktif.reduce((sum, l) => sum + (l.dendaBerjalan || 0), 0);

    res.render('dashboard', {
      judulHalaman: 'Dasbor',
      active: 'dashboard',
      loadError: null,
      ringkasan: {
        totalBuku: books.length,
        totalAnggota: members.length,
        peminjamanAktif: peminjamanAktif.length,
        overdue: overdue.length,
        antreanMenunggu: antreanMenunggu.length,
        totalDendaBerjalan,
      },
      belumAdaData: books.length === 0 && members.length === 0,
    });
  } catch (err) {
    res.status(500).render('dashboard', {
      judulHalaman: 'Dasbor',
      active: 'dashboard',
      loadError: err.message,
      ringkasan: null,
      belumAdaData: false,
    });
  }
});

module.exports = router;
