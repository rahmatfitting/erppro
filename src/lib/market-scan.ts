import { fetchKlines, detectBulishFVG } from './binance';
import { runAMDAnalysis } from './ict';
import { detectSMC } from './smc';

const SPOT_HOSTS = [
  'https://api.binance.com',
  'https://api1.binance.com',
  'https://api2.binance.com',
  'https://api3.binance.com',
  'https://api4.binance.com',
  'https://data.binance.com',
  'https://data-api.binance.vision',
];

const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (compatible; CryptoScreener/1.0)',
};

async function fetchWithFallback(path: string, hosts: string[]): Promise<any | null> {
  for (const host of hosts) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000); // Increased to 15s for large ticker data
      const res = await fetch(`${host}${path}`, {
        headers: HEADERS,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (data && !data.code) return data;
    } catch (err) {
      console.warn(`fetchWithFallback: ${host}${path} failed, trying next...`);
    }
  }
  return null;
}

export interface MarketTicker {
  symbol: string;
  priceChangePercent: number;
  lastPrice: number;
  volume: number;
  quoteVolume: number;
}

export async function fetchTicker24hr(): Promise<MarketTicker[]> {
  const data = await fetchWithFallback('/api/v3/ticker/24hr', SPOT_HOSTS);
  if (!Array.isArray(data)) return [];
  return data
    .filter((t: any) => t.symbol.endsWith('USDT'))
    .map((t: any) => ({
      symbol: t.symbol,
      priceChangePercent: parseFloat(t.priceChangePercent),
      lastPrice: parseFloat(t.lastPrice),
      volume: parseFloat(t.volume),
      quoteVolume: parseFloat(t.quoteVolume),
    }));
}

export function detectMoneyRotation(tickers: MarketTicker[]) {
  const btc = tickers.find(t => t.symbol === 'BTCUSDT');
  if (!btc) return 'UNKNOWN';

  const alts = tickers.filter(t => t.symbol !== 'BTCUSDT' && t.symbol !== 'ETHUSDT');
  const avgAltChange = alts.reduce((acc, t) => acc + t.priceChangePercent, 0) / alts.length;

  if (btc.priceChangePercent < 0 && avgAltChange > 0) return 'ALTSEASON';
  if (btc.priceChangePercent > 1 && avgAltChange < btc.priceChangePercent) return 'BTC_DOMINANCE';
  return 'NEUTRAL';
}

export function detectExplosion(candles: any[]) {
  if (candles.length < 20) return false;
  const currentMove = Math.abs(candles[candles.length - 1].close - candles[candles.length - 1].open);
  const moves = candles.slice(-21, -1).map(c => Math.abs(c.close - c.open));
  const avgMove = moves.reduce((a, b) => a + b, 0) / moves.length;
  
  const currentVol = candles[candles.length - 1].volume;
  const vols = candles.slice(-21, -1).map(c => c.volume);
  const avgVol = vols.reduce((a, b) => a + b, 0) / vols.length;

  return currentMove > avgMove * 2.5 && currentVol > avgVol * 1.5;
}

export async function detectMomentumMultiTF(symbol: string) {
  const [m5, m15, h1] = await Promise.all([
    fetchKlines(symbol, '5m', 10),
    fetchKlines(symbol, '15m', 10),
    fetchKlines(symbol, '1h', 10),
  ]);

  if (!m5.length || !m15.length || !h1.length) return 0;

  const getMove = (c: any[]) => (c[c.length - 1].close - c[0].open) / c[0].open * 100;
  
  const score5 = getMove(m5) > 0.5 ? 1 : getMove(m5) > 1.5 ? 2 : 0;
  const score15 = getMove(m15) > 1 ? 2 : getMove(m15) > 3 ? 4 : 0;
  const score60 = getMove(h1) > 2 ? 3 : getMove(h1) > 5 ? 6 : 0;

  return score5 + score15 + score60;
}

export function calculateEntrySLTP(symbol: string, smc: any, fvg: any, ict: any, currentPrice: number) {
  let entry = currentPrice;
  let sl = currentPrice * 0.95;
  let tp1 = currentPrice * 1.03;
  let tp2 = currentPrice * 1.06;
  let tp3 = currentPrice * 1.10;

  if (fvg) {
    entry = fvg.entry;
    sl = fvg.stopLoss;
    tp1 = fvg.takeProfit;
    tp2 = tp1 * 1.05;
    tp3 = tp2 * 1.05;
  } else if (smc) {
    entry = smc.ob_price || currentPrice;
    sl = entry * 0.98;
    tp1 = smc.last_hh_ll || entry * 1.05;
    tp2 = tp1 * 1.05;
    tp3 = tp2 * 1.05;
  }

  return { entry, sl, tp1, tp2, tp3 };
}
