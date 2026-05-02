/**
 * ⚡ ETHUSDT 5-MINUTE SCALPING ENGINE
 * Data Source: Binance API (fetchKlines)
 * Teknik: BOS/CHoCH + Liquidity Sweep + Pivot P/S/R + Premium-Discount Zone
 *         + Order Block + Triangle/Consolidation + Session Killzone
 * Flow: KLINES 5M → STRUCTURE → PIVOT → ZONE → LIQUIDITY → OB → SESSION → SCORING → SIGNAL
 */

import { fetchKlines } from './binance';

export interface ETHCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ETHUSDT5MSignal {
  pair: string;
  timeframe: string;
  setup: string;
  session: string;
  score: number;
  bias: 'BUY' | 'SELL' | 'WAIT';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isLive: boolean;
  entry?: number | null;
  sl?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  atr?: number | null;
  pivotP?: number | null;
  pivotS1?: number | null;
  pivotS2?: number | null;
  pivotS3?: number | null;
  pivotR1?: number | null;
  pivotR2?: number | null;
  pivotR3?: number | null;
  structure: string;    // BOS_BULL | BOS_BEAR | CHoCH_BULL | CHoCH_BEAR | NONE
  zone: string;         // PREMIUM | DISCOUNT | EQUILIBRIUM
  orderBlock?: number | null;
  sweepType?: string;
  reasoning: string[];
}

// ─────────────────────────────────────────────────────────────
// 1. DATA FETCH — Binance 5m klines
// ─────────────────────────────────────────────────────────────
async function fetchETH5MCandles(limit = 200): Promise<{ candles: ETHCandle[]; isLive: boolean }> {
  try {
    const raw = await fetchKlines('ETHUSDT', '5m', limit);
    if (!raw || raw.length === 0) {
      return { candles: generateMockETH(limit), isLive: false };
    }
    return { candles: raw as ETHCandle[], isLive: true };
  } catch {
    return { candles: generateMockETH(limit), isLive: false };
  }
}

function generateMockETH(limit: number): ETHCandle[] {
  let base = 1800 + Math.random() * 200; // ETH ~$1800-2000 fallback
  const now = Date.now();
  const data: ETHCandle[] = [];
  for (let i = 0; i < limit; i++) {
    const change = (Math.random() - 0.49) * 4;
    const open = base;
    const close = open + change;
    const wick = Math.random() * 1.5;
    data.push({
      time: now - (limit - i) * 5 * 60000,
      open, high: Math.max(open, close) + wick,
      low: Math.min(open, close) - wick, close,
      volume: Math.random() * 3000 + 500,
    });
    base = close;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// 2. ATR (Wilder Smoothing)
// ─────────────────────────────────────────────────────────────
function calcATR(candles: ETHCandle[], period = 14): number {
  if (candles.length <= period) return 0;
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
// 3. PIVOT POINTS — Classical, based on ~1 day previous candles
// ─────────────────────────────────────────────────────────────
function calcPivots(candles: ETHCandle[]) {
  // 288 candles = 24h of 5m bars
  const daySlice = candles.slice(Math.max(0, candles.length - 300), candles.length - 12);
  const src = daySlice.length >= 12 ? daySlice : candles;
  const H = Math.max(...src.map(c => c.high));
  const L = Math.min(...src.map(c => c.low));
  const C = src[src.length - 1].close;
  const P = (H + L + C) / 3;
  return {
    P,
    R1: 2 * P - L,
    R2: P + (H - L),
    R3: H + 2 * (P - L),
    S1: 2 * P - H,
    S2: P - (H - L),
    S3: L - 2 * (H - P),
  };
}

// ─────────────────────────────────────────────────────────────
// 4. MARKET STRUCTURE — swing-based BOS / CHoCH
// ─────────────────────────────────────────────────────────────
function detectStructure(candles: ETHCandle[]): {
  type: 'BOS_BULL' | 'BOS_BEAR' | 'CHoCH_BULL' | 'CHoCH_BEAR' | 'NONE';
  lastSwingHigh: number;
  lastSwingLow: number;
} {
  const len = candles.length;
  if (len < 20) return { type: 'NONE', lastSwingHigh: 0, lastSwingLow: 0 };

  const swingHighs: { price: number }[] = [];
  const swingLows: { price: number }[] = [];

  for (let i = 2; i < len - 2; i++) {
    const c = candles[i];
    if (c.high > candles[i-1].high && c.high > candles[i-2].high && c.high > candles[i+1].high && c.high > candles[i+2].high)
      swingHighs.push({ price: c.high });
    if (c.low < candles[i-1].low && c.low < candles[i-2].low && c.low < candles[i+1].low && c.low < candles[i+2].low)
      swingLows.push({ price: c.low });
  }

  if (swingHighs.length < 2 || swingLows.length < 2) {
    return { type: 'NONE', lastSwingHigh: candles[len-1].high, lastSwingLow: candles[len-1].low };
  }

  const lastHigh = swingHighs[swingHighs.length - 1].price;
  const prevHigh = swingHighs[swingHighs.length - 2].price;
  const lastLow  = swingLows[swingLows.length - 1].price;
  const prevLow  = swingLows[swingLows.length - 2].price;
  const close    = candles[len - 1].close;

  if (close > lastHigh && lastHigh > prevHigh) return { type: 'BOS_BULL',   lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  if (close < lastLow  && lastLow  < prevLow)  return { type: 'BOS_BEAR',   lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  if (close > lastHigh && lastHigh < prevHigh) return { type: 'CHoCH_BULL', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  if (close < lastLow  && lastLow  > prevLow)  return { type: 'CHoCH_BEAR', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  return { type: 'NONE', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
}

// ─────────────────────────────────────────────────────────────
// 5. LIQUIDITY SWEEP
// ─────────────────────────────────────────────────────────────
function detectSweep(candles: ETHCandle[]): { swept: boolean; type: 'SWEEP_LOW' | 'SWEEP_HIGH' | 'NONE'; level: number } {
  const len = candles.length;
  if (len < 10) return { swept: false, type: 'NONE', level: 0 };
  const cur  = candles[len - 1];
  const lb   = candles.slice(len - 30, len - 1);
  const pHi  = Math.max(...lb.map(c => c.high));
  const pLo  = Math.min(...lb.map(c => c.low));
  if (cur.low  < pLo && cur.close > pLo) return { swept: true, type: 'SWEEP_LOW',  level: pLo };
  if (cur.high > pHi && cur.close < pHi) return { swept: true, type: 'SWEEP_HIGH', level: pHi };
  return { swept: false, type: 'NONE', level: 0 };
}

// ─────────────────────────────────────────────────────────────
// 6. ORDER BLOCK
// ─────────────────────────────────────────────────────────────
function detectOrderBlock(candles: ETHCandle[], structType: string): number | null {
  const len = candles.length;
  if (len < 5) return null;
  if (structType.includes('BULL')) {
    for (let i = len - 5; i >= Math.max(0, len - 25); i--)
      if (candles[i].close < candles[i].open) return candles[i].open;
  } else if (structType.includes('BEAR')) {
    for (let i = len - 5; i >= Math.max(0, len - 25); i--)
      if (candles[i].close > candles[i].open) return candles[i].open;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// 7. PREMIUM / DISCOUNT ZONE
// ─────────────────────────────────────────────────────────────
function detectZone(price: number, pivots: { P: number }): 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' {
  const pct = ((price - pivots.P) / pivots.P) * 100;
  if (pct >  0.08) return 'PREMIUM';
  if (pct < -0.08) return 'DISCOUNT';
  return 'EQUILIBRIUM';
}

// ─────────────────────────────────────────────────────────────
// 8. CONSOLIDATION / TRIANGLE
// ─────────────────────────────────────────────────────────────
function detectConsolidation(candles: ETHCandle[], lookback = 24): boolean {
  const r = candles.slice(-lookback);
  if (r.length < lookback) return false;
  const h = r.map(c => c.high), l = r.map(c => c.low);
  const half = lookback >> 1;
  const r1 = Math.max(...h.slice(0, half)) - Math.min(...l.slice(0, half));
  const r2 = Math.max(...h.slice(half))    - Math.min(...l.slice(half));
  return r2 < r1 * 0.7;
}

// ─────────────────────────────────────────────────────────────
// 9. SESSION & KILLZONE (WIB)
// ─────────────────────────────────────────────────────────────
function detectSession(): { session: string; inKillzone: boolean; kzName: string } {
  const wib = (new Date().getUTCHours() + 7) % 24 + new Date().getUTCMinutes() / 60;
  if (wib >= 19 && wib < 21) return { session: 'London/NY Overlap', inKillzone: true, kzName: 'Overlap KZ ⚡' };
  if (wib >= 14 && wib < 17) return { session: 'London',   inKillzone: true,  kzName: 'London Open KZ' };
  if (wib >= 19 && wib < 23) return { session: 'New York', inKillzone: true,  kzName: 'NY Open KZ' };
  if (wib >= 7  && wib < 10) return { session: 'Tokyo',    inKillzone: true,  kzName: 'Tokyo KZ' };
  if (wib >= 22 || wib < 5)  return { session: 'Dead Zone',inKillzone: false, kzName: 'None' };
  return { session: 'Asian Range', inKillzone: false, kzName: 'Asian' };
}

// ─────────────────────────────────────────────────────────────
// 10. CANDLE PATTERN — Engulfing + Pin Bar
// ─────────────────────────────────────────────────────────────
function detectCandlePattern(candles: ETHCandle[]): { bullish: boolean; bearish: boolean; name: string } {
  const len = candles.length;
  if (len < 3) return { bullish: false, bearish: false, name: 'NONE' };
  const c = candles[len - 1], p = candles[len - 2];
  const body = Math.abs(c.close - c.open), range = c.high - c.low;
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;

  if (c.close > c.open && p.close < p.open && c.open < p.close && c.close > p.open)
    return { bullish: true, bearish: false, name: 'Bullish Engulfing' };
  if (c.close < c.open && p.close > p.open && c.open > p.close && c.close < p.open)
    return { bullish: false, bearish: true, name: 'Bearish Engulfing' };
  if (range > 0 && lower > body * 2 && upper < body * 0.5)
    return { bullish: true, bearish: false, name: 'Bullish Pin Bar' };
  if (range > 0 && upper > body * 2 && lower < body * 0.5)
    return { bullish: false, bearish: true, name: 'Bearish Pin Bar' };
  return { bullish: false, bearish: false, name: 'NONE' };
}

// ─────────────────────────────────────────────────────────────
// 11. VOLUME SPIKE (Crypto-specific — Binance has real volume)
// ─────────────────────────────────────────────────────────────
function detectVolumeSpike(candles: ETHCandle[], period = 20): boolean {
  const len = candles.length;
  if (len < period + 1) return false;
  const avgVol = candles.slice(len - period - 1, len - 1).reduce((s, c) => s + c.volume, 0) / period;
  return candles[len - 1].volume > avgVol * 1.8;
}

// ─────────────────────────────────────────────────────────────
// 12. MAIN SCAN
// ─────────────────────────────────────────────────────────────
export async function scanETHUSDT5M(): Promise<ETHUSDT5MSignal> {
  const { candles, isLive } = await fetchETH5MCandles(200);
  const len = candles.length;

  const atr         = calcATR(candles, 14);
  const pivots      = calcPivots(candles);
  const structure   = detectStructure(candles);
  const sweep       = detectSweep(candles);
  const session     = detectSession();
  const zone        = detectZone(candles[len - 1].close, pivots);
  const ob          = detectOrderBlock(candles, structure.type);
  const consol      = detectConsolidation(candles, 24);
  const candle      = detectCandlePattern(candles);
  const voltSpike   = detectVolumeSpike(candles, 20);

  let score = 0;
  const reasoning: string[] = [];

  // 1. Structure +3
  if (structure.type !== 'NONE') {
    score += 3;
    const lbl: Record<string, string> = {
      BOS_BULL: '🔥 BOS Bullish — kelanjutan trend naik',
      BOS_BEAR: '🔥 BOS Bearish — kelanjutan trend turun',
      CHoCH_BULL: '🔄 CHoCH Bullish — reversal naik terdeteksi',
      CHoCH_BEAR: '🔄 CHoCH Bearish — reversal turun terdeteksi',
    };
    reasoning.push(lbl[structure.type] ?? structure.type);
  }

  // 2. Liquidity Sweep +3
  if (sweep.swept) {
    score += 3;
    reasoning.push(sweep.type === 'SWEEP_LOW'
      ? `💧 Sweep Low @ ${sweep.level.toFixed(2)} — Bullish manipulation by smart money`
      : `💧 Sweep High @ ${sweep.level.toFixed(2)} — Bearish manipulation by smart money`);
  }

  // 3. Killzone +2
  if (session.inKillzone) {
    score += 2;
    reasoning.push(`⏰ Inside ${session.kzName} — high-probability scalp window`);
  }

  // 4. Order Block +2
  if (ob !== null) {
    const dist = Math.abs(candles[len - 1].close - ob) / (atr || 1);
    if (dist < 1.5) {
      score += 2;
      reasoning.push(`📦 Order Block @ ${ob.toFixed(2)} — ${dist < 0.5 ? 'INSIDE OB zone!' : `${dist.toFixed(1)} ATR away`}`);
    }
  }

  // 5. Zone alignment +2
  if (zone === 'DISCOUNT' && structure.type.includes('BULL') || zone === 'DISCOUNT' && sweep.type === 'SWEEP_LOW') {
    score += 2;
    reasoning.push('📍 Discount Zone + Bullish Signal — ideal BUY confluence');
  } else if (zone === 'PREMIUM' && structure.type.includes('BEAR') || zone === 'PREMIUM' && sweep.type === 'SWEEP_HIGH') {
    score += 2;
    reasoning.push('📍 Premium Zone + Bearish Signal — ideal SELL confluence');
  }

  // 6. Candle Pattern +1
  if (candle.name !== 'NONE') {
    score += 1;
    reasoning.push(`🕯 ${candle.name} — candle confirmation`);
  }

  // 7. Consolidation / Triangle +1
  if (consol) {
    score += 1;
    reasoning.push('🔺 Consolidation/Triangle — breakout imminent');
  }

  // 8. Volume Spike +1 (Crypto-specific advantage over Forex)
  if (voltSpike) {
    score += 1;
    reasoning.push('📊 Volume Spike >1.8× average — institutional activity confirmed');
  }

  // ── BIAS ──────────────────────────────────────────────────
  const isBull = structure.type.includes('BULL') || sweep.type === 'SWEEP_LOW' || candle.bullish;
  const isBear = structure.type.includes('BEAR') || sweep.type === 'SWEEP_HIGH' || candle.bearish;

  let bias: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  if (score >= 5) bias = isBull && !isBear ? 'BUY' : isBear && !isBull ? 'SELL' : 'WAIT';

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    score >= 10 ? 'HIGH' : score >= 6 ? 'MEDIUM' : 'LOW';

  // ── ENTRY / SL / TP (crypto scalp: SL 0.5 ATR) ──────────
  const price = candles[len - 1].close;
  let entry = price, sl: number | null = null, tp1: number | null = null, tp2: number | null = null;

  if (bias === 'BUY') {
    sl  = entry - atr * 0.5;
    tp1 = entry + (entry - sl) * 2;
    tp2 = entry + (entry - sl) * 3;
  } else if (bias === 'SELL') {
    sl  = entry + atr * 0.5;
    tp1 = entry - (sl - entry) * 2;
    tp2 = entry - (sl - entry) * 3;
  }

  // ── SETUP NAME ────────────────────────────────────────────
  const parts: string[] = [];
  if (structure.type !== 'NONE') parts.push(structure.type.replace('_', ' '));
  if (sweep.swept) parts.push('Liq.Sweep');
  if (ob) parts.push('OB');
  if (session.inKillzone) parts.push(session.kzName);
  if (candle.name !== 'NONE') parts.push(candle.name);
  if (voltSpike) parts.push('Vol.Spike');
  const setup = parts.length ? parts.join(' + ') : 'No Setup Yet';

  return {
    pair: 'ETHUSDT', timeframe: '5M', setup,
    session: session.session, score, bias, confidence, isLive,
    entry, sl, tp1, tp2, atr,
    pivotP: pivots.P, pivotS1: pivots.S1, pivotS2: pivots.S2, pivotS3: pivots.S3,
    pivotR1: pivots.R1, pivotR2: pivots.R2, pivotR3: pivots.R3,
    structure: structure.type, zone, orderBlock: ob,
    sweepType: sweep.type, reasoning,
  };
}
