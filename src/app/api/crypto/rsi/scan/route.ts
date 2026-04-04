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
      return NextResponse.json({ success: false, error: 'Binance API tidak merespons. Coba lagi nanti.' }, { status: 503 });
    }
    const activeSymbols = symbols.slice(0, 50); 

    let detectedCount = 0;
    for (const symbol of activeSymbols) {
      // Need ~100 candles for accurate Wilder's RSI 14
      const candles = await fetchKlines(symbol, interval, 100);
      const rsi = calculateRSI(candles, 14);
      
      let status = '';
      if (rsi > 70) status = 'OVERBOUGHT';
      else if (rsi < 30) status = 'OVERSOLD';
      
      if (status) {
        try {
          await executeQuery(
            `INSERT INTO crypto_rsi_signals (symbol, rsi_value, status, timeframe) 
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
              rsi_value = VALUES(rsi_value),
              status = VALUES(status),
              created_at = CURRENT_TIMESTAMP`,
            [symbol, rsi, status, interval]
          );
          detectedCount++;
          
          if (interval === '1h' || interval === '4h') {
             const icon = status === 'OVERBOUGHT' ? '🔴' : '🟢';
             const msg = `${icon} *RSI EXTREME (${interval})*
Symbol: ${symbol}
RSI: ${rsi.toFixed(2)}
Status: ${status}
             `;
             await sendTelegramNotification(msg);
          }
        } catch (dbErr) {}
      } else {
        // Remove from table if no longer extreme
        await executeQuery(`DELETE FROM crypto_rsi_signals WHERE symbol = ? AND timeframe = ?`, [symbol, interval]);
      }
    }

    return NextResponse.json({ success: true, message: `RSI Heatmap Scan [${interval}] complete. detected ${detectedCount} extremes.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
