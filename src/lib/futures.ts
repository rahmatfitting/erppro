import { executeQuery } from './db';

const FAPI_BASE = 'https://fapi.binance.com';

export async function fetchTopFuturesPairs(limit: number = 50) {
  try {
    const res = await fetch(`${FAPI_BASE}/fapi/v1/ticker/24hr`, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 0 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.error('fetchTopFuturesPairs: unexpected response', data);
      return [];
    }
    return data
      .filter((d: any) => d.symbol && d.symbol.endsWith('USDT'))
      .sort((a: any, b: any) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, limit)
      .map((d: any) => ({
        symbol: d.symbol,
        priceChangePercent: parseFloat(d.priceChangePercent),
        lastPrice: parseFloat(d.lastPrice),
        quoteVolume: parseFloat(d.quoteVolume)
      }));
  } catch (err) {
    console.error('fetchTopFuturesPairs error:', err);
    return [];
  }
}

export async function fetchOIChange(symbol: string) {
  try {
    // Current OI
    const currentRes = await fetch(`${FAPI_BASE}/fapi/v1/openInterest?symbol=${symbol}`);
    const currentData = await currentRes.json();
    const currentOI = parseFloat(currentData.openInterest);

    // OI 24h ago
    const histRes = await fetch(`${FAPI_BASE}/fapi/v1/openInterestHist?symbol=${symbol}&period=1d&limit=2`);
    const histData = await histRes.json();
    if (histData.length < 2) return 0;
    
    const prevOI = parseFloat(histData[0].sumOpenInterest);
    const change = ((currentOI - prevOI) / prevOI) * 100;
    return change;
  } catch (err) {
    return 0;
  }
}

export interface VisualSignal {
  symbol: string;
  priceChange: number;
  oiChange: number;
  type: 'LONG_ENTERING' | 'SHORT_ENTERING' | 'LONG_UNWINDING' | 'SHORT_COVERING';
  potential: number;
}

export function classifySentiment(priceChange: number, oiChange: number): VisualSignal['type'] {
  if (priceChange >= 0 && oiChange >= 0) return 'LONG_ENTERING';
  if (priceChange < 0 && oiChange >= 0) return 'SHORT_ENTERING';
  if (priceChange < 0 && oiChange < 0) return 'LONG_UNWINDING';
  return 'SHORT_COVERING';
}
