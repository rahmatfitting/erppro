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

#### 4. Pembaruan Multi-Coin (Multi-Instance Compounding)
- **Deskripsi:** Peningkatan arsitektur dari single-coin menjadi **Multi-Coin** di mana trader dapat menambahkan banyak koin sekaligus (misal `BTCUSDT`, `ETHUSDT`, `SOLUSDT`).
- **Mekanisme Independen:**
  - Setiap koin memiliki konfigurasi masing-masing (Notional USD, Leverage, Target Compound %, dan Stop Loss).
  - Setiap koin berjalan mandiri: saat salah satu koin menyentuh target (+1%), hanya koin tersebut yang ditutup dan di-reopen dengan modal bertambah tanpa mengganggu koin lain.
- **Fitur UI & Kontrol Multi-Coin:**
  - Tombol **"+ Tambah Koin Baru"**: Modal konfigurasi koin baru lengkap dengan validasi live Binance.
  - **Grid Card Multi-Koin**: Setiap koin memiliki kartu pemantauannya sendiri lengkap dengan live price, target exit, progress bar target, PnL, tombol START/STOP per koin, dan tombol Hapus.
  - **Tombol "STOP ALL"**: Opsi sekali klik untuk menghentikan seluruh bot koin yang sedang aktif.
  - **Filter Koin**: Filter log terminal dan riwayat siklus berdasarkan koin tertentu atau semua koin.
- **Background Runner Multi-Coin (`cron_compound_bot.js`):**
  - Mengevaluasi seluruh koin aktif secara simultan setiap 3 detik.
  - Menampilkan ringkasan status masing-masing koin di terminal background.

#### 5. Integrasi Perhitungan Harga & PnL Riil dari Binance Futures
- **Masalah:** Perhitungan teoritis lokal menghasilkan perbedaan angka dengan posisi riil Binance (misal harga entri berbeda akibat penggabungan rata-rata posisi *One-Way Mode*, serta PnL terealisasi berbeda karena belum memperhitungkan komisi/fee bursa dan harga fill riil).
- **Solusi & Sinkronisasi Live Binance FAPI:**
  1. **Harga Entri & Ukuran Riil (`/fapi/v2/positionRisk`):** Mengambil `entryPrice`, `positionAmt`, `notional`, `markPrice`, `leverage`, dan `margin` langsung dari akun pengguna di Binance Futures. Target exit (+1.0%) dihitung secara presisi dari harga entri rata-rata riil Binance.
  2. **Unrealized PnL & ROE% Riil:** Menampilkan `unRealizedProfit` dan persentase ROE langsung dari engine derivatif Binance secara real-time pada card aktif.
  3. **Realized PnL Asli Siklus Selesai (`/fapi/v1/userTrades`):** Mengambil data eksekusi fill riil dan `realizedPnl` tepat setelah MARKET SELL terisi di Binance, sehingga angka profit siklus di riwayat identik dengan riwayat posisi Binance (termasuk potongan fee transaksi).
  4. **Indikator Visual:** Menampilkan badge `LIVE BINANCE` dan `REAL` pada card posisi aktif serta tabel riwayat siklus.

### [2026-09-24] - Crypto Narrative & On-Chain Opportunity Monitor

#### 1. Menu Baru: Crypto Narrative & On-Chain Opportunity Monitor (`/crypto/narrative-onchain`)
- **Deskripsi:** Sistem kuantitatif multi-layer untuk memindai pasar crypto secara otomatis, mengidentifikasi narasi yang sedang booming (*emerging/hot narratives*), menemukan koin di dalam narasi tersebut, memvalidasi dengan metrik on-chain, memvalidasi struktur pasar & derivatif, menghitung **Opportunity Score (0–100)**, mengklasifikasikan bukti sinyal (*evidence signal*), dan menyusun watchlist prioritas serta pengiriman alert.
- **Tujuan Kunci:** Bukan meramal harga secara spekulatif, melainkan menemukan koin dengan perpaduan momentum perhatian pasar, lonjakan adopsi on-chain, akumulasi *smart money/whale*, ekspansi likuiditas & TVL, derivatif sehat (*non-crowded*), serta risiko unlock supply terkontrol.

#### 2. Arsitektur Evaluasi 5 Layer Kuantitatif (Opportunity Score 0–100)
- **Layer 1: On-Chain Adoption (Bobot 30%)**
  - Pertumbuhan Alamat Aktif (*Active Address Growth 7D & 30D*).
  - Pertumbuhan Alamat Baru (*New Address Growth 30D* - indikator inflow pengguna riil).
  - Aktivitas & Net Flow Whale (*Whale Accumulation vs Distribution*).
  - Aliran Bursa (*Exchange Netflow*: Net Outflow = akumulasi, Net Inflow = potensi tekanan jual).
  - Distribusi & Konsentrasi Holder (*Top 10 Holder Concentration Risk*).
  - Pertumbuhan TVL (*Total Value Locked*) dan Rasio TVL/Market Cap.
  - Pendapatan Protokol (*Protocol Revenue & Fees Growth 30D* - pembeda hype vs penggunaan riil).
- **Layer 2: Narrative & Social Attention (Bobot 20%)**
  - Pertumbuhan Sosial 24 Jam (*Social Mention Growth*).
  - Kecepatan Narasi (*Narrative Velocity %* - deteksi dini pergeseran atensi pasar).
  - Frekuensi Berita & Liputan Media (*News Count & Media Momentum*).
  - Tren Pencarian (*Search Trend Score*).
- **Layer 3: Market Momentum (Bobot 15%) & Liquidity (Bobot 15%)**
  - Volume Perdagangan 24 Jam dan Volume 7D.
  - Kekuatan Tren Harga (1h, 24h, 7d, 30d) & Jarak dari ATH (*All-Time High*).
  - Rasio Likuiditas: Volume / Market Cap untuk memastikan koin mudah diperdagangkan (*liquid*).
- **Layer 4: Derivatives Health (Bobot 10%)**
  - Pertumbuhan Minat Terbuka (*Open Interest / Market Cap*).
  - Tarif Pendanaan (*Funding Rate*): Normal vs Crowded Long vs Negative Squeeze.
  - Likuidasi 24 Jam (Dominasi Short Liquidation sebagai bukti *short squeeze*).
  - Penalti Crowding: Jika Funding Rate > 0.05% atau OI naik jauh melebihi pergerakan spot, skor derivatif dipangkas.
- **Layer 5: Tokenomics & Supply Unlock Risk (Bobot 10%)**
  - Jadwal Unlock Terdekat (*Next Unlock Date*), Jumlah Koin (% Circulating Supply), dan Estimasi Nilai USD.
  - Klasifikasi Risiko Unlock: `LOW` (< 5%), `MEDIUM` (5–15%), `HIGH` (> 15%).
  - Rasio Sirkulasi dan Evaluasi Valuasi Terdilusi Penuh (*MC / FDV Ratio*).

#### 3. Klasifikasi Sinyal Evidence (Evidence Classification)
- 🟢 **`EARLY_ACCUMULATION`**: On-chain ↑, Whale Accumulation ↑, Volume ↑, Social ↑, namun harga masih relatif stabil (kondisi paling ideal untuk riset sebelum harga terbang).
- 🔵 **`NARRATIVE_BREAKOUT`**: Social ↑↑, Media News ↑↑, Volume ↑↑, On-chain ↑, dan Harga telah mengonfirmasi breakout.
- 🟠 **`CROWDED_RISK`**: Harga ↑↑, Social Hype ↑↑, OI ↑↑, Funding Rate ekstrem tinggi (risiko pembalikan arah / long squeeze).
- 🔴 **`DISTRIBUTION_WARNING`**: Harga stagnan/naik, Exchange Inflow besar, Whale Net Outflow/Selling, OI turun (peringatan distribusi smart money).

#### 4. Fitur Antarmuka UI Komprehensif (`/crypto/narrative-onchain`)
- **Macro Market Regime Header:** Menampilkan Status Rezim Pasar (`SELECTIVE RISK-ON`, `BROAD RISK-ON`, `DEFENSIVE`), Dominasi BTC (%), Breadth Altcoin, Total Narasi Aktif, dan Jumlah Sinyal Akumulasi.
- **4 Tab Sub-View Interaktif:**
  1. *Opportunity Watchlist:* Tabel komprehensif peringkat koin dengan skor 0–100, badge sinyal, metrik on-chain, indikator unlock, dan tombol aksi detail/alert.
  2. *Hot Narratives Leaderboard:* Pemetaan narasi crypto 2026 (AI Agents, RWA, Perp DEX, DePIN, BTCFi, Stablecoin, ZK/Privacy, Meme) dengan skor momentum, velocity, dan pertumbuhan sosial/volume.
  3. *On-Chain Radar:* Matriks komparasi metrik on-chain mendalam: Active Address Growth, Whale Netflow, Exchange Netflow, TVL, dan Protocol Revenue.
  4. *Unlock & Catalyst Calendar:* Kalender peristiwa katalis penting (Mainnet, Upgrade, Listing, Staking, Token Unlock) lengkap dengan tingkat urgensi (*CRITICAL / HIGH*).
- **Drawer Filter Scanner Kustom:** Memungkinkan trader menyaring koin berdasarkan batasan Market Cap, Volume Minimal, Pertumbuhan Alamat Aktif, Batas Maksimal Funding Rate, dan Batas Risiko Unlock Supply.
- **Modal Deep Dive 5 Layer:** Analisis rincian 5 layer per koin secara mendalam dengan visual progress bar skor, data finansial on-chain, status leverage derivatif, dan profil tokenomics.
- **Integrasi Telegram Alert:** Tombol 1-click kirim alert laporan terstruktur ke bot Telegram atau webhook notifikasi.

### [2026-09-26] - Bot Compound Future: Fitur DCA (Dollar Cost Averaging) Tambah Posisi Notional

#### 1. Tombol & Modal DCA Disetiap Koin (`/crypto/compound-bot`)
- **Deskripsi:** Tombol aksi `DCA` baru pada setiap kartu koin untuk menambah ukuran posisi notional koin yang sedang berjalan di Binance Futures, meratakan harga rata-rata entri (*average-down*), dan mempercepat pencapaian target exit profit siklus compound.
- **Dua Mode Eksekusi DCA:**
  1. **Mode DCA Instan (`INSTANT`):**
     - Langsung mengeksekusi order MARKET BUY di Binance Futures untuk menambah notional posisi saat ini juga.
     - Pilihan preset notional cepat: `$10`, `$20`, `$50`, `$100`, `$250`, `$500` USD atau custom input.
     - Live simulation card menghitung secara instan:
       - Tambahan margin terpakai (`+$USDT`).
       - Total ukuran notional baru (`$USD`).
       - Estimasi harga entri rata-rata baru (turun lebih dekat ke harga pasar riil).
       - Estimasi target exit baru (+X% dari entri baru yang jauh lebih mudah tercapai).
  2. **Mode Auto DCA Penurunan (`AUTO_DIP`):**
     - Opsi menunggu penurunan harga sebesar X% dari harga entri saat ini sebelum otomatis menambah posisi notional.
     - Pilihan preset persentase penurunan: `-1.0%`, `-1.5%`, `-2.0%`, `-3.0%`, `-5.0%`, `-7.5%`, `-10.0%`.
     - Perhitungan harga pemicu otomatis:
       $$\text{Trigger Price} = \text{Entry Price} \times (1 - \frac{\text{Drop Percent}}{100})$$
     - Dipantau otomatis oleh tick engine browser dan background daemon runner (`cron_compound_bot.js`) setiap 3 detik.
     - Saat harga menyentuh atau turun di bawah harga pemicu, sistem seketika mengeksekusi MARKET BUY penambahan posisi di Binance, memperbarui harga entri dan target exit baru, serta mencatat status `DCA_TRIGGERED` di log terminal.
     - Dilengkapi fitur pembatalan (*Cancel Auto DCA*) kapan saja langsung dari modal.

#### 2. Indikator Visual & Sinkronisasi Live Binance
- **Badge Status Auto DCA:** Menampilkan label pulsing `Auto DCA: -X%` pada header kartu koin saat pemantauan penurunan sedang aktif.
- **Counter DCA (`DCA xN`):** Menampilkan jumlah akumulasi DCA yang telah dieksekusi pada siklus aktif saat ini.
- **Sinkronisasi Riwayat Siklus:** Kolom Notional pada tabel riwayat siklus kini menampilkan tag `+N DCA` beserta nominal tambahan yang diakumulasikan.
- **Kategori Log Khusus `[DCA]`:** Penanda warna amber pada jendela log terminal monospace untuk seluruh eksekusi DCA instan maupun otomatis.

### [2026-09-26] - Autonomous Funding Farming Bot & Real Binance Settlement Engine

#### 1. Fitur Baru: Autonomous Funding Farming Bot (`/crypto/funding-farming`)
- **Deskripsi:** Bot arbitrase kuantitatif otomatis untuk mengeksploitasi pembayaran *Funding Fee* di pasar Binance Futures USDT-M.
- **Mekanisme Autonomous Loop:**
  - **Fokus Koin Fee Terbesar:** Bot secara cerdas memindai seluruh pair USDT-M di Binance Futures untuk menemukan koin yang mendekati jam settlement pendanaan terdekat dengan nilai *Funding Rate* absolut tertinggi (`Math.abs(fundingRate)`).
  - **Sisi Posisi Arbitrase:**
    - Jika Funding Rate > 0: Long membayar Short. Bot otomatis membuka posisi **SHORT (SELL)** untuk menerima fee dari Long.
    - Jika Funding Rate < 0: Short membayar Long. Bot otomatis membuka posisi **LONG (BUY)** untuk menerima fee dari Short.
  - **Auto-Open Presisi (&lt; 30 Detik):** Bot menunggu hingga waktu pembayaran funding fee tersisa **kurang dari 30 detik** sebelum otomatis mengeksekusi order MARKET di Binance Futures untuk meminimalkan paparan risiko pergerakan harga pasar.
  - **Auto-Close Fee Lock:** Segera setelah jam pembayaran settlement terlewati (+10 detik) dan fee tercatat di ledger Binance, bot langsung mengeksekusi MARKET close (`reduceOnly: true`) untuk menutup posisi dan mengunci profit terlepas dari apakah kondisi harga koin dalam status minus atau plus.
  - **Continuous Continuous Loop:** Setelah satu siklus (*round*) selesai, bot secara otomatis kembali ke mode scanning untuk mencari kandidat koin dengan fee tertinggi pada jadwal settlement berikutnya dan mengulang proses tanpa henti hingga tombol **STOP** ditekan.

#### 2. Kontrol & Pengaturan Parameter Bot
- **Tombol START & STOP:** Kontrol instan pada hero banner dilengkapi status aktif round dan modal konfirmasi penutupan darurat jika ada posisi yang masih aktif saat dihentikan.
- **Konfigurasi Fleksibel:**
  - **Ukuran Notional (USD):** Nilai kontrak total di bursa dengan preset chip cepat `$20`, `$50`, `$100`, `$250`, `$500` USD atau custom input.
  - **Leverage:** Pengungkit modal margin (`3x`, `5x`, `10x`, `20x`).
  - **Timing Masuk & Keluar:** Waktu buka posisi sebelum settlement (default `< 30 detik`) dan waktu tutup setelah settlement (default `+10 detik`).
  - **Threshold Minimum Rate:** Batasan minimum funding rate (default `0.01%`) agar bot tidak membuka posisi pada koin dengan fee yang tidak signifikan.

#### 3. Kondisi Saldo Real Binance & Metrik Total Profit
- **Live Binance Futures Wallet Balance Card:**
  - Menampilkan Saldo Real USDT Wallet Balance dari akun Binance Futures (`/fapi/v2/account`).
  - Margin Tersedia (*Available Balance*) untuk membuka posisi baru.
  - Floating Unrealized PnL real-time.
- **Performance Bar Total Profit:**
  - Total Net Realized Profit ($ USDT).
  - Total Funding Fee Diterima ($ USDT).
  - Total Price Trading PnL ($ USDT).
  - Win Rate (% siklus dengan Net PnL > 0) dan Total Rounds.
- **Live Active Farming Radar Card:**
  - Status `HOLDING FOR FEE`: Menampilkan koin aktif, sisi (SHORT/LONG), harga entry riil, harga mark Binance terkini, floating PnL, dan countdown auto-exit.
  - Status `WAITING FOR ENTRY`: Menampilkan koin target #1 dengan fee tertinggi, estimasi fee dalam USD, dan countdown menuju jendela `< 30s`.

#### 4. Konsol Log Monospace & Riwayat Siklus
- **Terminal Log Interaktif:** Menampilkan status `[START]`, `[OPEN_TRIGGER]`, `[OPENED]`, `[HOLDING]`, `[CLOSE]`, `[CYCLE_COMPLETE]`, `[STOP]` dengan penanda warna dan fitur autoscroll.
- **Tabel Riwayat Round:** Merekam setiap siklus: Round #, Symbol, Sisi, Notional USD, Leverage, Funding Rate, Entry Price ➔ Exit Price, Funding Fee, Price PnL, Komisi, Net Realized PnL ($ dan % ROE), Status, serta Timestamp.
- **Export to Excel:** Fitur download laporan riwayat round dan scanner ke format spreadsheet Excel.

#### 5. Background Daemon Runner (`cron_funding_bot.js` & `run_funding_bot.bat`)
- Standalone runner Node.js untuk Windows yang mengevaluasi tick setiap 2.5 detik secara mandiri di background 24/7 tanpa mewajibkan tab browser terbuka.

### [2026-09-26] - Funding Farming: Fitur Mode Reverse & 1-Click Order RR (Risk:Reward 1:1, 1:2, 1:3)

#### 1. Konsep & Fitur Mode Reverse (Pembalikan Sisi Order)
- **Deskripsi:** Menambahkan kemampuan untuk membalikkan (*reverse*) arah posisi derivatif dari rekomendasi arbitrase funding fee standar.
- **Mekanisme Logika:**
  - **Sinyal Asli Funding Fee:**
    - Funding < 0: Sinyal arbitrase standar adalah **`LONG (BUY)`** (menerima bayaran fee dari short).
    - Funding > 0: Sinyal arbitrase standar adalah **`SHORT (SELL)`** (menerima bayaran fee dari long).
  - **Saat Mode Reverse Aktif:**
    - Sinyal Funding < 0 (biasanya koin yang di-short habis-habisan) $\rightarrow$ Dibalik menjadi **`SELL / SHORT`** (mengikuti momentum penurunan atau trading breakdown).
    - Sinyal Funding > 0 $\rightarrow$ Dibalik menjadi **`BUY / LONG`** (mengikuti momentum rally atau short squeeze).
- **Integrasi Antarmuka:**
  - **Toggle Reverse per Kartu Scanner:** Setiap kartu koin (seperti `WAXPUSDT`) memiliki tombol toggle `Reverse`. Saat diaktifkan, badge arah posisi langsung berubah secara visual (misal `LONG` menjadi `SELL (REVERSE)` berwarna ungu/rose).
  - **Toggle Reverse pada Bot Otomatis:** Pilihan reverse juga tersedia di Pengaturan Bot Otomatis, sehingga bot dapat berjalan 24/7 membuka posisi berlawanan dengan arah fee jika strategi trader menghendakinya.

#### 2. Tombol Pilihan Risk:Reward (RR 1:1, 1:2, 1:3) & Eksekusi Otomatis
- **Deskripsi:** Tombol aksi cepat Risk:Reward (`RR 1:1`, `RR 1:2`, `RR 1:3`) disematkan langsung di setiap kartu scanner koin maupun kartu kandidat target settlement.
- **Kalkulasi Bracket SL & TP Otomatis:**
  - **Stop Loss Dasar:** Default 1.5% dari harga fill/entri riil.
  - **Formula Target TP:**
    - `RR 1:1`: Target Profit = $+1.5\%$ (1x SL).
    - `RR 1:2`: Target Profit = $+3.0\%$ (2x SL).
    - `RR 1:3`: Target Profit = $+4.5\%$ (3x SL).
  - **Arah Posisi:**
    - Jika `BUY` (Long): $\text{SL} = \text{Entry} \times (1 - 0.015)$, $\text{TP} = \text{Entry} \times (1 + 0.015 \times \text{RR})$.
    - Jika `SELL` (Short): $\text{SL} = \text{Entry} \times (1 + 0.015)$, $\text{TP} = \text{Entry} \times (1 - 0.015 \times \text{RR})$.
- **Eksekusi 1-Click Binance Futures (`/fapi/v1/algoOrder`):**
  - Mengirim order posisi utama `MARKET` ke Binance Futures.
  - Secara otomatis mengirim sepasang Algo Order bracket:
    1. **Stop Loss (`STOP_MARKET`)**: Mengunci proteksi modal jika pergerakan berlawanan arah.
    2. **Take Profit (`TAKE_PROFIT_MARKET`)**: Mengunci keuntungan saat harga mencapai target rasio.
  - Dilengkapi proteksi error `[-2021]` (auto-kalibrasi dinamis terhadap slippage harga isi pasar) dan `reduceOnly: true`.

#### 3. Modal Konfirmasi & Live Calculator Preview
- Menampilkan estimasi harga entri, trigger Stop Loss beserta nominal estimasi kerugian dalam USD, serta target Take Profit beserta estimasi keuntungan riil USD.
- Menampilkan indikator margin saldo terpakai sesuai leverage yang dipilih (`3x`, `5x`, `10x`, `20x`).

---

## 🛠️ File-File Terkait

| File Path | Peran & Tanggung Jawab |
|-----------|------------------------|
| [`src/app/crypto/funding-farming/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/funding-farming/page.tsx) | Antarmuka pengguna Funding Farming Bot: Hero Master Control (START/STOP), Saldo Real Binance, Card Target Koin, 3 Tab View (Bot Leaderboard & Terminal, Riwayat Round, Full Scanner), Modal Pengaturan, Watchdog Tick, Toggle Reverse per Card, Tombol RR 1:1, 1:2, 1:3, dan Modal Konfirmasi Order Cepat. |
| [`src/lib/binanceOrder.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/binanceOrder.ts) | Integrasi Binance FAPI: Eksekusi order dengan bracket SL/TP (`executeFundingOrderWithRR`), penyesuaian leverage, pembacaan saldo riil, serta order algo conditional `/fapi/v1/algoOrder`. |
| [`src/app/api/crypto/funding-farming/order/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/funding-farming/order/route.ts) | API Endpoint POST untuk eksekusi 1-Click order manual dengan mode Reverse dan kalkulasi bracket RR otomatis. |
| [`src/lib/fundingBot.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/fundingBot.ts) | Core Engine Funding Farming Bot: Migrasi skema database kolom `is_reverse`, `rr_ratio`, `base_sl_percent`, integrasi pembalikan arah posisi dan bracket algo order pada siklus autonomous. |
| [`src/app/api/crypto/funding-farming/bot/start/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/funding-farming/bot/start/route.ts) | API Endpoint POST untuk memulai bot dengan opsi `isReverse`, `rrRatio`, dan `baseSlPercent`. |
| [`src/app/api/crypto/funding-farming/bot/save/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/funding-farming/bot/save/route.ts) | API Endpoint POST untuk menyimpan konfigurasi bot termasuk setting Reverse dan RR. |
| [`cron_funding_bot.js`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/cron_funding_bot.js) | Standalone Node.js background runner untuk eksekusi funding farming 24/7 di Windows. |
| [`run_funding_bot.bat`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/run_funding_bot.bat) | Batch launcher Windows 1-click untuk menjalankan background cron funding bot. |
| [`src/app/crypto/compound-bot/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/compound-bot/page.tsx) | Antarmuka pengguna Bot Compound Future: Tombol DCA di setiap koin, Modal interaktif 2 mode (DCA Instan & Auto DCA Penurunan), simulasi live margin & entry baru, serta badge status DCA. |
| [`src/lib/compoundBot.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/compoundBot.ts) | Core Engine Bot Compound: Migrasi skema database kolom DCA (`dca_auto_enabled`, `dca_drop_percent`, `dca_notional_usd`, `dca_trigger_price`, `dca_executed`, `dca_count`), fungsi `executeInstantDca`, `setAutoDca`, `cancelAutoDca`, dan evaluasi auto DCA di `tickCompoundBot`. |
| [`src/app/api/crypto/compound-bot/dca/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/dca/route.ts) | API Endpoint POST untuk memproses DCA Instan, Set Auto DCA Penurunan, dan Cancel Auto DCA. |
| [`cron_compound_bot.js`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/cron_compound_bot.js) | Standalone Node.js background runner untuk eksekusi engine compound 24/7 dan pencatatan trigger DCA otomatis di konsol. |
| [`src/app/crypto/narrative-onchain/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/narrative-onchain/page.tsx) | Antarmuka pengguna utama Dashboard Crypto Narrative & On-Chain Monitor: Regime Header, 4 Sub-View Tab, Modal Deep Dive 5 Layer, Filter Scanner Drawer, dan Alert Sender. |
| [`src/lib/narrativeOnchain.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/narrativeOnchain.ts) | Core Engine Kuantitatif: Auto-migration tabel MySQL (`crypto_narratives`, `crypto_narrative_coins`, `crypto_narrative_catalysts`, `crypto_narrative_alerts`), formula Opportunity Score 5-layer, klasifikasi sinyal, sinkronisasi data Binance & DefiLlama, dan formatter pesan Telegram. |
| [`src/app/api/crypto/compound-bot/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/route.ts) | API Endpoint GET status bot, konfigurasi, riwayat siklus, dan log eksekusi. |
| [`src/app/api/crypto/compound-bot/validate/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/validate/route.ts) | API Endpoint GET untuk validasi pair ke Binance Futures USDT-M. |
| [`src/app/api/crypto/compound-bot/start/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/start/route.ts) | API Endpoint POST untuk memulai bot dan mengeksekusi order BUY perdana di Binance. |
| [`src/app/api/crypto/compound-bot/stop/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/stop/route.ts) | API Endpoint POST untuk menghentikan bot dan opsional menutup posisi pasar. |
| [`src/app/api/crypto/compound-bot/tick/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/tick/route.ts) | API Endpoint GET & POST untuk evaluasi harga real-time, eksekusi close saat target hit, dan pembukaan order compound baru. |
| [`src/app/api/crypto/compound-bot/clear-logs/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/compound-bot/clear-logs/route.ts) | API Endpoint POST untuk membersihkan tabel log aktivitas bot. |
| [`run_compound_bot.bat`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/run_compound_bot.bat) | File batch Windows 1-click launcher untuk menjalankan daemon background compound bot. |
| [`src/components/Sidebar.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/components/Sidebar.tsx) | Menu navigasi "Bot Compound Future" & "Narrative & On-Chain Monitor" di bagian Crypto Intelligence. |
| [`src/middleware.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/middleware.ts) | Whitelist rute `/api/crypto/funding-farming`, `/api/crypto/compound-bot` dan `/api/crypto/narrative-onchain` agar dapat diakses tanpa hambatan sesi. |
| [`src/app/crypto/hedgefund-buy/page.tsx`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/crypto/hedgefund-buy/page.tsx) | Halaman antarmuka Radar, Tabel Freeze Header, Terminal 8 Chart, Tombol "Kirim ke Telegram", dan Watchdog Scheduler. |
| [`src/app/api/crypto/hedgefund-buy/scan/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/scan/route.ts) | API Endpoint GET & POST untuk scan pasar, pembentukan format pesan Telegram institusional, dan dispatch notifikasi. |
| [`cron_hedgefund_buy.js`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/cron_hedgefund_buy.js) | Standalone Node.js background runner untuk pemantauan jadwal 07:00, 13:00, 20:00 WIB dan trigger API. |
| [`run_hedgefund_buy_cron.bat`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/run_hedgefund_buy_cron.bat) | Windows Batch file untuk menjalankan cron scheduler Hedge Fund Buy dengan 1-click. |
| [`src/lib/hedgefundBuy.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/lib/hedgefundBuy.ts) | Library kuantitatif scoring Alpha (0–100), setup classifier, dan builder 8 seri chart derivatif. |
| [`src/app/api/crypto/hedgefund-buy/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/route.ts) | API Endpoint untuk mengambil daftar sinyal koin derivatif Binance. |
| [`src/app/api/crypto/hedgefund-buy/detail/route.ts`](file:///d:/rahmat/belajar%20next%20js/erp_nextjs/frontend/src/app/api/crypto/hedgefund-buy/detail/route.ts) | API Endpoint untuk mengambil 8 seri data grafik historis Binance Futures. |




