import { executeQuery } from './db';

export interface SMCSignal {
  symbol: string;
  timeframe: string;
  structure: 'BOS' | 'CHoCH' | 'NONE';
  bias: 'BULLISH' | 'BEARISH';
  ob_price: number;
  last_hh_ll: number;
}

export function detectSMC(symbol: string, candles: any[], timeframe: string): SMCSignal | null {
  if (candles.length < 50) return null;

  // 1. Identify Swings (Pivot Points)
  // We use a sensitivity window of 5 candles left/right
  const window = 5;
  let highs: any[] = [];
  let lows: any[] = [];

  for (let i = window; i < candles.length - window; i++) {
    const current = candles[i];
    let isHigh = true;
    let isLow = true;

    for (let j = i - window; j <= i + window; j++) {
      if (i === j) continue;
      if (candles[j].high >= current.high) isHigh = false;
      if (candles[j].low <= current.low) isLow = false;
    }

    if (isHigh) highs.push({ price: current.high, index: i, time: current.time });
    if (isLow) lows.push({ price: current.low, index: i, time: current.time });
  }

  if (highs.length < 2 || lows.length < 2) return null;

  // 2. Market Structure (BOS / CHoCH)
  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  const prevHigh = highs[highs.length - 2];
  const prevLow = lows[lows.length - 2];

  const currentPrice = candles[candles.length - 1].close;
  const prevPrice = candles[candles.length - 2].close;

  let structure: 'BOS' | 'CHoCH' | 'NONE' = 'NONE';
  let bias: 'BULLISH' | 'BEARISH' = 'BULLISH';
  let ob_price = 0;
  let triggerIndex = -1;

  // Bullish Break (Potential BOS or CHoCH)
  if (currentPrice > lastHigh.price && prevPrice <= lastHigh.price) {
    // Bias was Bearish? Reversal! (CHoCH)
    // How to know if bias was bearish? 
    // Usually if prevHigh was lower than the high before that (LH).
    structure = (prevHigh.price < highs[highs.length - 3]?.price) ? 'CHoCH' : 'BOS';
    bias = 'BULLISH';
    triggerIndex = lastHigh.index;
    
    // 3. Identify Order Block (Extreme Low before the break)
    // Look for the lowest candle between lastLow index and triggerIndex
    let minLow = Infinity;
    for (let k = lastLow.index; k < triggerIndex; k++) {
      if (candles[k].low < minLow) {
        minLow = candles[k].low;
        ob_price = candles[k].open; // Using open as OB level
      }
    }
  } 
  // Bearish Break
  else if (currentPrice < lastLow.price && prevPrice >= lastLow.price) {
    structure = (prevLow.price > lows[lows.length - 3]?.price) ? 'CHoCH' : 'BOS';
    bias = 'BEARISH';
    triggerIndex = lastLow.index;
    
    // Identify Order Block (Extreme High before the break)
    let maxHigh = -Infinity;
    for (let k = lastHigh.index; k < triggerIndex; k++) {
      if (candles[k].high > maxHigh) {
        maxHigh = candles[k].high;
        ob_price = candles[k].open;
      }
    }
  }

  if (structure === 'NONE') return null;

  return {
    symbol,
    timeframe,
    structure,
    bias,
    ob_price,
    last_hh_ll: bias === 'BULLISH' ? lastHigh.price : lastLow.price
  };
}
