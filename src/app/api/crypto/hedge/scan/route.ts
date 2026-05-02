import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { fetchTopFuturesPairs } from '@/lib/futures';
import { calculateHedgeScore, HedgeSignal } from '@/lib/hedge';

export const maxDuration = 300; 

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_hedge_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      score INT,
      setup VARCHAR(100),
      distance DECIMAL(10, 2),
      volatility DECIMAL(10, 2),
      volume_24h DECIMAL(20, 2),
      status VARCHAR(20),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol)
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    
    // Clear previous daily signals to refresh the Top 10
    await executeQuery(`DELETE FROM crypto_hedge_signals`);

    // Fetch Top 50 Futures Pairs by Volume
    const pairs = await fetchTopFuturesPairs(50);
    
    let allHedgeSignals: HedgeSignal[] = [];

    for (const pair of pairs) {
      // Hedge Fund Standard: 4h Timeframe
      const candles = await fetchKlines(pair.symbol, '4h', 100);
      
      // Calculate probability score
      const signal = calculateHedgeScore(pair.symbol, candles, {
        volume: pair.quoteVolume || 0, // Need to make sure quoteVolume is passed
        priceChange: pair.priceChangePercent
      });

      if (signal) {
        allHedgeSignals.push(signal);
      }
    }

    // Sort by Score DESC and Take Top 10
    const top10 = allHedgeSignals
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    for (const signal of top10) {
      try {
        await executeQuery(
          `INSERT INTO crypto_hedge_signals (symbol, score, setup, distance, volatility, volume_24h, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [signal.symbol, signal.score, signal.setup, signal.distance, signal.volatility, signal.volume, signal.status]
        );

        if (signal.score >= 85) {
          const msg = `🏆 *HEDGE FUND TOP SETUP (4h)*
Symbol: ${signal.symbol}
Score: ${signal.score}/100
Setup: ${signal.setup}
Status: 🔥 ${signal.status}
          `;
          await sendTelegramNotification(msg);
        }
      } catch (dbErr) {}
    }

    // Data already reset at start of scan (line 31)
    // If no signals found, table stays empty (reset state)

    return NextResponse.json({ success: true, message: `Hedge Fund Analysis complete. Found ${top10.length} Top setups.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
