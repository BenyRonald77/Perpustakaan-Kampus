const express = require('express');
const store = require('../lib/store');
const lib = require('../lib/library');

const router = express.Router();

function loadMemberForEdit(req, res, next) {
  try {
    const member = store.findById('members', req.params.id);
    if (!member) {
      return res.status(404).render('members/form', {
        judulHalaman: 'Anggota tidak ditemukan',
        active: 'anggota',
        mode: 'edit',
        member: null,
        errors: [],
        notFound: true,
      });
    }
    req.member = member;
    next();
  } catch (err) {
    next(err);
  }
}

router.get('/', (req, res) => {
  try {
    const members = store.readAll('members').sort((a, b) => a.nama.localeCompare(b.nama));
    res.render('members/index', {
      judulHalaman: 'Anggota',
      active: 'anggota',
      members,
      notice: req.query.notice ? { kind: req.query.kind || 'info', text: req.query.notice } : null,
      loadError: null,
    });
  } catch (err) {
    res.status(500).render('members/index', {
      judulHalaman: 'Anggota',
      active: 'anggota',
      members: [],
      notice: null,
      loadError: err.message,
    });
  }
});

router.get('/baru', (req, res) => {
  res.render('members/form', {
    judulHalaman: 'Tambah Anggota',
    active: 'anggota',
    mode: 'baru',
    member: { nama: '', nim: '' },
    errors: [],
    notFound: false,
  });
});

router.post('/', (req, res) => {
  const nama = (req.body.nama || '').trim();
  const nim = (req.body.nim || '').trim();
  const errors = [];

  if (!nama) errors.push('Nama anggota wajib diisi.');
  if (!nim) errors.push('NIM/barcode anggota wajib diisi.');
  if (nim && lib.findMemberByNim(nim)) {
    errors.push(`NIM/barcode "${nim}" sudah dipakai anggota lain. Barcode anggota harus unik.`);
  }

  if (errors.length > 0) {
    return res.status(400).render('members/form', {
      judulHalaman: 'Tambah Anggota',
      active: 'anggota',
      mode: 'baru',
      member: { nama, nim },
      errors,
      notFound: false,
    });
  }

  store.insert('members', { nama, nim });
  res.redirect(`/anggota?notice=${encodeURIComponent(`Anggota "${nama}" berhasil ditambahkan.`)}&kind=sukses`);
});

router.get('/:id/edit', loadMemberForEdit, (req, res) => {
  if (!req.member) return;
  res.render('members/form', {
    judulHalaman: `Ubah Anggota - ${req.member.nama}`,
    active: 'anggota',
    mode: 'edit',
    member: req.member,
    errors: [],
    notFound: false,
  });
});

router.post('/:id', loadMemberForEdit, (req, res) => {
  if (!req.member) return;
  const nama = (req.body.nama || '').trim();
  const nim = (req.body.nim || '').trim();
  const errors = [];

  if (!nama) errors.push('Nama anggota wajib diisi.');
  if (!nim) errors.push('NIM/barcode anggota wajib diisi.');
  const existing = nim ? lib.findMemberByNim(nim) : null;
  if (existing && existing.id !== req.member.id) {
    errors.push(`NIM/barcode "${nim}" sudah dipakai anggota lain. Barcode anggota harus unik.`);
  }

  if (errors.length > 0) {
    return res.status(400).render('members/form', {
      judulHalaman: `Ubah Anggota - ${req.member.nama}`,
      active: 'anggota',
      mode: 'edit',
      member: Object.assign({}, req.member, { nama, nim }),
      errors,
      notFound: false,
    });
  }

  store.update('members', req.member.id, { nama, nim });
  res.redirect(`/anggota?notice=${encodeURIComponent(`Anggota "${nama}" berhasil diperbarui.`)}&kind=sukses`);
});

router.post('/:id/hapus', (req, res) => {
  const member = store.findById('members', req.params.id);
  if (!member) {
    return res.redirect(`/anggota?notice=${encodeURIComponent('Anggota tidak ditemukan.')}&kind=galat`);
  }
  const loansAktif = store.readAll('loans').some((l) => l.memberId === member.id && l.status === 'aktif');
  const punyaAntrean = store
    .readAll('reservations')
    .some((r) => r.memberId === member.id && (r.status === 'menunggu' || r.status === 'siap_diambil'));
  if (loansAktif || punyaAntrean) {
    return res.redirect(
      `/anggota?notice=${encodeURIComponent(`Anggota "${member.nama}" tidak bisa dihapus karena masih punya peminjaman aktif atau antrean berjalan.`)}&kind=galat`
    );
  }
  store.remove('members', member.id);
  res.redirect(`/anggota?notice=${encodeURIComponent(`Anggota "${member.nama}" dihapus.`)}&kind=sukses`);
});

module.exports = router;
