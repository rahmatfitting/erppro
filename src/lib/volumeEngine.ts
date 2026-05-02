import { executeQuery } from './db';

export interface VolumeSignal {
  symbol: string;
  moneyVolumeUSD: number;
  avgVolumeUSD: number;
  spikeMultiplier: number;
  signalType: 'BUYING_PRESSURE' | 'SELLING_PRESSURE' | 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  score: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  metadata: any;
}

export async function fetchKlines(symbol: string, interval: string = '4h', limit: number = 21) {
  try {
    const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Binance API error: ${res.status}`);
    const data = await res.json();
    
    // Binance kline format:
    // [0] Open time
    // [1] Open
    // [2] High
    // [3] Low
    // [4] Close
    // [5] Volume
    // [6] Close time
    // [7] Quote asset volume
    // [8] Number of trades
    // [9] Taker buy base asset volume
    // [10] Taker buy quote asset volume
    // [11] Ignore
    return data.map((d: any) => ({
      openTime: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]), // Koin
      quoteVolume: parseFloat(d[7]), // USD (Money Volume)
      takerBuyVolume: parseFloat(d[10]), // USD (Taker buy quote volume -> Buying power)
    }));
  } catch (error) {
    console.error(`Error fetching klines for ${symbol}:`, error);
    return null;
  }
}

export function analyzeVolume(klines: any[], symbol: string): VolumeSignal | null {
  if (!klines || klines.length < 21) return null;
  
  // Pisahkan candle terakhir (current) dan 20 candle sebelumnya (history)
  const currentCandle = klines[klines.length - 1];
  const historyCandles = klines.slice(0, klines.length - 1);
  
  // Kita gunakan Quote Asset Volume sebagai "Money Volume" (nilai dalam USD)
  const currentMoneyVolume = currentCandle.quoteVolume;
  
  // Hitung rata-rata volume 20 candle sebelumnya
  const totalHistoryVolume = historyCandles.reduce((acc, c) => acc + c.quoteVolume, 0);
  const avgMoneyVolume = totalHistoryVolume / historyCandles.length;
  
  const spikeMultiplier = currentMoneyVolume / avgMoneyVolume;
  const isSpike = spikeMultiplier > 2; // Threshold: volume > 2x rata-rata
  
  if (!isSpike && currentMoneyVolume < 5_000_000) {
     return null; // Skip if no spike and volume is small
  }
  
  const open = currentCandle.open;
  const close = currentCandle.close;
  const high = currentCandle.high;
  const low = currentCandle.low;
  
  const priceChangePct = ((close - open) / open) * 100;
  const candleRange = ((high - low) / low) * 100;
  
  let signalType: 'BUYING_PRESSURE' | 'SELLING_PRESSURE' | 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL' = 'NEUTRAL';
  let score = 0;
  
  if (isSpike) score += 4;
  if (currentMoneyVolume > 10_000_000) score += 3; // > $10M
  
  const isBuying = close > open;
  const isSelling = close < open;
  
  // Absorption / Distribution logic
  // Jika volume meledak tapi harga gerak sangat sedikit (< 0.5% body)
  const isSmallBody = Math.abs(priceChangePct) < 0.5;
  const hasLongLowerWick = (open > close ? close - low : open - low) / (high - low) > 0.5;
  const hasLongUpperWick = (high - (open > close ? open : close)) / (high - low) > 0.5;
  
  if (isSpike && isSmallBody && hasLongLowerWick) {
    signalType = 'ACCUMULATION'; // Smart money nyerap jualan retail
    score += 3;
  } else if (isSpike && isSmallBody && hasLongUpperWick) {
    signalType = 'DISTRIBUTION'; // Smart money jualan diam-diam
    score -= 3;
  } else if (isSpike && isBuying) {
    signalType = 'BUYING_PRESSURE';
    score += 2;
  } else if (isSpike && isSelling) {
    signalType = 'SELLING_PRESSURE';
    score -= 2;
  }
  
  let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (signalType === 'ACCUMULATION' || signalType === 'BUYING_PRESSURE') bias = 'BULLISH';
  else if (signalType === 'DISTRIBUTION' || signalType === 'SELLING_PRESSURE') bias = 'BEARISH';
  
  // Jika tidak ada signal kuat dari spike
  if (signalType === 'NEUTRAL') return null;
  
  return {
    symbol,
    moneyVolumeUSD: currentMoneyVolume,
    avgVolumeUSD: avgMoneyVolume,
    spikeMultiplier,
    signalType,
    score,
    bias,
    metadata: {
      priceChangePct,
      candleRange,
      close,
      isSpike
    }
  };
}

export async function saveVolumeSignal(signal: VolumeSignal) {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await executeQuery(`
    INSERT INTO volume_screener_signals 
      (symbol, money_volume, signal_type, score, bias, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    signal.symbol,
    signal.moneyVolumeUSD,
    signal.signalType,
    signal.score,
    signal.bias,
    JSON.stringify(signal.metadata),
    timestamp
  ]);
}

export async function runVolumeScreenerCore(symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT', 'AVAXUSDT', 'DOTUSDT', 'MATICUSDT', 'NEARUSDT', 'FTMUSDT', 'OPUSDT', 'ARBUSDT']) {
  const results: VolumeSignal[] = [];
  
  for (const symbol of symbols) {
    const klines = await fetchKlines(symbol, '4h', 21);
    if (klines) {
      const signal = analyzeVolume(klines, symbol);
      if (signal) {
        await saveVolumeSignal(signal);
        results.push(signal);
      }
    }
  }
  
  return results;
}

export async function getVolumeSignalsFromDB() {
  const data = await executeQuery<any[]>(`
    SELECT * FROM volume_screener_signals
    ORDER BY timestamp DESC
    LIMIT 300
  `);
  
  // Filter to only keep the latest result per symbol
  const latestMap = new Map();
  for (const row of data) {
    if (!latestMap.has(row.symbol)) {
      latestMap.set(row.symbol, row);
    }
  }
  
  const latestData = Array.from(latestMap.values());
  
  // Parse JSON metadata
  return latestData.map(row => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
  }));
}
