const axios = require('axios');

async function runTraderScan() {
  console.log(`\n[${new Date().toLocaleString()}] ⏳ Memulai Auto Scan (Top Trader Futures)...`);
  try {
    const res = await axios.get('http://localhost:3000/api/crypto/trader/scan');
    console.log(`[${new Date().toLocaleString()}] ✅ Sukses: ${res.data.message}`);
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] ❌ Error saat scan:`, err.response ? err.response.data : err.message);
  }
}

console.log("==================================================");
console.log("    🤖 CRON JOB CRYPTO TOP TRADER AKTIF    ");
console.log("==================================================");
console.log("Sistem akan otomatis melakukan Scan Trader dan");
console.log("mengirim notifikasi ke Telegram setiap 1 Jam.");
console.log("Biarkan terminal/jendela ini tetap terbuka.");
console.log("==================================================\n");

// Jalankan pertama kali saat script dibuka
runTraderScan();

// Set interval setiap 1 Jam (3600000 ms)
setInterval(runTraderScan, 3600000);
