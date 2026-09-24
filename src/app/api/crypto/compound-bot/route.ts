import { NextRequest, NextResponse } from 'next/server';
import { getBotState } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const state = await getBotState();
    return NextResponse.json({
      success: true,
      data: state,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot GET error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memuat status bot compound'
    }, { status: 500 });
  }
}
