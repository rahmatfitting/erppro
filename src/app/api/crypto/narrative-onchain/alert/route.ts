import { NextRequest, NextResponse } from 'next/server';
import { dispatchOpportunityTelegramAlert } from '@/lib/narrativeOnchain';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, slugOrSymbol } = body;

    if (!slugOrSymbol) {
      return NextResponse.json({
        success: false,
        error: 'Parameter slugOrSymbol wajib diisi'
      }, { status: 400 });
    }

    const result = await dispatchOpportunityTelegramAlert({
      type: type === 'NARRATIVE' ? 'NARRATIVE' : 'COIN',
      slugOrSymbol
    });

    return NextResponse.json({
      success: true,
      message: result.message
    });
  } catch (error: any) {
    console.error("API /api/crypto/narrative-onchain/alert error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengirim alert ke Telegram'
    }, { status: 500 });
  }
}
