import { NextResponse } from 'next/server';
import { stopFundingBot } from '@/lib/fundingBot';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const closePosition = Boolean(body.closePosition);

    const state = await stopFundingBot(closePosition);

    return NextResponse.json({
      success: true,
      message: closePosition 
        ? 'Funding Farming Bot dihentikan dan posisi aktif telah ditutup!' 
        : 'Funding Farming Bot dihentikan.',
      data: state,
    });
  } catch (error: any) {
    console.error("POST /api/crypto/funding-farming/bot/stop error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menghentikan Funding Farming Bot',
    }, { status: 500 });
  }
}
