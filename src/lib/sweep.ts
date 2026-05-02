import { fetchKlines } from './binance';
import { detectBulishFVG } from './binance';

export interface LiquiditySweepSignal {
  symbol: string;
  timeframe: string;
  swingLow: number;
  sweepLow: number;
  closePrice: number;
  wickSize: number;
  bodySize: number;
  volumeRatio: number;
  nearFVG: boolean;
  nearPrevLow: boolean;
  strength: 'STRONG' | 'MODERATE';
  reason: string[];
}

export function detectLiquiditySweepBullish(
  symbol: string,
  candles: any[],
  timeframe: string
): LiquiditySweepSignal | null {
  if (candles.length < 30) return null;

  // --- Step 1: Identify Swing Low ---
  // Look for pivot low in the last 5–40 candles before the current candle
  const lookback = Math.min(40, candles.length - 5);
  let swingLow = Infinity;
  let swingLowIndex = -1;

  for (let i = candles.length - 3; i >= candles.length - lookback; i--) {
    const c = candles[i];
    const prev = candles[i - 1];
    const next = candles[i + 1];
    // Pivot Low: lower than both neighbors
    if (c.low < prev.low && c.low < next.low) {
      swingLow = c.low;
      swingLowIndex = i;
      break;
    }
  }

  if (swingLowIndex === -1) return null;

  // --- Step 2: Detect Sweep on the latest candle ---
  const current = candles[candles.length - 1];

  const broke = current.low < swingLow;           // Wick below swing low
  const rejected = current.close > swingLow;       // Closed back above

  if (!broke || !rejected) return null;

  // --- Step 3: Filter conditions ---
  const wickSize = current.high - current.low;
  const bodySize = Math.abs(current.open - current.close);

  // ✅ Strong Wick: wick > body * 2
  const hasStrongWick = wickSize > bodySize * 2;

  // ✅ Volume Spike: current volume > 1.5x avg
  const avgVolume =
    candles.slice(-20, -1).reduce((sum: number, c: any) => sum + c.volume, 0) / 19;
  const volumeRatio = current.volume / avgVolume;
  const hasVolumeSpike = volumeRatio > 1.5;

  // Both required for a valid signal
  if (!hasStrongWick || !hasVolumeSpike) return null;

  // --- Step 4: Contextual filters (Support Areas) ---
  const fvg = detectBulishFVG(symbol, candles.slice(0, -1)); // exclude current candle
  const nearFVG = fvg !== null && current.low <= fvg.fvgHigh * 1.02; // within 2% of FVG

  // Near Previous Low: check if close to another swing low in broader lookback
  let anotherLow = Infinity;
  for (let i = swingLowIndex - 2; i >= candles.length - 60 && i >= 0; i--) {
    if (candles[i].low < anotherLow) anotherLow = candles[i].low;
  }
  const nearPrevLow = anotherLow !== Infinity && Math.abs(current.low - anotherLow) / anotherLow < 0.03;

  // Strength classification
  const reasons: string[] = [];
  if (hasStrongWick) reasons.push(`Strong Wick (${(wickSize / bodySize).toFixed(1)}x body)`);
  if (hasVolumeSpike) reasons.push(`Volume Spike (${volumeRatio.toFixed(1)}x avg)`);
  if (nearFVG) reasons.push('Near FVG Zone');
  if (nearPrevLow) reasons.push('Near Previous Low');

  const strength: LiquiditySweepSignal['strength'] =
    nearFVG || nearPrevLow ? 'STRONG' : 'MODERATE';

  return {
    symbol,
    timeframe,
    swingLow,
    sweepLow: current.low,
    closePrice: current.close,
    wickSize,
    bodySize,
    volumeRatio,
    nearFVG,
    nearPrevLow,
    strength,
    reason: reasons,
  };
}

export function detectLiquiditySweepBearish(
  symbol: string,
  candles: any[],
  timeframe: string
): any | null {
  if (candles.length < 30) return null;

  // --- Step 1: Identify Swing High ---
  const lookback = Math.min(40, candles.length - 5);
  let swingHigh = -Infinity;
  let swingHighIndex = -1;

  for (let i = candles.length - 3; i >= candles.length - lookback; i--) {
    const c = candles[i];
    const prev = candles[i - 1];
    const next = candles[i + 1];
    if (c.high > prev.high && c.high > next.high) {
      swingHigh = c.high;
      swingHighIndex = i;
      break;
    }
  }

  if (swingHighIndex === -1) return null;

  // --- Step 2: Detect Sweep on the latest candle ---
  const current = candles[candles.length - 1];
  const broke = current.high > swingHigh;           // Wick above swing high
  const rejected = current.close < swingHigh;       // Closed back below

  if (!broke || !rejected) return null;

  // --- Step 3: Filter conditions ---
  const wickSize = current.high - current.low;
  const bodySize = Math.abs(current.open - current.close);
  const hasStrongWick = wickSize > bodySize * 2;

  const avgVolume = candles.slice(-20, -1).reduce((sum: number, c: any) => sum + c.volume, 0) / 19;
  const volumeRatio = current.volume / avgVolume;
  const hasVolumeSpike = volumeRatio > 1.5;

  if (!hasStrongWick || !hasVolumeSpike) return null;

  const reasons: string[] = [`Sweep High (${(current.high - swingHigh).toFixed(2)} pts)`, `Strong Rejection (${(wickSize / bodySize).toFixed(1)}x body)`];
  if (hasVolumeSpike) reasons.push(`Volume Spike (${volumeRatio.toFixed(1)}x avg)`);

  return {
    symbol,
    timeframe,
    swingHigh,
    sweepHigh: current.high,
    closePrice: current.close,
    wickSize,
    bodySize,
    volumeRatio,
    strength: 'MODERATE',
    reason: reasons,
  };
}
