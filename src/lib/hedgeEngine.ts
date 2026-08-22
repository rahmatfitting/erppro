import { executeQuery } from './db';
import { sendTelegramNotification } from './binance';
import { fetchTopFuturesPairs, fetchFuturesKlines } from './futures';
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
  if (!pairs || pairs.length === 0) return [];
  
  let allHedgeSignals: HedgeSignal[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const batchSignals = await Promise.all(
      batch.map(async (pair) => {
        try {
          const candles = await fetchFuturesKlines(pair.symbol, '4h', 100);
          return calculateHedgeScore(pair.symbol, candles, {
            volume: pair.quoteVolume || 0,
            priceChange: pair.priceChangePercent
          });
        } catch {
          return null;
        }
      })
    );

    for (const sig of batchSignals) {
      if (sig) allHedgeSignals.push(sig);
    }
  }

  // Sort by Score DESC and Take Top 10
  return allHedgeSignals
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}
