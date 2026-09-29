import { NextRequest, NextResponse } from 'next/server';
import { saveCoinConfig } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, notionalUsd, leverage, compoundPercent, stopLossPercent, autoStopHours, targetCycles, targetPriceGoal, slReopenEnabled, slReopenMode } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Pair simbol wajib diisi' }, { status: 400 });
    }

    const notional = parseFloat(notionalUsd);
    if (isNaN(notional) || notional <= 0) {
      return NextResponse.json({ success: false, error: 'Ukuran Posisi Notional (USD) harus lebih dari 0' }, { status: 400 });
    }

    const lev = parseInt(leverage);
    if (isNaN(lev) || lev <= 0) {
      return NextResponse.json({ success: false, error: 'Leverage harus lebih dari 0' }, { status: 400 });
    }

    const compPct = parseFloat(compoundPercent);
    if (isNaN(compPct) || compPct <= 0) {
      return NextResponse.json({ success: false, error: 'Persentase compound harus lebih dari 0%' }, { status: 400 });
    }

    const slPct = stopLossPercent && parseFloat(stopLossPercent) > 0 ? parseFloat(stopLossPercent) : null;
    const stopHours = autoStopHours !== undefined && autoStopHours !== null && autoStopHours !== ''
      ? parseFloat(autoStopHours)
      : null;
    const tCycles = targetCycles !== undefined && targetCycles !== null && targetCycles !== ''
      ? parseInt(targetCycles)
      : null;
    const tPriceGoal = targetPriceGoal !== undefined && targetPriceGoal !== null && targetPriceGoal !== ''
      ? parseFloat(targetPriceGoal)
      : null;
    const slReopen = slReopenEnabled !== undefined && slReopenEnabled !== null ? Boolean(slReopenEnabled) : false;
    const slMode: 'h4_reversal' | 'fvg_30m' | 'both' =
      ['h4_reversal', 'fvg_30m', 'both'].includes(slReopenMode) ? slReopenMode : 'h4_reversal';

    const result = await saveCoinConfig({
      symbol: symbol.toUpperCase().trim(),
      notionalUsd: notional,
      leverage: lev,
      compoundPercent: compPct,
      stopLossPercent: slPct,
      autoStopHours: stopHours && stopHours > 0 ? stopHours : null,
      targetCycles: tCycles && tCycles > 0 ? tCycles : null,
      targetPriceGoal: tPriceGoal && tPriceGoal > 0 ? tPriceGoal : null,
      slReopenEnabled: slReopen,
      slReopenMode: slMode
    });

    const timerMsg = stopHours && stopHours > 0 ? ` (Auto-Stop: ${stopHours} Jam)` : '';
    const cycleMsg = tCycles && tCycles > 0 ? ` (Target: ${tCycles} Cycle)` : '';
    const priceMsg = tPriceGoal && tPriceGoal > 0 ? ` (Target Price: $${tPriceGoal})` : '';
    const reopenModeLabel = slMode === 'fvg_30m' ? 'FVG Bullish 30m' : slMode === 'both' ? 'H4 + FVG 30m' : 'Candle H4';
    const reopenMsg = slReopen ? ` (Re-Open [${reopenModeLabel}]: Aktif)` : '';
    return NextResponse.json({
      success: true,
      message: `Konfigurasi koin ${symbol} berhasil disimpan ke daftar${timerMsg}${cycleMsg}${priceMsg}${reopenMsg}.`,
      data: result
    });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/save error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal menyimpan konfigurasi koin'
    }, { status: 500 });
  }
}
