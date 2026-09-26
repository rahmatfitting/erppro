import { NextResponse } from 'next/server';
import { getFundingBotState } from '@/lib/fundingBot';

export async function GET() {
  try {
    const state = await getFundingBotState();
    return NextResponse.json({
      success: true,
      data: state,
    });
  } catch (error: any) {
    console.error("GET /api/crypto/funding-farming/bot error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memuat state Funding Farming Bot',
    }, { status: 500 });
  }
}
