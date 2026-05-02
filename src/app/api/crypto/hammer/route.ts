import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_hammer_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      timeframe VARCHAR(10) NOT NULL,
      trend VARCHAR(15),
      zone VARCHAR(15),
      confidence INT DEFAULT 0,
      pattern VARCHAR(50),
      entry_price DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      take_profit DECIMAL(20, 8),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol, timeframe)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || '15m';

    await ensureTable();

    const signals: any = await executeQuery(
      `SELECT * FROM crypto_hammer_signals 
       WHERE timeframe = ?
       ORDER BY created_at DESC`,
      [timeframe]
    );
    return NextResponse.json({ success: true, data: signals });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
