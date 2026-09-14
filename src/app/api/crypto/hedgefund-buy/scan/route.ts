import { NextRequest, NextResponse } from 'next/server';
import { runHedgeFundBuyScan, HedgeFundSignal } from '@/lib/hedgefundBuy';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

function getWibDateTime(): { dateStr: string; hour: number; minute: number } {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (3600000 * 7));
  
  const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  const dayName = days[wib.getDay()];
  const dateNum = wib.getDate();
  const monthName = months[wib.getMonth()];
  const year = wib.getFullYear();
  const hh = String(wib.getHours()).padStart(2, '0');
  const mm = String(wib.getMinutes()).padStart(2, '0');

  return {
    dateStr: `${dayName}, ${dateNum} ${monthName} ${year} pukul ${hh}:${mm} WIB`,
    hour: wib.getHours(),
    minute: wib.getMinutes()
  };
}

function resolveSessionLabel(customSession?: string | null): string {
  if (customSession && customSession.trim().length > 0) {
    return customSession.trim();
  }
  const { hour } = getWibDateTime();
  if (hour >= 6 && hour <= 9) return '07:00 WIB (Sesi Pagi)';
  if (hour >= 12 && hour <= 15) return '13:00 WIB (Sesi Siang)';
  if (hour >= 19 && hour <= 22) return '20:00 WIB (Sesi Malam)';
  return `${String(hour).padStart(2, '0')}:00 WIB`;
}

function formatTelegramReport(signals: HedgeFundSignal[], sessionLabel: string): string {
  const { dateStr } = getWibDateTime();
  const strongBuys = signals.filter(s => s.score >= 75);
  const topList = signals.slice(0, 5);

  let msg = `🏛️ *BINANCE FUTURES - HEDGE FUND BUY RADAR* 🏛️\n`;
  msg += `⏰ *Jadwal:* ${sessionLabel}\n`;
  msg += `📅 *Waktu:* ${dateStr}\n\n`;

  msg += `📊 *Ringkasan Analisis Kuantitatif:*\n`;
  msg += `• Total Koin Derivatif Dipindai: *${signals.length} Koin*\n`;
  if (strongBuys.length > 0) {
    msg += `• Sinyal High Conviction (Skor ≥ 75): *${strongBuys.length} Koin* 🔥\n\n`;
  } else {
    msg += `• Sinyal High Conviction (Skor ≥ 75): *0 Koin* (Kondisi Pasar Konsolidasi)\n\n`;
  }

  msg += `🏆 *TOP 5 REKOMENDASI BUY SMART MONEY:*\n\n`;

  topList.forEach((s, idx) => {
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : '🔹';
    const convictionBadge = s.score >= 80 ? '🔥 HIGH CONVICTION' : s.score >= 65 ? '⚡ MODERATE BUY' : '👀 WATCHLIST';
    const cleanSetup = (s.setupTitle || s.setup || 'Whale Accumulation').replace(/_/g, ' ');
    const changeSign = s.priceChange24h >= 0 ? '+' : '';

    msg += `${medal} *${s.symbol}* (Skor: ${s.score}/100 - ${convictionBadge})\n`;
    msg += `   • 🏷️ Setup: ${cleanSetup}\n`;
    msg += `   • 💵 Harga: $${s.price.toFixed(s.price < 1 ? 4 : 2)} (${changeSign}${s.priceChange24h.toFixed(2)}%)\n`;
    msg += `   • 🐋 Whale Pos: ${s.topTraderPositionRatio.toFixed(2)}x (${s.topTraderPositionLongPercent.toFixed(0)}% Long)\n`;
    msg += `   • 👥 Retail L/S: ${s.globalRetailRatio.toFixed(2)}x | Taker Buy: ${s.takerBuySellRatio.toFixed(2)}x\n`;
    msg += `   • 📈 Funding: ${(s.fundingRatePercent || (s.fundingRate * 100)).toFixed(4)}% | OI: ${s.oiChangePercent >= 0 ? '+' : ''}${s.oiChangePercent.toFixed(2)}%\n`;
    msg += `   • 🎯 Entry Zone: $${s.entryMin.toFixed(s.entryMin < 1 ? 4 : 2)} - $${s.entryMax.toFixed(s.entryMax < 1 ? 4 : 2)}\n`;
    msg += `   • 🛑 Stop Loss: $${s.stopLoss.toFixed(s.stopLoss < 1 ? 4 : 2)} (-2.2%)\n`;
    msg += `   • 🚀 TP1: $${s.tp1.toFixed(s.tp1 < 1 ? 4 : 2)} (+4.5% 1:2 R:R)\n`;
    msg += `   • 💎 TP2: $${s.tp2.toFixed(s.tp2 < 1 ? 4 : 2)} (+8.0% 1:3.5 R:R)\n\n`;
  });

  msg += `💡 _Buka posisi 1-Click dengan Stop Loss & Take Profit otomatis di menu Hedge Fund Buy ERP Pro._`;

  return msg;
}

async function handleScanAndNotify(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const forceTelegram = searchParams.get('forceTelegram') === 'true' || searchParams.get('telegram') === 'true';
    const customSession = searchParams.get('session');
    const sessionLabel = resolveSessionLabel(customSession);

    const signals = await runHedgeFundBuyScan(limit);

    if (!signals || signals.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'Gagal mengambil data dari Binance Futures. Silakan coba sesaat lagi.'
      }, { status: 502 });
    }

    const strongBuys = signals.filter(s => s.score >= 75);
    let telegramSent = false;
    let telegramError: string | null = null;

    // Send Telegram when forced (e.g. from scheduled cron or UI button) or when strong buys exist
    const shouldSendTelegram = forceTelegram || strongBuys.length > 0;

    if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID && shouldSendTelegram) {
      try {
        const msg = formatTelegramReport(signals, sessionLabel);
        await sendTelegramNotification(msg);
        telegramSent = true;
      } catch (tgErr: any) {
        console.warn("Telegram notification error:", tgErr);
        telegramError = tgErr?.message || 'Gagal mengirim Telegram';
      }
    }

    return NextResponse.json({
      success: true,
      message: `Deep Scan berhasil. ${signals.length} koin diproses, ${strongBuys.length} koin memiliki sinyal BUY kuat.${telegramSent ? ' Notifikasi Telegram terkirim.' : ''}`,
      data: signals,
      total: signals.length,
      strongBuysCount: strongBuys.length,
      session: sessionLabel,
      telegramSent,
      telegramError,
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

export async function GET(req: NextRequest) {
  return handleScanAndNotify(req);
}

export async function POST(req: NextRequest) {
  return handleScanAndNotify(req);
}

