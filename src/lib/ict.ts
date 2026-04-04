// ─────────────────────────────────────────────────────────────
// ICT KILL ZONE + AMD SCREENER ENGINE
// ─────────────────────────────────────────────────────────────

// ── 1. ATR (reuse logic inline) ──────────────────────────────
function calcATR(candles: any[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) atr = (atr * (period - 1) + trs[i]) / period;
  return atr;
}

// ─────────────────────────────────────────────────────────────
// 1. ICT KILL ZONE — Based on UTC+7 (WIB) session times
// ─────────────────────────────────────────────────────────────
export interface KillzoneStatus {
  active: boolean;
  session: 'London' | 'New York' | 'None';
}

export function detectKillzone(now: Date = new Date()): KillzoneStatus {
  // Use the timestamp of current server time
  const utcHour = now.getUTCHours();
  const wibHour = (utcHour + 7) % 24;

  // London Kill Zone: 08:00–11:00 London = 14:00–17:00 WIB (UTC+1→UTC+7 diff = 6h, BST = 5h, use standard)
  const isLondon  = wibHour >= 14 && wibHour < 17;
  // New York Kill Zone: 13:00–16:00 NY = 19:00–22:00 WIB (ET UTC-5 → UTC+7 diff = 12h)
  const isNewYork = wibHour >= 19 && wibHour < 22;

  return {
    active: isLondon || isNewYork,
    session: isLondon ? 'London' : isNewYork ? 'New York' : 'None',
  };
}

// ─────────────────────────────────────────────────────────────
// 2. ACCUMULATION DETECTION (Consolidation / Ranging)
// ─────────────────────────────────────────────────────────────
export interface AccumulationResult {
  detected: boolean;
  rangePct: number;
  equalHighs: boolean;
  equalLows: boolean;
}

export function detectAccumulation(candles: any[], lookback = 20): AccumulationResult {
  const recent = candles.slice(-lookback);
  const atr = calcATR(candles, 14);

  const highs = recent.map((c: any) => c.high);
  const lows  = recent.map((c: any) => c.low);
  const highest = Math.max(...highs);
  const lowest  = Math.min(...lows);
  const range   = highest - lowest;

  // Accumulation = tight range < 1.2× ATR
  const isRanging = range < atr * 1.2;

  // Equal Highs: top 3 highs within 0.2% of each other
  const sortedHighs = [...highs].sort((a, b) => b - a);
  const equalHighs  = Math.abs(sortedHighs[0] - sortedHighs[2]) / sortedHighs[0] < 0.002;
  // Equal Lows: bottom 3 lows within 0.2%
  const sortedLows  = [...lows].sort((a, b) => a - b);
  const equalLows   = Math.abs(sortedLows[0] - sortedLows[2]) / sortedLows[0] < 0.002;

  return {
    detected: isRanging,
    rangePct: (range / lowest) * 100,
    equalHighs,
    equalLows,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. MANIPULATION DETECTION (Liquidity Sweep)
// ─────────────────────────────────────────────────────────────
export type SweepType = 'sweep_low' | 'sweep_high' | 'none';
export interface ManipulationResult {
  detected: boolean;
  type: SweepType;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export function detectManipulation(candles: any[], lookback = 20): ManipulationResult {
  if (candles.length < lookback + 2) return { detected: false, type: 'none', bias: 'NEUTRAL' };

  const reference = candles.slice(-lookback - 2, -2);
  const prevHigh = Math.max(...reference.map((c: any) => c.high));
  const prevLow  = Math.min(...reference.map((c: any) => c.low));

  const current = candles[candles.length - 1];

  // Sweep Low (Bullish trap): wick below prevLow, close above
  if (current.low < prevLow && current.close > prevLow) {
    return { detected: true, type: 'sweep_low', bias: 'BULLISH' };
  }
  // Sweep High (Bearish trap): wick above prevHigh, close below
  if (current.high > prevHigh && current.close < prevHigh) {
    return { detected: true, type: 'sweep_high', bias: 'BEARISH' };
  }

  return { detected: false, type: 'none', bias: 'NEUTRAL' };
}

// ─────────────────────────────────────────────────────────────
// 4. DISTRIBUTION / EXPANSION DETECTION (BOS + Impulse)
// ─────────────────────────────────────────────────────────────
export interface DistributionResult {
  detected: boolean;
  bos: boolean;
  impulse: boolean;
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export function detectDistribution(candles: any[], lookback = 20): DistributionResult {
  if (candles.length < lookback + 2) {
    return { detected: false, bos: false, impulse: false, direction: 'NEUTRAL' };
  }

  const reference = candles.slice(-lookback - 2, -2);
  const prevHigh = Math.max(...reference.map((c: any) => c.high));
  const prevLow  = Math.min(...reference.map((c: any) => c.low));

  const current = candles[candles.length - 1];
  const body = Math.abs(current.close - current.open);
  const avgBody = reference.reduce((a: number, c: any) => a + Math.abs(c.close - c.open), 0) / reference.length;

  const isImpulse = body > avgBody * 1.5;
  const bosUp     = current.close > prevHigh;
  const bosDown   = current.close < prevLow;

  const bos = bosUp || bosDown;
  const direction = bosUp ? 'BULLISH' : bosDown ? 'BEARISH' : 'NEUTRAL';

  return {
    detected: isImpulse && bos,
    bos,
    impulse: isImpulse,
    direction,
  };
}

// ─────────────────────────────────────────────────────────────
// 5. VOLUME SPIKE
// ─────────────────────────────────────────────────────────────
function hasVolumeSpike(candles: any[]): boolean {
  if (candles.length < 21) return false;
  const avg = candles.slice(-20, -1).reduce((a: number, c: any) => a + c.volume, 0) / 19;
  return candles[candles.length - 1].volume > avg * 1.5;
}

// ─────────────────────────────────────────────────────────────
// 6. AMD SEQUENCE + FINAL SCORE
// ─────────────────────────────────────────────────────────────
export interface AMDSignal {
  symbol: string;
  timeframe: string;
  phase: 'AMD' | 'PARTIAL' | 'NONE';
  killzone: KillzoneStatus;
  accumulation: AccumulationResult;
  manipulation: ManipulationResult;
  distribution: DistributionResult;
  volumeSpike: boolean;
  score: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  confidence: 'SNIPER' | 'STRONG' | 'MODERATE' | 'NOISE';
}

export function runAMDAnalysis(symbol: string, candles: any[], timeframe: string): AMDSignal | null {
  if (candles.length < 50) return null;

  const killzone      = detectKillzone();
  const accumulation  = detectAccumulation(candles, 20);
  const manipulation  = detectManipulation(candles, 20);
  const distribution  = detectDistribution(candles, 20);
  const volumeSpike   = hasVolumeSpike(candles);

  // ── AMD Sequence
  const amdDetected =
    accumulation.detected &&
    manipulation.detected &&
    distribution.detected;
  const partialAmd =
    (accumulation.detected && manipulation.detected) ||
    (manipulation.detected && distribution.detected);

  // ── Scoring
  let score = 0;
  if (killzone.active)          score += 2;
  if (accumulation.detected)    score += 2;
  if (manipulation.detected)    score += 3;
  if (distribution.bos)         score += 3;
  if (volumeSpike)              score += 2;
  // Bonus: Equal highs AND lows in accumulation
  if (accumulation.equalHighs && accumulation.equalLows) score += 1;

  // No signal if score too low
  if (score < 4) return null;

  // ── Bias (majority of detected phases)
  const votes = [manipulation.bias, distribution.direction].filter(b => b !== 'NEUTRAL');
  const bullVotes = votes.filter(v => v === 'BULLISH').length;
  const bearVotes = votes.filter(v => v === 'BEARISH').length;
  const bias: AMDSignal['bias'] = bullVotes > bearVotes ? 'BULLISH' : bearVotes > bullVotes ? 'BEARISH' : 'NEUTRAL';

  const confidence: AMDSignal['confidence'] =
    score >= 10 ? 'SNIPER' : score >= 7 ? 'STRONG' : score >= 4 ? 'MODERATE' : 'NOISE';

  return {
    symbol,
    timeframe,
    phase: amdDetected ? 'AMD' : partialAmd ? 'PARTIAL' : 'NONE',
    killzone,
    accumulation,
    manipulation,
    distribution,
    volumeSpike,
    score,
    bias,
    confidence,
  };
}
