/**
 * ⚙️ 🔁 EURUSD AI SCREENER ENGINE (Major FX)
 * Flow: DATA -> STRUCTURE -> LIQUIDITY -> SESSION -> NEWS -> SCORING -> SIGNAL
 */

import { fetchForexNews, processEvents } from './forex';

export interface EURUSDCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface EURUSDSignal {
  pair: string;
  setup: string;
  session: string;
  score: number;
  bias: 'BUY' | 'SELL' | 'WAIT';
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  isLive?: boolean;
  entry?: number | null;
  sl?: number | null;
  tp1?: number | null;
  tp2?: number | null;
  atr?: number | null;
  reasoning: string[];
}

// ─────────────────────────────────────────────────────────────
// 1. DATA SOURCE (TwelveData Fallback / Mock for Dev)
// ─────────────────────────────────────────────────────────────
export async function fetchEURUSDCandles(interval: string = '1h', limit: number = 50): Promise<{candles: EURUSDCandle[], isLive: boolean}> {
  const apiKey = process.env.TWELVEDATA_API_KEY;
  
  if (!apiKey) {
    return { candles: generateMockEuroData(limit), isLive: false };
  }

  try {
    const url = `https://api.twelvedata.com/time_series?symbol=EUR/USD&interval=${interval}&outputsize=${limit}&apikey=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (data.status === 'error') {
      console.warn('TwelveData Error:', data.message);
      return { candles: generateMockEuroData(limit), isLive: false };
    }

    return {
      candles: data.values.map((v: any) => ({
        time: new Date(v.datetime).getTime(),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
        volume: parseFloat(v.volume || '0'),
      })).reverse(),
      isLive: true
    };
  } catch (err) {
    console.error('Fetch EURUSD error:', err);
    return { candles: generateMockEuroData(limit), isLive: false };
  }
}

async function fetchEURUSDWrapper(interval: string = '1h', limit: number = 50): Promise<{candles: EURUSDCandle[], isLive: boolean}> {
  return fetchEURUSDCandles(interval, limit);
}

function generateMockEuroData(limit: number): EURUSDCandle[] {
  const data: EURUSDCandle[] = [];
  let basePrice = 1.0850; 
  const now = Date.now();
  for (let i = 0; i < limit; i++) {
    const change = (Math.random() - 0.5) * 0.0020;
    const open = basePrice;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * 0.0010;
    const low = Math.min(open, close) - Math.random() * 0.0010;
    data.push({
      time: now - (limit - i) * 3600000,
      open,
      high,
      low,
      close,
      volume: Math.random() * 10000,
    });
    basePrice = close;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────
// 2. CORE DETECTION (Structure & Liquidity)
// ─────────────────────────────────────────────────────────────

/** Detect BOS / CHoCH */
function detectStructure(candles: EURUSDCandle[]) {
  const len = candles.length;
  if (len < 10) return { trend: 'neutral', bos: false };

  const lastCandle = candles[len - 1];
  const prevHigh = Math.max(...candles.slice(len - 10, len - 1).map(c => c.high));
  const prevLow = Math.min(...candles.slice(len - 10, len - 1).map(c => c.low));

  if (lastCandle.close > prevHigh) return { trend: 'bullish', bos: true };
  if (lastCandle.close < prevLow) return { trend: 'bearish', bos: true };
  
  return { trend: 'neutral', bos: false };
}

/** Detect Liquidity Sweep */
function detectLiquiditySweep(candles: EURUSDCandle[]) {
  const len = candles.length;
  if (len < 5) return { sweepLow: false, sweepHigh: false };

  const current = candles[len - 1];
  const lowestPrev = Math.min(...candles.slice(len - 10, len - 1).map(c => c.low));
  const highestPrev = Math.max(...candles.slice(len - 10, len - 1).map(c => c.high));

  const sweepLow = current.low < lowestPrev && current.close > lowestPrev;
  const sweepHigh = current.high > highestPrev && current.close < highestPrev;

  return { sweepLow, sweepHigh };
}

// ─────────────────────────────────────────────────────────────
// 3. SESSION & KILLZONE
// ─────────────────────────────────────────────────────────────

function detectSessionAndKillzone() {
  const now = new Date();
  const wibHour = (now.getUTCHours() + 7) % 24;
  
  let session = 'Asian';
  let inKillzone = false;
  let kzName = 'None';

  if (wibHour >= 14 && wibHour < 17) {
    session = 'London';
    inKillzone = true;
    kzName = 'London';
  }
  else if (wibHour >= 19 && wibHour < 22) {
    session = 'New York';
    inKillzone = true;
    kzName = 'New York';
  }
  else if (wibHour >= 7 && wibHour < 10) {
    session = 'Asian';
    inKillzone = true;
    kzName = 'Tokyo';
  }
  else if (wibHour >= 17 && wibHour < 19) {
    session = 'London/NY Overlap';
  }
  else if (wibHour >= 22 || wibHour < 7) {
    session = 'Late NY / Early Asia';
  }

  return { session, inKillzone, kzName };
}

/** Detect Asian Range Expansion */
function analyzeAsianRange(candles: EURUSDCandle[]) {
  const asiaCandles = candles.filter(c => {
    const d = new Date(c.time);
    const hour = (d.getUTCHours() + 7) % 24;
    return hour >= 7 && hour < 14;
  });

  if (asiaCandles.length < 2) return { tightRange: false, range: 0 };

  const high = Math.max(...asiaCandles.map(c => c.high));
  const low = Math.min(...asiaCandles.map(c => c.low));
  const range = high - low;

  // EURUSD range is very tight in Asia (< 20-30 pips)
  const tightRange = range < 0.0025; 
  
  return { tightRange, range };
}

// ─────────────────────────────────────────────────────────────
// 4. NEWS FILTER
// ─────────────────────────────────────────────────────────────
async function checkNewsRisk() {
  const rawNews = await fetchForexNews();
  const processed = processEvents(rawNews);
  
  const today = new Date().toDateString();
  const highImpactSoon = processed.some(e => 
    (e.currency === 'USD' || e.currency === 'EUR') && 
    e.impact === 'High' && 
    new Date(e.date).toDateString() === today &&
    e.sentiment === 'pending'
  );

  return !highImpactSoon;
}

// ─────────────────────────────────────────────────────────────
// 5. ATR CALCULATION
// ─────────────────────────────────────────────────────────────
export function calcATR(candles: EURUSDCandle[], period: number = 14): number {
  if (candles.length <= period) return 0;
  
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

// ─────────────────────────────────────────────────────────────
// 6. SCORING SYSTEM & SIGNAL GENERATOR
// ─────────────────────────────────────────────────────────────
export async function scanEURUSD(): Promise<EURUSDSignal> {
  const { candles, isLive } = await fetchEURUSDWrapper('1h', 100);
  const structure = detectStructure(candles);
  const liquidity = detectLiquiditySweep(candles);
  const sessionData = detectSessionAndKillzone();
  const asiaRange = analyzeAsianRange(candles);
  const noNewsRisk = await checkNewsRisk();
  const atr = calcATR(candles, 14);

  let score = 0;
  const reasoning: string[] = [];

  // Liquidity Sweep +4
  if (liquidity.sweepLow || liquidity.sweepHigh) {
    score += 4;
    reasoning.push(liquidity.sweepLow ? 'Liquidity Sweep LOW detected (Euro Bullish Manipulation)' : 'Liquidity Sweep HIGH detected (Euro Bearish Manipulation)');
  }

  // BOS / CHoCH +3
  if (structure.bos) {
    score += 3;
    reasoning.push(`EURUSD Structure Break (${structure.trend} BOS) detected`);
  }

  // Killzone +2
  if (sessionData.inKillzone) {
    score += 2;
    reasoning.push(`Inside ${sessionData.kzName} Killzone — high Euro liquidity expected`);
  }

  // Asia Range Break +2
  if (asiaRange.tightRange) {
    score += 2;
    reasoning.push('Tight Asian Range detected — Euro preparing for expansion');
  }

  // No News Risk +2
  if (noNewsRisk) {
    score += 2;
    reasoning.push('No High Impact USD/EUR news pending — technical Euro setup preferred');
  }

  const currentPrice = candles[candles.length - 1].close;
  const bias: 'BUY' | 'SELL' | 'WAIT' = 
    score >= 8 ? (liquidity.sweepLow || structure.trend === 'bullish' ? 'BUY' : 'SELL') :
    score >= 5 ? (liquidity.sweepLow || structure.trend === 'bullish' ? 'BUY' : 'SELL') : 'WAIT';

  const confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 
    score >= 8 ? 'HIGH' : score >= 5 ? 'MEDIUM' : 'LOW';

  let entry = currentPrice;
  let sl = null, tp1 = null, tp2 = null;
  
  // Standard SL for major pairs: 1.5x ATR
  const slMultiplier = 1.5; 

  if (bias === 'BUY') {
    sl = entry - (atr * slMultiplier);
    const risk = entry - sl;
    tp1 = entry + (risk * 2);
    tp2 = entry + (risk * 3);
  } else if (bias === 'SELL') {
    sl = entry + (atr * slMultiplier);
    const risk = sl - entry;
    tp1 = entry - (risk * 2);
    tp2 = entry - (risk * 3);
  }

  return {
    pair: 'EURUSD',
    setup: `${liquidity.sweepLow || liquidity.sweepHigh ? 'Liquidity Sweep' : 'Structure Break'} + ${sessionData.session} Expansion`,
    session: sessionData.session,
    score,
    bias,
    confidence,
    isLive,
    entry,
    sl,
    tp1,
    tp2,
    atr,
    reasoning
  };
}
