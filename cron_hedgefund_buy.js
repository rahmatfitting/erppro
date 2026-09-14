require('dotenv').config();
const axios = require('axios');

// Target jadwal pengiriman Telegram (WIB)
const TARGET_HOURS = [7, 13, 20]; // 07:00, 13:00, 20:00 WIB
const SCHEDULE_LABELS = {
  7: '07:00 WIB (Sesi Pagi)',
  13: '13:00 WIB (Sesi Siang)',
  20: '20:00 WIB (Sesi Malam)'
};

// URL API Local Next.js
const API_URL = process.env.APP_URL 
  ? `${process.env.APP_URL}/api/crypto/hedgefund-buy/scan` 
  : 'http://localhost:3000/api/crypto/hedgefund-buy/scan';

// Pelacak slot jadwal yang sudah terkirim (format: YYYY-MM-DD-HH)
let lastSentSlot = null;
let isScanning = false;

function getWibTime() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 7));
}

function formatWibString(date) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss} WIB`;
}

function getNextScheduledTime() {
  const wib = getWibTime();
  const currentHour = wib.getHours();
  const currentMin = wib.getMinutes();

  for (const th of TARGET_HOURS) {
    if (th > currentHour || (th === currentHour && currentMin === 0)) {
      const diffHours = th - currentHour;
      const diffMin = (diffHours * 60) - currentMin;
      return {
        targetHour: th,
        label: SCHEDULE_LABELS[th],
        countdownMinutes: diffMin
      };
    }
  }

  // Jika sudah melewati jam 20:00, jadwal berikutnya adalah jam 07:00 esok hari
  const diffHours = (24 - currentHour) + 7;
  const diffMin = (diffHours * 60) - currentMin;
  return {
    targetHour: 7,
    label: '07:00 WIB (Besok Pagi)',
    countdownMinutes: diffMin
  };
}

async function triggerHedgeFundBuyTelegram(sessionLabel) {
  if (isScanning) {
    console.log(`[${formatWibString(getWibTime())}] ⏳ Pemindaian sedang berjalan, permintaan dilewati.`);
    return;
  }

  isScanning = true;
  console.log(`\n==================================================================`);
  console.log(`🚀 [${formatWibString(getWibTime())}] MEMULAI PEMINDAIAN & PENGIRIMAN TELEGRAM`);
  console.log(`📌 Sesi: ${sessionLabel}`);
  console.log(`🌐 Target: ${API_URL}`);
  console.log(`==================================================================`);

  try {
    const response = await axios.get(API_URL, {
      params: {
        limit: 25,
        forceTelegram: 'true',
        session: sessionLabel
      },
      timeout: 180000 // Timeout 3 menit untuk pemindaian derivatif
    });

    const data = response.data;
    if (data.success) {
      console.log(`✅ [${formatWibString(getWibTime())}] SUKSES:`);
      console.log(`   • Pesan: ${data.message}`);
      console.log(`   • Total Koin: ${data.total}`);
      console.log(`   • Sinyal High Conviction (≥75): ${data.strongBuysCount}`);
      console.log(`   • Status Telegram: ${data.telegramSent ? '✅ Terkirim' : '⚠️ Tidak terkirim'}`);
      if (data.telegramError) {
        console.warn(`   • Telegram Error: ${data.telegramError}`);
      }
    } else {
      console.error(`❌ [${formatWibString(getWibTime())}] API Gagal:`, data.message || data.error);
    }
  } catch (error) {
    console.error(`❌ [${formatWibString(getWibTime())}] Error saat menghubungi server Next.js:`, 
      error.response ? (error.response.data || error.response.statusText) : error.message
    );
    console.log(`💡 Pastikan server Next.js sedang menyala ('npm run dev' di port 3000).`);
  } finally {
    isScanning = false;
    const next = getNextScheduledTime();
    console.log(`⏳ Jadwal berikutnya: ${next.label} (± ${Math.floor(next.countdownMinutes / 60)} jam ${next.countdownMinutes % 60} menit lagi)\n`);
  }
}

function checkAndRunCron() {
  const wib = getWibTime();
  const currentHour = wib.getHours();
  const currentMinute = wib.getMinutes();
  const dateKey = `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}-${String(currentHour).padStart(2, '0')}`;

  // Cek apakah jam saat ini masuk dalam TARGET_HOURS (7, 13, 20)
  // dan menit saat ini berada di menit 00 s/d 02 (window 3 menit)
  if (TARGET_HOURS.includes(currentHour) && currentMinute >= 0 && currentMinute <= 2) {
    if (lastSentSlot !== dateKey) {
      lastSentSlot = dateKey;
      const label = SCHEDULE_LABELS[currentHour] || `${currentHour}:00 WIB`;
      triggerHedgeFundBuyTelegram(label);
    }
  }
}

// Banner Tampilan Awal
console.log("==================================================================");
console.log("   🤖 CRON JOB HEDGE FUND BUY RADAR -> TELEGRAM AKTIF 🤖   ");
console.log("==================================================================");
console.log("Sistem memantau dan otomatis mengirim data kuantitatif ke Telegram:");
console.log("  • Sesi 1: Jam 07:00 WIB (Sesi Pagi)");
console.log("  • Sesi 2: Jam 13:00 WIB (Sesi Siang)");
console.log("  • Sesi 3: Jam 20:00 WIB (Sesi Malam)");
console.log(`Waktu Sekarang : ${formatWibString(getWibTime())}`);
const initialNext = getNextScheduledTime();
console.log(`Jadwal Terdekat: ${initialNext.label} (± ${Math.floor(initialNext.countdownMinutes / 60)} jam ${initialNext.countdownMinutes % 60} menit lagi)`);
console.log("Biarkan jendela terminal ini tetap terbuka.");
console.log("==================================================================\n");

// Argumen baris perintah untuk tes langsung: node cron_hedgefund_buy.js --now
const args = process.argv.slice(2);
if (args.includes('--now') || args.includes('--test')) {
  console.log("⚡ Mode Uji Coba (--now / --test) terdeteksi. Memulai pengiriman segera...");
  triggerHedgeFundBuyTelegram(`Uji Coba Manual (${formatWibString(getWibTime())})`);
}

// Cek waktu setiap 30 detik
setInterval(checkAndRunCron, 30000);
