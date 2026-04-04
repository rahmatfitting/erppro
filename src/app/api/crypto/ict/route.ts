import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval   = searchParams.get('interval') || '1h';
    const bias       = searchParams.get('bias') || 'ALL';
    const minScore   = parseInt(searchParams.get('minScore') || '4');

    const biasWhere = bias === 'ALL' ? '' : `AND bias = '${bias}'`;
    const data: any = await executeQuery(
      `SELECT * FROM crypto_ict_signals
       WHERE timeframe = ? AND score >= ? ${biasWhere}
       ORDER BY score DESC
       LIMIT 50`,
      [interval, minScore]
    );
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
