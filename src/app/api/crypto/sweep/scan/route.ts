import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { detectLiquiditySweepBullish } from '@/lib/sweep';

export const maxDuration = 300;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_sweep_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) NOT NULL,
      swing_low DECIMAL(20, 8),
      sweep_low DECIMAL(20, 8),
      close_price DECIMAL(20, 8),
      wick_ratio DECIMAL(10, 2),
      volume_ratio DECIMAL(10, 2),
      near_fvg TINYINT(1),
      near_prev_low TINYINT(1),
      strength VARCHAR(10),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol, timeframe)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '4h';

    await ensureTable();
    const symbols = await fetchBinancePairs();
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'Binance API tidak merespons. Coba lagi nanti.' }, { status: 503 });
    }
    const active = symbols.slice(0, 50);

    let count = 0;
    for (const symbol of active) {
      const candles = await fetchKlines(symbol, interval, 100);
      const signal = detectLiquiditySweepBullish(symbol, candles, interval);

      if (signal) {
        try {
          await executeQuery(
            `INSERT INTO crypto_sweep_signals
              (symbol, timeframe, swing_low, sweep_low, close_price, wick_ratio, volume_ratio, near_fvg, near_prev_low, strength, reason)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
              swing_low = VALUES(swing_low),
              sweep_low = VALUES(sweep_low),
              close_price = VALUES(close_price),
              wick_ratio = VALUES(wick_ratio),
              volume_ratio = VALUES(volume_ratio),
              near_fvg = VALUES(near_fvg),
              near_prev_low = VALUES(near_prev_low),
              strength = VALUES(strength),
              reason = VALUES(reason),
              created_at = CURRENT_TIMESTAMP`,
            [
              symbol, interval,
              signal.swingLow, signal.sweepLow, signal.closePrice,
              (signal.wickSize / signal.bodySize).toFixed(2),
              signal.volumeRatio.toFixed(2),
              signal.nearFVG ? 1 : 0,
              signal.nearPrevLow ? 1 : 0,
              signal.strength,
              signal.reason.join(', '),
            ]
          );
          count++;

          if (signal.strength === 'STRONG') {
            await sendTelegramNotification(
              `🎯 *LIQUIDITY SWEEP (${interval})*\nSymbol: ${symbol}\nStrength: 💪 ${signal.strength}\n${signal.reason.join('\n')}`
            );
          }
        } catch (_) {}
      }
    }

    return NextResponse.json({ success: true, message: `Sweep Scan [${interval}] selesai. Ditemukan ${count} sinyal.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
