const express = require('express');
const store = require('../lib/store');
const lib = require('../lib/library');

const router = express.Router();

router.get('/laporan', (req, res) => {
  try {
    const books = store.readAll('books');
    const members = store.readAll('members');
    const loans = store.readAll('loans');
    const today = lib.todayISODate();

    const aktif = loans
      .filter((l) => l.status === 'aktif')
      .map((l) => {
        const book = books.find((b) => b.id === l.bookId);
        const member = members.find((m) => m.id === l.memberId);
        const overdue = l.tanggalJatuhTempo < today;
        const hariTelat = overdue ? lib.diffDaysCeil(l.tanggalJatuhTempo, today) : 0;
        return Object.assign({}, l, { book, member, overdue, hariTelat });
      })
      .sort((a, b) => {
        if (a.overdue !== b.overdue) return a.overdue ? -1 : 1;
        return a.tanggalJatuhTempo.localeCompare(b.tanggalJatuhTempo);
      });

    const totalDendaPerAnggota = {};
    aktif.forEach((l) => {
      if (l.dendaBerjalan > 0 && l.member) {
        totalDendaPerAnggota[l.member.id] = totalDendaPerAnggota[l.member.id] || { nama: l.member.nama, total: 0 };
        totalDendaPerAnggota[l.member.id].total += l.dendaBerjalan;
      }
    });

    res.render('reports/laporan', {
      judulHalaman: 'Laporan Peminjaman',
      active: 'laporan',
      aktif,
      overdueCount: aktif.filter((l) => l.overdue).length,
      totalDendaPerAnggota: Object.values(totalDendaPerAnggota).sort((a, b) => b.total - a.total),
      loadError: null,
    });
  } catch (err) {
    res.status(500).render('reports/laporan', {
      judulHalaman: 'Laporan Peminjaman',
      active: 'laporan',
      aktif: [],
      overdueCount: 0,
      totalDendaPerAnggota: [],
      loadError: err.message,
    });
  }
});

router.get('/notifikasi', (req, res) => {
  try {
    const notifs = store.readAll('notifikasi');
    const loans = store.readAll('loans');
    const books = store.readAll('books');
    const members = store.readAll('members');

    const daftar = notifs
      .map((n) => {
        const loan = loans.find((l) => l.id === n.loanId);
        const book = loan ? books.find((b) => b.id === loan.bookId) : null;
        const member = members.find((m) => m.id === n.memberId);
        return Object.assign({}, n, { book, member });
      })
      .sort((a, b) => (b.dibuatPada || '').localeCompare(a.dibuatPada || ''));

    res.render('reports/notifikasi', {
      judulHalaman: 'Notifikasi',
      active: 'notifikasi',
      daftar,
      loadError: null,
    });
  } catch (err) {
    res.status(500).render('reports/notifikasi', {
      judulHalaman: 'Notifikasi',
      active: 'notifikasi',
      daftar: [],
      loadError: err.message,
    });
  }
});

module.exports = router;
