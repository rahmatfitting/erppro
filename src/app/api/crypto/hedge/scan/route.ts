import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';
import { runHedgeScan, ensureHedgeTable } from '@/lib/hedgeEngine';

export const maxDuration = 300; 

export async function GET() {
  try {
    await ensureHedgeTable();
    
    // Clear previous daily signals to refresh the Top 10
    await executeQuery(`DELETE FROM crypto_hedge_signals`);
    
    const top10 = await runHedgeScan(50);

    for (const signal of top10) {
      try {
        await executeQuery(
          `INSERT INTO crypto_hedge_signals (symbol, score, setup, distance, volatility, volume_24h, status) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [signal.symbol, signal.score, signal.setup, signal.distance, signal.volatility, signal.volume, signal.status]
        );

        if (signal.score >= 85) {
          const msg = `🏆 *HEDGE FUND TOP SETUP (4h)*
Symbol: ${signal.symbol}
Score: ${signal.score}/100
Setup: ${signal.setup}
Status: 🔥 ${signal.status}
          `;
          await sendTelegramNotification(msg);
        }
      } catch (dbErr) {}
    }

    return NextResponse.json({ success: true, message: `Hedge Fund Analysis complete. Found ${top10.length} Top setups.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
