import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { detectSMC } from '@/lib/smc';

export const maxDuration = 300; 

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_smc_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      structure VARCHAR(20),
      bias VARCHAR(20),
      ob_price DECIMAL(20, 8),
      timeframe VARCHAR(10),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE (symbol, timeframe, ob_price)
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1w';
    
    await ensureTable();
    const symbols = await fetchBinancePairs();
    const activeSymbols = symbols.slice(0, 50); 
    
    let detectedCount = 0;
    for (const symbol of activeSymbols) {
      const candles = await fetchKlines(symbol, interval, 200);
      const signal = detectSMC(symbol, candles, interval);
      
      if (signal) {
        try {
          const res: any = await executeQuery(
            `INSERT INTO crypto_smc_signals (symbol, structure, bias, ob_price, timeframe) 
             VALUES (?, ?, ?, ?, ?)`,
            [symbol, signal.structure, signal.bias, signal.ob_price, interval]
          );
          
          if (res.affectedRows > 0) {
            detectedCount++;
            const icon = signal.bias === 'BULLISH' ? '🟢' : '🔴';
            const msg = `⚡ *SMC SIGNAL (${interval})*
Symbol: ${symbol}
Type: ${signal.structure}
Bias: ${icon} ${signal.bias}
OB Level: ${signal.ob_price}
            `;
            await sendTelegramNotification(msg);
          }
        } catch (dbErr) {}
      }
    }

    // Reset data if no signals detected
    if (detectedCount === 0) {
      await executeQuery(`DELETE FROM crypto_smc_signals WHERE timeframe = ?`, [interval]);
    }

    return NextResponse.json({ success: true, message: `SMC Scan [${interval}] complete. Detected ${detectedCount} signals.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
