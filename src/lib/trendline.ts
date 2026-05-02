// ═══════════════════════════════════════════════════════════════
// TRENDLINE BREAK SCREENER — Multi-Timeframe Detection Engine
// ═══════════════════════════════════════════════════════════════

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  price: number;
  index: number;
  time: number;
  type: 'HIGH' | 'LOW';
}

export interface Trendline {
  type: 'UPTREND' | 'DOWNTREND';
  slope: number;
  intercept: number;
  startIdx: number;
  endIdx: number;
  startPrice: number;
  endPrice: number;
  touches: number;
}

export interface TrendlineBreakSignal {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH';
  timeframe: string;
  breakPrice: number;
  trendlinePrice: number;
  breakPercent: number;
  volumeRatio: number;
  bodyRatio: number;
  hasBOS: boolean;
  hasLiquiditySweep: boolean;
  hasFVG: boolean;
  confidence: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
  score: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
}

export interface MTFTrendlineSignal {
  symbol: string;
  direction: 'BULLISH' | 'BEARISH';
  timeframes: string[];
  totalScore: number;
  confidence: 'NOISE' | 'VALID' | 'STRONG' | 'INSTITUTIONAL';
  volumeLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  bestTimeframe: string;
  breakPrice: number;
  breakPercent: number;
  hasBOS: boolean;
  hasLiquiditySweep: boolean;
  hasFVG: boolean;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  details: TrendlineBreakSignal[];
}

// ─────────────────────────────────────────────────────────────
// 1️⃣ SWING DETECTION (Fractal Pivot)
// ─────────────────────────────────────────────────────────────

function detectSwings(candles: Candle[], sensitivity: number = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  if (candles.length < sensitivity * 2 + 1) return swings;

  for (let i = sensitivity; i < candles.length - sensitivity; i++) {
    let isHigh = true;
    let isLow = true;

    for (let j = i - sensitivity; j <= i + sensitivity; j++) {
      if (j === i) continue;
      if (candles[j].high >= candles[i].high) isHigh = false;
      if (candles[j].low <= candles[i].low) isLow = false;
    }

    if (isHigh) {
      swings.push({
        price: candles[i].high,
        index: i,
        time: candles[i].time,
        type: 'HIGH',
      });
    }
    if (isLow) {
      swings.push({
        price: candles[i].low,
        index: i,
        time: candles[i].time,
        type: 'LOW',
      });
    }
  }

  return swings;
}

// ─────────────────────────────────────────────────────────────
// 2️⃣ BUILD TRENDLINES (Auto Connect Swings)
// ─────────────────────────────────────────────────────────────

function buildTrendlines(swings: SwingPoint[], candles: Candle[]): Trendline[] {
  const trendlines: Trendline[] = [];
  
  const swingHighs = swings.filter(s => s.type === 'HIGH');
  const swingLows = swings.filter(s => s.type === 'LOW');

  // ── Downtrend lines: connect swing highs (descending) ──
  for (let i = 0; i < swingHighs.length - 1; i++) {
    const p1 = swingHighs[i];
    const p2 = swingHighs[i + 1];
    
    // Only valid if price is descending (downtrend)
    if (p2.price >= p1.price) continue;
    
    const dx = p2.index - p1.index;
    if (dx <= 0) continue;
    
    const slope = (p2.price - p1.price) / dx;
    const intercept = p1.price - slope * p1.index;
    
    // Count how many swings "touch" this line (within 0.5% tolerance)
    let touches = 2;
    for (let j = i + 2; j < swingHighs.length; j++) {
      const expectedPrice = slope * swingHighs[j].index + intercept;
      const tolerance = expectedPrice * 0.005;
      if (Math.abs(swingHighs[j].price - expectedPrice) <= tolerance) {
        touches++;
      }
    }
    
    trendlines.push({
      type: 'DOWNTREND',
      slope,
      intercept,
      startIdx: p1.index,
      endIdx: p2.index,
      startPrice: p1.price,
      endPrice: p2.price,
      touches,
    });
  }

  // ── Uptrend lines: connect swing lows (ascending) ──
  for (let i = 0; i < swingLows.length - 1; i++) {
    const p1 = swingLows[i];
    const p2 = swingLows[i + 1];
    
    // Only valid if price is ascending (uptrend)
    if (p2.price <= p1.price) continue;
    
    const dx = p2.index - p1.index;
    if (dx <= 0) continue;
    
    const slope = (p2.price - p1.price) / dx;
    const intercept = p1.price - slope * p1.index;
    
    let touches = 2;
    for (let j = i + 2; j < swingLows.length; j++) {
      const expectedPrice = slope * swingLows[j].index + intercept;
      const tolerance = expectedPrice * 0.005;
      if (Math.abs(swingLows[j].price - expectedPrice) <= tolerance) {
        touches++;
      }
    }
    
    trendlines.push({
      type: 'UPTREND',
      slope,
      intercept,
      startIdx: p1.index,
      endIdx: p2.index,
      startPrice: p1.price,
      endPrice: p2.price,
      touches,
    });
  }

  // Sort by touches (more touches = stronger trendline)
  return trendlines.sort((a, b) => b.touches - a.touches);
}

// ─────────────────────────────────────────────────────────────
// 3️⃣ DETECT BREAK + VALIDATION
// ─────────────────────────────────────────────────────────────

function calcAvgBody(candles: Candle[], endIdx: number, period: number = 14): number {
  const start = Math.max(0, endIdx - period);
  const slice = candles.slice(start, endIdx);
  if (slice.length === 0) return 0;
  return slice.reduce((acc, c) => acc + Math.abs(c.close - c.open), 0) / slice.length;
}

function calcAvgVolume(candles: Candle[], endIdx: number, period: number = 14): number {
  const start = Math.max(0, endIdx - period);
  const slice = candles.slice(start, endIdx);
  if (slice.length === 0) return 0;
  return slice.reduce((acc, c) => acc + c.volume, 0) / slice.length;
}

/** Detect BOS (Break of Structure) confirmation */
function detectBOS(candles: Candle[], swings: SwingPoint[], direction: 'BULLISH' | 'BEARISH'): boolean {
  const lastCandle = candles[candles.length - 1];
  
  if (direction === 'BULLISH') {
    // Find the most recent swing high before current
    const recentHighs = swings
      .filter(s => s.type === 'HIGH' && s.index < candles.length - 1)
      .sort((a, b) => b.index - a.index);
    
    if (recentHighs.length >= 1) {
      return lastCandle.close > recentHighs[0].price;
    }
  } else {
    const recentLows = swings
      .filter(s => s.type === 'LOW' && s.index < candles.length - 1)
      .sort((a, b) => b.index - a.index);
    
    if (recentLows.length >= 1) {
      return lastCandle.close < recentLows[0].price;
    }
  }
  
  return false;
}

/** Detect Liquidity Sweep (price briefly pierced beyond swing then reversed) */
function detectLiquiditySweep(candles: Candle[], swings: SwingPoint[], direction: 'BULLISH' | 'BEARISH'): boolean {
  if (candles.length < 5) return false;
  
  const lookback = 5;
  
  if (direction === 'BULLISH') {
    // Sweep below recent swing low then close back above
    const recentLows = swings
      .filter(s => s.type === 'LOW')
      .sort((a, b) => b.index - a.index);
    
    if (recentLows.length >= 1) {
      const targetLow = recentLows[0].price;
      for (let i = candles.length - lookback; i < candles.length; i++) {
        if (i < 0) continue;
        if (candles[i].low < targetLow && candles[i].close > targetLow) {
          return true;
        }
      }
    }
  } else {
    const recentHighs = swings
      .filter(s => s.type === 'HIGH')
      .sort((a, b) => b.index - a.index);
    
    if (recentHighs.length >= 1) {
      const targetHigh = recentHighs[0].price;
      for (let i = candles.length - lookback; i < candles.length; i++) {
        if (i < 0) continue;
        if (candles[i].high > targetHigh && candles[i].close < targetHigh) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/** Detect FVG (Fair Value Gap) near break area */
function detectFVGNearBreak(candles: Candle[], direction: 'BULLISH' | 'BEARISH'): boolean {
  if (candles.length < 5) return false;
  
  // Check last 5 candles for FVG
  for (let i = candles.length - 4; i < candles.length - 1; i++) {
    if (i < 1) continue;
    const A = candles[i - 1];
    const B = candles[i];
    const C = candles[i + 1];
    
    if (direction === 'BULLISH') {
      // Bullish FVG: gap between A.high and C.low with B being bullish impulse
      if (C.low > A.high && B.close > B.open) {
        return true;
      }
    } else {
      // Bearish FVG: gap between C.high and A.low with B being bearish impulse
      if (C.high < A.low && B.close < B.open) {
        return true;
      }
    }
  }
  
  return false;
}

/** Main detection function for a single timeframe */
export function detectTrendlineBreak(
  symbol: string,
  candles: Candle[],
  timeframe: string
): TrendlineBreakSignal | null {
  if (candles.length < 50) return null;

  const lastCandle = candles[candles.length - 1];
  const lastIdx = candles.length - 1;

  // Step 1: Detect swings
  const swings = detectSwings(candles, 3);
  if (swings.length < 4) return null;

  // Step 2: Build trendlines
  const trendlines = buildTrendlines(swings, candles);
  if (trendlines.length === 0) return null;

  // Step 3: Check for breaks on the most recent/strongest trendlines
  const avgBody = calcAvgBody(candles, lastIdx);
  const avgVolume = calcAvgVolume(candles, lastIdx);
  const candleBody = Math.abs(lastCandle.close - lastCandle.open);
  const candleRange = lastCandle.high - lastCandle.low;

  let bestSignal: TrendlineBreakSignal | null = null;
  let bestScore = 0;

  for (const tl of trendlines) {
    // Project trendline value at current candle index
    const trendlineValue = tl.slope * lastIdx + tl.intercept;
    if (trendlineValue <= 0) continue;

    let direction: 'BULLISH' | 'BEARISH' | null = null;

    // ── Break Bullish: price breaks above downtrend line ──
    if (tl.type === 'DOWNTREND' && lastCandle.close > trendlineValue) {
      // Previous candle must have been below the line
      const prevTLValue = tl.slope * (lastIdx - 1) + tl.intercept;
      if (candles[lastIdx - 1].close <= prevTLValue) {
        direction = 'BULLISH';
      }
    }

    // ── Break Bearish: price breaks below uptrend line ──
    if (tl.type === 'UPTREND' && lastCandle.close < trendlineValue) {
      const prevTLValue = tl.slope * (lastIdx - 1) + tl.intercept;
      if (candles[lastIdx - 1].close >= prevTLValue) {
        direction = 'BEARISH';
      }
    }

    if (!direction) continue;

    // ─── VALIDATION FILTERS ───
    // Must close through (not just wick)
    const breakPercent = Math.abs((lastCandle.close - trendlineValue) / trendlineValue) * 100;
    
    // Body must be > average (strong conviction)
    const bodyRatio = avgBody > 0 ? candleBody / avgBody : 0;
    if (bodyRatio < 0.8) continue; // At least 80% of average body

    // Volume check
    const volumeRatio = avgVolume > 0 ? lastCandle.volume / avgVolume : 0;

    // Body dominance check (body > 50% of candle range)
    if (candleRange > 0 && candleBody / candleRange < 0.4) continue;

    // ─── SCORING ───
    let score = 0;

    // Break magnitude (0-2 pts)
    score += Math.min(breakPercent * 0.5, 2);

    // Body strength (0-2 pts)
    score += Math.min(bodyRatio * 0.5, 2);

    // Volume spike (0-3 pts)
    if (volumeRatio > 2.5) score += 3;
    else if (volumeRatio > 1.5) score += 2;
    else if (volumeRatio > 1.0) score += 1;

    // Trendline touches/strength (0-2 pts)
    score += Math.min(tl.touches * 0.5, 2);

    // Trendline age/span (0-1 pt)
    const span = tl.endIdx - tl.startIdx;
    if (span > 30) score += 1;

    // SMC confirmations
    const hasBOS = detectBOS(candles, swings, direction);
    const hasLiquiditySweep = detectLiquiditySweep(candles, swings, direction);
    const hasFVG = detectFVGNearBreak(candles, direction);

    if (hasBOS) score += 2;
    if (hasLiquiditySweep) score += 1.5;
    if (hasFVG) score += 1.5;

    // Determine confidence
    let confidence: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME';
    if (score >= 10) confidence = 'EXTREME';
    else if (score >= 7) confidence = 'STRONG';
    else if (score >= 4) confidence = 'MODERATE';
    else confidence = 'WEAK';

    // ─── ACTIONABLE INSIGHTS (Entry, SL, TP) ───
    const entryPrice = lastCandle.close;
    let stopLoss = 0;
    
    if (direction === 'BULLISH') {
      const recentLows = swings
        .filter(s => s.type === 'LOW' && s.index > lastIdx - 20)
        .sort((a, b) => a.price - b.price);
      
      stopLoss = recentLows.length > 0 ? recentLows[0].price : entryPrice * 0.98;
    } else {
      const recentHighs = swings
        .filter(s => s.type === 'HIGH' && s.index > lastIdx - 20)
        .sort((a, b) => b.price - a.price);
      
      stopLoss = recentHighs.length > 0 ? recentHighs[0].price : entryPrice * 1.02;
    }

    const risk = Math.abs(entryPrice - stopLoss);
    const takeProfit = direction === 'BULLISH' ? entryPrice + risk * 2 : entryPrice - risk * 2;

    if (score > bestScore) {
      bestScore = score;
      bestSignal = {
        symbol,
        direction,
        timeframe,
        breakPrice: lastCandle.close,
        trendlinePrice: trendlineValue,
        breakPercent: Math.round(breakPercent * 100) / 100,
        volumeRatio: Math.round(volumeRatio * 100) / 100,
        bodyRatio: Math.round(bodyRatio * 100) / 100,
        hasBOS,
        hasLiquiditySweep,
        hasFVG,
        confidence,
        score: Math.round(score * 10) / 10,
        entryPrice,
        stopLoss,
        takeProfit,
      };
    }
  }

  return bestSignal;
}

// ─────────────────────────────────────────────────────────────
// 5️⃣ MULTI-TIMEFRAME AGGREGATION
// ─────────────────────────────────────────────────────────────

const TF_WEIGHTS: Record<string, number> = {
  '15m': 1,
  '1h': 2,
  '4h': 3,
  '1d': 4,
};

export function aggregateMTF(signals: TrendlineBreakSignal[]): MTFTrendlineSignal | null {
  if (signals.length === 0) return null;

  // Group by direction
  const bullish = signals.filter(s => s.direction === 'BULLISH');
  const bearish = signals.filter(s => s.direction === 'BEARISH');
  
  // Use the direction with more timeframe confirmations
  const dominant = bullish.length >= bearish.length ? bullish : bearish;
  if (dominant.length === 0) return null;

  const direction = dominant[0].direction;
  const timeframes = dominant.map(s => s.timeframe);
  
  // Calculate weighted score
  let totalScore = 0;
  for (const sig of dominant) {
    const weight = TF_WEIGHTS[sig.timeframe] || 1;
    totalScore += sig.score * weight * 0.5;
  }
  totalScore = Math.round(totalScore * 10) / 10;

  // Overall confidence
  let confidence: 'NOISE' | 'VALID' | 'STRONG' | 'INSTITUTIONAL';
  if (totalScore >= 10) confidence = 'INSTITUTIONAL';
  else if (totalScore >= 7) confidence = 'STRONG';
  else if (totalScore >= 4) confidence = 'VALID';
  else confidence = 'NOISE';

  // Volume level
  const maxVolRatio = Math.max(...dominant.map(s => s.volumeRatio));
  let volumeLevel: 'LOW' | 'NORMAL' | 'HIGH' | 'EXTREME';
  if (maxVolRatio >= 3) volumeLevel = 'EXTREME';
  else if (maxVolRatio >= 2) volumeLevel = 'HIGH';
  else if (maxVolRatio >= 1) volumeLevel = 'NORMAL';
  else volumeLevel = 'LOW';

  // Best timeframe (highest individual score)
  const best = dominant.reduce((a, b) => a.score > b.score ? a : b);

  return {
    symbol: dominant[0].symbol,
    direction,
    timeframes,
    totalScore,
    confidence,
    volumeLevel,
    bestTimeframe: best.timeframe,
    breakPrice: best.breakPrice,
    breakPercent: best.breakPercent,
    hasBOS: dominant.some(s => s.hasBOS),
    hasLiquiditySweep: dominant.some(s => s.hasLiquiditySweep),
    hasFVG: dominant.some(s => s.hasFVG),
    entryPrice: best.entryPrice,
    stopLoss: best.stopLoss,
    takeProfit: best.takeProfit,
    details: dominant,
  };
}
