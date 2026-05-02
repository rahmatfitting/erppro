import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { detectTrendlineBreak, aggregateMTF, type TrendlineBreakSignal } from '@/lib/trendline';

export const maxDuration = 300;

const SCAN_TIMEFRAMES = ['15m', '1h', '4h', '1d'];
const CANDLE_LIMITS: Record<string, number> = {
  '15m': 200,
  '1h': 200,
  '4h': 200,
  '1d': 200,
};

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_trendline_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      direction VARCHAR(10) NOT NULL,
      timeframes VARCHAR(50),
      total_score DECIMAL(5, 1),
      confidence VARCHAR(20),
      volume_level VARCHAR(10),
      best_timeframe VARCHAR(10),
      break_price DECIMAL(20, 8),
      break_percent DECIMAL(8, 2),
      has_bos TINYINT(1) DEFAULT 0,
      has_sweep TINYINT(1) DEFAULT 0,
      has_fvg TINYINT(1) DEFAULT 0,
      entry_price DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      take_profit DECIMAL(20, 8),
      details JSON,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol)
    )
  `);

  // Migration: Add new columns if they don't exist
  try {
    await executeQuery(`ALTER TABLE crypto_trendline_signals ADD COLUMN IF NOT EXISTS entry_price DECIMAL(20, 8) AFTER has_fvg`);
    await executeQuery(`ALTER TABLE crypto_trendline_signals ADD COLUMN IF NOT EXISTS stop_loss DECIMAL(20, 8) AFTER entry_price`);
    await executeQuery(`ALTER TABLE crypto_trendline_signals ADD COLUMN IF NOT EXISTS take_profit DECIMAL(20, 8) AFTER stop_loss`);
  } catch (err) {
    // Columns might already exist or DB doesn't support ADD COLUMN IF NOT EXISTS
  }
}

export async function GET(request: Request) {
  try {
    await ensureTable();
    const symbols = await fetchBinancePairs();
    const activeSymbols = symbols.slice(0, 50);

    let detectedCount = 0;

    for (const symbol of activeSymbols) {
      try {
        // Fetch candles for all timeframes
        const tfSignals: TrendlineBreakSignal[] = [];

        for (const tf of SCAN_TIMEFRAMES) {
          try {
            const candles = await fetchKlines(symbol, tf, CANDLE_LIMITS[tf]);
            if (candles.length < 50) continue;

            const signal = detectTrendlineBreak(symbol, candles, tf);
            if (signal && signal.score >= 3) {
              tfSignals.push(signal);
            }
          } catch (tfErr) {
            // Skip this timeframe
          }
        }

        if (tfSignals.length === 0) continue;

        // Aggregate multi-timeframe
        const mtfSignal = aggregateMTF(tfSignals);
        if (!mtfSignal || mtfSignal.totalScore < 3) continue;

        // Upsert into DB
        try {
          const res: any = await executeQuery(
            `INSERT INTO crypto_trendline_signals 
              (symbol, direction, timeframes, total_score, confidence, volume_level, 
               best_timeframe, break_price, break_percent, has_bos, has_sweep, has_fvg, 
               entry_price, stop_loss, take_profit, details) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              direction = VALUES(direction),
              timeframes = VALUES(timeframes),
              total_score = VALUES(total_score),
              confidence = VALUES(confidence),
              volume_level = VALUES(volume_level),
              best_timeframe = VALUES(best_timeframe),
              break_price = VALUES(break_price),
              break_percent = VALUES(break_percent),
              has_bos = VALUES(has_bos),
              has_sweep = VALUES(has_sweep),
              has_fvg = VALUES(has_fvg),
              entry_price = VALUES(entry_price),
              stop_loss = VALUES(stop_loss),
              take_profit = VALUES(take_profit),
              details = VALUES(details),
              created_at = NOW()
            `,
            [
              mtfSignal.symbol,
              mtfSignal.direction,
              mtfSignal.timeframes.join(','),
              mtfSignal.totalScore,
              mtfSignal.confidence,
              mtfSignal.volumeLevel,
              mtfSignal.bestTimeframe,
              mtfSignal.breakPrice,
              mtfSignal.breakPercent,
              mtfSignal.hasBOS ? 1 : 0,
              mtfSignal.hasLiquiditySweep ? 1 : 0,
              mtfSignal.hasFVG ? 1 : 0,
              mtfSignal.entryPrice,
              mtfSignal.stopLoss,
              mtfSignal.takeProfit,
              JSON.stringify(mtfSignal.details),
            ]
          );

          if (res.affectedRows > 0) {
            detectedCount++;

            // Telegram notification for strong signals
            if (mtfSignal.totalScore >= 6) {
              const icon = mtfSignal.direction === 'BULLISH' ? '🟢' : '🔴';
              const smcTags = [
                mtfSignal.hasBOS ? '✅BOS' : '',
                mtfSignal.hasLiquiditySweep ? '✅SWEEP' : '',
                mtfSignal.hasFVG ? '✅FVG' : '',
              ].filter(Boolean).join(' ');

              const msg = `📐 *TRENDLINE BREAK MTF*
Symbol: ${mtfSignal.symbol}
Direction: ${icon} ${mtfSignal.direction}
Score: ${mtfSignal.totalScore}/15
Confidence: ${mtfSignal.confidence}
Timeframes: ${mtfSignal.timeframes.join(', ')}
Break Price: ${mtfSignal.breakPrice.toLocaleString()}
Volume: ${mtfSignal.volumeLevel}
${smcTags ? `SMC: ${smcTags}` : ''}

🎯 *Actionable Insight:*
Entry: ${mtfSignal.entryPrice.toLocaleString()}
SL: ${mtfSignal.stopLoss.toLocaleString()}
TP: ${mtfSignal.takeProfit.toLocaleString()}
              `;
              await sendTelegramNotification(msg);
            }
          }
        } catch (dbErr) {
          // Likely duplicate — skip
        }
      } catch (symbolErr) {
        // Skip this symbol
      }
    }

    // Reset data if no signals detected
    if (detectedCount === 0) {
      await executeQuery(`DELETE FROM crypto_trendline_signals`);
    }

    return NextResponse.json({
      success: true,
      message: `Trendline MTF Scan complete. Detected ${detectedCount} breakout signals from ${activeSymbols.length} pairs.`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
