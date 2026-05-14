# Dokumentasi Pengembangan: AI Affiliate Reels Bot (Shopee -> Instagram)

Dokumentasi ini merangkum seluruh proses pembangunan, fitur, dan logika teknis yang diterapkan dalam sistem otomasi konten Shopee Affiliate ke Instagram Reels.

## 1. Ikhtisar Proyek
Membangun sistem otomasi *end-to-end* yang mengambil data produk dari Shopee, menghasilkan konten pemasaran menggunakan AI (Teks & Suara), dan menerbitkannya secara otomatis ke Instagram Reels.

## 2. Fitur Utama & Keunggulan Teknis

### A. Mesin Scraper (Shopee) - Technical Tasks
*   **Hero Image Targeting**: Mengimplementasikan selektor khusus `shopee:heroComponentPaint` untuk memastikan gambar utama produk yang diambil adalah gambar kualitas terbaik tanpa gangguan logo/iklan.
*   **Anti-Bot Bypass**: Menambahkan header browser lengkap (User-Agent, Referer, Accept) agar permintaan download aset gambar tidak diblokir oleh CDN Shopee.
*   **Auto-Resizing**: Menambahkan logika manipulasi URL gambar untuk memaksa resolusi tinggi (`900x900`) dan format JPG agar kompatibel dengan Instagram.
*   **Video Extraction**: Mengembangkan algoritma untuk mendeteksi tag `<video>` dan mengekstrak URL video mentah dari halaman produk.
*   **Data Cleaning Engine**: Membangun parser otomatis untuk membersihkan data "kotor" Shopee (misal: mengubah teks "1,2RB Terjual" menjadi angka murni `1200` agar bisa dihitung oleh sistem).

### B. Content Engine (AI Service)
*   **Script & Caption**: Menggunakan GPT-4o untuk membuat script video yang viral dan caption yang menjual.
*   **Link Affiliate Otomatis**: AI secara cerdas menyisipkan link produk Shopee di dalam caption dengan *Call to Action* (CTA) yang menarik.
*   **Voice AI Opsional**: Integrasi OpenAI TTS (Text-to-Speech) dengan opsi aktif/mati sesuai keinginan user.

### C. Instagram Uploader (Otomasi UI)
*   **Handling Popup**: Bot mampu mendeteksi dan menutup berbagai popup Instagram (Edukasi Reels, Notifikasi, dll).
*   **Sistem Pemulihan (Recovery)**: Jika tidak sengaja muncul dialog "Discard post?", bot otomatis menekan "Cancel" untuk menyelamatkan proses upload.
*   **Flow Lengkap**: Melakukan navigasi Next -> Next -> Share -> Done secara otomatis tanpa intervensi manual.

### D. Database & Inventory (MySQL)
*   **Persistent Cookies**: Cookies Shopee dan Instagram disimpan di database (`ai_reels_settings`). Jika halaman di-refresh atau server restart, bot tetap dalam status login.
*   **Modul Inventory**: Produk yang lolos screening disimpan di tabel `ai_reels_products` sebagai gudang konten siap posting.
*   **Robustness (Raw SQL)**: Menggunakan perintah SQL langsung (`$queryRaw`) untuk interaksi database, memastikan sistem tetap jalan meskipun Prisma Client belum di-generate.

### E. Auto-Hunt Viral (New!)
*   **Pencarian Otomatis**: Bot bisa mencari sendiri produk tren berdasarkan kata kunci (misal: "viral", "racun shopee").
*   **Harvesting Masal**: Mengumpulkan puluhan link sekaligus dari halaman pencarian Shopee dengan teknik *aggressive scrolling*.
*   **Dua Tahap (Discovery & Screening)**: Memisahkan proses pencarian link dan pemeriksaan video untuk menghindari *timeout* dan memastikan kestabilan koneksi.

## 3. Log Perubahan & Perbaikan Penting
1.  **Perbaikan Gambar**: Mengatasi masalah gambar hoodie yang salah dengan sistem *priority-hero-targeting*.
2.  **Fix Extension**: Mengatasi error upload Instagram akibat format file WebP dengan deteksi ekstensi dinamis.
3.  **Logika "Done"**: Menambahkan klik pada tombol "Done" di akhir upload agar modal Instagram tertutup sempurna.
4.  **Sync Database**: Membangun mekanisme `syncCookies` yang memulihkan file sesi lokal dari data MySQL setiap kali bot dijalankan.
5.  **Fix Timeout**: Memecah proses Auto-Hunt menjadi dua tahap untuk menghindari error "Failed to fetch" pada browser.

## 4. Struktur Database Utama (MySQL)
*   `ai_reels_settings`: Penyimpanan Cookies & Konfigurasi.
*   `ai_reels_products`: Inventory produk hasil screening.
*   `ai_reels_history`: Jejak postingan (Log keberhasilan upload).

## 5. Panduan Penggunaan
1.  **Set Cookies**: Masukkan cookies Shopee & Instagram di tab "Cookies & Settings".
2.  **Auto-Hunt**: Ketik kata kunci (misal: "viral") dan klik **"AUTO-HUNT VIRAL"**. Bot akan mencari produk terbaik untuk Anda.
3.  **Manual Bulk**: Tempel list link Shopee di tab "Product Inventory", klik "Run Screening".
4.  **Inventory Management**: Cek tab "Product Inventory", pilih produk bertanda "Video Ready".
5.  **Generate**: Klik tombol petir (Zap) untuk mulai membuat video dan upload otomatis.

## 6. Detail Pengerjaan Task Shopee
| Task ID | Nama Tugas | Status | Deskripsi Teknis |
| :--- | :--- | :--- | :--- |
| SH-01 | Scraper Optimization | Selesai | Implementasi selektor hero-component & bypass CDN headers. |
| SH-02 | Cookie Persistence | Selesai | Integrasi MySQL untuk penyimpanan sesi Shopee permanen. |
| SH-03 | Bulk Screener | Selesai | Mesin pemroses link masal dengan filtrasi video & rating. |
| SH-04 | Auto-Hunt Engine | Selesai | Bot pencari produk viral otomatis berbasis kata kunci. |
| SH-05 | Data Normalization | Selesai | Konversi otomatis format harga, terjual, dan rating ke tipe data database. |

---
*Dikembangkan oleh Antigravity AI Coding Assistant - 2026*
