import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';
import { runHedgeScan, ensureHedgeTable } from '@/lib/hedgeEngine';

export const maxDuration = 300; 

export async function GET() {
  try {
    await ensureHedgeTable();
    
    // 1. Get existing symbols before scan to detect new entries
    const existingSignals: any = await executeQuery(`SELECT symbol FROM crypto_hedge_signals`);
    const existingSymbols = new Set(existingSignals.map((s: any) => s.symbol));
    
    // 2. Run scan
    const top10 = await runHedgeScan(50);

    // 3. Clear and Update DB
    await executeQuery(`DELETE FROM crypto_hedge_signals`);
    
    let newEntries = [];

    for (const signal of top10) {
      try {
        await executeQuery(
          `INSERT INTO crypto_hedge_signals (symbol, score, setup, distance, volatility, volume_24h, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [signal.symbol, signal.score, signal.setup, signal.distance, signal.volatility, signal.volume, signal.status]
        );

        // 4. Identify if it's a "New" entry in the Top 10
        if (!existingSymbols.has(signal.symbol)) {
          newEntries.push(signal);
        }
      } catch (dbErr) {}
    }

    // 5. Telegram Alert for NEW entries (or high score if preferred)
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
    }

    return NextResponse.json({ 
      success: true, 
      message: `Hedge Fund Analysis complete. Found ${top10.length} setups, ${newEntries.length} new ones.`,
      new_entries: newEntries.map(e => e.symbol)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
