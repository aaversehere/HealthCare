# Install HEART CARE

HEART CARE sudah disiapkan sebagai PWA, jadi bisa di-install dari browser modern.

## Laptop

1. Jalankan server lokal:
   ```bash
   node server.js
   ```
2. Buka:
   ```text
   http://localhost:3000
   ```
3. Di Chrome atau Edge, klik ikon install di address bar, lalu pilih install.

## HP dan Tablet

Untuk Android, iPhone, iPad, atau tablet lain, aplikasi harus dibuka dari alamat HTTPS agar fitur install muncul dengan benar.

Cara paling mudah:
1. Upload folder aplikasi ke hosting HTTPS seperti Netlify, Vercel, GitHub Pages, atau hosting kampus/server sendiri.
2. Buka alamat HTTPS itu di browser perangkat.
3. Android Chrome: menu titik tiga, lalu Install app atau Add to Home screen.
4. iPhone/iPad Safari: tombol Share, lalu Add to Home Screen.

Catatan: membuka langsung file `index.html` tidak cukup untuk mode install karena service worker PWA tidak berjalan dari `file://`.
