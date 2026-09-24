require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.APP_URL || 'http://localhost:3000';
const TICK_URL = `${API_BASE}/api/crypto/compound-bot/tick`;
const STATE_URL = `${API_BASE}/api/crypto/compound-bot`;

let isTicking = false;
let lastIdleLog = 0;

console.log('====================================================');
console.log('🤖 FUTURE COMPOUND BOT - 24/7 BACKGROUND ENGINE');
console.log('🎯 BUY Only Auto-Compounding Runner');
console.log(`🔗 Target API: ${TICK_URL}`);
console.log('====================================================\n');

async function runTick() {
  if (isTicking) return;
  isTicking = true;

  try {
    const res = await axios.post(TICK_URL, {}, { timeout: 10000 });
    const data = res.data;

    if (data && data.success) {
      const d = data.data;
      const now = new Date().toLocaleTimeString('id-ID');

      if (d.status === 'MONITORING') {
        const pnlSign = d.unrealizedPnl >= 0 ? '+' : '';
        const progressStr = (d.progressToTarget || 0).toFixed(1);
        console.log(
          `[${now}] 🟢 [Cycle #${d.cycleNumber}] ${d.symbol} Live: $${d.currentPrice?.toLocaleString()} | Entry: $${d.entryPrice} | Target: $${d.targetPrice} | PnL: ${pnlSign}$${(d.unrealizedPnl || 0).toFixed(2)} | Progres: ${progressStr}%`
        );
      } else if (d.status === 'COMPOUND_EXECUTED') {
        console.log('\n====================================================');
        console.log(`[${now}] 🎯 TARGET HIT & COMPOUNDED!`);
        console.log(`💰 Cycle #${d.previousCycle} Selesai! Realized Profit: +$${d.realizedPnl.toFixed(2)} USDT`);
        console.log(`🚀 Cycle #${d.newCycle} Dibuka dengan Modal Ter-Compound: $${d.nextNotional} USD!`);
        console.log(`📈 New Entry: $${d.nextEntryPrice} | New Target: $${d.nextTargetPrice}`);
        console.log('====================================================\n');
      } else if (d.status === 'STOP_LOSS_HIT') {
        console.log(`\n[${now}] ⚠️ STOP LOSS HIT! Posisi ditutup @ $${d.exitPrice}. Bot dihentikan demi proteksi modal.\n`);
      } else if (d.status === 'IDLE' || d.status === 'NO_OPEN_CYCLE') {
        const timeNow = Date.now();
        if (timeNow - lastIdleLog > 30000) {
          console.log(`[${now}] ⏸️ Bot sedang idle (STOPPED). Menunggu start dari web browser (/crypto/compound-bot)...`);
          lastIdleLog = timeNow;
        }
      }
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] ❌ Next.js dev server belum berjalan di ${API_BASE}. Menunggu koneksi...`);
    } else {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] Error tick:`, err.message);
    }
  } finally {
    isTicking = false;
  }
}

// Tick every 3 seconds
setInterval(runTick, 3000);
runTick();
