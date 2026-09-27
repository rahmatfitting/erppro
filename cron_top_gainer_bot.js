require('dotenv').config();
const axios = require('axios');

let API_BASE = process.env.APP_URL || 'http://localhost:3000';
let TICK_URL = `${API_BASE}/api/crypto/top-gainer-bot/tick`;
let hasFallenBack = false;

let isTicking = false;
let lastIdleLog = 0;
let lastMonitoringLog = 0;

console.log('====================================================');
console.log('🚀 BINANCE FUTURES TOP GAINER 20-SECOND SCALPER BOT');
console.log('👑 Auto-Detect #1 Rank Gainer & Instant MARKET BUY');
console.log('⏱️ Flash Scalp: Exactly 20 Seconds Hold & Auto-Close');
console.log('🔄 Continuous Loop: Triggers on Every New #1 Coin Shift');
console.log(`🔗 Target API: ${TICK_URL}`);
console.log('====================================================\n');

async function runTick() {
  if (isTicking) return;
  isTicking = true;

  try {
    const res = await axios.post(TICK_URL, {}, { timeout: 10000 });
    const data = res.data;

    if (data && data.success) {
      const { tickResult, state } = data.data;
      const now = new Date().toLocaleTimeString('id-ID');
      const config = state?.config;

      if (!config?.is_active) {
        const timeNow = Date.now();
        if (timeNow - lastIdleLog > 30000) {
          console.log(`[${now}] ⏸️ Bot Top Gainer sedang IDLE (STOPPED). Klik START di web (/crypto/top-gainer) untuk memulai...`);
          lastIdleLog = timeNow;
        }
        return;
      }

      if (tickResult?.status === 'HOLDING') {
        const pnlSign = (tickResult.unrealizedPnl || 0) >= 0 ? '+' : '';
        const roeSign = (tickResult.roePercent || 0) >= 0 ? '+' : '';
        const modeTag = tickResult.strategyMode === 'SESSION_HOURS'
          ? `🏛️ [${tickResult.sessionInfo?.name || tickResult.sessionInfo?.preset || 'SESI'} | ${tickResult.symbol}]`
          : `⚡ [SCALPING ${tickResult.symbol}]`;
        const timeTag = tickResult.strategyMode === 'SESSION_HOURS'
          ? `Tutup Sesi: ${tickResult.sessionInfo?.endTime} WIB`
          : `Sisa: ${tickResult.secondsLeft}s / ${tickResult.holdSeconds}s`;
        const trailingTag = tickResult.trailingInfo?.enabled
          ? ` | Peak: $${tickResult.peakPrice} (Pullback: ${tickResult.trailingInfo?.dropFromPeakPercent?.toFixed(2)}% / ${tickResult.trailingInfo?.callbackPercent}%)`
          : '';

        console.log(
          `[${now}] ${modeTag} ${timeTag} | Entry: $${tickResult.entryPrice} | Live: $${tickResult.markPrice}${trailingTag} | PnL: ${pnlSign}$${(tickResult.unrealizedPnl || 0).toFixed(4)} (${roeSign}${(tickResult.roePercent || 0).toFixed(2)}%)`
        );
      } else if (tickResult?.status === 'ORDER_OPENED') {
        const isSession = tickResult.strategyMode === 'SESSION_HOURS';
        console.log('\n====================================================');
        console.log(`[${now}] 🚀 ${isSession ? 'SESI TRADING DIMULAI! BUY ORDER OPENED!' : 'NEW #1 TOP GAINER DETECTED! ORDER BUY OPENED!'}`);
        console.log(`🪙 Koin: ${tickResult.symbol} | Sisi: ${tickResult.side}`);
        console.log(`💵 Harga Entry: $${tickResult.entryPrice} | Qty: ${tickResult.quantity}`);
        if (isSession) {
          console.log(`🏛️ Target Exit: Ditahan Hingga Jam Tutup Sesi (${tickResult.sessionEndTime} WIB)`);
        } else {
          console.log(`⏱️ Scalp Countdown: ${tickResult.holdSeconds} Detik Dimulai!`);
        }
        console.log(`🆔 Binance Order ID: ${tickResult.orderId}`);
        console.log('====================================================\n');
      } else if (tickResult?.status === 'ROUND_COMPLETED') {
        const pnlSign = (tickResult.netPnl || 0) >= 0 ? '+' : '';
        const exitLabel = tickResult.exitReason === 'TRAILING_STOP'
          ? '🎯 TRAILING STOP HIT'
          : tickResult.exitReason === 'SESSION_END'
          ? '🏁 JAM TUTUP SESI TERCAPAI'
          : tickResult.exitReason === 'STOP_LOSS'
          ? '🛑 STOP LOSS DARURAT'
          : '⏱️ SCALP FLASH SELESAI';

        console.log('\n====================================================');
        console.log(`[${now}] 🎉 [${exitLabel}] ROUND #${tickResult.roundNumber} COMPLETED (${tickResult.elapsedSeconds}s)!`);
        console.log(`🪙 Koin: ${tickResult.symbol} | Entry: $${tickResult.entryPrice} ➔ Exit: $${tickResult.exitPrice} (Peak: $${tickResult.peakPrice})`);
        console.log(`📊 Price Trade PnL: $${tickResult.tradePnl?.toFixed(4)} USDT`);
        console.log(`✨ Net Realized PnL: ${pnlSign}$${tickResult.netPnl?.toFixed(4)} USDT (${pnlSign}${tickResult.netPnlPercent?.toFixed(2)}%)`);
        if (config?.is_compound && (tickResult.netPnl || 0) > 0) {
          console.log(`📈 Auto-Compound: Modal Notional berikutnya: $${config.notional_usd} USD`);
        }
        console.log('🔍 Menunggu peluang atau siklus berikutnya...');
        console.log('====================================================\n');
      } else if (tickResult?.status === 'WAITING_SESSION') {
        const timeNow = Date.now();
        if (timeNow - lastMonitoringLog > 15000) {
          console.log(`[${now}] ⏳ ${tickResult.message}`);
          lastMonitoringLog = timeNow;
        }
      } else if (tickResult?.status === 'SESSION_COMPLETED') {
        const timeNow = Date.now();
        if (timeNow - lastMonitoringLog > 25000) {
          console.log(`[${now}] 💤 ${tickResult.message}`);
          lastMonitoringLog = timeNow;
        }
      } else if (tickResult?.status === 'MONITORING') {
        const timeNow = Date.now();
        if (timeNow - lastMonitoringLog > 10000) {
          const leader = tickResult.currentLeader;
          console.log(
            `[${now}] 👑 [LEADER #1: ${leader?.symbol || 'N/A'}] +${leader?.priceChangePercent?.toFixed(2)}% | Menunggu koin baru menyalip juara sebelumnya (${tickResult.lastBought || 'None'})...`
          );
          lastMonitoringLog = timeNow;
        }
      } else if (tickResult?.status === 'BELOW_GAIN_THRESHOLD') {
        const timeNow = Date.now();
        if (timeNow - lastMonitoringLog > 20000) {
          console.log(`[${now}] ⏳ ${tickResult.message}`);
          lastMonitoringLog = timeNow;
        }
      }
    }
  } catch (err) {
    if ((err.response?.status === 404 || err.code === 'ECONNREFUSED') && !hasFallenBack && API_BASE === 'http://localhost:3000') {
      hasFallenBack = true;
      API_BASE = 'https://demo.erpproapp.com';
      TICK_URL = `${API_BASE}/api/crypto/top-gainer-bot/tick`;
      console.log(`\n[Auto-Fallback] Port 3000 ${err.response?.status === 404 ? 'mengembalikan 404 Not Found' : 'gagal terhubung'}. Mengalihkan target otomatis ke live domain: ${TICK_URL}\n`);
      return;
    }
    if (err.code === 'ECONNREFUSED') {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] ❌ Server Next.js belum aktif di ${API_BASE}. Menunggu koneksi...`);
    } else {
      console.error(`[${new Date().toLocaleTimeString('id-ID')}] Error tick:`, err.message);
    }
  } finally {
    isTicking = false;
  }
}

// Tick every 1.5 seconds for lightning-fast scalp reaction
setInterval(runTick, 1500);
runTick();
