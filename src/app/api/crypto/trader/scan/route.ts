import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchTopFuturesPairs } from '@/lib/futures';
import {
  fetchLongShortRatio,
  fetchTopTraderRatio,
  fetchOITrend,
  calcTraderScore,
} from '@/lib/trader';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 300;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_trader_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL UNIQUE,
      score INT,
      signal_type VARCHAR(20),
      long_ratio DECIMAL(5,4),
      top_trader_ratio DECIMAL(5,4),
      oi_change DECIMAL(10,2),
      price_change DECIMAL(10,2),
      contrarian_bias VARCHAR(40),
      whale_bias VARCHAR(20),
      oi_trend VARCHAR(10),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    // Clear previous scan
    await executeQuery(`DELETE FROM crypto_trader_signals`);

    const pairs = await fetchTopFuturesPairs(30); // top 30 by volume for speed
    let saved = 0;

    for (const pair of pairs) {
      const [longRatio, topTraderRatio, oiData] = await Promise.all([
        fetchLongShortRatio(pair.symbol),
        fetchTopTraderRatio(pair.symbol),
        fetchOITrend(pair.symbol),
      ]);

      if (longRatio === null || topTraderRatio === null) continue;

      const sig = calcTraderScore(
        pair.symbol,
        longRatio,
        topTraderRatio,
        oiData.trend,
        pair.priceChangePercent,
        oiData.oiChange
      );

      if (sig.signal === 'NEUTRAL') continue; // Only store non-neutral

      try {
        await executeQuery(
          `INSERT INTO crypto_trader_signals
            (symbol, score, signal_type, long_ratio, top_trader_ratio, oi_change, price_change, contrarian_bias, whale_bias, oi_trend, reason)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sig.symbol, sig.score, sig.signal,
            sig.longRatio, sig.topTraderRatio,
            sig.oiChange, sig.priceChange,
            sig.contrarianBias, sig.whaleBias, sig.oiTrend,
            sig.reason.join(' | '),
          ]
        );
        saved++;

        if (sig.signal === 'STRONG LONG' || sig.signal === 'STRONG SHORT') {
          const icon = sig.signal === 'STRONG LONG' ? '🔥🟢' : '🔥🔴';
          await sendTelegramNotification(
            `${icon} *TOP TRADER SIGNAL*\nSymbol: ${sig.symbol}\nScore: ${sig.score}/100\nSignal: ${sig.signal}\n${sig.reason.join('\n')}`
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: `Top Trader Scan selesai. ${saved} sinyal ditemukan.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
