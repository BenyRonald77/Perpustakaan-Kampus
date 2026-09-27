const express = require('express');
const path = require('path');

const dashboardRoutes = require('./routes/dashboard');
const bookRoutes = require('./routes/books');
const memberRoutes = require('./routes/members');

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

app.use((req, res) => {
  res.status(404).send('Halaman tidak ditemukan.');
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Terjadi kesalahan pada server: ' + err.message);
});

app.listen(PORT, () => {
  console.log(`Perpustakaan Kampus berjalan di http://localhost:${PORT}`);
});

module.exports = app;
