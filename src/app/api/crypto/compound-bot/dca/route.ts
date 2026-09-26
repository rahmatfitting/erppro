import { NextRequest, NextResponse } from 'next/server';
import { executeInstantDca, setAutoDca, cancelAutoDca } from '@/lib/compoundBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, symbol, notionalUsd, dropPercent } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Simbol koin wajib diisi' }, { status: 400 });
    }

    const cleanSymbol = symbol.toUpperCase().trim();

    if (action === 'INSTANT') {
      const notional = parseFloat(notionalUsd);
      if (isNaN(notional) || notional <= 0) {
        return NextResponse.json({ success: false, error: 'Nominal tambahan notional (USD) harus lebih dari 0' }, { status: 400 });
      }

      const result = await executeInstantDca({
        symbol: cleanSymbol,
        notionalUsd: notional
      });

      return NextResponse.json({
        success: true,
        message: `DCA Instan berhasil! Posisi ${cleanSymbol} bertambah +$${notional.toFixed(2)} USD. Entry rata-rata baru: $${result.newEntryPrice.toFixed(4)}.`,
        data: result
      });
    }

    if (action === 'SET_AUTO') {
      const drop = parseFloat(dropPercent);
      if (isNaN(drop) || drop <= 0) {
        return NextResponse.json({ success: false, error: 'Target persentase penurunan harus lebih dari 0% (contoh: 2.0%)' }, { status: 400 });
      }

      const notional = parseFloat(notionalUsd);
      if (isNaN(notional) || notional <= 0) {
        return NextResponse.json({ success: false, error: 'Nominal tambahan notional (USD) harus lebih dari 0' }, { status: 400 });
      }

      const result = await setAutoDca({
        symbol: cleanSymbol,
        dropPercent: drop,
        notionalUsd: notional
      });

      return NextResponse.json({
        success: true,
        message: `Auto DCA penurunan -${drop}% untuk ${cleanSymbol} berhasil diaktifkan! Level pemicu: $${result.triggerPrice.toFixed(4)}.`,
        data: result
      });
    }

    if (action === 'CANCEL_AUTO') {
      const result = await cancelAutoDca(cleanSymbol);
      return NextResponse.json({
        success: true,
        message: `Auto DCA penurunan untuk ${cleanSymbol} telah dibatalkan.`,
        data: result
      });
    }

    return NextResponse.json({ success: false, error: `Aksi DCA '${action}' tidak valid.` }, { status: 400 });
  } catch (error: any) {
    console.error("API /api/crypto/compound-bot/dca error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal memproses permintaan DCA'
    }, { status: 500 });
  }
}
