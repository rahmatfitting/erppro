import { NextResponse } from 'next/server';
import { stopTopGainerBot } from '@/lib/topGainerBot';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const closePosition = Boolean(body.closePosition);
    const state = await stopTopGainerBot(closePosition);

    return NextResponse.json({
      success: true,
      message: 'Top Gainer Scalper Bot berhasil dihentikan',
      data: state,
    });
  } catch (error: any) {
    console.error("POST /api/crypto/top-gainer-bot/stop error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menghentikan Top Gainer Bot',
    }, { status: 500 });
  }
}
