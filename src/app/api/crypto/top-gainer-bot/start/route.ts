import { NextResponse } from 'next/server';
import { startTopGainerBot } from '@/lib/topGainerBot';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const state = await startTopGainerBot(body);

    return NextResponse.json({
      success: true,
      message: 'Top Gainer Scalper Bot berhasil dimulai',
      data: state,
    });
  } catch (error: any) {
    console.error("POST /api/crypto/top-gainer-bot/start error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memulai Top Gainer Bot',
    }, { status: 500 });
  }
}
