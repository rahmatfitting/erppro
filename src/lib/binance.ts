import { executeQuery } from './db';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Binance hosts (try in order — some are blocked on Vercel, others aren't)
const SPOT_HOSTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
];

const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; CryptoScreener/1.0)',
};

/** Try a URL on multiple hosts until one succeeds */
async function fetchWithFallback(path: string, hosts: string[]): Promise<any | null> {
  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000); // 8s timeout per host
      const res = await fetch(`${host}${path}`, {
        headers: HEADERS,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && !data.code) return data; // Binance error responses have a .code field
    } catch (err) {
      // This host failed — try next
      console.warn(`fetchWithFallback: ${host}${path} failed, trying next...`);
    }
  }
  return null; // All hosts failed
}

export async function fetchBinancePairs(): Promise<string[]> {
  const data = await fetchWithFallback('/api/v3/exchangeInfo', SPOT_HOSTS);
  if (!data || !Array.isArray(data.symbols)) {
    console.error('fetchBinancePairs: all hosts failed or bad response');
    return [];
  }
  return data.symbols
    .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
    .map((s: any) => s.symbol);
}


export async function fetchKlines(symbol: string, interval: string = '1w', limit: number = 100) {
  const path = `/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
  
  // Try spot hosts first, then fall back to Binance data CDN (rarely blocked)
  const allHosts = [
    ...SPOT_HOSTS,
    'https://data.binance.com', // Binance CDN — usually not blocked
  ];

  const data = await fetchWithFallback(path, allHosts);
  if (!Array.isArray(data)) return [];

  return data.map((d: any) => ({
    time: d[0],
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
    volume: parseFloat(d[5]),
  }));
}


export interface FVGSignal {
  symbol: string;
  fvgLow: number;
  fvgHigh: number;
  entry: number;
  stopLoss: number;
  takeProfit: number;
  distance: number;
  status: 'FRESH' | 'RETESTED';
}

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

/** Wilder EMA (same formula TradingView uses for RSI/ATR) */
function calcEMA(candles: any[], period: number): number {
  if (candles.length < period) return 0;
  const closes = candles.map((c: any) => c.close);
  let ema = closes.slice(0, period).reduce((a: number, b: number) => a + b, 0) / period;
  const k = 2 / (period + 1);
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return ema;
}

/** True Range → ATR (period=14) for gap significance check */
function calcATR(candles: any[], period = 14): number {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h = candles[i].high;
    const l = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  // Wilder smoothing
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

/** Average body size over the last `period` candles before `endIdx` */
function avgBodySize(candles: any[], endIdx: number, period = 10): number {
  if (endIdx < period) return 0;
  const slice = candles.slice(endIdx - period, endIdx);
  return slice.reduce((acc: number, c: any) => acc + Math.abs(c.close - c.open), 0) / period;
}

/** Highest high in a window */
function highestHigh(candles: any[], from: number, to: number): number {
  return Math.max(...candles.slice(from, to).map((c: any) => c.high));
}

/** Previous Swing High above current price (for TP) */
function prevSwingHigh(candles: any[], fromIdx: number, currentPrice: number): number {
  for (let i = fromIdx; i >= 2; i--) {
    const c = candles[i];
    const prev = candles[i - 1];
    const next = candles[i + 1];
    if (c.high > prev.high && c.high > next.high && c.high > currentPrice) {
      return c.high;
    }
  }
  return currentPrice * 1.08; // fallback 8%
}

// ─────────────────────────────────────────────────────────────
// UPGRADED BULLISH FVG DETECTION — 7 LAYERS
// ─────────────────────────────────────────────────────────────
export function detectBulishFVG(symbol: string, candles: any[]): FVGSignal | null {
  if (candles.length < 50) return null;

  const currentPrice = candles[candles.length - 1].close;

  // ═══ LAYER 1 — MULTI-EMA TREND FILTER ═══════════════════════
  // Price must be above both EMA21 and EMA55 (confluence uptrend)
  const ema21 = calcEMA(candles, 21);
  const ema55 = calcEMA(candles, 55);
  if (currentPrice < ema21 || currentPrice < ema55) return null;
  // EMA21 must be above EMA55 (trend alignment)
  if (ema21 < ema55) return null;

  // ═══ LAYER 2 — ATR for FVG significance ═════════════════════
  const atr = calcATR(candles, 14);

  // Score tracker for the best FVG found
  let bestSignal: FVGSignal | null = null;
  let bestScore = -1;

  // Scan from most recent backward (skip the very last candle, it's forming)
  for (let i = candles.length - 2; i >= 20; i--) {
    const A = candles[i - 2];
    const B = candles[i - 1];
    const C = candles[i];

    // ── Basic FVG condition ──────────────────────────────────
    const fvgLow  = A.high;
    const fvgHigh = C.low;
    const gapSize = fvgHigh - fvgLow;
    if (gapSize <= 0) continue;

    // ═══ LAYER 3 — ATR-VALIDATED GAP SIZE ════════════════════
    // Gap must be at least 0.5× ATR to be significant (not noise)
    if (gapSize < atr * 0.5) continue;

    // ═══ LAYER 4 — IMPULSE CANDLE B ══════════════════════════
    // B must be bullish
    if (B.close <= B.open) continue;
    const bodyB = B.close - B.open;
    const avgBody = avgBodySize(candles, i - 1, 10);
    // Body of B must be > 1.5× average (not just > avg → stricter)
    if (bodyB < avgBody * 1.5) continue;
    // Candle B: body must dominate (body > 60% of range)
    const rangeB = B.high - B.low;
    if (rangeB > 0 && bodyB / rangeB < 0.6) continue;

    // ═══ LAYER 5 — STRICT FRESHNESS (ZERO-TOUCH) ════════════
    // No candle after C may have LOW ≤ fvgHigh (partial mitigation = invalid)
    let isFresh = true;
    let touchCount = 0;
    for (let j = i + 1; j < candles.length; j++) {
      if (candles[j].low < fvgHigh) {
        touchCount++;
        isFresh = false;
        break;
      }
      // Also reject if close below fvgHigh even without wick breakthrough
      if (candles[j].close < fvgHigh * 1.001) {
        isFresh = false;
        break;
      }
    }
    if (!isFresh) continue;

    // ═══ LAYER 6 — DISTANCE + PULLBACK QUALITY ═══════════════
    const middle  = (fvgLow + fvgHigh) / 2;
    const distance = ((currentPrice - middle) / middle) * 100;
    // Must be above FVG and within 15% (tighter than before)
    if (distance < 0 || distance > 15) continue;

    // ═══ LAYER 7 — MINIMUM RISK:REWARD ≥ 2:1 ════════════════
    const sl = fvgLow * 0.995; // Tight stop just below fvgLow
    const tp = prevSwingHigh(candles, i - 2, currentPrice);
    const riskPips   = currentPrice - sl;
    const rewardPips = tp - currentPrice;
    if (riskPips <= 0 || rewardPips / riskPips < 2.0) continue;

    // ── Scoring (pick BEST if multiple found) ────────────────
    // More recent = better | Bigger gap = better | Closer = better
    const recencyScore = (i / candles.length) * 40;      // 0-40 pts
    const gapScore     = Math.min(gapSize / atr, 3) * 20; // 0-60 pts (cap at 3×ATR)
    const distScore    = Math.max(0, 15 - distance) * 1;  // closer → higher (0-15 pts)
    const rrBonus      = Math.min(rewardPips / riskPips, 5) * 2; // R:R bonus 0-10
    const totalScore   = recencyScore + gapScore + distScore + rrBonus;

    if (totalScore > bestScore) {
      bestScore  = totalScore;
      bestSignal = {
        symbol,
        fvgLow,
        fvgHigh,
        entry: middle,
        stopLoss: sl,
        takeProfit: tp,
        distance,
        status: 'FRESH',
      };
    }
  }

  return bestSignal;
}

export async function sendTelegramNotification(msg: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: msg,
        parse_mode: 'Markdown'
      })
    });
  } catch (err) {
    console.error("Telegram error:", err);
  }
}
