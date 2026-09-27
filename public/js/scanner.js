// Perilaku form pemindaian barcode: auto-focus field pertama, Enter berpindah ke
// field berikutnya (meniru scanner USB yang mengirim Enter setelah setiap kode),
// dan submit otomatis saat Enter ditekan di field terakhir. Juga menampilkan
// keadaan "memuat" yang jujur (nonaktifkan tombol + spinner) selama form benar-benar
// dikirim ke server, bukan animasi dekoratif tanpa proses di baliknya.
(function () {
  function autoFocusFirst() {
    var target = document.querySelector('[data-autofocus]');
    if (target) target.focus();
  }

  function wireScanFields() {
    var fields = document.querySelectorAll('[data-scan-next]');
    fields.forEach(function (field) {
      field.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        var nextSelector = field.getAttribute('data-scan-next');
        if (nextSelector) {
          var next = document.querySelector(nextSelector);
          if (next) {
            next.focus();
            return;
          }
        }
        var form = field.closest('form');
        if (form) form.requestSubmit ? form.requestSubmit() : form.submit();
      });
    });
  }

  function wireLoadingState() {
    var forms = document.querySelectorAll('form[data-loading-label]');
    forms.forEach(function (form) {
      form.addEventListener('submit', function () {
        var button = form.querySelector('button[type="submit"]');
        if (!button) return;
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        var label = form.getAttribute('data-loading-label') || 'Memproses...';
        button.innerHTML = '<span class="spinner" aria-hidden="true"></span> ' + label;
      });
    });
  }

  // Trigger cron manual via fetch, dengan keadaan memuat dan galat yang nyata
  // (bukan sekadar hiasan) karena benar-benar menunggu respons server.
  function wireCronTrigger() {
    var button = document.querySelector('[data-cron-trigger]');
    if (!button) return;
    var resultBox = document.querySelector('[data-cron-result]');
    button.addEventListener('click', function () {
      button.disabled = true;
      var originalText = button.textContent;
      button.innerHTML = '<span class="spinner" aria-hidden="true"></span> Menjalankan job...';
      if (resultBox) {
        resultBox.innerHTML = '';
      }
      fetch('/cron/jalankan-sekali', { method: 'POST', headers: { Accept: 'application/json' } })
        .then(function (res) {
          if (!res.ok) throw new Error('Server merespons status ' + res.status);
          return res.json();
        })
        .then(function (data) {
          if (resultBox) {
            resultBox.innerHTML =
              '<div class="notice notice-sukses" role="status">Job selesai dijalankan pada ' +
              data.dijalankanPada +
              '. Peminjaman diperbarui: ' +
              data.loansDiperbarui +
              ', notifikasi dibuat: ' +
              data.notifikasiDibuat +
              ', antrean hangus: ' +
              data.reservasiHangus +
              '. Muat ulang halaman untuk melihat data terbaru.</div>';
          }
        })
        .catch(function (err) {
          if (resultBox) {
            resultBox.innerHTML =
              '<div class="notice notice-galat" role="alert">Gagal menjalankan job: ' +
              err.message +
              '. Coba lagi, atau jalankan `npm run cron:jalankan-sekali` dari terminal.</div>';
          }
        })
        .finally(function () {
          button.disabled = false;
          button.textContent = originalText;
        });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    autoFocusFirst();
    wireScanFields();
    wireLoadingState();
    wireCronTrigger();
  });
})();
