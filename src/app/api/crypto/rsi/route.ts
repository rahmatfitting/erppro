import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1h';

    const signals: any = await executeQuery(`
      SELECT * FROM crypto_rsi_signals 
      WHERE timeframe = ?
      ORDER BY rsi_value DESC
    `, [interval]);
    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
