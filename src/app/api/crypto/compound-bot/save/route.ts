import { NextRequest, NextResponse } from 'next/server';
import { saveCoinConfig } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, notionalUsd, leverage, compoundPercent, stopLossPercent } = body;

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

    const result = await saveCoinConfig({
      symbol: symbol.toUpperCase().trim(),
      notionalUsd: notional,
      leverage: lev,
      compoundPercent: compPct,
      stopLossPercent: slPct
    });

    return NextResponse.json({
      success: true,
      message: `Konfigurasi koin ${symbol} berhasil disimpan ke daftar.`,
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
