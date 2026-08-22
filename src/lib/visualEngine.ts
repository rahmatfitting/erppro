import { executeQuery } from './db';
import { fetchTopFuturesPairs, fetchOIChange, classifySentiment, fetchFuturesKlines } from './futures';

export async function ensureVisualTable() {
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
}

export async function runVisualScan(limit: number = 50) {
  await ensureVisualTable();
  
  const pairs = await fetchTopFuturesPairs(limit);
  if (!pairs || pairs.length === 0) {
    return [];
  }

  const results: any[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (pair) => {
        try {
          const [oiChange, candles] = await Promise.all([
            fetchOIChange(pair.symbol),
            fetchFuturesKlines(pair.symbol, '1h', 30)
          ]);

          const sentiment = classifySentiment(pair.priceChangePercent, oiChange);
          const potential = Math.abs(pair.priceChangePercent) + Math.abs(oiChange);

          // ATR Recommendations
          let entry = pair.lastPrice;
          let sl = 0;
          let tp1 = 0;

          if (candles.length >= 14) {
            const trs: number[] = [];
            for (let k = 1; k < candles.length; k++) {
              const h = candles[k].high;
              const l = candles[k].low;
              const pc = candles[k - 1].close;
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

          return {
            symbol: pair.symbol,
            priceChange: pair.priceChangePercent,
            oiChange,
            sentiment,
            potential,
            entry,
            stop_loss: sl,
            tp1
          };
        } catch {
          return null;
        }
      })
    );

    for (const res of batchResults) {
      if (res) results.push(res);
    }
  }

  return results;
}
