# Shopee Auto Checkout Bot

Bot otomasi checkout Shopee yang dibangun dengan Playwright, dirancang untuk kecepatan dan kemudahan penggunaan.

## Struktur Project

- `config/`: Konfigurasi produk dan selector.
- `storage/`: Tempat penyimpanan session (`state.json`), log, dan screenshot.
- `src/`: Source code utama (Service, Utils, Workers).

## Persiapan

1. Instal dependensi:
   ```bash
   yarn install
   ```
2. Setup environment:
   Buat file `.env` (atau gunakan default):
   ```env
   HEADLESS=false
   LOG_LEVEL=info
   ```

## Cara Penggunaan

### 1. Login Manual
Anda perlu login sekali untuk menyimpan session.
```bash
node src/login.js
```
Jendela browser akan terbuka, silakan login sampai masuk ke beranda. Setelah itu bot akan otomatis menyimpan session ke `storage/state.json`.

### 2. Konfigurasi Produk
Edit file `config/products.js` untuk menambahkan link produk dan waktu checkout.

### 3. Jalankan Bot
```bash
node src/checkout.js
```

## Fitur Unggulan
- **Scheduler Presisi**: Mengeksekusi tepat pada waktu yang ditentukan (milidetik).
- **Session Reuse**: Tidak perlu login berulang kali.
- **Retry Logic**: Otomatis klik ulang jika gagal.
- **Error Screenshot**: Menyimpan bukti visual jika terjadi kegagalan.

## Troubleshooting
- **Captcha**: Jika terdeteksi captcha, bot akan berhenti sejenak dan memberi peringatan di log. Anda harus menyelesaikannya secara manual jika dalam mode headful.
- **Selector Update**: Jika Shopee mengubah tampilannya, update selector di `config/selectors.js`.

## TODO
- [ ] Queue detection & handling
- [ ] WebSocket monitoring for faster trigger
- [ ] Multi-account support
- [ ] Proxy rotation
- [ ] Anti-popup handler (pop-up promo/iklan)
