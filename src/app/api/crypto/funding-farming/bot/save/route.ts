import { NextResponse } from 'next/server';
import { saveFundingBotConfig } from '@/lib/fundingBot';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const notionalUsd = parseFloat(body.notionalUsd) || 100;
    const leverage = parseInt(body.leverage) || 5;
    const openSecondsBefore = parseInt(body.openSecondsBefore) || 30;
    const closeSecondsAfter = parseInt(body.closeSecondsAfter) || 10;
    const minFundingRate = parseFloat(body.minFundingRate) || 0.0001;
    const isReverse = body.isReverse !== undefined ? Boolean(body.isReverse) : false;
    const rrRatio = body.rrRatio || 'NONE';
    const baseSlPercent = parseFloat(body.baseSlPercent) || 1.5;
    const isCompound = body.isCompound !== undefined ? Boolean(body.isCompound) : false;
    const closeOnProfit = body.closeOnProfit !== undefined ? Boolean(body.closeOnProfit) : false;
    const minProfitUsd = body.minProfitUsd !== undefined ? parseFloat(body.minProfitUsd) : 0;
    const maxHoldSeconds = body.maxHoldSeconds !== undefined ? parseInt(body.maxHoldSeconds) : 300;

    const state = await saveFundingBotConfig({
      notionalUsd,
      leverage,
      openSecondsBefore,
      closeSecondsAfter,
      minFundingRate,
      isReverse,
      rrRatio,
      baseSlPercent,
      isCompound,
      closeOnProfit,
      minProfitUsd,
      maxHoldSeconds
    });

    return NextResponse.json({
      success: true,
      message: 'Pengaturan berhasil disimpan!',
      data: state,
    });
  } catch (error: any) {
    console.error("POST /api/crypto/funding-farming/bot/save error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menyimpan pengaturan bot',
    }, { status: 500 });
  }
}
