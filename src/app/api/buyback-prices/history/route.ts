import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');

    // Fetch historical data (last N records) in ascending date order for chart
    const query = `
      SELECT * FROM (
        SELECT id, DATE_FORMAT(fetch_date, '%Y-%m-%d') as fetch_date, DATE_FORMAT(created_at, '%d-%b %H:%i') as time_label, price_1g, prev_price, diff, created_at
        FROM buyback_prices_history
        ORDER BY id DESC
        LIMIT ?
      ) AS sub
      ORDER BY id ASC
    `;
    
    // executeQuery uses mysql2 pool
    const data = await executeQuery<any[]>(query, [limit]);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Buyback DB Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
