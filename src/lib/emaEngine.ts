import { executeQuery } from './db';
import { fetchKlines, fetchBinancePairs } from './binance';

export async function ensureEmaTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS coins (
      symbol VARCHAR(20) PRIMARY KEY,
      name VARCHAR(50)
    )
  `);
  
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS ema_results (
      id INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) NOT NULL,
      ema20 DECIMAL(20, 8),
      ema50 DECIMAL(20, 8),
      ema100 DECIMAL(20, 8),
      ema200 DECIMAL(20, 8),
      trend VARCHAR(20),
      timestamp DATETIME,
      UNIQUE KEY unique_symbol_timeframe (symbol, timeframe),
      FOREIGN KEY (symbol) REFERENCES coins(symbol) ON DELETE CASCADE
    )
  `);
}

// EMA calculation logic
export function calcEMA(closes: number[], period: number): number {
  if (closes.length < period) return 0;
  
  // Calculate SMA for the first EMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  let ema = sum / period;
  
  // Multiplier for EMA
  const k = 2 / (period + 1);
  
  for (let i = period; i < closes.length; i++) {
    ema = (closes[i] - ema) * k + ema;
  }
  
  return ema;
}

export type TrendStatus = 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH';

export function determineTrend(ema20: number, ema50: number, ema100: number, ema200: number): TrendStatus {
  if (ema20 === 0 || ema50 === 0 || ema100 === 0 || ema200 === 0) return 'NEUTRAL';
  
  if (ema20 > ema50 && ema50 > ema100 && ema100 > ema200) {
    return 'BULLISH';
  } else if (ema20 < ema50 && ema50 < ema100 && ema100 < ema200) {
    return 'BEARISH';
  }
  return 'NEUTRAL';
}

export interface EMAResult {
  timeframe: string;
  ema20: number;
  ema50: number;
  ema100: number;
  ema200: number;
  trend: TrendStatus;
}

export async function processCoinEMA(symbol: string): Promise<Record<string, EMAResult> | null> {
  const timeframes = [
    { tf: '4h', key: 'h4' },
    { tf: '1d', key: 'daily' }
  ];
  
  const results: Record<string, EMAResult> = {};
  
  for (const { tf, key } of timeframes) {
    // Limits must be at least 200+ to calculate EMA200 correctly
    const klines = await fetchKlines(symbol, tf, 300);
    if (!klines || klines.length < 200) {
      console.warn(`Not enough data for ${symbol} on ${tf}`);
      return null;
    }
    
    const closes = klines.map((k: any) => k.close);
    
    const ema20 = calcEMA(closes, 20);
    const ema50 = calcEMA(closes, 50);
    const ema100 = calcEMA(closes, 100);
    const ema200 = calcEMA(closes, 200);
    
    results[key] = {
      timeframe: key,
      ema20,
      ema50,
      ema100,
      ema200,
      trend: determineTrend(ema20, ema50, ema100, ema200)
    };
  }
  
  return results;
}

export async function saveEmaResults(symbol: string, results: Record<string, EMAResult>) {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Upsert coin
  const coinName = symbol.replace('USDT', '');
  await executeQuery(
    `INSERT INTO coins (symbol, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?`,
    [symbol, coinName, coinName]
  );
  
  // Upsert results
  for (const key of Object.keys(results)) {
    const res = results[key];
    await executeQuery(`
      INSERT INTO ema_results 
        (symbol, timeframe, ema20, ema50, ema100, ema200, trend, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        ema20 = VALUES(ema20), ema50 = VALUES(ema50), 
        ema100 = VALUES(ema100), ema200 = VALUES(ema200), 
        trend = VALUES(trend), timestamp = VALUES(timestamp)
    `, [
      symbol, key, res.ema20, res.ema50, res.ema100, res.ema200, res.trend, timestamp
    ]);
  }
}

export async function runScreenerCore(topN: number = 100) {
  await ensureEmaTables();
  const pairs = await fetchBinancePairs();
  const targetPairs = pairs.slice(0, topN);
  
  console.log(`Starting Screener for Top ${targetPairs.length} coins...`);
  
  const scanResults = [];
  
  for (const symbol of targetPairs) {
    try {
      const results = await processCoinEMA(symbol);
      if (results) {
        await saveEmaResults(symbol, results);
        scanResults.push({ symbol, results });
      }
      
      // Delay to respect Binance API limits
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }
  
  return scanResults;
}

export async function getScreenerResultsFromDB() {
  await ensureEmaTables();
  const data = await executeQuery<any[]>(`
    SELECT c.symbol, c.name, e.timeframe, e.ema20, e.ema50, e.ema100, e.ema200, e.trend, e.timestamp 
    FROM coins c
    JOIN ema_results e ON c.symbol = e.symbol
    ORDER BY c.symbol, e.timeframe
  `);
  
  // Group by symbol
  const grouped: Record<string, any> = {};
  for (const row of Object.values(data) as any[]) {
    if (!grouped[row.symbol]) {
      grouped[row.symbol] = {
        symbol: row.symbol,
        name: row.name,
        statuses: {
          h4: 'NEUTRAL',
          daily: 'NEUTRAL'
        },
        raw: {}
      };
    }
    grouped[row.symbol].statuses[row.timeframe] = row.trend;
    grouped[row.symbol].raw[row.timeframe] = {
      ema20: row.ema20, ema50: row.ema50, ema100: row.ema100, ema200: row.ema200, timestamp: row.timestamp
    };
  }
  
  // Compute composite status
  const finalized = Object.values(grouped).map(coin => {
    const s = coin.statuses;
    let mainStatus = 'NEUTRAL';
    if (s.h4 === 'BULLISH' && s.daily === 'BULLISH') mainStatus = 'STRONG_BULLISH';
    else if (s.h4 === 'BULLISH' || s.daily === 'BULLISH') mainStatus = 'BULLISH';
    else if (s.h4 === 'BEARISH' && s.daily === 'BEARISH') mainStatus = 'STRONG_BEARISH';
    else if (s.h4 === 'BEARISH' || s.daily === 'BEARISH') mainStatus = 'BEARISH';
    
    return { ...coin, status: mainStatus };
  });
  
  return finalized;
}
