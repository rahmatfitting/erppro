import 'dotenv/config';
import { executeQuery } from '../src/lib/db';
import { sendTelegramNotification } from '../src/lib/binance';
import { runHedgeScan, ensureHedgeTable } from '../src/lib/hedgeEngine';

async function executeCron() {
  console.log(`[${new Date().toISOString()}] Starting CRON: Hedge Fund Screener...`);
  try {
    await ensureHedgeTable();

    // 1. Get existing symbols before scan
    const existingSignals: any = await executeQuery(`SELECT symbol FROM crypto_hedge_signals`);
    const existingSymbols = new Set(existingSignals.map((s: any) => s.symbol));

    // 2. Run new scan (Top 150 coins to get a good Top 10)
    const top10 = await runHedgeScan(150);
    
    // 3. Update DB (Clear first, then insert new Top 10)
    await executeQuery(`DELETE FROM crypto_hedge_signals`);
    
    let newEntries = [];

    for (const signal of top10) {
      await executeQuery(
        `INSERT INTO crypto_hedge_signals (symbol, score, setup, distance, volatility, volume_24h, status) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [signal.symbol, signal.score, signal.setup, signal.distance, signal.volatility, signal.volume, signal.status]
      );

      // 4. Identify if it's a "New" entry in the Top 10
      if (!existingSymbols.has(signal.symbol)) {
        newEntries.push(signal);
      }
    }

    console.log(`[${new Date().toISOString()}] Scan finished. Found ${newEntries.length} new setups in Top 10.`);

    // 5. Telegram Alert for NEW entries
    if (newEntries.length > 0) {
      let msg = `💎 *NEW HEDGE FUND SETUP DETECTED* 💎\n\n`;
      msg += `The following coins have newly entered the Top 10 Screening:\n\n`;
      
      newEntries.forEach((s) => {
        msg += `🚀 *${s.symbol}*\n`;
        msg += `Score: ${s.score}/100\n`;
        msg += `Setup: ${s.setup}\n`;
        msg += `Status: ${s.score >= 80 ? '🔥 HIGH PROB' : '⚡ MEDIUM'}\n`;
        msg += `Chart: [TradingView](https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol})\n\n`;
      });
      
      await sendTelegramNotification(msg);
      console.log('Telegram Alert dispatched for new entries!');
    }
  } catch (error) {
    console.error('CRON Execution Failed:', error);
  }
}

executeCron().then(() => {
  console.log('Cron script executed successfully.');
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
