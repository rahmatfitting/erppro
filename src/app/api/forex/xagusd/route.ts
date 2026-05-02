import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    const data: any = await executeQuery(
      `SELECT * FROM xagusd_screener_signals 
       ORDER BY created_at DESC LIMIT 50`
    );
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
