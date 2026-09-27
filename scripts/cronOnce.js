// Memicu job harian (denda berjalan + notifikasi + penghangusan antrean) satu kali,
// tanpa perlu menunggu jadwal node-cron. Dipakai untuk pengujian manual.
// Jalankan dengan: npm run cron:jalankan-sekali

const { runDailyJob } = require('../lib/cron');

const hasil = runDailyJob();
console.log('Job harian dijalankan manual.');
console.log(JSON.stringify(hasil, null, 2));
