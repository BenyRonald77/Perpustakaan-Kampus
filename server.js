const express = require('express');
const path = require('path');
const cron = require('node-cron');

const dashboardRoutes = require('./routes/dashboard');
const bookRoutes = require('./routes/books');
const memberRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const reportRoutes = require('./routes/reports');
const { runDailyJob } = require('./lib/cron');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', dashboardRoutes);
app.use('/buku', bookRoutes);
app.use('/anggota', memberRoutes);
app.use('/', loanRoutes);
app.use('/', reportRoutes);

// Pemicu manual job harian (denda berjalan + notifikasi + penghangusan antrean),
// dipakai untuk pengujian tanpa menunggu jadwal cron. Logikanya identik dengan
// job terjadwal di bawah (keduanya memanggil lib/cron.js:runDailyJob).
app.post('/cron/jalankan-sekali', (req, res) => {
  try {
    const hasil = runDailyJob();
    res.json(hasil);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan.');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Terjadi kesalahan pada server: ' + err.message);
});

// Job harian terjadwal: 00:05 setiap hari (waktu server). Menjalankan fungsi yang
// sama persis dengan pemicu manual di atas dan skrip scripts/cronOnce.js.
cron.schedule('5 0 * * *', () => {
  const hasil = runDailyJob();
  console.log(`[cron] Job harian dijalankan otomatis pada ${hasil.dijalankanPada}: ${hasil.loansDiperbarui} peminjaman diperbarui, ${hasil.notifikasiDibuat} notifikasi dibuat, ${hasil.reservasiHangus} antrean hangus.`);
});

app.listen(PORT, () => {
  console.log(`Perpustakaan Kampus berjalan di http://localhost:${PORT}`);
});

module.exports = app;
