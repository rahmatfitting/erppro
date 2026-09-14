# AGENTS.md

Panduan dan dokumentasi riwayat implementasi fitur untuk AI Agent yang bekerja pada repositori **ERP Pro - Next.js Frontend**.

---

## 📅 Riwayat Perubahan & Fitur (Changelog)

### [2026-09-12] - Hedge Fund Buy Radar & Binance Futures 1-Click Order Execution

#### 1. Menu Baru: Hedge Fund Buy Radar (`/crypto/hedgefund-buy`)
- **Deskripsi:** Menu pemantauan kuantitatif pasar derivatif kripto yang dirancang berdasarkan data institusional 8 metrik derivatif Binance Futures untuk menyaring koin yang paling berpotensi untuk posisi **BUY / Long**.
- **8 Metrik Derivatif yang Dipantau:**
  1. **Minat Terbuka (Open Interest & Notional Value):** Akumulasi kontrak aktif di pasar.
  2. **Rasio Long/Short Top Trader (Akun):** Sentimen trader besar berdasarkan jumlah akun.
  3. **Rasio Long/Short Top Trader (Posisi):** Dominasi nominal modal modal paus (*whale*) di posisi Long vs Short.
  4. **Rasio Long/Short Global:** Distribusi trader ritel vs institusi.
  5. **Volume Pembelian/Penjualan Taker (Taker Buy/Sell Ratio):** Tekanan beli agresif *market order*.
  6. **Basis & Harga Mark:** Selisih harga futures terhadap indeks spot (Diskon/Premium).
  7. **Tingkat Pendanaan Arbitrase (Funding Rate):** Sentimen biaya pendanaan derivatif (termasuk deteksi *negative funding* untuk potensi *Short Squeeze*).
  8. **Grafik Harga & Candlestick:** Aksi harga real-time.
- **Kecerdasan Kuantitatif Hedge Fund:**
  - Algoritma **Alpha Score (0–100)** untuk memprioritaskan koin dengan konvinsi tertinggi.
  - Klasifikasi setup institusional otomatis: *Whale Accumulation, Short Squeeze Incoming, Institutional Breakout, Deep Dip Buy*.
  - Blueprint perdagangan otomatis: Zona Masuk (*Entry Zone*), Stop Loss, dan Target Take Profit (TP1 1:2 R:R, TP2 1:3.5 R:R).
- **Fitur UI/UX:**
  - **Sticky Freeze Header:** Header tabel tetap membeku di atas saat scroll vertikal (`sticky top-0 z-30`).
  - **Terminal 8 Chart Interaktif:** Tampilan modal mendalam identik dengan terminal derivatif Binance Futures, dilengkapi pemilih timeframe (5m, 15m, 30m, 1h, 2h, 4h, 1d).
  - Export data ke format Excel / CSV.

#### 2. Fitur 1-Click Direct Order ke Akun Binance Futures
- **Deskripsi:** Eksekusi posisi beli (LONG) langsung dari tabel monitoring radar ke akun Binance Futures pengguna via Binance FAPI.
- **Tipe Eksekusi:**
  - `Best Market (Instant)`: Eksekusi saat itu juga di harga pasar terbaik.
  - `Limit (Entry Zone)`: Menggunakan harga acuan zona masuk institusional.
- **Auto Set Leverage:** Secara otomatis menyetel leverage akun ke `3x`, `5x`, `10x`, atau `20x` via `/fapi/v1/leverage`.

#### 3. Pembaruan Sizing: Ukuran Posisi Notional USD (Bukan Modal Margin)
- **Perubahan Sizing:**
  - Input order diubah dari modal margin menjadi **Ukuran Posisi Notional (USD)** (nilai kontrak total di pasar).
  - **Formula Perhitungan:**
    $$\text{Margin Terpakai} = \frac{\text{Notional (USD)}}{\text{Leverage}}$$
    $$\text{Kuantitas Koin} = \frac{\text{Notional (USD)}}{\text{Harga Acuan}}$$
  - **Contoh Penggunaan:**
    - Notional: `$20 USD`, Leverage: `20x` $\rightarrow$ Margin saldo yang terpakai hanya **`$1.00 USDT`**.
- **Preset Chips & Real-time Live Card:**
  - Tombol cepat nominal notional: `$10`, `$20` (default), `$50`, `$100`, `$250`.
  - Tombol cepat leverage: `3x`, `5x`, `10x`, `20x`.
  - Live card menghitung: Ukuran Notional, Estimasi Margin Terpakai, Maksimal Risiko Stop Loss (dalam USD & % ROE), dan Target Keuntungan Take Profit (dalam USD & % ROE).

#### 4. Penanganan Kredensial & Error Binance API Key `[-2014]`
- **Masalah:** Error `[-2014]: API-key format invalid` akibat karakter tersembunyi `\r` (CRLF Windows) atau tanda kutip pada file `.env` / `.env.local`.
- **Solusi:**
  - Implementasi fungsi [getBinanceCredentials()](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/binanceOrder.ts) dengan sanitasi `.trim()` dan pembersihan kutip `replace(/^["']|["']$/g, '')`.
  - Dilengkapi sistem fallback pembacaan langsung dari file `.env.local` dan `.env` jika process environment Next.js belum melakukan reload otomatis.

#### 5. Integrasi Binance Futures Algo Order API (`/fapi/v1/algoOrder`)
- **Masalah:** Binance Futures menolak order `STOP_MARKET` / `TAKE_PROFIT_MARKET` pada endpoint `/fapi/v1/order` dengan error `[-4120]: Order type not supported for this endpoint. Please use the Algo Order API endpoints instead.`
- **Solusi:**
  - Mengalihkan pembuatan bracket Stop Loss dan Take Profit ke endpoint resmi Algo Order:
    `POST /fapi/v1/algoOrder` dengan parameter:
    - `algoType: 'CONDITIONAL'`
    - `type: 'STOP_MARKET'` (untuk Stop Loss) / `type: 'TAKE_PROFIT_MARKET'` (untuk Take Profit)
    - `triggerPrice: formattedPrice`
    - `reduceOnly: 'true'`
- **Fitur Dynamic Fill-Price Calibration & Auto-Recovery:**
  - Mencegah error `[-2021]: Order would immediately trigger` saat terjadi slippage harga pasar pada order beli.
  - Sistem mengkalibrasi ulang level pemicu SL secara dinamis terhadap harga pengisian riil (`fillPrice`), serta memiliki mekanisme *auto-retry* pembacaan harga pasar real-time jika terjadi penolakan awal.

#### 6. Fitur Fleksibel: Pilihan "Tanpa TP" dan "Tanpa SL"
- **Deskripsi:** Memberikan kebebasan penuh kepada trader untuk membuka posisi tanpa kewajiban memasang Take Profit atau Stop Loss otomatis.
- **Pilihan pada Target Take Profit:**
  - `TP1 (1:2)`: Konservatif (+4.5%).
  - `TP2 (1:3.5)`: Institusional (+8.0%).
  - `Tanpa TP`: Hold posisi bebas tanpa target profit otomatis *(exit manual)*.
- **Pilihan pada Stop Loss:**
  - Tombol toggle `⚡ Tanpa SL` / `Matikan SL`: Membuka posisi tanpa memasang Stop Loss otomatis.
- **Penyesuaian Sistem:**
  - File [binanceOrder.ts](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/binanceOrder.ts) & [route.ts](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/order/route.ts) menerima parameter `stopLoss` dan `takeProfit` bernilai `null`. Order pasar utama tetap tereksekusi instan di Binance tanpa mengirimkan Algo Order SL/TP yang dinonaktifkan.

---

## 🛠️ File-File Terkait

| File Path | Peran & Tanggung Jawab |
|-----------|------------------------|
| [`src/app/crypto/hedgefund-buy/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/hedgefund-buy/page.tsx) | Halaman antarmuka Radar, Tabel Freeze Header, Terminal 8 Chart, dan Modal 1-Click Order. |
| [`src/lib/binanceOrder.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/binanceOrder.ts) | Core Engine eksekusi Binance Futures, sanitasi API Key, precision query, dan Algo Order SL/TP. |
| [`src/app/api/crypto/hedgefund-buy/order/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/order/route.ts) | API Endpoint POST untuk validasi payload order (Notional USD, Leverage, Optional SL/TP). |
| [`src/lib/hedgefundBuy.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/hedgefundBuy.ts) | Library kuantitatif scoring Alpha (0–100), setup classifier, dan builder 8 seri chart derivatif. |
| [`src/app/api/crypto/hedgefund-buy/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/route.ts) | API Endpoint untuk mengambil daftar sinyal koin derivatif Binance. |
| [`src/app/api/crypto/hedgefund-buy/detail/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/detail/route.ts) | API Endpoint untuk mengambil 8 seri data grafik historis Binance Futures. |
| [`src/middleware.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/middleware.ts) | Whitelist rute API `/api/crypto/hedgefund-buy` agar dapat diakses tanpa hambatan sesi. |
