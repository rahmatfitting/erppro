import 'dotenv/config';
import { executeQuery } from '../src/lib/db';
import { sendTelegramNotification } from '../src/lib/binance';
import { runVisualScan, ensureVisualTable } from '../src/lib/visualEngine';

async function executeCron() {
  console.log(`[${new Date().toISOString()}] Starting CRON: Visual Screener...`);
  try {
    await ensureVisualTable();

    // 1. Get existing symbols to detect new ones
    const existingSignals: any = await executeQuery(`SELECT symbol FROM crypto_visual_signals`);
    const existingSymbols = new Set(existingSignals.map((s: any) => s.symbol));

    // 2. Run Scan (Scan top 150 for wide coverage)
    const results = await runVisualScan(150);

    // 3. Clear and Update DB
    await executeQuery(`DELETE FROM crypto_visual_signals`);

    let newEntries = [];
    for (const signal of results) {
      try {
        await executeQuery(
          `INSERT INTO crypto_visual_signals (symbol, price_change, oi_change, sentiment, potential, entry, stop_loss, tp1) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [signal.symbol, signal.priceChange, signal.oiChange, signal.sentiment, signal.potential, signal.entry, signal.stop_loss, signal.tp1]
        );

        // 4. Detect New High Potential Signals
        const isEntering = signal.sentiment === 'LONG_ENTERING' || signal.sentiment === 'SHORT_ENTERING';
        if (isEntering && signal.potential > 12 && !existingSymbols.has(signal.symbol)) {
          newEntries.push(signal);
        }
      } catch (dbErr) { }
    }

    console.log(`[${new Date().toISOString()}] Scan finished. Found ${newEntries.length} new high potential visual signals.`);

    // 5. Telegram Notification
    if (newEntries.length > 0) {
      let msg = `🔥 *NEW VISUAL SIGNALS (High Potential)* 🔥\n\n`;
      newEntries.forEach(s => {
        const icon = s.sentiment === 'LONG_ENTERING' ? '📈' : '📉';
        msg += `${icon} *${s.symbol}* (${s.sentiment})\n`;
        msg += `Price Change: ${s.priceChange.toFixed(2)}%\n`;
        msg += `OI Change: ${s.oiChange.toFixed(2)}%\n`;
        msg += `Potential: ${s.potential.toFixed(2)}%\n`;
        msg += `Entry: ${s.entry}\n`;
        msg += `Chart: [TradingView](https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol})\n\n`;
      });
      await sendTelegramNotification(msg);
      console.log('Telegram Alert dispatched!');
    }
  } catch (error) {
    console.error('CRON Execution Failed:', error);
  }
}

executeCron().then(() => {
  process.exit(0);
}).catch((err) => {
  console.error(err);
  process.exit(1);
});
