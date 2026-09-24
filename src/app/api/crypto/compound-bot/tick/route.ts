import { NextRequest, NextResponse } from 'next/server';
import { tickCompoundBot } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const result = await tickCompoundBot();
    return NextResponse.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/tick error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengeksekusi tick bot compound'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
