import { NextRequest, NextResponse } from 'next/server';
import { stopCompoundBot } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let closePosition = true;
    try {
      const body = await req.json();
      if (body.closePosition !== undefined) {
        closePosition = Boolean(body.closePosition);
      }
    } catch {
      // json parse error or empty body
    }

    const result = await stopCompoundBot(closePosition);
    return NextResponse.json({
      success: true,
      message: 'Bot Compound Future berhasil dihentikan.',
      data: result
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/stop error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menghentikan bot compound'
    }, { status: 500 });
  }
}
