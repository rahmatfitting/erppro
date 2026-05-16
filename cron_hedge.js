const axios = require('axios');

async function runHedgeScan() {
  console.log(`\n[${new Date().toLocaleString()}] ⏳ Memulai Auto Deep Analyzing (Hedge Fund Scan)...`);
  try {
    // Memanggil endpoint scan yang sama dengan tombol 'Deep Analyzing'
    const res = await axios.get('http://localhost:3000/api/crypto/hedge/scan');
    console.log(`[${new Date().toLocaleString()}] ✅ Sukses: ${res.data.message}`);
    
    if (res.data.new_entries && res.data.new_entries.length > 0) {
      console.log(`[${new Date().toLocaleString()}] 🚀 Dikirim ke Telegram: ${res.data.new_entries.join(', ')}`);
    } else {
      console.log(`[${new Date().toLocaleString()}] ℹ️ Tidak ada setup baru yang masuk top 10 untuk dikirim ke Telegram.`);
    }
  } catch (err) {
    console.error(`[${new Date().toLocaleString()}] ❌ Error saat scan:`, err.response ? err.response.data : err.message);
  }
}

console.log("==================================================");
console.log("   🤖 CRON JOB CRYPTO HEDGE SCREENER AKTIF   ");
console.log("==================================================");
console.log("Sistem akan otomatis melakukan Deep Analyze dan");
console.log("mengirim notifikasi ke Telegram setiap 1 Jam.");
console.log("Biarkan terminal/jendela ini tetap terbuka.");
console.log("==================================================\n");

// Jalankan pertama kali saat script dibuka
runHedgeScan();

// Set interval setiap 1 Jam (3600000 ms)
setInterval(runHedgeScan, 3600000);
