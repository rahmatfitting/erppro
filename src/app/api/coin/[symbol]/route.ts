import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request, context: { params: { symbol: string } }) {
  try {
    const { params } = context;
    // For Next.js 15, route params in Route Handlers should be accessed as async (wait for resolution) 
    // or just direct destructure based on Next.js setup. Assuming typical params object or search param:
    
    // Actually, params could be a promise in newer Next.js versions. We use it directly for fallback:
    const symbol = (await Promise.resolve(params)).symbol.toUpperCase();

    const data = await executeQuery<any[]>(`
      SELECT c.symbol, c.name, e.timeframe, e.ema20, e.ema50, e.ema100, e.ema200, e.trend, e.timestamp 
      FROM coins c
      JOIN ema_results e ON c.symbol = e.symbol
      WHERE c.symbol = ?
    `, [symbol]);

    return NextResponse.json({ success: true, symbol, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
