import { NextRequest, NextResponse } from 'next/server';
import { runHedgeFundBuyScan } from '@/lib/hedgefundBuy';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const signals = await runHedgeFundBuyScan(limit);

    if (!signals || signals.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Gagal mengambil data dari Binance Futures. Silakan coba sesaat lagi.'
      }, { status: 502 });
    }

    // High conviction buy signals (Score >= 75)
    const strongBuys = signals.filter(s => s.score >= 75);

    // Optional Telegram alert for high conviction institutional buys
    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && strongBuys.length > 0) {
      try {
        let msg = `🏛️ *HEDGE FUND BUY RADAR ALERT* 🏛️\n`;
        msg += `Terdeteksi *${strongBuys.length}* koin dengan akumulasi kuat Smart Money!\n\n`;

        strongBuys.slice(0, 5).forEach((s, idx) => {
          msg += `${idx + 1}. *${s.symbol}* (Skor: ${s.score}/100)\n`;
          msg += `   • Setup: ${s.setupTitle}\n`;
          msg += `   • Whale Pos: ${s.topTraderPositionRatio.toFixed(2)}x (${s.topTraderPositionLongPercent.toFixed(0)}% Long)\n`;
          msg += `   • Retail L/S: ${s.globalRetailRatio.toFixed(2)}x | Taker: ${s.takerBuySellRatio.toFixed(2)}x\n`;
          msg += `   • Entry: $${s.entryMin.toFixed(4)} - $${s.entryMax.toFixed(4)}\n`;
          msg += `   • SL: $${s.stopLoss.toFixed(4)} | TP1: $${s.tp1.toFixed(4)}\n\n`;
        });

        await sendTelegramNotification(msg);
      } catch (tgErr) {
        console.warn("Telegram notification error:", tgErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deep Scan berhasil. ${signals.length} koin diproses, ${strongBuys.length} koin memiliki sinyal BUY kuat.`,
      data: signals,
      total: signals.length,
      strongBuysCount: strongBuys.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error("API /api/crypto/hedgefund-buy/scan error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Scan gagal dieksekusi'
    }, { status: 500 });
  }
}
