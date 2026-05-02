import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const direction = searchParams.get('direction') || 'ALL';

    let query = `
      SELECT * FROM crypto_trendline_signals 
      ORDER BY total_score DESC, created_at DESC
      LIMIT 100
    `;
    let params: any[] = [];

    if (direction !== 'ALL') {
      query = `
        SELECT * FROM crypto_trendline_signals 
        WHERE direction = ?
        ORDER BY total_score DESC, created_at DESC
        LIMIT 100
      `;
      params = [direction];
    }

    const signals: any = await executeQuery(query, params);
    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
