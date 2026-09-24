require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.APP_URL || 'http://localhost:3000';
const TICK_URL = `${API_BASE}/api/crypto/compound-bot/tick`;

let isTicking = false;
let lastIdleLog = 0;

console.log('====================================================');
console.log('🤖 MULTI-COIN FUTURE COMPOUND BOT - 24/7 RUNNER');
console.log('🎯 BUY Only Independent Multi-Pair Auto-Compounding');
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

      if (d.status === 'MONITORING' && Array.isArray(d.coins) && d.coins.length > 0) {
        for (const coin of d.coins) {
          if (coin.status === 'MONITORING') {
            const pnlSign = (coin.unrealizedPnl || 0) >= 0 ? '+' : '';
            const progressStr = (coin.progressToTarget || 0).toFixed(1);
            console.log(
              `[${now}] 🟢 [${coin.symbol} #${coin.cycleNumber}] Live: $${coin.currentPrice?.toLocaleString()} | Entry: $${coin.entryPrice} | Target: $${coin.targetPrice} | PnL: ${pnlSign}$${(coin.unrealizedPnl || 0).toFixed(2)} | Progres: ${progressStr}%`
            );
          } else if (coin.status === 'COMPOUND_EXECUTED') {
            console.log('\n====================================================');
            console.log(`[${now}] 🎯 [${coin.symbol}] TARGET HIT & RE-COMPOUNDED!`);
            console.log(`💰 Cycle #${coin.previousCycle} Selesai! Realized Profit: +$${coin.realizedPnl?.toFixed(2)} USDT`);
            console.log(`🚀 Cycle #${coin.newCycle} Dibuka dengan Modal Baru: $${coin.nextNotional} USD!`);
            console.log('====================================================\n');
          } else if (coin.status === 'STOP_LOSS_HIT') {
            console.log(`\n[${now}] ⚠️ [${coin.symbol}] STOP LOSS HIT! Posisi ditutup @ $${coin.exitPrice}.\n`);
          }
        }
      } else if (d.status === 'IDLE' || d.activeCount === 0) {
        const timeNow = Date.now();
        if (timeNow - lastIdleLog > 30000) {
          console.log(`[${now}] ⏸️ Semua bot koin sedang idle (STOPPED). Menunggu start dari web browser (/crypto/compound-bot)...`);
          lastIdleLog = timeNow;
        }
      }
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] ❌ Next.js server belum berjalan di ${API_BASE}. Menunggu koneksi...`);
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
