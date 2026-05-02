import { NextResponse } from 'next/server';
import { runWhaleScreenerCore } from '@/lib/whaleEngine';

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const symbolParam = url.searchParams.get('symbol');
    
    let symbolsToScan = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT', 'DOGEUSDT', 'LINKUSDT'];
    if (symbolParam) {
      symbolsToScan = symbolParam.split(',').map(s => s.trim());
    }
    
    const scanResults = await runWhaleScreenerCore(symbolsToScan);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Whale scan completed successfully', 
      count: scanResults.length,
      data: scanResults
    });
  } catch (error: any) {
    console.error('API /crypto/whale/scan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Allow GET for easy browser testing
export async function GET(req: Request) {
  return POST(req);
}
