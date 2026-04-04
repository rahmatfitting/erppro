import { detectSMC } from './smc';
import { detectBulishFVG } from './binance';

export interface HedgeSignal {
  symbol: string;
  score: number;
  setup: string;
  distance: number;
  volatility: number;
  volume: number;
  status: 'HIGH PROBABILITY' | 'MEDIUM';
}

export function detectLiquiditySweep(candles: any[]) {
  if (candles.length < 20) return { bullish: false, bearish: false };

  // Find previous Swing Low/High (Pivot 5)
  let prevLow = Infinity;
  let prevHigh = -Infinity;
  
  // Look back for a clear pivot point before current move
  for (let i = candles.length - 15; i < candles.length - 2; i++) {
    if (candles[i].low < prevLow) prevLow = candles[i].low;
    if (candles[i].high > prevHigh) prevHigh = candles[i].high;
  }

  const current = candles[candles.length - 1];
  
  // Bullish Sweep: Low below prevLow, but Close above it (Wick)
  const bullish = current.low < prevLow && current.close > prevLow;
  // Bearish Sweep: High above prevHigh, but Close below it
  const bearish = current.high > prevHigh && current.close < prevHigh;

  return { bullish, bearish };
}

export function calculateHedgeScore(
  symbol: string, 
  candles: any[], 
  volData: { volume: number, priceChange: number }
): HedgeSignal | null {
  
  const sweep = detectLiquiditySweep(candles);
  const smc = detectSMC(symbol, candles, '4h');
  const fvg = detectBulishFVG(symbol, candles);

  // Setup Detection
  let setupFound = [];
  if (sweep.bullish) setupFound.push("Sweep");
  if (smc?.structure === 'CHoCH' && smc.bias === 'BULLISH') setupFound.push("CHoCH");
  if (fvg) setupFound.push("FVG");

  if (setupFound.length === 0) return null;

  // 1. SMC Score (40%)
  let smcTotal = 0;
  if (setupFound.includes("CHoCH")) smcTotal += 20;
  if (setupFound.includes("Sweep")) smcTotal += 10;
  if (setupFound.includes("FVG")) smcTotal += 10;

  // 2. Volume Score (30%) - Normalized relative to $500M benchmark
  const volScore = Math.min(30, (volData.volume / 500000000) * 30);

  // 3. Volatility Score (20%) - Normalized relative to 10% change
  const volatilityScore = Math.min(20, (Math.abs(volData.priceChange) / 10) * 20);

  // 4. Distance Score (10%) - Closer to FVG entry is better
  let distScore = 0;
  if (fvg) {
    distScore = Math.max(0, 10 - (fvg.distance / 2)); // 0% distance = 10 points
  }

  const totalScore = Math.round(smcTotal + volScore + volatilityScore + distScore);

  return {
    symbol,
    score: totalScore,
    setup: setupFound.join(" + "),
    distance: fvg?.distance || 0,
    volatility: volData.priceChange,
    volume: volData.volume,
    status: totalScore >= 80 ? 'HIGH PROBABILITY' : 'MEDIUM'
  };
}
