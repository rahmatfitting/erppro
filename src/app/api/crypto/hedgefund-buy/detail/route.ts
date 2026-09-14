import { NextRequest, NextResponse } from 'next/server';
import { fetchHedgeFund8Charts } from '@/lib/hedgefundBuy';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = (searchParams.get('symbol') || 'BTCUSDT').toUpperCase();
    const period = searchParams.get('period') || '5m';

    const validPeriods = ['5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d'];
    const activePeriod = validPeriods.includes(period) ? period : '5m';

    const data = await fetchHedgeFund8Charts(symbol, activePeriod);

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/hedgefund-buy/detail error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memuat 8 chart analitik'
    }, { status: 500 });
  }
}
