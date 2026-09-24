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

### [2026-09-14] - Pengiriman Data Terjadwal ke Telegram (07:00, 13:00, 20:00 WIB)

#### 1. Format Laporan Kuantitatif Telegram Institusional
- **Deskripsi:** Menghasilkan pesan berkala otomatis yang merangkum kondisi pasar derivatif koin teratas dari Hedge Fund Buy Radar.
- **Isi Laporan Telegram:**
  - **Identitas Sesi:** Penanda sesi spesifik (`07:00 WIB Sesi Pagi`, `13:00 WIB Sesi Siang`, `20:00 WIB Sesi Malam`, atau `Update Manual`).
  - **Ringkasan Analisis:** Total koin dipindai dan jumlah koin berkonvinsi tinggi (*High Conviction* Skor ≥ 75).
  - **Top 5 Rekomendasi Buy Smart Money:**
    - Nama koin, skor alpha (0–100), dan status konvinsi (*High Conviction / Moderate Buy / Watchlist*).
    - Setup institusional (*Whale Accumulation, Short Squeeze Trap, Smart Money Breakout, Stealth Dip Buying*).
    - Harga terkini dan persentase perubahan 24 jam.
    - Rasio posisi modal paus vs ritel (*Whale Pos Ratio* & *Whale Long %*).
    - Rasio dominasi Taker Buy agresif (*Taker Buy/Sell Ratio*).
    - Tarif pendanaan (*Funding Rate*) dan fluktuasi Minat Terbuka (*OI Change %*).
    - Blueprint perdagangan terukur: Zona Masuk (*Entry Zone*), Stop Loss (-2.2%), Take Profit 1 (+4.5% 1:2 R:R), dan Take Profit 2 (+8.0% 1:3.5 R:R).
  - **Fallback Pasar Konsolidasi:** Jika pasar sedang tenang (belum ada koin dengan skor ≥ 75), sistem tetap mengirimkan Top 5 ranking tertinggi saat itu disertai status konsolidasi pasar, sehingga pengguna tetap memperoleh data komprehensif pada setiap jam jadwal.

#### 2. Background Cron Service (`cron_hedgefund_buy.js` & `run_hedgefund_buy_cron.bat`)
- **Deskripsi:** Layanan background mandiri berbasis Node.js yang berjalan di Windows pengguna (mengikuti pola `cron_hedge.js` / `cron_trader.js`).
- **Mekanisme Kerja:**
  - Memantau jam lokal (WIB) setiap 30 detik.
  - Saat waktu menunjukkan **07:00**, **13:00**, atau **20:00 WIB** (pada jendela menit 00–02), script memicu scan derivatif dan mengirimkan pesan laporan ke bot Telegram via API.
  - Dilengkapi mekanisme *deduplication tracking* (`lastSentSlot`) untuk memastikan laporan hanya terkirim tepat 1 kali per slot sesi.
  - Dilengkapi argumen baris perintah `--now` atau `--test` untuk pengujian langsung kapan saja.

#### 3. Fitur Antarmuka UI (`/crypto/hedgefund-buy`)
- **Tombol "Kirim ke Telegram":** Tombol aksi instan pada toolbar hero header untuk mengirimkan snapshot data radar terbaru ke bot Telegram kapan saja dengan satu klik.
- **Badge Status Jadwal:** Menampilkan info jadwal aktif `07:00, 13:00, 20:00 WIB` beserta hitung mundur jadwal sesi berikutnya (*countdown timer*).
- **Client-Side Watchdog:** Jika tab browser sedang dibuka oleh trader pada jam 07:00, 13:00, atau 20:00 WIB, browser akan otomatis memicu pengiriman data ke Telegram dengan sinkronisasi `localStorage` untuk mencegah pengiriman berulang.

### [2026-09-24] - Bot Compound Future (BUY Only) Otomatis

#### 1. Menu Baru: Bot Compound Future (`/crypto/compound-bot`)
- **Deskripsi:** Menu otomasi akumulasi posisi beli (Long Only) di Binance Futures USDT-M dengan strategi reinvesting profit (*compounding*).
- **Mekanisme Kerja:**
  - Trader memilih pair futures (misal `BTCUSDT`, `ETHUSDT`, `SOLUSDT`).
  - Fitur **Cek Pair**: Memvalidasi status kontrak di Binance Futures (`exchangeInfo`, filter `minNotional`, `stepSize`, `minQty`, ticker 24 jam).
  - Trader menginput:
    - **Ukuran Posisi Notional (USD):** Nilai kontrak total di pasar (misal `$100 USD`).
    - **Leverage:** Pengungkit modal margin (misal `20x`, dengan margin terpakai hanya `100 / 20 = $5.00 USDT`).
    - **Target Compound (%):** Target persentase kenaikan harga per siklus (misal `+1.0%`).
    - **Stop Loss Opsional (%):** Proteksi modal jika harga turun tajam (dapat diaktifkan atau dinonaktifkan "Tanpa SL").
  - **Siklus Compound Otomatis:**
    1. Saat bot di-**START**, sistem mengeksekusi order MARKET BUY perdana di Binance.
    2. Saat harga naik mencapai target (+1%): Sistem mengeksekusi MARKET SELL `reduceOnly: true` untuk menutup posisi dan mengunci profit.
    3. Sistem menghitung nominal notional berikutnya:
       $$\text{Next Notional} = \text{Current Notional} \times (1 + \frac{\text{compound\_percent}}{100})$$
       *(Contoh: $100 USD ➔ $101.00 USD, siklus berikutnya $101.00 ➔ $102.01 USD).*
    4. Langsung membuka order MARKET BUY baru dengan modal ter-compound tersebut pada harga pasar saat itu.
    5. Siklus berulang secara berkesinambungan (`Cycle #1`, `Cycle #2`, `Cycle #3`, dst.).
  - Saat tombol **STOP** ditekan:
    - Status bot diubah menjadi `STOPPED`.
    - Pilihan konfirmasi: Tutup posisi aktif sekarang di Binance via Market Sell atau biarkan posisi tetap terbuka.

#### 2. Fitur Monitoring & Log Real-time
- **Live Active Position Card:**
  - Menampilkan Siklus aktif, Pair, Leverage, Entry Price, Live Market Price, Target Exit Price, dan Unrealized PnL ($ dan % ROE).
  - Progress bar dinamis menuju target exit (+1.00%).
- **Interactive Terminal Log Box:**
  - Jendela konsol monospace auto-scroll dengan penanda kategori warna: `[START]`, `[BUY]`, `[TARGET_HIT]`, `[COMPOUND]`, `[CLOSE]`, `[STOP]`, `[ERROR]`.
  - Tombol untuk membersihkan riwayat log (*Clear Logs*).
- **Tabel Riwayat Siklus (Cycle History):**
  - Merekam setiap siklus perdagangan: Siklus #, Pair, Status (`TARGET_HIT`, `STOPPED`, `SL_HIT`), Notional Masuk ➔ Keluar, Entry Price ➔ Exit Price, Realized PnL ($ dan %), dan Timestamp eksekusi.

#### 3. Dual Execution Engine (Browser Poller & 24/7 Background Runner)
- **Browser Poller:** Otomatis melakukan polling `/api/crypto/compound-bot/tick` setiap 3 detik selama tab browser dibuka oleh trader.
- **Standalone Background Runner (`cron_compound_bot.js` & `run_compound_bot.bat`):**
  - Menjalankan polling 24/7 di background terminal Windows tanpa perlu membuka browser secara terus-menerus.

---

## 🛠️ File-File Terkait

| File Path | Peran & Tanggung Jawab |
|-----------|------------------------|
| [`src/app/crypto/compound-bot/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/compound-bot/page.tsx) | Antarmuka pengguna Bot Compound Future: Input parameter, Tombol Cek Pair, START & STOP, Card Monitoring Live, Terminal Log, dan Tabel Riwayat Siklus. |
| [`src/lib/compoundBot.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/compoundBot.ts) | Core Engine Bot Compound: Inisialisasi tabel MySQL (`compound_bot_config`, `compound_bot_cycles`, `compound_bot_logs`), state management, kalkulasi compound, tick engine, dan validasi pair. |
| [`src/app/api/crypto/compound-bot/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/route.ts) | API Endpoint GET status bot, konfigurasi, riwayat siklus, dan log eksekusi. |
| [`src/app/api/crypto/compound-bot/validate/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/validate/route.ts) | API Endpoint GET untuk validasi pair ke Binance Futures USDT-M. |
| [`src/app/api/crypto/compound-bot/start/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/start/route.ts) | API Endpoint POST untuk memulai bot dan mengeksekusi order BUY perdana di Binance. |
| [`src/app/api/crypto/compound-bot/stop/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/stop/route.ts) | API Endpoint POST untuk menghentikan bot dan opsional menutup posisi pasar. |
| [`src/app/api/crypto/compound-bot/tick/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/tick/route.ts) | API Endpoint GET & POST untuk evaluasi harga real-time, eksekusi close saat target hit, dan pembukaan order compound baru. |
| [`src/app/api/crypto/compound-bot/clear-logs/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/clear-logs/route.ts) | API Endpoint POST untuk membersihkan tabel log aktivitas bot. |
| [`cron_compound_bot.js`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/cron_compound_bot.js) | Standalone Node.js background runner untuk eksekusi engine compound 24/7. |
| [`run_compound_bot.bat`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/run_compound_bot.bat) | File batch Windows 1-click launcher untuk menjalankan daemon background compound bot. |
| [`src/lib/binanceOrder.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/binanceOrder.ts) | Fungsi eksekusi order Binance Futures: `executeCompoundBuyOrder` dan `executeCompoundCloseOrder`. |
| [`src/components/Sidebar.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/components/Sidebar.tsx) | Menu navigasi "Bot Compound Future" di bagian Crypto Intelligence. |
| [`src/middleware.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/middleware.ts) | Whitelist rute `/api/crypto/compound-bot` agar dapat diakses tanpa hambatan sesi. |
| [`src/app/crypto/hedgefund-buy/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/hedgefund-buy/page.tsx) | Halaman antarmuka Radar, Tabel Freeze Header, Terminal 8 Chart, Tombol "Kirim ke Telegram", dan Watchdog Scheduler. |
| [`src/app/api/crypto/hedgefund-buy/scan/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/scan/route.ts) | API Endpoint GET & POST untuk scan pasar, pembentukan format pesan Telegram institusional, dan dispatch notifikasi. |
| [`cron_hedgefund_buy.js`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/cron_hedgefund_buy.js) | Standalone Node.js background runner untuk pemantauan jadwal 07:00, 13:00, 20:00 WIB dan trigger API. |
| [`run_hedgefund_buy_cron.bat`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/run_hedgefund_buy_cron.bat) | Windows Batch file untuk menjalankan cron scheduler Hedge Fund Buy dengan 1-click. |
| [`src/lib/hedgefundBuy.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/hedgefundBuy.ts) | Library kuantitatif scoring Alpha (0–100), setup classifier, dan builder 8 seri chart derivatif. |
| [`src/app/api/crypto/hedgefund-buy/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/route.ts) | API Endpoint untuk mengambil daftar sinyal koin derivatif Binance. |
| [`src/app/api/crypto/hedgefund-buy/detail/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/detail/route.ts) | API Endpoint untuk mengambil 8 seri data grafik historis Binance Futures. |


