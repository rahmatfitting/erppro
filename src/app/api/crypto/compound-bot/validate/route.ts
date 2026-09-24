import { NextRequest, NextResponse } from 'next/server';
import { validateFuturesPair } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get('symbol') || '';

    if (!symbol) {
      return NextResponse.json({
        success: false,
        error: 'Parameter symbol wajib diisi (contoh: BTCUSDT)'
      }, { status: 400 });
    }

    const result = await validateFuturesPair(symbol);
    return NextResponse.json({
      success: result.isValid,
      ...result
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/validate error:", error);
    return NextResponse.json({
      success: false,
      isValid: false,
      error: error.message || 'Gagal memvalidasi pair'
    }, { status: 500 });
  }
}
