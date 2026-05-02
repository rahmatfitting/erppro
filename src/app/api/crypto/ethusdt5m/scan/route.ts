import { NextResponse } from 'next/server';
import { scanETHUSDT5M } from '@/lib/ethusdt5m';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 60;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS ethusdt_5m_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      pair VARCHAR(20) DEFAULT 'ETHUSDT',
      timeframe VARCHAR(10) DEFAULT '5M',
      setup VARCHAR(200),
      session VARCHAR(50),
      score INT,
      bias VARCHAR(10),
      confidence VARCHAR(10),
      entry_price DECIMAL(18,4),
      stop_loss DECIMAL(18,4),
      take_profit1 DECIMAL(18,4),
      take_profit2 DECIMAL(18,4),
      pivot_p DECIMAL(18,4),
      pivot_s1 DECIMAL(18,4),
      pivot_r1 DECIMAL(18,4),
      atr DECIMAL(18,6),
      structure VARCHAR(30),
      zone VARCHAR(30),
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    const signal = await scanETHUSDT5M();

    await executeQuery(
      `INSERT INTO ethusdt_5m_signals
       (setup, session, score, bias, confidence, entry_price, stop_loss, take_profit1, take_profit2,
        pivot_p, pivot_s1, pivot_r1, atr, structure, zone, reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        signal.setup ?? null, signal.session ?? null,
        signal.score ?? 0, signal.bias ?? 'WAIT', signal.confidence ?? 'LOW',
        signal.entry ?? null, signal.sl ?? null, signal.tp1 ?? null, signal.tp2 ?? null,
        signal.pivotP ?? null, signal.pivotS1 ?? null, signal.pivotR1 ?? null,
        signal.atr ?? null, signal.structure ?? 'NONE',
        signal.zone ?? 'NEUTRAL', signal.reasoning?.join(' | ') ?? ''
      ]
    );

    if (signal.confidence === 'HIGH' && signal.bias !== 'WAIT') {
      const icon = signal.bias === 'BUY' ? '🟢🔥' : '🔴🔥';
      const msg =
        `${icon} *ETHUSDT 5M SCALP SIGNAL*\n\n` +
        `Bias: *${signal.bias}*\n` +
        `Setup: ${signal.setup}\n` +
        `Session: ${signal.session}\n` +
        `Score: ${signal.score}/15\n` +
        `Confidence: *${signal.confidence}*\n\n` +
        `Entry: ${signal.entry?.toFixed(2)}\n` +
        `SL: ${signal.sl?.toFixed(2)}\n` +
        `TP1: ${signal.tp1?.toFixed(2)}\n` +
        `TP2: ${signal.tp2?.toFixed(2)}\n\n` +
        `Structure: ${signal.structure} | Zone: ${signal.zone}\n` +
        `📋 ${signal.reasoning?.slice(0, 3).join(' | ')}`;
      await sendTelegramNotification(msg);
    }

    return NextResponse.json({ success: true, message: 'ETHUSDT 5M Scan complete', data: signal });
  } catch (error: any) {
    console.error('ETHUSDT 5M Scan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
