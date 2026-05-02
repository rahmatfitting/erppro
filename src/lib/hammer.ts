export interface HammerSignal {
  symbol: string;
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH';
  zone: 'DISCOUNT' | 'PREMIUM' | 'EQUILIBRIUM';
  confidence: number;
  pattern: string;
  entry: number;
  sl: number;
  tp: number;
}

export function detectHammerReversal(symbol: string, candles: any[], timeframe: string): HammerSignal | null {
  if (candles.length < 60) return null;

  const current = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  
  // 1. Detect Trend (Bearish required for Reversal Buy)
  // Check last 20 candles for Lower Highs (LH) and Lower Lows (LL)
  let lhCount = 0;
  let llCount = 0;
  for (let i = candles.length - 20; i < candles.length - 1; i++) {
    if (candles[i].high < candles[i-1].high) lhCount++;
    if (candles[i].low < candles[i-1].low) llCount++;
  }
  const isDowntrend = lhCount > 10 && llCount > 10;

  // 2. Equilibrium & Zone Calculation (50-candle lookback)
  const rangeCandles = candles.slice(-50);
  const rangeHigh = Math.max(...rangeCandles.map(c => c.high));
  const rangeLow = Math.min(...rangeCandles.map(c => c.low));
  const equilibrium = (rangeHigh + rangeLow) / 2;
  
  let zone: 'DISCOUNT' | 'PREMIUM' | 'EQUILIBRIUM' = 'EQUILIBRIUM';
  if (current.close < equilibrium * 0.95) zone = 'DISCOUNT';
  else if (current.close > equilibrium * 1.05) zone = 'PREMIUM';

  // 3. Liquidity Sweep Detection
  // Current Low is lower than previous low, but closes above it
  const isLiquiditySweep = current.low < previous.low && current.close > previous.low;

  // 4. Hammer Pattern Detection
  const bodySize = Math.abs(current.open - current.close);
  const candleRange = current.high - current.low;
  const lowerWick = Math.min(current.open, current.close) - current.low;
  const upperWick = current.high - Math.max(current.open, current.close);

  // Hammer: Long lower wick, small body at the top
  const isHammer = lowerWick > bodySize * 2 && upperWick < bodySize;
  const isSmallBody = bodySize < candleRange * 0.4;

  if (!isDowntrend || zone !== 'DISCOUNT' || !isHammer || !isSmallBody) return null;

  // 5. Confidence Scoring
  let confidence = 5; // Base score for meeting core criteria
  
  // Volume Spike
  const avgVolume = candles.slice(-20, -1).reduce((s, c) => s + c.volume, 0) / 19;
  if (current.volume > avgVolume * 1.5) confidence += 2;

  // RSI Confirmation (Oversold) - Optional but good
  // (Assuming calculateRSI is available or handles externally)

  // 6. Signal Output
  return {
    symbol,
    timeframe,
    trend: 'BEARISH',
    zone: 'DISCOUNT',
    confidence,
    pattern: isLiquiditySweep ? 'Hammer + Liquidity Sweep' : 'Hammer Reversal',
    entry: current.close,
    sl: current.low,
    tp: current.close + (current.close - current.low) * 2 // 2R Reward
  };
}
