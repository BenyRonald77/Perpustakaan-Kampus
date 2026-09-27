// Job harian: pembaruan denda berjalan, notifikasi pengingat, dan penghangusan
// alokasi antrean yang lewat batas ambil. Fungsi runDailyJob() adalah satu-satunya
// tempat logika ini ditulis; dipanggil baik oleh penjadwal node-cron (server.js)
// maupun oleh pemicu manual (scripts/cronOnce.js, endpoint POST /cron/jalankan-sekali),
// supaya kedua jalur terverifikasi identik.

const store = require('./store');
const lib = require('./library');

function runDailyJob() {
  const settings = store.getSettings();
  const today = lib.todayISODate();
  const loans = store.readAll('loans');
  const notifs = store.readAll('notifikasi');

  let loansDiperbarui = 0;
  let notifikasiDibuat = 0;
  const rincian = [];

  loans
    .filter((loan) => loan.status === 'aktif')
    .forEach((loan) => {
      const lateDays = lib.diffDaysCeil(loan.tanggalJatuhTempo, today);

      if (lateDays > 0) {
        const nominalBaru = lateDays * settings.dendaPerHari;
        if (loan.dendaBerjalan !== nominalBaru) {
          store.update('loans', loan.id, { dendaBerjalan: nominalBaru });
          loansDiperbarui += 1;
          rincian.push(`Denda peminjaman ${loan.id} diperbarui menjadi Rp${nominalBaru.toLocaleString('id-ID')} (${lateDays} hari telat).`);
        }
        const sudahAdaNotifOverdue = notifs.some((n) => n.loanId === loan.id && n.tipe === 'overdue');
        if (!sudahAdaNotifOverdue) {
          store.insert('notifikasi', {
            loanId: loan.id,
            memberId: loan.memberId,
            tipe: 'overdue',
            pesan: `Peminjaman jatuh tempo ${loan.tanggalJatuhTempo} kini terlambat ${lateDays} hari. Denda berjalan Rp${nominalBaru.toLocaleString('id-ID')}.`,
            dibuatPada: new Date().toISOString(),
            dibaca: false,
          });
          notifikasiDibuat += 1;
          rincian.push(`Notifikasi overdue dibuat untuk peminjaman ${loan.id}.`);
        }
      } else {
        const daysToDue = lib.diffDaysCeil(today, loan.tanggalJatuhTempo);
        if (daysToDue === settings.batasAmbilAntreanHari) {
          const sudahAdaNotifH2 = notifs.some((n) => n.loanId === loan.id && n.tipe === 'pengingat_h2');
          if (!sudahAdaNotifH2) {
            store.insert('notifikasi', {
              loanId: loan.id,
              memberId: loan.memberId,
              tipe: 'pengingat_h2',
              pesan: `Pengingat: peminjaman jatuh tempo pada ${loan.tanggalJatuhTempo} (${daysToDue} hari lagi).`,
              dibuatPada: new Date().toISOString(),
              dibaca: false,
            });
            notifikasiDibuat += 1;
            rincian.push(`Notifikasi pengingat H-2 dibuat untuk peminjaman ${loan.id}.`);
          }
        }
      }
    });

  let reservasiHangus = 0;
  const reservations = store.readAll('reservations');
  reservations
    .filter((r) => r.status === 'siap_diambil' && r.batasAmbil && r.batasAmbil < today)
    .forEach((r) => {
      store.update('reservations', r.id, { status: 'hangus' });
      reservasiHangus += 1;
      rincian.push(`Alokasi antrean ${r.id} hangus (lewat batas ambil ${r.batasAmbil}).`);
      const allocated = lib.allocateNextInQueue(r.bookId);
      if (allocated) {
        rincian.push(`Antrean berikutnya untuk buku ${r.bookId} dialokasikan (batas ambil baru ${allocated.batasAmbil}).`);
      }
    });

  return {
    dijalankanPada: new Date().toISOString(),
    tanggalAcuan: today,
    loansDiperbarui,
    notifikasiDibuat,
    reservasiHangus,
    rincian,
  };
}

module.exports = { runDailyJob };
