import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { TF_CFG } from '@/lib/xauusd5m';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = (searchParams.get('interval') ?? '5m').toLowerCase();
    
    if (!TF_CFG[interval]) {
      return NextResponse.json({ success: false, error: 'Invalid interval' }, { status: 400 });
    }

    const data: any = await executeQuery(
      `SELECT * FROM xauusd_5m_signals WHERE timeframe = ? ORDER BY created_at DESC LIMIT 30`,
      [TF_CFG[interval].label]
    );
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
