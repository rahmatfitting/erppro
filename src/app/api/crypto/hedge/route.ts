import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const signals: any = await executeQuery(`
      SELECT * FROM crypto_hedge_signals 
      ORDER BY score DESC
      LIMIT 10
    `);
    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
