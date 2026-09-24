import { NextRequest, NextResponse } from 'next/server';
import { clearCompoundBotLogs } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await clearCompoundBotLogs();
    return NextResponse.json({
      success: true,
      message: 'Log riwayat aktivitas berhasil dibersihkan.'
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/clear-logs error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal membersihkan log'
    }, { status: 500 });
  }
}
