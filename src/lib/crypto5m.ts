/**
 * ⚡ UNIVERSAL CRYPTO SMC ENGINE — MULTI TIMEFRAME
 * Mendukung: BTCUSDT, BNBUSDT, XRPUSDT, TRXUSDT, SOLUSDT (dan pair lain)
 * Timeframe: 1w · 1d · 4h · 1h · 5m
 * Data Source: Binance API (fetchKlines)
 * Teknik: BOS/CHoCH · Liquidity Sweep · Pivot P/S/R · Premium-Discount Zone
 *         · Order Block · Triangle · Session Killzone · Volume Spike
 */

import { fetchKlines } from './binance';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Crypto5MSignal {
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
  structure: string;
  zone: string;
  orderBlock?: number | null;
  sweepType?: string;
  reasoning: string[];
}

// ─── Timeframe Config ─────────────────────────────────────────
/**
 * pivotWin  : lookback candles for pivot H/L/C ("prior period")
 * slMult    : ATR multiplier for Stop Loss  (tight scalp → wide swing)
 * swingBars : pivot detection radius (bars each side)
 * sweepWin  : liquidity sweep lookback
 * consolN   : consolidation window
 * zoneThres : % from Pivot P to classify PREMIUM / DISCOUNT
 */
const TF_CFG: Record<string, {
  label: string; limit: number; pivotWin: number;
  slMult: number; tp1Mult: number; tp2Mult: number;
  swingBars: number; sweepWin: number; consolN: number; zoneThres: number;
}> = {
  '1w': { label: 'Weekly', limit: 60,  pivotWin: 5,   slMult: 2.0, tp1Mult: 2, tp2Mult: 3, swingBars: 3, sweepWin: 20, consolN: 12, zoneThres: 0.3  },
  '1d': { label: 'Daily',  limit: 100, pivotWin: 10,  slMult: 1.5, tp1Mult: 2, tp2Mult: 3, swingBars: 3, sweepWin: 20, consolN: 14, zoneThres: 0.2  },
  '4h': { label: 'H4',     limit: 150, pivotWin: 30,  slMult: 1.0, tp1Mult: 2, tp2Mult: 3, swingBars: 3, sweepWin: 25, consolN: 18, zoneThres: 0.1  },
  '1h': { label: 'H1',     limit: 200, pivotWin: 24,  slMult: 0.7, tp1Mult: 2, tp2Mult: 3, swingBars: 2, sweepWin: 30, consolN: 20, zoneThres: 0.08 },
  '5m': { label: '5M',     limit: 200, pivotWin: 288, slMult: 0.5, tp1Mult: 2, tp2Mult: 3, swingBars: 2, sweepWin: 30, consolN: 24, zoneThres: 0.08 },
};

// ─── Mock data per pair ───────────────────────────────────────
const PAIR_BASE: Record<string, number> = {
  BTCUSDT: 82000, BNBUSDT: 580, XRPUSDT: 2.1,
  TRXUSDT: 0.22,  SOLUSDT: 130, ETHUSDT: 1750,
};

const INTERVAL_MS: Record<string, number> = {
  '1w': 7 * 24 * 3600000, '1d': 86400000, '4h': 4 * 3600000, '1h': 3600000, '5m': 300000,
};

function generateMock(pair: string, interval: string, limit: number): Candle[] {
  let base = PAIR_BASE[pair] ?? 100;
  const now = Date.now();
  const ms  = INTERVAL_MS[interval] ?? 300000;
  const data: Candle[] = [];
  for (let i = 0; i < limit; i++) {
    const pct = (Math.random() - 0.49) * 0.008;
    const open = base, close = open * (1 + pct);
    const wick = Math.abs(open - close) * (0.2 + Math.random() * 0.5);
    data.push({ time: now - (limit - i) * ms, open, close, high: Math.max(open, close) + wick, low: Math.min(open, close) - wick, volume: Math.random() * 5000 + 200 });
    base = close;
  }
  return data;
}

// ─── 1. FETCH ─────────────────────────────────────────────────
async function fetchCandles(pair: string, interval: string, limit: number): Promise<{ candles: Candle[]; isLive: boolean }> {
  try {
    const raw = await fetchKlines(pair, interval, limit);
    if (!raw || raw.length < 20) throw new Error('empty');
    return { candles: raw as Candle[], isLive: true };
  } catch {
    return { candles: generateMock(pair, interval, limit), isLive: false };
  }
}

// ─── 2. ATR ───────────────────────────────────────────────────
function calcATR(candles: Candle[], period = 14): number {
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

// ─── 3. PIVOT POINTS (Classical) ─────────────────────────────
function calcPivots(candles: Candle[], pivotWin: number) {
  const end   = candles.length - 1;
  const start = Math.max(0, end - pivotWin);
  const src   = candles.slice(start, end);
  const H = Math.max(...src.map(c => c.high));
  const L = Math.min(...src.map(c => c.low));
  const C = src[src.length - 1].close;
  const P = (H + L + C) / 3;
  return {
    P,
    R1: 2 * P - L, R2: P + (H - L), R3: H + 2 * (P - L),
    S1: 2 * P - H, S2: P - (H - L), S3: L - 2 * (H - P),
  };
}

// ─── 4. MARKET STRUCTURE ─────────────────────────────────────
function detectStructure(candles: Candle[], bars: number): {
  type: 'BOS_BULL' | 'BOS_BEAR' | 'CHoCH_BULL' | 'CHoCH_BEAR' | 'NONE';
  lastSwingHigh: number; lastSwingLow: number;
} {
  const len = candles.length;
  if (len < bars * 4 + 4) return { type: 'NONE', lastSwingHigh: 0, lastSwingLow: 0 };
  const sHi: number[] = [], sLo: number[] = [];
  for (let i = bars; i < len - bars; i++) {
    const c = candles[i];
    const rng = Array.from({ length: bars }, (_, k) => k + 1);
    const hiOK = rng.every(k => c.high > candles[i - k].high && c.high > candles[i + k].high);
    const loOK = rng.every(k => c.low  < candles[i - k].low  && c.low  < candles[i + k].low);
    if (hiOK) sHi.push(c.high);
    if (loOK) sLo.push(c.low);
  }
  if (sHi.length < 2 || sLo.length < 2) return { type: 'NONE', lastSwingHigh: candles[len-1].high, lastSwingLow: candles[len-1].low };
  const lH = sHi[sHi.length-1], pH = sHi[sHi.length-2];
  const lL = sLo[sLo.length-1], pL = sLo[sLo.length-2];
  const cl = candles[len-1].close;
  if (cl > lH && lH > pH) return { type: 'BOS_BULL',   lastSwingHigh: lH, lastSwingLow: lL };
  if (cl < lL && lL < pL) return { type: 'BOS_BEAR',   lastSwingHigh: lH, lastSwingLow: lL };
  if (cl > lH && lH < pH) return { type: 'CHoCH_BULL', lastSwingHigh: lH, lastSwingLow: lL };
  if (cl < lL && lL > pL) return { type: 'CHoCH_BEAR', lastSwingHigh: lH, lastSwingLow: lL };
  return { type: 'NONE', lastSwingHigh: lH, lastSwingLow: lL };
}

// ─── 5. LIQUIDITY SWEEP ──────────────────────────────────────
function detectSweep(candles: Candle[], lookback: number): { swept: boolean; type: 'SWEEP_LOW' | 'SWEEP_HIGH' | 'NONE'; level: number } {
  const len = candles.length;
  if (len < 10) return { swept: false, type: 'NONE', level: 0 };
  const cur = candles[len-1], lb = candles.slice(Math.max(0, len - lookback - 1), len - 1);
  const pHi = Math.max(...lb.map(c => c.high));
  const pLo = Math.min(...lb.map(c => c.low));
  if (cur.low  < pLo && cur.close > pLo) return { swept: true, type: 'SWEEP_LOW',  level: pLo };
  if (cur.high > pHi && cur.close < pHi) return { swept: true, type: 'SWEEP_HIGH', level: pHi };
  return { swept: false, type: 'NONE', level: 0 };
}

// ─── 6. ORDER BLOCK ──────────────────────────────────────────
function detectOB(candles: Candle[], structType: string): number | null {
  const len = candles.length;
  if (len < 5) return null;
  if (structType.includes('BULL')) {
    for (let i = len-5; i >= Math.max(0, len-30); i--)
      if (candles[i].close < candles[i].open) return candles[i].open;
  } else if (structType.includes('BEAR')) {
    for (let i = len-5; i >= Math.max(0, len-30); i--)
      if (candles[i].close > candles[i].open) return candles[i].open;
  }
  return null;
}

// ─── 7. ZONE ─────────────────────────────────────────────────
function detectZone(price: number, P: number, thres: number): 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' {
  const pct = ((price - P) / P) * 100;
  if (pct >  thres) return 'PREMIUM';
  if (pct < -thres) return 'DISCOUNT';
  return 'EQUILIBRIUM';
}

// ─── 8. CONSOLIDATION ────────────────────────────────────────
function detectConsol(candles: Candle[], n: number): boolean {
  const r = candles.slice(-n);
  if (r.length < n) return false;
  const h = r.map(c => c.high), l = r.map(c => c.low), half = n >> 1;
  return (Math.max(...h.slice(half)) - Math.min(...l.slice(half))) < (Math.max(...h.slice(0, half)) - Math.min(...l.slice(0, half))) * 0.7;
}

// ─── 9. SESSION ──────────────────────────────────────────────
function detectSession(interval: string): { session: string; inKillzone: boolean; kzName: string } {
  if (interval === '1w' || interval === '1d') return { session: 'Swing', inKillzone: false, kzName: 'N/A' };
  const wib = (new Date().getUTCHours() + 7) % 24 + new Date().getUTCMinutes() / 60;
  if (wib >= 19 && wib < 21) return { session: 'London/NY Overlap', inKillzone: true,  kzName: 'Overlap KZ ⚡' };
  if (wib >= 14 && wib < 17) return { session: 'London',            inKillzone: true,  kzName: 'London Open KZ' };
  if (wib >= 19 && wib < 23) return { session: 'New York',          inKillzone: true,  kzName: 'NY Open KZ' };
  if (wib >= 7  && wib < 10) return { session: 'Tokyo',             inKillzone: true,  kzName: 'Tokyo KZ' };
  if (wib >= 22 || wib < 5)  return { session: 'Dead Zone',         inKillzone: false, kzName: 'None' };
  return { session: 'Asian Range', inKillzone: false, kzName: 'Asian' };
}

// ─── 10. CANDLE PATTERN ──────────────────────────────────────
function detectCandle(candles: Candle[]): { bullish: boolean; bearish: boolean; name: string } {
  const len = candles.length;
  if (len < 3) return { bullish: false, bearish: false, name: 'NONE' };
  const c = candles[len-1], p = candles[len-2];
  const body = Math.abs(c.close - c.open), range = c.high - c.low;
  const upper = c.high - Math.max(c.open, c.close);
  const lower = Math.min(c.open, c.close) - c.low;
  if (c.close > c.open && p.close < p.open && c.open < p.close && c.close > p.open) return { bullish: true,  bearish: false, name: 'Bullish Engulfing' };
  if (c.close < c.open && p.close > p.open && c.open > p.close && c.close < p.open) return { bullish: false, bearish: true,  name: 'Bearish Engulfing' };
  if (range > 0 && lower > body * 2 && upper < body * 0.5) return { bullish: true,  bearish: false, name: 'Bullish Pin Bar' };
  if (range > 0 && upper > body * 2 && lower < body * 0.5) return { bullish: false, bearish: true,  name: 'Bearish Pin Bar' };
  return { bullish: false, bearish: false, name: 'NONE' };
}

// ─── 11. VOLUME SPIKE ────────────────────────────────────────
function detectVolSpike(candles: Candle[], period = 20): boolean {
  const len = candles.length;
  if (len < period + 1) return false;
  const avg = candles.slice(len - period - 1, len - 1).reduce((s, c) => s + c.volume, 0) / period;
  return candles[len - 1].volume > avg * 1.8;
}

// ─── 12. MAIN SCAN ────────────────────────────────────────────
export async function scanCrypto5M(pair: string, interval: string = '5m'): Promise<Crypto5MSignal> {
  const cfg = TF_CFG[interval] ?? TF_CFG['5m'];
  const { candles, isLive } = await fetchCandles(pair, interval, cfg.limit);
  const len = candles.length;

  const atr      = calcATR(candles, 14);
  const pivots   = calcPivots(candles, cfg.pivotWin);
  const struct   = detectStructure(candles, cfg.swingBars);
  const sweep    = detectSweep(candles, cfg.sweepWin);
  const session  = detectSession(interval);
  const zone     = detectZone(candles[len-1].close, pivots.P, cfg.zoneThres);
  const ob       = detectOB(candles, struct.type);
  const consol   = detectConsol(candles, cfg.consolN);
  const candle   = detectCandle(candles);
  const volSpike = detectVolSpike(candles, 20);

  let score = 0;
  const reasoning: string[] = [];

  const TF = cfg.label;
  const STRUCT_LBL: Record<string, string> = {
    BOS_BULL:   `🔥 BOS Bullish [${TF}] — trend continuation naik`,
    BOS_BEAR:   `🔥 BOS Bearish [${TF}] — trend continuation turun`,
    CHoCH_BULL: `🔄 CHoCH Bullish [${TF}] — potensi reversal naik`,
    CHoCH_BEAR: `🔄 CHoCH Bearish [${TF}] — potensi reversal turun`,
  };

  if (struct.type !== 'NONE') { score += 3; reasoning.push(STRUCT_LBL[struct.type] ?? struct.type); }
  if (sweep.swept) {
    score += 3;
    reasoning.push(sweep.type === 'SWEEP_LOW'
      ? `💧 Sweep Low [${TF}] @ ${sweep.level.toFixed(4)}`
      : `💧 Sweep High [${TF}] @ ${sweep.level.toFixed(4)}`);
  }
  if (session.inKillzone) { score += 2; reasoning.push(`⏰ ${session.kzName} — high-prob window`); }
  if (ob !== null) {
    const dist = Math.abs(candles[len-1].close - ob) / (atr || 0.0001);
    if (dist < 1.5) { score += 2; reasoning.push(`📦 OB [${TF}] @ ${ob.toFixed(4)} — ${dist < 0.5 ? 'INSIDE!' : `${dist.toFixed(1)}×ATR`}`); }
  }
  if (zone === 'DISCOUNT' && (struct.type.includes('BULL') || sweep.type === 'SWEEP_LOW')) {
    score += 2; reasoning.push(`📍 Discount [${TF}] + Bullish — ideal BUY confluenc`);
  } else if (zone === 'PREMIUM' && (struct.type.includes('BEAR') || sweep.type === 'SWEEP_HIGH')) {
    score += 2; reasoning.push(`📍 Premium [${TF}] + Bearish — ideal SELL confluence`);
  }
  if (candle.name !== 'NONE') { score += 1; reasoning.push(`🕯 ${candle.name} [${TF}]`); }
  if (consol)   { score += 1; reasoning.push(`🔺 Consolidation [${TF}] — breakout imminent`); }
  if (volSpike) { score += 1; reasoning.push('📊 Volume Spike >1.8× avg — institutional activity'); }
  // Bonus for higher TF structure (swing/position weight)
  if ((interval === '1w' || interval === '1d') && struct.type !== 'NONE') {
    score = Math.min(score + 1, 15);
    reasoning.push(`🏔 Higher TF [${TF}] structure adds confluence weight`);
  }

  const isBull = struct.type.includes('BULL') || sweep.type === 'SWEEP_LOW' || candle.bullish;
  const isBear = struct.type.includes('BEAR') || sweep.type === 'SWEEP_HIGH' || candle.bearish;

  let bias: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  if (score >= 5) bias = isBull && !isBear ? 'BUY' : isBear && !isBull ? 'SELL' : 'WAIT';

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' = score >= 10 ? 'HIGH' : score >= 6 ? 'MEDIUM' : 'LOW';

  const price = candles[len-1].close;
  let entry = price, sl: number | null = null, tp1: number | null = null, tp2: number | null = null;
  if (bias === 'BUY')  { sl = entry - atr * cfg.slMult; tp1 = entry + (entry - sl) * cfg.tp1Mult; tp2 = entry + (entry - sl) * cfg.tp2Mult; }
  if (bias === 'SELL') { sl = entry + atr * cfg.slMult; tp1 = entry - (sl - entry) * cfg.tp1Mult; tp2 = entry - (sl - entry) * cfg.tp2Mult; }

  const parts: string[] = [];
  if (struct.type !== 'NONE') parts.push(struct.type.replace('_', ' '));
  if (sweep.swept) parts.push('Liq.Sweep');
  if (ob) parts.push('OB');
  if (session.inKillzone) parts.push(session.kzName);
  if (candle.name !== 'NONE') parts.push(candle.name);
  if (volSpike) parts.push('Vol.Spike');

  return {
    pair, timeframe: TF,
    setup: parts.length ? parts.join(' + ') : 'No Setup Yet',
    session: session.session, score, bias, confidence, isLive,
    entry, sl, tp1, tp2, atr,
    pivotP: pivots.P,
    pivotR1: pivots.R1, pivotR2: pivots.R2, pivotR3: pivots.R3,
    pivotS1: pivots.S1, pivotS2: pivots.S2, pivotS3: pivots.S3,
    structure: struct.type, zone, orderBlock: ob,
    sweepType: sweep.type, reasoning,
  };
}
