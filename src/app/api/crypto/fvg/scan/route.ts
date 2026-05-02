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

  // Add Scoring Columns (Migration)
  const scoreCols: any = await executeQuery(`SHOW COLUMNS FROM crypto_fvg_signals LIKE 'score'`);
  if (scoreCols.length === 0) {
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN score INT DEFAULT 0 AFTER timeframe`);
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN grade VARCHAR(5) DEFAULT 'D' AFTER score`);
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN impulse_size DECIMAL(10, 2) DEFAULT 0 AFTER grade`);
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN volume_spike DECIMAL(10, 2) DEFAULT 0 AFTER impulse_size`);
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN trend_strength DECIMAL(10, 4) DEFAULT 0 AFTER volume_spike`);
    await executeQuery(`ALTER TABLE crypto_fvg_signals ADD COLUMN fvg_size DECIMAL(20, 8) DEFAULT 0 AFTER trend_strength`);
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1w'; // default to weekly
    
    await ensureTable();
    const symbols = await fetchBinancePairs();
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'Binance API tidak merespons. Coba lagi nanti.' }, { status: 503 });
    }

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
            `INSERT INTO crypto_fvg_signals (
              symbol, fvg_low, fvg_high, entry, stop_loss, take_profit, distance, timeframe, 
              score, grade, impulse_size, volume_spike, trend_strength, fvg_size
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              symbol, signal.fvgLow, signal.fvgHigh, signal.entry, signal.stopLoss, signal.takeProfit, signal.distance, interval,
              signal.score, signal.grade, signal.features.impulseSize, signal.features.volumeSpike, signal.features.trendStrength, signal.features.fvgSize
            ]
          );
          
          if (res.affectedRows > 0) {
            detectedCount++;
            // Notify Telegram
            const msg = `🚀 *NEW BULLISH FVG (${interval})*
Symbol: ${symbol}
*AI Score: ${signal.score} (${signal.grade})*
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

    // Reset data if no signals detected
    if (detectedCount === 0) {
      await executeQuery(`DELETE FROM crypto_fvg_signals WHERE timeframe = ?`, [interval]);
    }

    return NextResponse.json({ success: true, message: `Scan [${interval}] complete. Detected ${detectedCount} new FVG signals.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
