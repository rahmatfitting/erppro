require('dotenv').config();
const axios = require('axios');

const API_BASE = process.env.APP_URL || 'http://localhost:3000';
const TICK_URL = `${API_BASE}/api/crypto/funding-farming/bot/tick`;

let isTicking = false;
let lastIdleLog = 0;
let lastWaitingLog = 0;

console.log('====================================================');
console.log('🤖 AUTONOMOUS FUNDING FARMING BOT - 24/7 RUNNER');
console.log('⚡ Auto-Target Highest Funding Fee Coin');
console.log('⏱️ Auto-Entry: < 30s Before Settlement');
console.log('💰 Auto-Exit: +10s After Settlement (Fee Locked)');
console.log(`🔗 Target API: ${TICK_URL}`);
console.log('====================================================\n');

async function runTick() {
  if (isTicking) return;
  isTicking = true;

  try {
    const res = await axios.post(TICK_URL, {}, { timeout: 12000 });
    const data = res.data;

    if (data && data.success) {
      const { tickResult, state } = data.data;
      const now = new Date().toLocaleTimeString('id-ID');
      const config = state?.config;

      if (!config?.is_active) {
        const timeNow = Date.now();
        if (timeNow - lastIdleLog > 30000) {
          console.log(`[${now}] ⏸️ Bot Funding Farming sedang IDLE (STOPPED). Klik START di web (/crypto/funding-farming) untuk memulai...`);
          lastIdleLog = timeNow;
        }
        return;
      }

      if (tickResult?.status === 'HOLDING') {
        const pnlSign = (tickResult.unrealizedPnl || 0) >= 0 ? '+' : '';
        console.log(
          `[${now}] 🟢 [HOLDING ${tickResult.symbol} ${tickResult.side}] Live: $${tickResult.markPrice?.toLocaleString()} | Entry: $${tickResult.entryPrice} | Float PnL: ${pnlSign}$${(tickResult.unrealizedPnl || 0).toFixed(4)} | Auto-Close in: ${tickResult.secondsLeftToClose}s`
        );
      } else if (tickResult?.status === 'ORDER_OPENED') {
        console.log('\n====================================================');
        console.log(`[${now}] 🚀 ORDER OPENED FOR FUNDING FARMING!`);
        console.log(`🪙 Koin: ${tickResult.symbol} | Posisi: ${tickResult.side}`);
        console.log(`💵 Harga Entry: $${tickResult.entryPrice} | Qty: ${tickResult.quantity}`);
        console.log(`🆔 Binance Order ID: ${tickResult.orderId}`);
        console.log('====================================================\n');
      } else if (tickResult?.status === 'ROUND_COMPLETED') {
        console.log('\n====================================================');
        console.log(`[${now}] 🎉 ROUND #${tickResult.roundNumber} COMPLETED!`);
        console.log(`🪙 Koin: ${tickResult.symbol} | Exit: $${tickResult.exitPrice}`);
        console.log(`💰 Funding Fee Diterima: +$${tickResult.fundingFee?.toFixed(4)} USDT`);
        console.log(`📊 Price Realized PnL: $${tickResult.tradePnl?.toFixed(4)} USDT`);
        console.log(`✨ Net Realized PnL: $${tickResult.netPnl?.toFixed(4)} USDT`);
        console.log('🔄 Loop berlanjut, memindai target koin berikutnya...');
        console.log('====================================================\n');
      } else if (tickResult?.status === 'WAITING_ENTRY') {
        const cand = tickResult.targetCandidate;
        const timeNow = Date.now();
        if (timeNow - lastWaitingLog > 10000) {
          const rateStr = ((cand?.fundingRate || 0) * 100).toFixed(4);
          console.log(
            `[${now}] 🎯 [TARGET: ${cand?.symbol || 'N/A'}] Sisi: ${cand?.recommendation} | Fee Rate: ${rateStr}% | Sisa Waktu: ${tickResult.secondsUntilFunding}s (Trigger < ${tickResult.openSecondsBefore}s)`
          );
          lastWaitingLog = timeNow;
        }
      } else if (tickResult?.status === 'BELOW_THRESHOLD') {
        const timeNow = Date.now();
        if (timeNow - lastWaitingLog > 30000) {
          console.log(`[${now}] ⏳ ${tickResult.message}`);
          lastWaitingLog = timeNow;
        }
      }
    }
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] ❌ Server Next.js belum aktif di ${API_BASE}. Menunggu koneksi...`);
    } else {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] Error tick:`, err.message);
    }
  } finally {
    isTicking = false;
  }
}

// Tick every 2.5 seconds
setInterval(runTick, 2500);
runTick();
