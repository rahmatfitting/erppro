import { NextResponse } from 'next/server';
import { clearTopGainerBotLogs } from '@/lib/topGainerBot';

export async function POST() {
  try {
    await clearTopGainerBotLogs();
    return NextResponse.json({
      success: true,
      message: 'Log Top Gainer Bot berhasil dibersihkan',
    });
  } catch (error: any) {
    console.error("POST /api/crypto/top-gainer-bot/clear-logs error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal membersihkan log',
    }, { status: 500 });
  }
}
