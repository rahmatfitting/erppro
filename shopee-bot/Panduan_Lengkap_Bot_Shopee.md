# 🚀 Panduan Lengkap Shopee Auto Checkout Bot

Panduan ini berisi instruksi teknis dan strategi untuk menggunakan bot otomasi checkout Shopee agar mendapatkan peluang menang maksimal, terutama saat Flash Sale.

---

## 🛠 1. Persiapan Awal (Setup)

1. **Instalasi Dependensi**:
   Buka terminal di dalam folder project dan jalankan:
   ```bash
   yarn install
   ```
2. **Setup Environment**:
   Pastikan file `shopee-bot/.env` sudah berisi:
   ```env
   HEADLESS=false
   LOG_LEVEL=info
   ```
   *Catatan: `HEADLESS=false` wajib agar jendela browser terlihat dan Anda bisa memantau prosesnya.*

---

## 🔑 2. Tahap Login (Hanya Perlu Sekali)

Bot menggunakan sistem **Session Reuse**. Anda harus menyimpan login Anda ke dalam file `state.json`.

1. Jalankan perintah login:
   ```bash
   node shopee-bot/src/login.js
   ```
2. Jendela browser akan terbuka. **Silakan login secara manual** menggunakan akun Anda (HP/Email/Password).
3. Setelah masuk ke halaman beranda Shopee, tunggu 5 detik. Bot akan otomatis menutup browser dan menyimpan session Anda di `shopee-bot/storage/state.json`.

---

## ⚙️ 3. Konfigurasi Produk (Target Belanja)

Buka file `shopee-bot/config/products.js`. Contoh pengisian:

```javascript
module.exports = [
  {
    name: 'Flash Sale iPhone Rp 1',
    url: 'https://shopee.co.id/link-produk-target-disini',
    checkoutTime: '2026-05-10 00:00:00', // Waktu dimulainya Flash Sale
    variant: 'Midnight, 128GB', // Sesuaikan dengan nama varian di Shopee
    quantity: 1
  }
];
```

---

## 🚀 4. Menjalankan Bot

Setelah login tersimpan dan produk dikonfigurasi, jalankan bot dengan perintah:
```bash
node shopee-bot/src/checkout.js
```
Bot akan memunculkan **Countdown (hitung mundur)** di terminal. Anda bisa menjalankan bot 2-5 menit sebelum waktu target.

---

## ❓ 5. FAQ (Tanya Jawab Strategi)

### **Apakah bot ini hanya untuk Flash Sale?**
**TIDAK.** Bot ini bisa digunakan untuk:
- Flash Sale (Limited Stock/Time).
- Rilis Produk Terbatas (Limited Drop).
- Tiket Konser atau Merchandise.
- Belanja rutin otomatis pada jam tertentu.
*Jika ingin belanja barang biasa tanpa menunggu, cukup ganti `checkoutTime` ke waktu yang sudah lewat, bot akan langsung checkout saat dijalankan.*

### **Apakah produk harus dimasukkan ke keranjang dulu?**
**TIDAK PERLU.** Bot menggunakan metode **"Beli Sekarang" (Direct Buy)**. 
- Bot akan membuka link produk secara langsung.
- Memilih varian otomatis.
- Langsung masuk ke halaman Checkout.
Ini adalah jalur tercepat karena tidak terhambat oleh barang lain di keranjang.

### **Bagaimana jika ada Captcha?**
Bot akan memberikan peringatan di log. Karena kita menggunakan mode `HEADLESS=false`, Anda bisa membantu menyelesaikan captcha secara manual di jendela browser jika bot terhenti.

### **Metode Pembayaran & Alamat?**
Bot akan menggunakan **Alamat Utama** dan **Metode Pembayaran Terakhir** yang Anda gunakan di akun Shopee tersebut. 
- **Saran**: Pastikan Alamat dan Metode Pembayaran (misal: ShopeePay/COD) sudah tersetting sebagai **default** di aplikasi/web Shopee Anda sebelum menjalankan bot.

### **Apakah bisa menggunakan Voucher?**
**BISA.** Bot mendukung dua jenis voucher di Shopee:
1.  **Voucher Klaim (Auto-Apply)**: Jika voucher sudah Anda klaim di aplikasi/web (misal voucher gratis ongkir jam 20.00), Shopee akan otomatis memilihkan voucher terbaik saat bot masuk ke halaman checkout. 
    *   *Strategi*: Klaim voucher di HP tepat waktu, bot akan otomatis menggunakannya.
2.  **Voucher Kode (Manual Input)**: Jika Anda memiliki kode voucher khusus (misal: `FLASHSALE20`), Anda bisa memasukkannya ke file `config/products.js` pada bagian `voucherCode`. Bot akan otomatis mengetikkan dan memakai kode tersebut saat proses checkout berlangsung.

---

## 💡 6. Tips Menang Flash Sale (Gold Rules)

1. **Internet Stabil**: Pastikan koneksi internet kencang dan stabil.
2. **Cek Saldo**: Jika menggunakan ShopeePay, pastikan saldo cukup agar tidak gagal di tahap akhir.
3. **Varian Harus Akurat**: Nama varian di file config harus **PERSIS** sama dengan yang tertulis di web Shopee (termasuk huruf besar/kecilnya).
4. **Alamat Default**: Pastikan Alamat Utama sudah benar untuk menghindari error perhitungan ongkir.
5. **Standby**: Nyalakan bot minimal 2 menit sebelum jam target agar bot punya waktu untuk inisialisasi browser dan memuat halaman produk (pre-loading).

---
*Bot ini dibuat untuk tujuan otomasi pribadi. Gunakan dengan bijak.*
