import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'ALL';

    const where = type === 'ALL'
      ? ''
      : `WHERE signal_type = '${type}'`;

    const signals: any = await executeQuery(
      `SELECT * FROM crypto_trader_signals ${where} ORDER BY score DESC LIMIT 50`
    );

    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
