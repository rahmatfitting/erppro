import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { ensureVisualTable } from '@/lib/visualEngine';

export async function GET() {
  try {
    await ensureVisualTable();
    const signals: any = await executeQuery(`
      SELECT * FROM crypto_visual_signals 
      WHERE (sentiment = 'LONG_ENTERING' OR sentiment = 'SHORT_ENTERING')
      ORDER BY potential DESC
      LIMIT 100
    `);
    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
