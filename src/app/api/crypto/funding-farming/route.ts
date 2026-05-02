import { NextResponse } from 'next/server';
import { fetchFapiWithFallback } from '@/lib/futures';

async function fetchFuturesKlines(symbol: string, interval: string = '1h', limit: number = 20) {
  try {
    const data = await fetchFapiWithFallback(`/fapi/v1/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    if (!Array.isArray(data)) return [];
    
    return data.map((d: any) => ({
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
    }));
  } catch (e) {
    console.error(`FundingFarming: fetchFuturesKlines failed for ${symbol}`, e);
    return [];
  }
}

function analyzeMarketCondition(candles: any[]) {
  if (candles.length < 10) return 'UNKNOWN';

  const lastCandle = candles[candles.length - 1];
  const bodySize = Math.abs(lastCandle.close - lastCandle.open);
  
  // Calculate average body size for the last 10 candles
  const avgBody = candles.slice(-11, -1).reduce((acc, c) => acc + Math.abs(c.close - c.open), 0) / 10;
  
  // Impulsive check
  if (bodySize > avgBody * 2.5) return 'IMPULSIVE';

  // Sideways check: price stays within a 1.5% range over last 10 candles
  const prices = candles.slice(-10).map(c => c.close);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const rangePercent = ((max - min) / min) * 100;

  if (rangePercent < 1.5) return 'SIDEWAYS';
  
  return 'TRENDING';
}

export async function GET() {
  try {
    // 1. Fetch Premium Index (Funding Rates) using fallback hosts
    const data = await fetchFapiWithFallback('/fapi/v1/premiumIndex');
    if (!data) {
      throw new Error('Connection failed: All Binance Futures endpoints are unreachable (Timeout or Blocked).');
    }
    if (!Array.isArray(data)) {
      throw new Error('Invalid response: Binance returned data in an unexpected format.');
    }

    // 2. Filter high funding coins (Abs > 0.01%)
    // User requested 0.005 (0.5%), but we show from 0.01% as baseline
    const filtered = data
      .filter((item: any) => Math.abs(parseFloat(item.lastFundingRate)) >= 0.0001)
      .map((item: any) => ({
        symbol: item.symbol,
        fundingRate: parseFloat(item.lastFundingRate),
        nextFundingTime: parseInt(item.nextFundingTime),
        markPrice: parseFloat(item.markPrice),
      }))
      .sort((a, b) => Math.abs(b.fundingRate) - Math.abs(a.fundingRate));

    // 3. Take top 15 for health analysis to avoid rate limits/slow response
    const topOpportunities = filtered.slice(0, 15);
    const results = [];

    for (const opp of topOpportunities) {
      const candles = await fetchFuturesKlines(opp.symbol, '1h', 20);
      const condition = analyzeMarketCondition(candles);
      
      results.push({
        ...opp,
        marketCondition: condition,
        // Recommendation logic
        recommendation: opp.fundingRate > 0 ? 'SHORT' : 'LONG',
        isExtreme: Math.abs(opp.fundingRate) >= 0.005, // The 0.5% threshold requested by user
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
      totalHighFunding: filtered.length,
      timestamp: Date.now()
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
