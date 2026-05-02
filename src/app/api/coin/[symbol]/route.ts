import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: NextRequest, context: { params: Promise<{ symbol: string }> }) {
  try {
    const { symbol: rawSymbol } = await context.params;
    const symbol = rawSymbol.toUpperCase();

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
