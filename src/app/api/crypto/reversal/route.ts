import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '15m';

    await ensureTable();

    const signals: any = await executeQuery(
      `SELECT * FROM crypto_reversal_signals 
       WHERE timeframe = ?
       ORDER BY created_at DESC`,
      [timeframe]
    );
    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
