import { executeQuery } from './db';
import { fetchTopFuturesPairs, fetchOIChange, classifySentiment } from './futures';
import { fetchKlines } from './binance';

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
  let results = [];

  for (const pair of pairs) {
    const oiChange = await fetchOIChange(pair.symbol);
    const sentiment = classifySentiment(pair.priceChangePercent, oiChange);
    const potential = Math.abs(pair.priceChangePercent) + Math.abs(oiChange);

    // ATR Recommendations
    const candles = await fetchKlines(pair.symbol, '1h', 30);
    let entry = pair.lastPrice;
    let sl = 0;
    let tp1 = 0;

    if (candles.length >= 14) {
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

    results.push({
      symbol: pair.symbol,
      priceChange: pair.priceChangePercent,
      oiChange,
      sentiment,
      potential,
      entry,
      stop_loss: sl,
      tp1
    });
  }

  return results;
}
