import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const buyback = await executeQuery<any[]>(`SELECT * FROM buyback_prices ORDER BY id DESC LIMIT 5`);
    const buybackHistory = await executeQuery<any[]>(`SELECT * FROM buyback_prices_history ORDER BY id DESC LIMIT 5`);
    const gold = await executeQuery<any[]>(`SELECT * FROM gold_prices ORDER BY id DESC LIMIT 5`);
    const goldHistory = await executeQuery<any[]>(`SELECT * FROM gold_prices_history ORDER BY id DESC LIMIT 5`);

    return NextResponse.json({
      success: true,
      buyback,
      buybackHistory,
      gold,
      goldHistory
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
