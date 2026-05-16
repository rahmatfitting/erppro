import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';
import { runVisualScan, ensureVisualTable } from '@/lib/visualEngine';

export const maxDuration = 300;

export async function GET() {
  try {
    await ensureVisualTable();
    
    // 1. Get existing symbols to detect new ones
    const existingSignals: any = await executeQuery(`SELECT symbol FROM crypto_visual_signals`);
    const existingSymbols = new Set(existingSignals.map((s: any) => s.symbol));

    // 2. Run Scan
    const results = await runVisualScan(100); // Scan top 100 for better coverage

    // 3. Clear and Update DB
    await executeQuery(`DELETE FROM crypto_visual_signals`);

    let newEntries = [];
    let detectedCount = 0;

    for (const signal of results) {
      try {
        await executeQuery(
          `INSERT INTO crypto_visual_signals (symbol, price_change, oi_change, sentiment, potential, entry, stop_loss, tp1) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [signal.symbol, signal.priceChange, signal.oiChange, signal.sentiment, signal.potential, signal.entry, signal.stop_loss, signal.tp1]
        );
        detectedCount++;

        // 4. Detect New High Potential Signals
        const isEntering = signal.sentiment === 'LONG_ENTERING' || signal.sentiment === 'SHORT_ENTERING';
        if (isEntering && signal.potential > 10 && !existingSymbols.has(signal.symbol)) {
          newEntries.push(signal);
        }
      } catch (dbErr) { }
    }

    // 5. Telegram Notification (Selalu kirim setiap jam)
    let msg = `👁️ *HOURLY VISUAL SCREENER* 👁️\n\n`;

    if (newEntries.length > 0) {
      newEntries.forEach(s => {
        const icon = s.sentiment === 'LONG_ENTERING' ? '📈' : '📉';
        msg += `${icon} *${s.symbol}* (${s.sentiment})\n`;
        msg += `Price Change: ${s.priceChange.toFixed(2)}%\n`;
        msg += `OI Change: ${s.oiChange.toFixed(2)}%\n`;
        msg += `Potential: ${s.potential.toFixed(2)}%\n`;
        msg += `Entry: ${s.entry}\n`;
        msg += `Chart: [TradingView](https://www.tradingview.com/chart/?symbol=BINANCE:${s.symbol})\n\n`;
      });
    } else {
      msg += `ℹ️ No new high-potential signals (>10%) entering this hour.\n\n`;
    }
    
    msg += `Total Signals Monitored: ${detectedCount}`;
    await sendTelegramNotification(msg);

    return NextResponse.json({ 
      success: true, 
      message: `Visual Scan complete. Found ${detectedCount} signals, ${newEntries.length} new high potential ones.`,
      new_signals: newEntries.map(e => e.symbol)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
