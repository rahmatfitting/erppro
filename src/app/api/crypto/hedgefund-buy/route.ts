import { NextResponse } from 'next/server';
import { getCachedHedgeFundSignals } from '@/lib/hedgefundBuy';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const signals = await getCachedHedgeFundSignals();
    return NextResponse.json({
      success: true,
      data: signals,
      total: signals.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/hedgefund-buy error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memuat data sinyal Hedge Fund Buy'
    }, { status: 500 });
  }
}
