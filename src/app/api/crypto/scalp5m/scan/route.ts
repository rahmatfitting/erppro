import { NextResponse } from 'next/server';
import { scanCrypto5M } from '@/lib/crypto5m';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 60;

const VALID_PAIRS     = ['BTCUSDT', 'BNBUSDT', 'XRPUSDT', 'TRXUSDT', 'SOLUSDT', 'ETHUSDT'];
const VALID_INTERVALS = ['1w', '1d', '4h', '1h', '5m'];

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_5m_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      pair VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) DEFAULT '5M',
      setup VARCHAR(200),
      session VARCHAR(50),
      score INT,
      bias VARCHAR(10),
      confidence VARCHAR(10),
      entry_price DECIMAL(20,6),
      stop_loss DECIMAL(20,6),
      take_profit1 DECIMAL(20,6),
      take_profit2 DECIMAL(20,6),
      pivot_p DECIMAL(20,6),
      pivot_s1 DECIMAL(20,6),
      pivot_r1 DECIMAL(20,6),
      atr DECIMAL(20,8),
      structure VARCHAR(30),
      zone VARCHAR(30),
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_pair_tf_time (pair, timeframe, created_at)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const pair     = (searchParams.get('pair')     ?? 'BTCUSDT').toUpperCase();
    const interval = (searchParams.get('interval') ?? '5m').toLowerCase();

    if (!VALID_PAIRS.includes(pair)) {
      return NextResponse.json({ success: false, error: 'Invalid pair' }, { status: 400 });
    }
    if (!VALID_INTERVALS.includes(interval)) {
      return NextResponse.json({ success: false, error: 'Invalid interval' }, { status: 400 });
    }

    await ensureTable();
    const signal = await scanCrypto5M(pair, interval);

    await executeQuery(
      `INSERT INTO crypto_5m_signals
       (pair, timeframe, setup, session, score, bias, confidence, entry_price, stop_loss,
        take_profit1, take_profit2, pivot_p, pivot_s1, pivot_r1, atr, structure, zone, reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        pair,
        signal.timeframe ?? '5M',
        signal.setup     ?? null,
        signal.session   ?? null,
        signal.score     ?? 0,
        signal.bias      ?? 'WAIT',
        signal.confidence ?? 'LOW',
        signal.entry     ?? null,
        signal.sl        ?? null,
        signal.tp1       ?? null,
        signal.tp2       ?? null,
        signal.pivotP    ?? null,
        signal.pivotS1   ?? null,
        signal.pivotR1   ?? null,
        signal.atr       ?? null,
        signal.structure ?? 'NONE',
        signal.zone      ?? 'NEUTRAL',
        signal.reasoning?.join(' | ') ?? '',
      ]
    );

    if (signal.confidence === 'HIGH' && signal.bias !== 'WAIT') {
      const icon = signal.bias === 'BUY' ? '🟢🔥' : '🔴🔥';
      const msg =
        `${icon} *${pair} [${signal.timeframe}] SMC SIGNAL*\n\n` +
        `Bias: *${signal.bias}*\n` +
        `Setup: ${signal.setup}\n` +
        `Session: ${signal.session}\n` +
        `Score: ${signal.score}/15 — *${signal.confidence}*\n\n` +
        `Entry: \`${signal.entry?.toFixed(4)}\`\n` +
        `SL: \`${signal.sl?.toFixed(4)}\`\n` +
        `TP1: \`${signal.tp1?.toFixed(4)}\`\n` +
        `TP2: \`${signal.tp2?.toFixed(4)}\`\n\n` +
        `Structure: ${signal.structure} | Zone: ${signal.zone}\n` +
        `📋 ${signal.reasoning?.slice(0, 3).join(' | ')}`;
      await sendTelegramNotification(msg);
    }

    return NextResponse.json({ success: true, message: `${pair} [${signal.timeframe}] scan complete`, data: signal });
  } catch (error: any) {
    console.error('Crypto SMC Scan Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
