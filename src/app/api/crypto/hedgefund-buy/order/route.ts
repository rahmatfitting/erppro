import { NextRequest, NextResponse } from 'next/server';
import { executeHedgeFundBuyOrder } from '@/lib/binanceOrder';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, orderType, notionalUsd, marginUsd, leverage, entryPrice, stopLoss, takeProfit } = body;

    if (!symbol) {
      return NextResponse.json({ success: false, error: 'Symbol wajib diisi' }, { status: 400 });
    }

    const lev = parseInt(leverage) || 20;
    const finalNotional = notionalUsd 
      ? parseFloat(notionalUsd) 
      : (marginUsd ? parseFloat(marginUsd) * lev : 0);

    if (!finalNotional || finalNotional <= 0) {
      return NextResponse.json({ success: false, error: 'Ukuran posisi notional harus lebih besar dari 0 (contoh: 20 USD)' }, { status: 400 });
    }

    const cleanSL = stopLoss && parseFloat(stopLoss) > 0 ? parseFloat(stopLoss) : null;
    const cleanTP = takeProfit && parseFloat(takeProfit) > 0 ? parseFloat(takeProfit) : null;

    const result = await executeHedgeFundBuyOrder({
      symbol: symbol.toUpperCase(),
      orderType: orderType === 'LIMIT' ? 'LIMIT' : 'MARKET',
      notionalUsd: finalNotional,
      marginUsd: finalNotional / lev,
      leverage: lev,
      entryPrice: entryPrice ? parseFloat(entryPrice) : undefined,
      stopLoss: cleanSL,
      takeProfit: cleanTP,
    });

    const marginUsed = finalNotional / lev;

    return NextResponse.json({
      success: true,
      message: `Order Beli (LONG) ${symbol} sebesar $${finalNotional.toFixed(2)} USD (Margin $${marginUsed.toFixed(2)} USDT) berhasil dieksekusi di Binance!`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/hedgefund-buy/order error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Gagal mengeksekusi order ke Binance'
    }, { status: 500 });
  }
}
