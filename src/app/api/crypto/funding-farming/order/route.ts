import { NextRequest, NextResponse } from 'next/server';
import { executeFundingOrderWithRR } from '@/lib/binanceOrder';
import { addFundingBotLog } from '@/lib/fundingBot';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      symbol, 
      side, 
      notionalUsd, 
      leverage, 
      rrRatio = 'NONE', 
      baseSlPercent = 1.5, 
      isReverse = false 
    } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Simbol koin wajib diisi' }, { status: 400 });
    }

    const lev = parseInt(leverage) || 5;
    const notional = parseFloat(notionalUsd) || 20;

    if (notional <= 0) {
      return NextResponse.json({ success: false, error: 'Ukuran notional harus lebih dari 0' }, { status: 400 });
    }

    const effectiveSide = side === 'BUY' ? 'BUY' : 'SELL';

    const result = await executeFundingOrderWithRR({
      symbol: symbol.toUpperCase(),
      side: effectiveSide,
      notionalUsd: notional,
      leverage: lev,
      rrRatio,
      baseSlPercent: parseFloat(baseSlPercent) || 1.5,
      isReverse: Boolean(isReverse)
    });

    const sideText = effectiveSide === 'BUY' ? 'LONG (BUY)' : 'SHORT (SELL)';
    const rrText = rrRatio !== 'NONE' ? ` dengan target ${rrRatio}` : ' (Tanpa RR SL/TP)';
    const reverseTag = isReverse ? ' [MODE REVERSE]' : '';

    await addFundingBotLog(
      'MANUAL_ORDER',
      `⚡ Eksekusi Order${reverseTag}: ${symbol.toUpperCase()} ${sideText} @ $${result.fillPrice} | Notional: $${notional} USD (${lev}x)${rrText} | SL: ${result.stopLossPrice || '-'} | TP: ${result.takeProfitPrice || '-'}`,
      'SUCCESS'
    );

    return NextResponse.json({
      success: true,
      message: `Order ${reverseTag} ${symbol.toUpperCase()} ${sideText} berhasil dieksekusi di Binance!`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/funding-farming/order error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengeksekusi order ke Binance'
    }, { status: 500 });
  }
}
