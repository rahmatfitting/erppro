import { NextResponse } from 'next/server';
import { tickTopGainerBot, getTopGainerBotState } from '@/lib/topGainerBot';

export async function POST() {
  try {
    const tickResult = await tickTopGainerBot();
    const currentState = await getTopGainerBotState();

    return NextResponse.json({
      success: true,
      data: {
        tickResult,
        state: currentState
      }
    });
  } catch (error: any) {
    console.error("POST /api/crypto/top-gainer-bot/tick error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengeksekusi tick Top Gainer Bot',
    }, { status: 500 });
  }
}
