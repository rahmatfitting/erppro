function getFapiHosts(): string[] {
  const hosts: string[] = [];
  const proxy = process.env.BINANCE_FUTURES_BASE_URL || process.env.BINANCE_PROXY_URL;
  if (proxy) {
    hosts.push(proxy.trim().replace(/\/+$/, ''));
  }
  hosts.push('https://fapi.binance.com');
  return hosts;
}

const HEADERS = {
  'Accept': 'application/json',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

// In-memory cache to prevent WAF throttling from repetitive heavy calls (e.g. premiumIndex 200KB)
interface FapiCacheEntry {
  data: any;
  timestamp: number;
}
const fapiCache = new Map<string, FapiCacheEntry>();
const CACHE_TTL_MS = 4000; // 4s fresh cache
const STALE_TTL_MS = 180000; // 3m stale fallback if network temporarily fails

/** Try a Futures path on Binance host with caching and retries */
export async function fetchFapiWithFallback(path: string): Promise<any | null> {
  const now = Date.now();
  const cached = fapiCache.get(path);

  // Return fresh cache immediately
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const hosts = getFapiHosts();

  for (const host of hosts) {
    // Retry up to 2 times per host
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 9000); // 9s timeout for large payloads
        const res = await fetch(`${host}${path}`, {
          headers: HEADERS,
          signal: controller.signal,
          cache: 'no-store',
        });
        clearTimeout(timer);
        
        if (!res.ok) {
          if (res.status === 429 || res.status === 403 || res.status === 451) {
            console.warn(`[Binance FAPI] Host ${host}${path} returned HTTP ${res.status} (attempt ${attempt})`);
          }
          continue;
        }
        
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          continue;
        }

        const data = await res.json();
        if (data && !data.code) {
          // Cache successful response
          fapiCache.set(path, { data, timestamp: Date.now() });
          return data;
        }
      } catch (err: any) {
        // network/timeout error
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, 400));
        }
      }
    }
  }

  // Fallback to stale cached data if available rather than hard failing
  if (cached && now - cached.timestamp < STALE_TTL_MS) {
    console.warn(`[Binance FAPI] Using stale cache for ${path} due to network/WAF block.`);
    return cached.data;
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
