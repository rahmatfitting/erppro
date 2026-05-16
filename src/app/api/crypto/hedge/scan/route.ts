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
    
    // 2. Run scan (Use 150 to match Cronjob for consistency)
    const top10 = await runHedgeScan(150);

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

    // 5. Telegram Alert (Selalu kirim setiap jam)
    let msg = `💎 *HOURLY HEDGE FUND UPDATE* 💎\n\n`;
    
    if (newEntries.length > 0) {
      msg += `🚨 *${newEntries.length} NEW SETUP(S) DETECTED!* 🚨\n\n`;
    } else {
      msg += `📊 *Current Top 10 Setups:*\n\n`;
    }
    
    top10.forEach((s: any, index: number) => {
      const isNew = newEntries.some(n => n.symbol === s.symbol);
      msg += `${index + 1}. ${isNew ? '🆕 ' : ''}*${s.symbol}*\n`;
      msg += `   Score: ${s.score}/100 | ${s.score >= 80 ? '🔥 HIGH' : '⚡ MED'}\n`;
      msg += `   Setup: ${s.setup}\n`;
      msg += `   [View Chart](https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol})\n\n`;
    });
    
    await sendTelegramNotification(msg);

    return NextResponse.json({ 
      success: true, 
      message: `Hedge Fund Analysis complete. Found ${top10.length} setups, ${newEntries.length} new ones.`,
      new_entries: newEntries.map(e => e.symbol)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
