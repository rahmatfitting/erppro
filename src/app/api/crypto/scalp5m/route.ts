import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

const VALID_PAIRS = ['BTCUSDT', 'BNBUSDT', 'XRPUSDT', 'TRXUSDT', 'SOLUSDT', 'ETHUSDT'];
const VALID_INTERVALS = ['1w', '1d', '4h', '1h', '5m'];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pair     = (searchParams.get('pair')     ?? 'BTCUSDT').toUpperCase();
    const interval = (searchParams.get('interval') ?? '5m').toLowerCase();
    if (!VALID_PAIRS.includes(pair)) {
      return NextResponse.json({ success: false, error: 'Invalid pair' }, { status: 400 });
    }
    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json({ success: false, error: 'Invalid interval' }, { status: 400 });
    }
    const TF_LABEL: Record<string, string> = { '1w': 'Weekly', '1d': 'Daily', '4h': 'H4', '1h': 'H1', '5m': '5M' };
    const data: any = await executeQuery(
      `SELECT * FROM crypto_5m_signals WHERE pair = ? AND timeframe = ? ORDER BY created_at DESC LIMIT 30`,
      [pair, TF_LABEL[interval]]
    );
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
