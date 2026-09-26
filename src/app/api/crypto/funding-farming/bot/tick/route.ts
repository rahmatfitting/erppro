import { NextResponse } from 'next/server';
import { tickFundingBot, getFundingBotState } from '@/lib/fundingBot';

export async function POST() {
  try {
    const tickResult = await tickFundingBot();
    const currentState = await getFundingBotState();

    return NextResponse.json({
      success: true,
      data: {
        tickResult,
        state: currentState
      }
    });
  } catch (error: any) {
    console.error("POST /api/crypto/funding-farming/bot/tick error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengeksekusi tick Funding Farming Bot',
    }, { status: 500 });
  }
}
