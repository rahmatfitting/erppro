import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchTopFuturesPairs, fetchOIChange, classifySentiment, VisualSignal } from '@/lib/futures';
import { sendTelegramNotification } from '@/lib/binance';

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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol)
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const pairs = await fetchTopFuturesPairs(30); // Scanning top 30 for speed
    
    let detectedCount = 0;
    for (const pair of pairs) {
      const oiChange = await fetchOIChange(pair.symbol);
      const sentiment = classifySentiment(pair.priceChangePercent, oiChange);
      
      const potential = Math.abs(pair.priceChangePercent) + Math.abs(oiChange);
      
      try {
        await executeQuery(
          `INSERT INTO crypto_visual_signals (symbol, price_change, oi_change, sentiment, potential) 
           VALUES (?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            price_change = VALUES(price_change),
            oi_change = VALUES(oi_change),
            sentiment = VALUES(sentiment),
            potential = VALUES(potential),
            created_at = CURRENT_TIMESTAMP`,
          [pair.symbol, pair.priceChangePercent, oiChange, sentiment, potential]
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
      } catch (dbErr) {}
    }

    return NextResponse.json({ success: true, message: `Visual Scan complete. Analyzed ${detectedCount} pairs.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
