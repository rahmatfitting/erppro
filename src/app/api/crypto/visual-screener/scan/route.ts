import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchTopFuturesPairs, fetchOIChange, classifySentiment, VisualSignal } from '@/lib/futures';
import { sendTelegramNotification, fetchKlines } from '@/lib/binance';

export const maxDuration = 300;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_visual_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      price_change DECIMAL(10, 2),
      oi_change DECIMAL(10, 2),
      sentiment VARCHAR(20),
      potential DECIMAL(10, 2),
      entry DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      tp1 DECIMAL(20, 8),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol)
    )
  `);
  
  // Ensure new columns exist for recommendations
  try {
    await executeQuery(`ALTER TABLE crypto_visual_signals ADD COLUMN entry DECIMAL(20, 8)`);
  } catch (e) {}
  try {
    await executeQuery(`ALTER TABLE crypto_visual_signals ADD COLUMN stop_loss DECIMAL(20, 8)`);
  } catch (e) {}
  try {
    await executeQuery(`ALTER TABLE crypto_visual_signals ADD COLUMN tp1 DECIMAL(20, 8)`);
  } catch (e) {}
}

export async function GET() {
  try {
    await ensureTable();
    
    // Clear existing records to ensure only current futures from this scan are shown
    await executeQuery(`DELETE FROM crypto_visual_signals`);

    const pairs = await fetchTopFuturesPairs(50); // Scanning top 50 for better coverage

    let detectedCount = 0;
    for (const pair of pairs) {
      const oiChange = await fetchOIChange(pair.symbol);
      const sentiment = classifySentiment(pair.priceChangePercent, oiChange);

      const potential = Math.abs(pair.priceChangePercent) + Math.abs(oiChange);

      // 1. Calculate Professional Recommendations based on ATR
      const candles = await fetchKlines(pair.symbol, '1h', 30);
      let entry = pair.lastPrice;
      let sl = 0;
      let tp1 = 0;

      if (candles.length >= 14) {
        // Simple ATR calculation from recent klines
        const trs: number[] = [];
        for (let i = 1; i < candles.length; i++) {
          const h = candles[i].high;
          const l = candles[i].low;
          const pc = candles[i - 1].close;
          trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
        }
        const atr = trs.slice(-14).reduce((a, b) => a + b, 0) / 14;

        if (sentiment === 'LONG_ENTERING') {
          sl = entry - (atr * 1.5);
          tp1 = entry + (atr * 3.0);
        } else if (sentiment === 'SHORT_ENTERING') {
          sl = entry + (atr * 1.5);
          tp1 = entry - (atr * 3.0);
        }
      }

      try {
        await executeQuery(
          `INSERT INTO crypto_visual_signals (symbol, price_change, oi_change, sentiment, potential, entry, stop_loss, tp1) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            price_change = VALUES(price_change),
            oi_change = VALUES(oi_change),
            sentiment = VALUES(sentiment),
            potential = VALUES(potential),
            entry = VALUES(entry),
            stop_loss = VALUES(stop_loss),
            tp1 = VALUES(tp1),
            created_at = CURRENT_TIMESTAMP`,
          [pair.symbol, pair.priceChangePercent, oiChange, sentiment, potential, entry, sl, tp1]
        );
        detectedCount++;

        // Notify Telegram for high potential entering signals (Price + OI > 10%)
        if ((sentiment === 'LONG_ENTERING' || sentiment === 'SHORT_ENTERING') && potential > 10) {
          const icon = sentiment === 'LONG_ENTERING' ? '📈' : '📉';
          const msg = `${icon} *VISUAL SIGNAL: ${sentiment}*
Symbol: ${pair.symbol}
Price Change: ${pair.priceChangePercent.toFixed(2)}%
OI Change: ${oiChange.toFixed(2)}%
Potential: ${potential.toFixed(2)}%
          `;
          await sendTelegramNotification(msg);
        }
      } catch (dbErr) { }
    }

    // Reset data if no signals detected
    if (detectedCount === 0) {
      await executeQuery(`DELETE FROM crypto_visual_signals`);
    }

    return NextResponse.json({ success: true, message: `Visual Scan complete. Analyzed ${detectedCount} pairs.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
