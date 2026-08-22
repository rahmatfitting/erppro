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
      const timer = setTimeout(() => controller.abort(), 5000); // 5s timeout
      const res = await fetch(`${host}${path}`, {
        headers: HEADERS,
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      
      if (!res.ok) {
        // If 400 (Bad Request) or 404 (Not Found), the endpoint/symbol is invalid, no need to retry mirror hosts
        if (res.status === 400 || res.status === 404) return null;
        continue;
      }
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        continue;
      }

      try {
        const data = await res.json();
        if (data && !data.code) return data;
      } catch (jsonErr) {
        continue;
      }
    } catch (err: any) {
      // Host network issue or timeout, continue to next host
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

export async function fetchFuturesKlines(symbol: string, interval: string = '1h', limit: number = 30) {
  try {
    const data = await fetchFapiWithFallback(`/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!Array.isArray(data)) return [];
    
    return data.map((d: any) => ({
      time: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch {
    return [];
  }
}

export async function fetchOIChange(symbol: string) {
  try {
    const [currentData, histData] = await Promise.all([
      fetchFapiWithFallback(`/fapi/v1/openInterest?symbol=${symbol}`),
      fetchFapiWithFallback(`/futures/data/openInterestHist?symbol=${symbol}&period=1d&limit=2`)
    ]);

    if (!currentData || !Array.isArray(histData) || histData.length < 2) return 0;
    const currentOI = parseFloat(currentData.openInterest);
    const prevOI = parseFloat(histData[0].sumOpenInterest);
    if (!prevOI) return 0;
    
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
