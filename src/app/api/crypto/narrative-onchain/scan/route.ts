import { NextRequest, NextResponse } from 'next/server';
import { refreshOpportunityData } from '@/lib/narrativeOnchain';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const data = await refreshOpportunityData();
    return NextResponse.json({
      success: true,
      message: 'Pemindaian pasar, narasi, dan on-chain berhasil diperbarui.',
      data
    });
  } catch (error: any) {
    console.error("API /api/crypto/narrative-onchain/scan error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menyinkronkan data scanner'
    }, { status: 500 });
  }
}
