import { NextRequest, NextResponse } from 'next/server';
import { stopCompoundBot } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    let symbol = 'ALL';
    let closePosition = true;
    try {
      const body = await req.json();
      if (body.symbol) {
        symbol = body.symbol.toUpperCase().trim();
      }
      if (body.closePosition !== undefined) {
        closePosition = Boolean(body.closePosition);
      }
    } catch {
      // json parse error or empty body
    }

    const result = await stopCompoundBot({ symbol, closeMarketPosition: closePosition });
    return NextResponse.json({
      success: true,
      message: symbol === 'ALL' 
        ? 'Seluruh bot compound berhasil dihentikan.' 
        : `Bot compound untuk ${symbol} berhasil dihentikan.`,
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
