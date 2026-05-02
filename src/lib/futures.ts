const FAPI_HOSTS = [
  'https://fapi.binance.com',
  'https://fapi.binance.me',
  'https://fapi.binance.info',
  'https://fapi.binance.org',
  'https://fapi1.binance.com',
  'https://fapi2.binance.com',
  'https://fapi3.binance.com',
  'https://fapi4.binance.com',
  'https://fapi5.binance.com',
];

const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
};

/** Try a Futures path on multiple hosts until one succeeds */
export async function fetchFapiWithFallback(path: string): Promise<any | null> {
  for (const host of FAPI_HOSTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000); // 15s
      const res = await fetch(`${host}${path}`, {
        headers: HEADERS,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      
      if (!res.ok) {
        console.error(`fetchFapi: ${host}${path} returned Status ${res.status}`);
        continue;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        console.error(`fetchFapi: ${host}${path} returned non-JSON content: ${contentType}`);
        continue;
      }

      try {
        const data = await res.json();
        if (data && !data.code) return data;
      } catch (jsonErr) {
        console.error(`fetchFapi: ${host}${path} JSON parse error`);
        continue;
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.error(`fetchFapi: ${host}${path} timeout`);
      } else {
        console.error(`fetchFapi: ${host}${path} error: ${err.message}`);
      }
    }
  }
  return null;
}

export async function fetchTopFuturesPairs(limit: number = 50) {
  const data = await fetchFapiWithFallback('/fapi/v1/ticker/24hr');
  if (!Array.isArray(data)) {
    console.error('fetchTopFuturesPairs: all hosts failed or bad response');
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
}

export async function fetchOIChange(symbol: string) {
  try {
    const currentData = await fetchFapiWithFallback(`/fapi/v1/openInterest?symbol=${symbol}`);
    if (!currentData) return 0;
    const currentOI = parseFloat(currentData.openInterest);

    const histData = await fetchFapiWithFallback(`/fapi/v1/openInterestHist?symbol=${symbol}&period=1d&limit=2`);
    if (!Array.isArray(histData) || histData.length < 2) return 0;
    
    const prevOI = parseFloat(histData[0].sumOpenInterest);
    const change = ((currentOI - prevOI) / prevOI) * 100;
    return change;
  } catch {
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
