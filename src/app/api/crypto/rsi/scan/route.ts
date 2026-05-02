import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { calculateRSI } from '@/lib/indicators';

export const maxDuration = 300; 

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_rsi_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      rsi_value DECIMAL(10, 2),
      status VARCHAR(20),
      timeframe VARCHAR(10),
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
      return NextResponse.json({ success: false, error: 'Binance API Error' }, { status: 503 });
    }
    const activeSymbols = symbols.slice(0, 150); 

    let count = 0;
    for (const symbol of activeSymbols) {
      const candles = await fetchKlines(symbol, interval, 100);
      const rsi = calculateRSI(candles, 14);
      
      let status = 'NEUTRAL';
      if (rsi >= 70) status = 'OVERBOUGHT';
      else if (rsi <= 30) status = 'OVERSOLD';
      
      try {
        await executeQuery(
          `INSERT INTO crypto_rsi_signals (symbol, rsi_value, status, timeframe) 
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE 
            rsi_value = VALUES(rsi_value),
            status = VALUES(status),
            created_at = CURRENT_TIMESTAMP`,
          [symbol, rsi.toFixed(2), status, interval]
        );
        count++;
        
        if (status !== 'NEUTRAL' && (interval === '1h' || interval === '4h')) {
          const prefix = status === 'OVERBOUGHT' ? 'OB' : 'OS';
          const msg = `[${prefix}] ${symbol}: ${rsi.toFixed(2)} (${interval})`;
          await sendTelegramNotification(msg);
        }
      } catch (dbErr) {
        console.error("DB Error:", dbErr);
      }
    }

    if (count === 0) {
      await executeQuery(`DELETE FROM crypto_rsi_signals WHERE timeframe = ?`, [interval]);
    }

    return NextResponse.json({ 
      success: true, 
      message: `Grid scan for ${interval} complete. Processed ${count} coins.` 
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
