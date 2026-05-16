import { NextResponse } from 'next/server';
import { getScreenerResultsFromDB, runScreenerCore } from '@/lib/emaEngine';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 300;

export async function GET() {
  try {
    const scanResults = await runScreenerCore(50);
    const data = await getScreenerResultsFromDB();
    
    // Filter only STRONG_BULLISH and STRONG_BEARISH for the telegram report
    const strongSignals = data.filter((d: any) => d.status === 'STRONG_BULLISH' || d.status === 'STRONG_BEARISH');
    
    let msg = `📈 *HOURLY EMA SCREENER UPDATE* 📉\n\n`;
    
    if (strongSignals.length > 0) {
      msg += `🚨 *${strongSignals.length} STRONG TREND(S) DETECTED!* 🚨\n\n`;
      strongSignals.forEach((sig: any) => {
        const icon = sig.status === 'STRONG_BULLISH' ? '🔥🟢' : '🔥🔴';
        msg += `${icon} *${sig.symbol}* - ${sig.status}\n`;
        msg += `   H4: ${sig.statuses.h4} | Daily: ${sig.statuses.daily}\n`;
        msg += `   [View Chart](https://www.tradingview.com/chart/?symbol=BINANCE:${sig.symbol})\n\n`;
      });
    } else {
      msg += `ℹ️ No strong EMA trends (H4 & Daily confluence) detected this hour.\n\n`;
    }
    
    msg += `Total Coins Scanned: ${scanResults.length}`;
    await sendTelegramNotification(msg);

    return NextResponse.json({ 
      success: true, 
      message: 'Scan completed successfully', 
      count: scanResults.length 
    });
  } catch (error: any) {
    console.error('API /screener/scan GET Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
