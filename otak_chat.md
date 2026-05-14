# Dokumentasi Kecerdasan AI Assistant (otak_chat.md)

Dokumen ini mencatat seluruh logika, pemahaman konteks, dan *skill* yang telah ditanamkan ke dalam `src/app/api/chat/route.ts` untuk melayani pengguna ERP Pro.

## 1. Modul Stok & Master Data (Dynamic DB Query)
AI mampu menjawab pertanyaan ketersediaan stok secara *real-time* langsung dari database.

- **Kata Kunci Pemicu:** `"ada berapa"`, `"stok"` (tanpa ada kata `"lihat"`)
- **Proses:**
  1. AI akan membersihkan pertanyaan dari kata sandang (contoh: *ada berapa, tolong, cek, ya*) untuk mengekstrak nama barang.
  2. AI mencari barang di tabel `mhbarang` (Master Barang).
  3. Jika ketemu, AI menghitung total mutasi di tabel `rhlaporanstok` untuk mendapatkan *running balance* (stok akhir) hari ini.
- **Contoh Pertanyaan:**
  - *"stok gula ada berapa?"*
  - *"tolong cek stok minyak ya"*

## 2. Modul Pembelian / Purchasing (Dynamic DB Query)
AI mengenali konteks yang luas terkait siklus pembelian, mulai dari Permintaan (PR) hingga Tagihan (Nota).

**Kata Kunci Pemicu:** `"permintaan"`, `"order"`, `"po"`, `"penerimaan"`, `"nota"`, `"beli"`, `"pembelian"`, `"tagihan"`, `"pemelian"` (dukungan typo)

Kategori pemahaman di Modul Pembelian:

### 2.1. Tracking Status PR Spesifik
- **Logika:** Mengekstrak nomor dokumen dengan format `PR-XXXXXX-XXX`.
- **Aksi:** Cek langsung ke tabel `thbelipermintaan` untuk melihat `status_aktif` dan `status_disetujui`.
- **Contoh Pertanyaan:** *"status PR-202605-001 apa?"*, *"Kenapa PR-202605-002 ditolak?"*

### 2.2. Daftar Permintaan (PR) Pending
- **Logika:** Mencari kata `"pending"`, `"belum diproses"`, atau `"belum approve"` bersamaan dengan `"pr"` atau `"permintaan"`.
- **Aksi:** Menampilkan 5 PR terbaru dari database yang `status_disetujui = 0`.
- **Contoh Pertanyaan:** *"Ada PR yang pending nggak?"*, *"Daftar PR belum diproses"*

### 2.3. Asisten Operasional Pembuatan PR
- **Logika:** Mencari kata `"cara"`, `"buat"`, `"tambah"`, `"edit"`, atau `"batal"`.
- **Aksi:** Memberikan teks panduan (*walkthrough*) cara navigasi UI untuk membuat atau mengedit PR.
- **Contoh Pertanyaan:** *"Cara membuat permintaan pembelian?"*, *"Bisa edit PR yang sudah dikirim?"*

### 2.4. Informasi Kebijakan & Approval
- **Logika:** Mencari kata `"approver"`, `"limit approval"`, atau `"siapa yang belum approve"`.
- **Aksi:** Menjelaskan struktur otorisasi dan cara manajer/supervisor melakukan *approval* di dalam ERP.
- **Contoh Pertanyaan:** *"Siapa approver PR saya?"*, *"Kenapa approval tidak jalan?"*

### 2.5. Rekomendasi Kebutuhan Belanja
- **Logika:** Mencari kata `"hampir habis"`, `"kebutuhan"`, atau `"harus dibeli"`.
- **Aksi:** Mengarahkan pengguna untuk mengecek menu **Laporan Stok Kritis**.
- **Contoh Pertanyaan:** *"Barang apa saja yang hampir habis?"*

### 2.6. Informasi Supplier & Hutang Outstanding
- **Logika:** Mencari kata `"supplier"` atau `"hutang"`.
- **Aksi:** Menampilkan daftar **Top Supplier dengan sisa hutang terbesar** dari tabel `rhlaporanhutang` serta merangkum Nota Pembelian hari ini berdasarkan masing-masing supplier.
- **Contoh Pertanyaan:** *"nota beli dari supplier mana saja"*, *"ada berapa hutang suppliernya"*

### 2.7. Ringkasan Transaksi Harian (Fallback Pembelian)
- **Logika:** Jika pengguna hanya menanyakan informasi umum pembelian, AI akan merangkum seluruh aktivitas di hari itu (Today).
- **Aksi:** Menyajikan balasan berformat **Markdown kaya yang meniru gaya analitis ChatGPT**, menggabungkan total PR, total PO, total PB, nominal Nota tagihan, serta sisipan status *Top Sisa Hutang Supplier* secara komprehensif dalam satu pesan.
  *Catatan: Filter Perusahaan dan Cabang diatur fleksibel (mendukung ID spesifik user aktif maupun record global bernilai 0 atau NULL).*
- **Contoh Pertanyaan:** *"apakah ada pemelian hari ini ?"*, *"info pembelian dong"*

---

## 3. Navigasi Cepat & Mock Responses (Static)
AI juga diprogram untuk mengenali kata kunci umum agar bisa bertindak sebagai *guide* (pemandu) bagi pengguna baru.

- **Posisi Stok / Opname:** Jika user ingin melihat laporan keseluruhan (*"stok per barang"*).
- **Penjualan / Invoice:** Mengarahkan ke Dashboard Utama atau Laporan Penjualan.
- **Proyek / RAB:** Mengarahkan ke Modul Manajemen Proyek.
- **Market Intelligence / Crypto:** Mengarahkan ke Bot Auto FVG (Master Flow AI).
- **Sapaan Alami (Small Talk):** AI bisa membalas sapaan ramah (*"halo"*, *"terima kasih"*).

---

## 4. Pengaturan Otak AI (Hybrid Engine)
Sistem sekarang menyediakan fitur **Pengaturan Otak AI** langsung di antarmuka chat (ikon *Settings* di kanan atas), yang memungkinkan pengguna beralih antara 2 mode eksekusi:

1. **Program Langsung (Native Mode):** Memproses chat secara instan, statis, dan terprogram secara ketat di lokal (cepat tanpa biaya API).
2. **ChatGPT Engine (OpenAI API Mode):** Menginjeksi **skema dan data operasional live database** (rekap mutasi stok & ringkasan dokumen harian) sebagai acuan/konteks dasar ke dalam *System Prompt* model `gpt-4o-mini`. ChatGPT kemudian menyusun gaya bahasa balasan yang sangat alami, profesional, dan kaya fitur tanpa pernah berhalusinasi di luar data aslinya.

---
*Catatan: Dokumen ini sebaiknya diupdate setiap kali ada fitur/modul ERP baru yang diintegrasikan ke dalam otak AI Assistant di file `route.ts`.*
