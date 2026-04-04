import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { runAMDAnalysis } from '@/lib/ict';

export const maxDuration = 300;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_ict_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10),
      phase VARCHAR(10),
      bias VARCHAR(10),
      score INT,
      confidence VARCHAR(10),
      killzone_active TINYINT(1),
      killzone_session VARCHAR(20),
      accumulation TINYINT(1),
      equal_highs TINYINT(1),
      equal_lows TINYINT(1),
      manipulation VARCHAR(20),
      bos TINYINT(1),
      distribution TINYINT(1),
      volume_spike TINYINT(1),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol, timeframe)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1h';

    await ensureTable();
    const symbols = await fetchBinancePairs();
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'Binance API tidak merespons. Coba lagi nanti.' }, { status: 503 });
    }
    const active  = symbols.slice(0, 50);

    let saved = 0;
    for (const symbol of active) {
      const candles = await fetchKlines(symbol, interval, 150);
      const signal  = runAMDAnalysis(symbol, candles, interval);

      if (!signal) continue;

      try {
        await executeQuery(`
          INSERT INTO crypto_ict_signals
            (symbol, timeframe, phase, bias, score, confidence,
             killzone_active, killzone_session,
             accumulation, equal_highs, equal_lows,
             manipulation, bos, distribution, volume_spike)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            phase = VALUES(phase), bias = VALUES(bias), score = VALUES(score),
            confidence = VALUES(confidence), killzone_active = VALUES(killzone_active),
            killzone_session = VALUES(killzone_session),
            accumulation = VALUES(accumulation), equal_highs = VALUES(equal_highs),
            equal_lows = VALUES(equal_lows), manipulation = VALUES(manipulation),
            bos = VALUES(bos), distribution = VALUES(distribution),
            volume_spike = VALUES(volume_spike), created_at = CURRENT_TIMESTAMP
        `, [
          symbol, interval, signal.phase, signal.bias, signal.score, signal.confidence,
          signal.killzone.active ? 1 : 0, signal.killzone.session,
          signal.accumulation.detected ? 1 : 0,
          signal.accumulation.equalHighs ? 1 : 0,
          signal.accumulation.equalLows ? 1 : 0,
          signal.manipulation.type,
          signal.distribution.bos ? 1 : 0,
          signal.distribution.detected ? 1 : 0,
          signal.volumeSpike ? 1 : 0,
        ]);
        saved++;

        if (signal.confidence === 'SNIPER') {
          const icon = signal.bias === 'BULLISH' ? '💣🟢' : '💣🔴';
          await sendTelegramNotification(
            `${icon} *ICT SNIPER ENTRY (${interval})*\nSymbol: ${signal.symbol}\nPhase: ${signal.phase}\nBias: ${signal.bias}\nScore: ${signal.score}/12\nKill Zone: ${signal.killzone.session}`
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: `ICT Scan [${interval}] selesai. ${saved} sinyal ditemukan.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
