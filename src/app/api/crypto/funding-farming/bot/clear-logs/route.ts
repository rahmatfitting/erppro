import { NextResponse } from 'next/server';
import { clearFundingBotLogs } from '@/lib/fundingBot';

export async function POST() {
  try {
    await clearFundingBotLogs();
    return NextResponse.json({
      success: true,
      message: 'Log riwayat berhasil dibersihkan',
    });
  } catch (error: any) {
    console.error("POST /api/crypto/funding-farming/bot/clear-logs error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal membersihkan log',
    }, { status: 500 });
  }
}
