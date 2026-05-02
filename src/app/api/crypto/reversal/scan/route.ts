import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { detectLiquiditySweepBullish, detectLiquiditySweepBearish } from '@/lib/sweep';
import { detectSMC } from '@/lib/smc';

export const maxDuration = 300;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_reversal_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) NOT NULL,
      bias VARCHAR(10) NOT NULL,
      rsi_context VARCHAR(20),
      reason TEXT,
      entry_price DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      take_profit DECIMAL(20, 8),
      strength VARCHAR(15),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol, timeframe, bias)
    )
  `);
}

export async function POST(request: Request) {
  try {
    const { symbols, timeframe = '15m', rsiContextMap = {} } = await request.json();
    if (!symbols || !Array.isArray(symbols)) {
      return NextResponse.json({ success: false, error: 'Symbols array is required' }, { status: 400 });
    }

    await ensureTable();
    let detectedCount = 0;

    for (const symbol of symbols) {
      const candles = await fetchKlines(symbol, timeframe, 100);
      if (!candles || candles.length < 50) continue;

      const rsiType = rsiContextMap[symbol] || 'NONE'; // E.g. 'OVERBOUGHT' or 'OVERSOLD'
      
      let signal: any = null;
      let bias: 'BULLISH' | 'BEARISH' = 'BULLISH';

      // 1. Detect Potential Reversal based on RSI Context
      if (rsiType === 'OVERSOLD' || rsiType === 'NONE') {
        const sweep = detectLiquiditySweepBullish(symbol, candles, timeframe);
        const smc = detectSMC(symbol, candles, timeframe);
        
        if (sweep || (smc && smc.bias === 'BULLISH')) {
          signal = sweep || smc;
          bias = 'BULLISH';
        }
      }

      if (!signal && (rsiType === 'OVERBOUGHT' || rsiType === 'NONE')) {
        const sweep = detectLiquiditySweepBearish(symbol, candles, timeframe);
        const smc = detectSMC(symbol, candles, timeframe);
        
        if (sweep || (smc && smc.bias === 'BEARISH')) {
          signal = sweep || smc;
          bias = 'BEARISH';
        }
      }

      if (signal) {
        const currentPrice = candles[candles.length - 1].close;
        let sl = 0;
        let tp = 0;

        if (bias === 'BULLISH') {
          sl = signal.sweepLow || signal.ob_price || (currentPrice * 0.98);
          tp = currentPrice + (currentPrice - sl) * 2; // 2R Reward
        } else {
          sl = signal.sweepHigh || signal.ob_price || (currentPrice * 1.02);
          tp = currentPrice - (sl - currentPrice) * 2;
        }

        const reason = signal.reason ? signal.reason.join(', ') : `${signal.structure} Detected`;

        try {
          await executeQuery(
            `INSERT INTO crypto_reversal_signals 
              (symbol, timeframe, bias, rsi_context, reason, entry_price, stop_loss, take_profit, strength)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              reason = VALUES(reason),
              entry_price = VALUES(entry_price),
              stop_loss = VALUES(stop_loss),
              take_profit = VALUES(take_profit),
              strength = VALUES(strength),
              created_at = CURRENT_TIMESTAMP`,
            [symbol, timeframe, bias, rsiType, reason, currentPrice, sl, tp, 'SNIPER']
          );
          detectedCount++;

          // Notification for SNIPER entries
          const icon = bias === 'BULLISH' ? '🏹 🟢' : '🏹 🔴';
          await sendTelegramNotification(
            `${icon} *REVERSAL SNIPER (${timeframe})*\nSymbol: ${symbol}\nBias: ${bias}\nReason: ${reason}\n\nEntry: ${currentPrice}\nSL: ${sl}\nTP: ${tp}`
          );
        } catch (dbErr) {}
      }
    }

    return NextResponse.json({ success: true, message: `Reversal Scan complete. Found ${detectedCount} signals.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
