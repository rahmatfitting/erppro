import { NextRequest, NextResponse } from 'next/server';
import { getOpportunityDashboardData } from '@/lib/narrativeOnchain';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const data = await getOpportunityDashboardData();
    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/narrative-onchain GET error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memuat data Opportunity Monitor'
    }, { status: 500 });
  }
}
