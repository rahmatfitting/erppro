import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '30';
    
    // Fetch last N records from history, then sort ascending for the chart
    const query = `
      SELECT * FROM (
        SELECT id, DATE_FORMAT(fetch_date, '%Y-%m-%d') as fetch_date, DATE_FORMAT(created_at, '%d-%b %H:%i') as time_label, price_1g, prev_price, diff, created_at 
        FROM gold_prices_history 
        ORDER BY id DESC
        LIMIT ?
      ) AS sub
      ORDER BY id ASC
    `;

    const prices = await executeQuery<any[]>(query, [parseInt(limit, 10)]);

    return NextResponse.json({ success: true, data: prices });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
