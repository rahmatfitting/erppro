import { fetchFapiWithFallback } from './futures';

export interface TraderFlowData {
  symbol: string;
  longRatio: number;
  topTraderLongRatio: number;
  oiChange: number; // % vs 24h ago
  priceChange: number;
}

export interface TraderSignal {
  symbol: string;
  score: number;
  signal: 'STRONG LONG' | 'LONG BIAS' | 'STRONG SHORT' | 'SHORT BIAS' | 'NEUTRAL';
  reason: string[];
  longRatio: number;
  topTraderRatio: number;
  oiChange: number;
  priceChange: number;
  contrarianBias: string;
  whaleBias: string;
  oiTrend: 'up' | 'down' | 'flat';
}

// ------------------------------------------------------
// Fetch Long/Short Account Ratio (Global Retail Sentiment)
// ------------------------------------------------------
export async function fetchLongShortRatio(symbol: string): Promise<number | null> {
  try {
    const data = await fetchFapiWithFallback(
      `/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=1h&limit=2`
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    return parseFloat(data[data.length - 1].longAccount);
  } catch {
    return null;
  }
}

// ------------------------------------------------------
// Fetch Top Trader Long/Short Position Ratio (Whale Sentiment)
// ------------------------------------------------------
export async function fetchTopTraderRatio(symbol: string): Promise<number | null> {
  try {
    const data = await fetchFapiWithFallback(
      `/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=1h&limit=2`
    );
    if (!Array.isArray(data) || data.length === 0) return null;
    return parseFloat(data[data.length - 1].longAccount);
  } catch {
    return null;
  }
}

// ------------------------------------------------------
// Fetch Open Interest Change (24h trend)
// ------------------------------------------------------
export async function fetchOITrend(symbol: string): Promise<{
  oiChange: number;
  trend: 'up' | 'down' | 'flat';
}> {
  try {
    const data = await fetchFapiWithFallback(
      `/fapi/v1/openInterestHist?symbol=${symbol}&period=1h&limit=25`
    );
    if (!Array.isArray(data) || data.length < 2) return { oiChange: 0, trend: 'flat' };

    const latest = parseFloat(data[data.length - 1].sumOpenInterest);
    const prev24h = parseFloat(data[0].sumOpenInterest);
    const change = ((latest - prev24h) / prev24h) * 100;

    return {
      oiChange: change,
      trend: change > 2 ? 'up' : change < -2 ? 'down' : 'flat',
    };
  } catch {
    return { oiChange: 0, trend: 'flat' };
  }
}

// ------------------------------------------------------
// Contrarian Signal (Retail Longs → Smart Money Short)
// ------------------------------------------------------
export function contrarianSignal(longRatio: number): string {
  if (longRatio > 0.7) return 'RETAIL LONG → LOOK SHORT';
  if (longRatio < 0.3) return 'RETAIL SHORT → LOOK LONG';
  return 'NEUTRAL';
}

// ------------------------------------------------------
// Whale Bias from Top Trader Ratio
// ------------------------------------------------------
export function whaleBias(ratio: number): string {
  if (ratio > 0.6) return 'BULLISH';
  if (ratio < 0.4) return 'BEARISH';
  return 'SIDEWAYS';
}

// ------------------------------------------------------
// Master Scoring Engine
// ------------------------------------------------------
export function calcTraderScore(
  symbol: string,
  longRatio: number,
  topTraderRatio: number,
  oiTrend: 'up' | 'down' | 'flat',
  priceChange: number,
  oiChange: number
): TraderSignal {
  let score = 0;
  const reason: string[] = [];

  // ✅ Contrarian (30 pts max)
  if (longRatio < 0.35) {
    score += 30;
    reason.push(`Retail SHORT (${(longRatio * 100).toFixed(0)}%) → Smart $ Long`);
  } else if (longRatio > 0.65) {
    score += 30;
    reason.push(`Retail LONG (${(longRatio * 100).toFixed(0)}%) → Smart $ Short`);
  } else {
    score += 10;
  }

  // ✅ Whale Bias (40 pts max)
  if (topTraderRatio > 0.6) {
    score += 40;
    reason.push(`Whale LONG (${(topTraderRatio * 100).toFixed(0)}%)`);
  } else if (topTraderRatio < 0.4) {
    score += 40;
    reason.push(`Whale SHORT (${(topTraderRatio * 100).toFixed(0)}%)`);
  } else {
    score += 10;
  }

  // ✅ OI Trend (30 pts max)
  if (oiTrend === 'up') {
    score += 30;
    reason.push(`OI Increasing (+${oiChange.toFixed(1)}%)`);
  } else if (oiTrend === 'down') {
    score += 10;
    reason.push(`OI Declining (${oiChange.toFixed(1)}%)`);
  } else {
    score += 5;
  }

  // Determine signal type
  const contrarian = contrarianSignal(longRatio);
  const whale = whaleBias(topTraderRatio);

  // STRONG LONG: retail short + whale long + OI up
  const strongLong = longRatio < 0.35 && topTraderRatio > 0.6 && oiTrend === 'up';
  // STRONG SHORT: retail long + whale short + OI up
  const strongShort = longRatio > 0.65 && topTraderRatio < 0.4 && oiTrend === 'up';

  let signal: TraderSignal['signal'] = 'NEUTRAL';
  if (strongLong) signal = 'STRONG LONG';
  else if (strongShort) signal = 'STRONG SHORT';
  else if (longRatio < 0.4 && topTraderRatio > 0.55) signal = 'LONG BIAS';
  else if (longRatio > 0.6 && topTraderRatio < 0.45) signal = 'SHORT BIAS';

  return {
    symbol,
    score,
    signal,
    reason,
    longRatio,
    topTraderRatio,
    oiChange,
    priceChange,
    contrarianBias: contrarian,
    whaleBias: whale,
    oiTrend,
  };
}
