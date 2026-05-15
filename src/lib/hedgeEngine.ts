import { executeQuery } from './db';
import { fetchKlines, sendTelegramNotification } from './binance';
import { fetchTopFuturesPairs } from './futures';
import { calculateHedgeScore, HedgeSignal } from './hedge';

export async function ensureHedgeTable() {
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

export async function runHedgeScan(limit: number = 50) {
  await ensureHedgeTable();
  
  // Fetch Top Futures Pairs by Volume
  const pairs = await fetchTopFuturesPairs(limit);
  
  let allHedgeSignals: HedgeSignal[] = [];

  for (const pair of pairs) {
    // Hedge Fund Standard: 4h Timeframe
    const candles = await fetchKlines(pair.symbol, '4h', 100);
    
    // Calculate probability score
    const signal = calculateHedgeScore(pair.symbol, candles, {
      volume: pair.quoteVolume || 0,
      priceChange: pair.priceChangePercent
    });

    if (signal) {
      allHedgeSignals.push(signal);
    }
  }

  // Sort by Score DESC and Take Top 10
  return allHedgeSignals
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
