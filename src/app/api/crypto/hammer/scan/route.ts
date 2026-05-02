import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { detectHammerReversal } from '@/lib/hammer';

export const maxDuration = 300;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_hammer_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) NOT NULL,
      trend VARCHAR(15),
      zone VARCHAR(15),
      confidence INT DEFAULT 0,
      pattern VARCHAR(50),
      entry_price DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      take_profit DECIMAL(20, 8),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol, timeframe)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '15m';
    
    await ensureTable();
    const symbols = await fetchBinancePairs();
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'Binance API Error' }, { status: 503 });
    }
    
    // Scan Top 100 for performance
    const activeSymbols = symbols.slice(0, 100); 
    let detectedCount = 0;

    for (const symbol of activeSymbols) {
      const candles = await fetchKlines(symbol, interval, 100);
      if (!candles || candles.length < 60) continue;

      const signal = detectHammerReversal(symbol, candles, interval);

      if (signal) {
        await executeQuery(
          `INSERT INTO crypto_hammer_signals (symbol, timeframe, trend, zone, confidence, pattern, entry_price, stop_loss, take_profit) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            confidence = VALUES(confidence),
            pattern = VALUES(pattern),
            entry_price = VALUES(entry_price),
            stop_loss = VALUES(stop_loss),
            take_profit = VALUES(take_profit),
            created_at = CURRENT_TIMESTAMP`,
          [symbol, interval, signal.trend, signal.zone, signal.confidence, signal.pattern, signal.entry, signal.sl, signal.tp]
        );
        detectedCount++;

        if (signal.confidence >= 7) {
          await sendTelegramNotification(
            `🎯 *HAMMER REVERSAL SNIPER (${interval})*\n` +
            `Symbol: ${symbol}\n` +
            `Pattern: ${signal.pattern}\n` +
            `Confidence: ${signal.confidence}/10\n\n` +
            `Entry: ${signal.entry}\n` +
            `SL: ${signal.sl}\n` +
            `TP: ${signal.tp}`
          );
        }
      }
    }

    return NextResponse.json({ success: true, message: `Hammer Scan complete. Detected ${detectedCount} signals.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
