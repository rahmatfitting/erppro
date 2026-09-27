import { NextResponse } from 'next/server';
import { getTopGainerBotState } from '@/lib/topGainerBot';

export async function GET() {
  try {
    const state = await getTopGainerBotState();
    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    console.error("GET /api/crypto/top-gainer-bot error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memuat state Top Gainer Bot',
    }, { status: 500 });
  }
}
