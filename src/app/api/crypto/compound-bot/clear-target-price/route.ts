import { NextRequest, NextResponse } from 'next/server';
import { clearCoinTargetPrice } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const symbol = body.symbol ? body.symbol.toUpperCase().trim() : '';

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Simbol koin wajib diisi' }, { status: 400 });
    }

    const result = await clearCoinTargetPrice(symbol);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/clear-target-price error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menghapus target price'
    }, { status: 500 });
  }
}
