import { NextRequest, NextResponse } from 'next/server';
import { deleteCoinConfig } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Pair simbol wajib diisi' }, { status: 400 });
    }

    const result = await deleteCoinConfig(symbol);
    return NextResponse.json({
      success: true,
      message: `Koin ${symbol} berhasil dihapus dari daftar bot compound.`,
      data: result
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/delete error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menghapus koin'
    }, { status: 500 });
  }
}
