import { NextResponse } from 'next/server';
import { scanXAGUSD } from '@/lib/xagusd';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 60;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS xagusd_screener_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      pair VARCHAR(10) DEFAULT 'XAGUSD',
      setup VARCHAR(100),
      session VARCHAR(50),
      score INT,
      bias VARCHAR(10),
      confidence VARCHAR(10),
      entry_price DECIMAL(18, 4),
      stop_loss DECIMAL(18, 4),
      take_profit1 DECIMAL(18, 4),
      take_profit2 DECIMAL(18, 4),
      atr DECIMAL(18, 4),
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();

    const signal = await scanXAGUSD();

    // Save to DB
    await executeQuery(
      `INSERT INTO xagusd_screener_signals 
       (setup, session, score, bias, confidence, entry_price, stop_loss, take_profit1, take_profit2, atr, reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        signal.setup ?? null, 
        signal.session ?? null, 
        signal.score ?? 0, 
        signal.bias ?? 'WAIT', 
        signal.confidence ?? 'LOW', 
        signal.entry ?? null, 
        signal.sl ?? null, 
        signal.tp1 ?? null, 
        signal.tp2 ?? null, 
        signal.atr ?? null, 
        signal.reasoning?.join(' | ') ?? ''
      ]
    );

    // Telegram Notification for High Confidence
    if (signal.confidence === 'HIGH' && signal.bias !== 'WAIT') {
      const icon = signal.bias === 'BUY' ? '🟢' : '🔴';
      const msg = `${icon} *XAGUSD AI SIGNAL*\n\n` +
                  `Bias: ${signal.bias}\n` +
                  `Setup: ${signal.setup}\n` +
                  `Score: ${signal.score}/13\n` +
                  `Confidence: ${signal.confidence}\n\n` +
                  `Entry: ${signal.entry?.toFixed(3)}\n` +
                  `SL: ${signal.sl?.toFixed(3)}\n` +
                  `TP1: ${signal.tp1?.toFixed(3)}\n` +
                  `TP2: ${signal.tp2?.toFixed(3)}\n\n` +
                  `Reasoning: ${signal.reasoning.join(', ')}`;
      
      await sendTelegramNotification(msg);
    }

    return NextResponse.json({
      success: true,
      message: 'XAGUSD Scan complete',
      data: signal
    });
  } catch (error: any) {
    console.error('XAGUSD Scan Route Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
