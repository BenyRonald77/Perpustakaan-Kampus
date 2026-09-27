const express = require('express');
const store = require('../lib/store');
const lib = require('../lib/library');

const router = express.Router();

function loadBookForEdit(req, res, next) {
  try {
    const book = store.findById('books', req.params.id);
    if (!book) {
      return res.status(404).render('books/form', {
        judulHalaman: 'Buku tidak ditemukan',
        active: 'buku',
        mode: 'edit',
        book: null,
        errors: [],
        notFound: true,
      });
    }
    req.book = book;
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/', (req, res) => {
  try {
    const books = lib.listBooksDecorated().sort((a, b) => a.judul.localeCompare(b.judul));
    res.render('books/index', {
      judulHalaman: 'Buku',
      active: 'buku',
      books,
      notice: req.query.notice ? { kind: req.query.kind || 'info', text: req.query.notice } : null,
      loadError: null,
    });
  } catch (err) {
    res.status(500).render('books/index', {
      judulHalaman: 'Buku',
      active: 'buku',
      books: [],
      notice: null,
      loadError: err.message,
    });
  }
});

router.get('/baru', (req, res) => {
  res.render('books/form', {
    judulHalaman: 'Tambah Buku',
    active: 'buku',
    mode: 'baru',
    book: { judul: '', barcode: '', totalEksemplar: 1 },
    errors: [],
    notFound: false,
  });
});

router.post('/', (req, res) => {
  const judul = (req.body.judul || '').trim();
  const barcode = (req.body.barcode || '').trim();
  const totalEksemplar = parseInt(req.body.totalEksemplar, 10);
  const errors = [];

  if (!judul) errors.push('Judul buku wajib diisi.');
  if (!barcode) errors.push('Barcode buku wajib diisi.');
  if (!Number.isInteger(totalEksemplar) || totalEksemplar < 1) {
    errors.push('Total eksemplar wajib berupa angka bulat minimal 1.');
  }
  if (barcode && lib.findBookByBarcode(barcode)) {
    errors.push(`Barcode "${barcode}" sudah dipakai buku lain. Barcode harus unik.`);
  }

  if (errors.length > 0) {
    return res.status(400).render('books/form', {
      judulHalaman: 'Tambah Buku',
      active: 'buku',
      mode: 'baru',
      book: { judul, barcode, totalEksemplar: req.body.totalEksemplar },
      errors,
      notFound: false,
    });
  }

  store.insert('books', { judul, barcode, totalEksemplar });
  res.redirect(`/buku?notice=${encodeURIComponent(`Buku "${judul}" berhasil ditambahkan.`)}&kind=sukses`);
});

router.get('/:id/edit', loadBookForEdit, (req, res) => {
  if (!req.book) return; // sudah dirender oleh loadBookForEdit
  res.render('books/form', {
    judulHalaman: `Ubah Buku - ${req.book.judul}`,
    active: 'buku',
    mode: 'edit',
    book: req.book,
    errors: [],
    notFound: false,
  });
});

router.post('/:id', loadBookForEdit, (req, res) => {
  if (!req.book) return;
  const judul = (req.body.judul || '').trim();
  const barcode = (req.body.barcode || '').trim();
  const totalEksemplar = parseInt(req.body.totalEksemplar, 10);
  const errors = [];

  if (!judul) errors.push('Judul buku wajib diisi.');
  if (!barcode) errors.push('Barcode buku wajib diisi.');
  if (!Number.isInteger(totalEksemplar) || totalEksemplar < 1) {
    errors.push('Total eksemplar wajib berupa angka bulat minimal 1.');
  }
  const existing = barcode ? lib.findBookByBarcode(barcode) : null;
  if (existing && existing.id !== req.book.id) {
    errors.push(`Barcode "${barcode}" sudah dipakai buku lain. Barcode harus unik.`);
  }
  const eksemplarTerpakai = req.book.totalEksemplar - lib.computeAvailable(req.book);
  if (Number.isInteger(totalEksemplar) && totalEksemplar < eksemplarTerpakai) {
    errors.push(`Total eksemplar tidak boleh kurang dari ${eksemplarTerpakai} (sedang dipinjam/dialokasikan antrean saat ini).`);
  }

  if (errors.length > 0) {
    return res.status(400).render('books/form', {
      judulHalaman: `Ubah Buku - ${req.book.judul}`,
      active: 'buku',
      mode: 'edit',
      book: Object.assign({}, req.book, { judul, barcode, totalEksemplar: req.body.totalEksemplar }),
      errors,
      notFound: false,
    });
  }

  store.update('books', req.book.id, { judul, barcode, totalEksemplar });
  res.redirect(`/buku?notice=${encodeURIComponent(`Buku "${judul}" berhasil diperbarui.`)}&kind=sukses`);
});

router.post('/:id/hapus', (req, res) => {
  const book = store.findById('books', req.params.id);
  if (!book) {
    return res.redirect(`/buku?notice=${encodeURIComponent('Buku tidak ditemukan.')}&kind=galat`);
  }
  const loansAktif = store.readAll('loans').some((l) => l.bookId === book.id && l.status === 'aktif');
  const punyaAntrean = store
    .readAll('reservations')
    .some((r) => r.bookId === book.id && (r.status === 'menunggu' || r.status === 'siap_diambil'));
  if (loansAktif || punyaAntrean) {
    return res.redirect(
      `/buku?notice=${encodeURIComponent(`Buku "${book.judul}" tidak bisa dihapus karena masih ada peminjaman aktif atau antrean berjalan.`)}&kind=galat`
    );
  }
  store.remove('books', book.id);
  res.redirect(`/buku?notice=${encodeURIComponent(`Buku "${book.judul}" dihapus.`)}&kind=sukses`);
});

module.exports = router;
