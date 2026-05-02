/**
 * ⚡ XAUUSD MULTI-TIMEFRAME SCALPING & SWING ENGINE
 * Teknik: BOS/CHoCH + Liquidity Sweep + Pivot P/S/R + Premium-Discount Zone + Order Block + Session Killzone
 */

import { fetchForexNews, processEvents } from './forex';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface XAUUSDSignal {
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

export const TF_CFG: Record<string, { intervalTD: string; slMult: number; pivotWindow: number; tp1Mult: number; tp2Mult: number; swingLookback: number; zoneThreshold: number; label: string }> = {
  '1w': { intervalTD: '1week', slMult: 2.0, pivotWindow: 4, tp1Mult: 2, tp2Mult: 3, swingLookback: 3, zoneThreshold: 0.003, label: 'Weekly' },
  '1d': { intervalTD: '1day', slMult: 1.5, pivotWindow: 10, tp1Mult: 2, tp2Mult: 3, swingLookback: 3, zoneThreshold: 0.002, label: 'Daily' },
  '4h': { intervalTD: '4h', slMult: 1.0, pivotWindow: 30, tp1Mult: 2, tp2Mult: 3, swingLookback: 3, zoneThreshold: 0.001, label: 'H4' },
  '1h': { intervalTD: '1h', slMult: 0.7, pivotWindow: 24, tp1Mult: 2, tp2Mult: 3, swingLookback: 2, zoneThreshold: 0.0008, label: 'H1' },
  '5m': { intervalTD: '5min', slMult: 0.5, pivotWindow: 288, tp1Mult: 2, tp2Mult: 3, swingLookback: 2, zoneThreshold: 0.0005, label: '5M' },
};

export async function fetchCandles(limit: number = 200, interval: string = '5m'): Promise<{ candles: Candle[]; isLive: boolean }> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  const cfg = TF_CFG[interval] || TF_CFG['5m'];

  if (!apiKey) {
    return { candles: generateMock(limit, interval), isLive: false };
  }

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=XAU/USD&interval=${cfg.intervalTD}&outputsize=${limit}&apikey=${apiKey}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const data = await res.json();

    if (data.status === 'error' || !data.values) {
      console.warn(`TwelveData ${interval} Error:`, data.message);
      return { candles: generateMock(limit, interval), isLive: false };
    }

    const candles: Candle[] = data.values.map((v: any) => ({
      time: new Date(v.datetime).getTime(),
      open: parseFloat(v.open),
      high: parseFloat(v.high),
      low: parseFloat(v.low),
      close: parseFloat(v.close),
      volume: parseFloat(v.volume || '0'),
    })).reverse();

    return { candles, isLive: true };
  } catch (err) {
    console.error('fetchCandles error:', err);
    return { candles: generateMock(limit, interval), isLive: false };
  }
}

function generateMock(limit: number, interval: string): Candle[] {
  const data: Candle[] = [];
  let base = 3285 + Math.random() * 40;
  const now = Date.now();
  const mult = interval === '1w' ? 80 : interval === '1d' ? 25 : interval === '4h' ? 10 : interval === '1h' ? 5 : 2;

  for (let i = 0; i < limit; i++) {
    const change = (Math.random() - 0.48) * mult;
    const open = base;
    const close = open + change;
    const wick = Math.random() * (mult * 0.5);
    const high = Math.max(open, close) + wick;
    const low = Math.min(open, close) - wick;
    data.push({
      time: now - (limit - i) * 60000,
      open, high, low, close,
      volume: Math.random() * 500 + 100,
    });
    base = close;
  }
  return data;
}

export function calcATR(candles: Candle[], period = 14): number {
  if (candles.length <= period) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high, l = candles[i].low, pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

function calcPivots(candles: Candle[], pivotWindow: number) {
  const dayCandles = candles.slice(Math.max(0, candles.length - pivotWindow), candles.length - Math.max(1, Math.floor(pivotWindow/24)));
  if (dayCandles.length < Math.max(1, Math.floor(pivotWindow/24))) {
    const c = candles[candles.length - 1];
    const H = c.high, L = c.low, C = c.close;
    const P = (H + L + C) / 3;
    return { P, R1: P + (P - L), R2: P + (H - L), R3: H + 2 * (P - L), S1: P - (H - P), S2: P - (H - L), S3: L - 2 * (H - P) };
  }
  const H = Math.max(...dayCandles.map(c => c.high));
  const L = Math.min(...dayCandles.map(c => c.low));
  const C = dayCandles[dayCandles.length - 1].close;
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

function detectStructure(candles: Candle[], lookback: number): {
  type: 'BOS_BULL' | 'BOS_BEAR' | 'CHoCH_BULL' | 'CHoCH_BEAR' | 'NONE';
  lastSwingHigh: number;
  lastSwingLow: number;
} {
  const len = candles.length;
  if (len < 20) return { type: 'NONE', lastSwingHigh: 0, lastSwingLow: 0 };

  let swingHighs: { idx: number; price: number }[] = [];
  let swingLows: { idx: number; price: number }[] = [];

  for (let i = lookback; i < len - lookback; i++) {
    const c = candles[i];
    let isHigh = true;
    let isLow = true;
    for (let j = 1; j <= lookback; j++) {
      if (c.high <= candles[i - j].high || c.high <= candles[i + j].high) isHigh = false;
      if (c.low >= candles[i - j].low || c.low >= candles[i + j].low) isLow = false;
    }
    if (isHigh) swingHighs.push({ idx: i, price: c.high });
    if (isLow) swingLows.push({ idx: i, price: c.low });
  }

  if (swingHighs.length < 2 || swingLows.length < 2) {
    return { type: 'NONE', lastSwingHigh: candles[len - 1].high, lastSwingLow: candles[len - 1].low };
  }

  const lastHigh = swingHighs[swingHighs.length - 1].price;
  const prevHigh = swingHighs[swingHighs.length - 2].price;
  const lastLow = swingLows[swingLows.length - 1].price;
  const prevLow = swingLows[swingLows.length - 2].price;
  const close = candles[len - 1].close;

  if (close > lastHigh && lastHigh > prevHigh) return { type: 'BOS_BULL', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  if (close < lastLow && lastLow < prevLow) return { type: 'BOS_BEAR', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  if (close > lastHigh && lastHigh < prevHigh) return { type: 'CHoCH_BULL', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
  if (close < lastLow && lastLow > prevLow) return { type: 'CHoCH_BEAR', lastSwingHigh: lastHigh, lastSwingLow: lastLow };

  return { type: 'NONE', lastSwingHigh: lastHigh, lastSwingLow: lastLow };
}

function detectLiqSweep(candles: Candle[]): {
  swept: boolean;
  type: 'SWEEP_LOW' | 'SWEEP_HIGH' | 'NONE';
  level: number;
} {
  const len = candles.length;
  if (len < 10) return { swept: false, type: 'NONE', level: 0 };

  const current = candles[len - 1];
  const lookback = candles.slice(len - 30, len - 1);
  const prevHigh = Math.max(...lookback.map(c => c.high));
  const prevLow = Math.min(...lookback.map(c => c.low));

  if (current.low < prevLow && current.close > prevLow) {
    return { swept: true, type: 'SWEEP_LOW', level: prevLow };
  }
  if (current.high > prevHigh && current.close < prevHigh) {
    return { swept: true, type: 'SWEEP_HIGH', level: prevHigh };
  }

  return { swept: false, type: 'NONE', level: 0 };
}

function detectOrderBlock(candles: Candle[], structureType: string, interval: string): number | null {
  const len = candles.length;
  if (len < 5) return null;

  const searchWindow = interval === '1w' || interval === '1d' ? 10 : 25;

  if (structureType.includes('BULL')) {
    for (let i = len - 5; i >= Math.max(0, len - searchWindow); i--) {
      if (candles[i].close < candles[i].open) {
        return candles[i].open; 
      }
    }
  } else if (structureType.includes('BEAR')) {
    for (let i = len - 5; i >= Math.max(0, len - searchWindow); i--) {
      if (candles[i].close > candles[i].open) {
        return candles[i].open;
      }
    }
  }
  return null;
}

function detectZone(price: number, pivots: { P: number; R1: number; S1: number }, threshold: number): 'PREMIUM' | 'DISCOUNT' | 'EQUILIBRIUM' {
  const eq = pivots.P;
  const pct = ((price - eq) / eq);
  if (pct > threshold) return 'PREMIUM';
  if (pct < -threshold) return 'DISCOUNT';
  return 'EQUILIBRIUM';
}

function detectConsolidation(candles: Candle[], lookback = 24): boolean {
  const recent = candles.slice(-lookback);
  if (recent.length < lookback) return false;

  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);

  const firstHalfHighRange = Math.max(...highs.slice(0, lookback / 2)) - Math.min(...lows.slice(0, lookback / 2));
  const secondHalfHighRange = Math.max(...highs.slice(lookback / 2)) - Math.min(...lows.slice(lookback / 2));

  return secondHalfHighRange < firstHalfHighRange * 0.7;
}

function detectSession(interval: string): { session: string; inKillzone: boolean; kzName: string } {
  if (interval === '1w' || interval === '1d') return { session: 'Macro Swing', inKillzone: false, kzName: '' };
  
  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  const wibMin = now.getUTCMinutes();
  const time = wibHour + wibMin / 60;

  if (time >= 14 && time < 17) return { session: 'London', inKillzone: true, kzName: 'London Open KZ' };
  if (time >= 19 && time < 22) return { session: 'New York', inKillzone: true, kzName: 'NY Open KZ' };
  if (time >= 19 && time < 21) return { session: 'London/NY Overlap', inKillzone: true, kzName: 'Overlap KZ ⚡' };
  if (time >= 7 && time < 10) return { session: 'Tokyo', inKillzone: true, kzName: 'Tokyo KZ' };
  if (time >= 13 && time < 14) return { session: 'Pre-London', inKillzone: false, kzName: 'Pre-London' };
  if (time >= 22 || time < 6) return { session: 'Dead Zone', inKillzone: false, kzName: 'None' };

  return { session: 'Asian Range', inKillzone: false, kzName: 'Asian' };
}

function detectCandlePattern(candles: Candle[]): { bullish: boolean; bearish: boolean; name: string } {
  const len = candles.length;
  if (len < 3) return { bullish: false, bearish: false, name: 'NONE' };

  const c = candles[len - 1];
  const p = candles[len - 2];
  const body = Math.abs(c.close - c.open);
  const range = c.high - c.low;
  const upperWick = c.high - Math.max(c.open, c.close);
  const lowerWick = Math.min(c.open, c.close) - c.low;

  if (c.close > c.open && p.close < p.open && c.open < p.close && c.close > p.open) {
    return { bullish: true, bearish: false, name: 'Bullish Engulfing' };
  }
  if (c.close < c.open && p.close > p.open && c.open > p.close && c.close < p.open) {
    return { bullish: false, bearish: true, name: 'Bearish Engulfing' };
  }
  if (lowerWick > body * 2 && upperWick < body * 0.5 && range > 0) {
    return { bullish: true, bearish: false, name: 'Bullish Pin Bar' };
  }
  if (upperWick > body * 2 && lowerWick < body * 0.5 && range > 0) {
    return { bullish: false, bearish: true, name: 'Bearish Pin Bar' };
  }

  return { bullish: false, bearish: false, name: 'NONE' };
}

async function checkNewsRisk(): Promise<{ safe: boolean; note: string }> {
  try {
    const rawNews = await fetchForexNews();
    const processed = processEvents(rawNews);
    const today = new Date().toDateString();
    const highImpactSoon = processed.some(e =>
      e.currency === 'USD' &&
      e.impact === 'High' &&
      new Date(e.date).toDateString() === today &&
      e.sentiment === 'pending'
    );
    return {
      safe: !highImpactSoon,
      note: highImpactSoon ? 'High Impact USD news pending — caution!' : 'No high-impact news — clear to trade'
    };
  } catch {
    return { safe: true, note: 'News check skipped' };
  }
}

export async function scanXAUUSD(interval: string = '5m'): Promise<XAUUSDSignal> {
  const cfg = TF_CFG[interval] || TF_CFG['5m'];
  const { candles, isLive } = await fetchCandles(300, interval);
  const len = candles.length;

  const atr = calcATR(candles, 14);
  const pivots = calcPivots(candles, cfg.pivotWindow);
  const structure = detectStructure(candles, cfg.swingLookback);
  const sweep = detectLiqSweep(candles);
  const session = detectSession(interval);
  const zone = detectZone(candles[len - 1].close, pivots, cfg.zoneThreshold);
  const ob = detectOrderBlock(candles, structure.type, interval);
  const consolidation = detectConsolidation(candles, interval === '1w' || interval === '1d' ? 10 : 24);
  const candlePattern = detectCandlePattern(candles);
  const newsCheck = await checkNewsRisk();

  let score = 0;
  const reasoning: string[] = [];

  if (structure.type !== 'NONE') {
    score += (interval === '1w' || interval === '1d') ? 4 : 3;
    const label = {
      'BOS_BULL': '🔥 BOS Bullish — trend lanjut naik',
      'BOS_BEAR': '🔥 BOS Bearish — trend lanjut turun',
      'CHoCH_BULL': '🔄 CHoCH Bullish — reversal naik terdeteksi',
      'CHoCH_BEAR': '🔄 CHoCH Bearish — reversal turun terdeteksi',
    }[structure.type] ?? structure.type;
    reasoning.push(label);
  }

  if (sweep.swept) {
    score += 3;
    reasoning.push(sweep.type === 'SWEEP_LOW'
      ? `💧 Sweep Low @ ${sweep.level.toFixed(2)} — Bullish manipulation, smart money buy`
      : `💧 Sweep High @ ${sweep.level.toFixed(2)} — Bearish manipulation, smart money sell`);
  }

  if (session.inKillzone) {
    score += 2;
    reasoning.push(`⏰ Inside ${session.kzName} — high probability zone`);
  }

  if (ob !== null) {
    const price = candles[len - 1].close;
    const dist = Math.abs(price - ob) / (atr || 1);
    if (dist < 1.5) {
      score += 2;
      reasoning.push(`📦 Order Block @ ${ob.toFixed(2)} — ${dist < 0.5 ? 'INSIDE OB zone!' : `${dist.toFixed(1)} ATR away`}`);
    }
  }

  if (zone === 'DISCOUNT' && (structure.type === 'BOS_BULL' || structure.type === 'CHoCH_BULL' || sweep.type === 'SWEEP_LOW')) {
    score += 2;
    reasoning.push('📍 Discount Zone + Bullish Signal — ideal BUY confluence');
  } else if (zone === 'PREMIUM' && (structure.type === 'BOS_BEAR' || structure.type === 'CHoCH_BEAR' || sweep.type === 'SWEEP_HIGH')) {
    score += 2;
    reasoning.push('📍 Premium Zone + Bearish Signal — ideal SELL confluence');
  }

  if (candlePattern.name !== 'NONE') {
    score += 1;
    reasoning.push(`🕯 ${candlePattern.name} — candle confirmation`);
  }

  if (consolidation) {
    score += 1;
    reasoning.push('🔺 Consolidation/Triangle detected — breakout imminent');
  }

  if (newsCheck.safe) {
    score += 1;
    reasoning.push(`📰 ${newsCheck.note}`);
  } else {
    reasoning.push(`⚠️ ${newsCheck.note}`);
  }

  const isBullish = structure.type === 'BOS_BULL' || structure.type === 'CHoCH_BULL' || sweep.type === 'SWEEP_LOW' || candlePattern.bullish;
  const isBearish = structure.type === 'BOS_BEAR' || structure.type === 'CHoCH_BEAR' || sweep.type === 'SWEEP_HIGH' || candlePattern.bearish;

  let bias: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  if (score >= 5) {
    bias = isBullish && !isBearish ? 'BUY' : isBearish && !isBullish ? 'SELL' : 'WAIT';
  }

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' =
    score >= 10 ? 'HIGH' : score >= 6 ? 'MEDIUM' : 'LOW';

  const price = candles[len - 1].close;
  let entry = price, sl: number | null = null, tp1: number | null = null, tp2: number | null = null;

  if (bias === 'BUY') {
    sl = entry - atr * cfg.slMult;
    const risk = entry - sl;
    tp1 = entry + risk * cfg.tp1Mult;
    tp2 = entry + risk * cfg.tp2Mult;
  } else if (bias === 'SELL') {
    sl = entry + atr * cfg.slMult;
    const risk = sl - entry;
    tp1 = entry - risk * cfg.tp1Mult;
    tp2 = entry - risk * cfg.tp2Mult;
  }

  const setupParts: string[] = [];
  if (structure.type !== 'NONE') setupParts.push(structure.type.replace('_', ' '));
  if (sweep.swept) setupParts.push('Liq.Sweep');
  if (ob) setupParts.push('OB');
  if (session.inKillzone || session.session === 'Macro Swing') setupParts.push(session.kzName || session.session);
  if (candlePattern.name !== 'NONE') setupParts.push(candlePattern.name);
  const setup = setupParts.length ? setupParts.join(' + ') : 'No Setup Yet';

  return {
    pair: 'XAUUSD',
    timeframe: cfg.label,
    setup,
    session: session.session,
    score,
    bias,
    confidence,
    isLive,
    entry,
    sl,
    tp1,
    tp2,
    atr,
    pivotP: pivots.P,
    pivotS1: pivots.S1,
    pivotS2: pivots.S2,
    pivotS3: pivots.S3,
    pivotR1: pivots.R1,
    pivotR2: pivots.R2,
    pivotR3: pivots.R3,
    structure: structure.type,
    zone,
    orderBlock: ob,
    sweepType: sweep.type,
    reasoning,
  };
}
