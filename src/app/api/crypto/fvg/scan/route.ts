import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, detectBulishFVG, sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 300; // 5 minutes (Vercel)

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_fvg_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      fvg_low DECIMAL(20, 8),
      fvg_high DECIMAL(20, 8),
      entry DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      take_profit DECIMAL(20, 8),
      distance DECIMAL(10, 2),
      timeframe VARCHAR(10) DEFAULT '1w',
      status VARCHAR(20) DEFAULT 'FRESH',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Add timeframe column if it doesn't exist (Migration)
  const columns: any = await executeQuery(`SHOW COLUMNS FROM crypto_fvg_signals LIKE 'timeframe'`);
  if (columns.length === 0) {
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN timeframe VARCHAR(10) DEFAULT '1w' AFTER distance`);
    // Re-create unique index
    try { await executeQuery(`ALTER TABLE crypto_fvg_signals DROP INDEX symbol`); } catch(e) {}
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD UNIQUE INDEX (symbol, entry, timeframe)`);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1w'; // default to weekly
    
    await ensureTable();
    const symbols = await fetchBinancePairs();
    
    // Limits the scan to top symbols
    const activeSymbols = symbols.slice(0, 50); 
    
    let detectedCount = 0;
    for (const symbol of activeSymbols) {
      const candles = await fetchKlines(symbol, interval);
      const signal = detectBulishFVG(symbol, candles);
      
      if (signal) {
        // Save to DB
        try {
          const res: any = await executeQuery(
            `INSERT INTO crypto_fvg_signals (symbol, fvg_low, fvg_high, entry, stop_loss, take_profit, distance, timeframe) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [symbol, signal.fvgLow, signal.fvgHigh, signal.entry, signal.stopLoss, signal.takeProfit, signal.distance, interval]
          );
          
          if (res.affectedRows > 0) {
            detectedCount++;
            // Notify Telegram
            const msg = `🚀 *NEW BULLISH FVG (${interval})*
Symbol: ${symbol}
Entry: ${signal.entry}
SL: ${signal.stopLoss}
TP: ${signal.takeProfit}
Distance: ${signal.distance.toFixed(2)}%
            `;
            await sendTelegramNotification(msg);
          }
        } catch (dbErr) {
          // Ignore unique constraint errors
        }
      }
    }

    return NextResponse.json({ success: true, message: `Scan [${interval}] complete. Detected ${detectedCount} new FVG signals.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
