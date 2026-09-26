import { NextResponse } from 'next/server';
import { startFundingBot } from '@/lib/fundingBot';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const notionalUsd = body.notionalUsd ? parseFloat(body.notionalUsd) : undefined;
    const leverage = body.leverage ? parseInt(body.leverage) : undefined;
    const openSecondsBefore = body.openSecondsBefore ? parseInt(body.openSecondsBefore) : undefined;
    const closeSecondsAfter = body.closeSecondsAfter ? parseInt(body.closeSecondsAfter) : undefined;
    const minFundingRate = body.minFundingRate ? parseFloat(body.minFundingRate) : undefined;
    const isReverse = body.isReverse !== undefined ? Boolean(body.isReverse) : undefined;
    const rrRatio = body.rrRatio || undefined;
    const baseSlPercent = body.baseSlPercent ? parseFloat(body.baseSlPercent) : undefined;

    const state = await startFundingBot({
      notionalUsd,
      leverage,
      openSecondsBefore,
      closeSecondsAfter,
      minFundingRate,
      isReverse,
      rrRatio,
      baseSlPercent
    });

    return NextResponse.json({
      success: true,
      message: 'Funding Farming Bot berhasil diaktifkan!',
      data: state,
    });
  } catch (error: any) {
    console.error("POST /api/crypto/funding-farming/bot/start error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memulai Funding Farming Bot',
    }, { status: 500 });
  }
}
