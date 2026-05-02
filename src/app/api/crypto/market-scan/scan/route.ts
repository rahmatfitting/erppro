import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { 
  fetchTicker24hr, 
  detectMoneyRotation, 
  detectMomentumMultiTF, 
  detectExplosion, 
  calculateEntrySLTP 
} from '@/lib/market-scan';
import { detectBulishFVG, fetchKlines } from '@/lib/binance';
import { runAMDAnalysis } from '@/lib/ict';
import { detectSMC } from '@/lib/smc';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 300; // 5 minutes (Vercel)

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_market_scan_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      score INT DEFAULT 0,
      category VARCHAR(20) DEFAULT 'Noise',
      setup VARCHAR(255),
      rotation VARCHAR(20),
      momentum INT,
      has_sweep BOOLEAN DEFAULT FALSE,
      has_bos BOOLEAN DEFAULT FALSE,
      has_fvg BOOLEAN DEFAULT FALSE,
      is_explosion BOOLEAN DEFAULT FALSE,
      entry DECIMAL(20, 8),
      stop_loss DECIMAL(20, 8),
      tp1 DECIMAL(20, 8),
      tp2 DECIMAL(20, 8),
      tp3 DECIMAL(20, 8),
      timeframe VARCHAR(10) DEFAULT '1h',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const interval = searchParams.get('interval') || '1h';
    
    await ensureTable();
    
    // 1. Fetch market-wide data
    const tickers = await fetchTicker24hr();
    if (tickers.length === 0) {
      console.error("fetchTicker24hr failed to return any data. Check SPOT_HOSTS or rate limits.");
      return NextResponse.json({ success: false, error: "Empty Binance response. Try again in 30 seconds." }, { status: 503 });
    }

    const rotation = detectMoneyRotation(tickers);
    
    // 2. Filter Top 50 by Volume
    const topSymbols = tickers
      .sort((a, b) => b.quoteVolume - a.quoteVolume)
      .slice(0, 50)
      .map(t => t.symbol);

    let detectedCount = 0;
    
    // 3. Clear old data for this timeframe to keep it fresh
    await executeQuery(`DELETE FROM crypto_market_scan_signals WHERE timeframe = ?`, [interval]);

    for (const symbol of topSymbols) {
      try {
        const candles = await fetchKlines(symbol, interval, 100);
        if (candles.length < 50) continue;

        // Detector Engines
        const momentum = await detectMomentumMultiTF(symbol);
        const isExplosion = detectExplosion(candles);
        
        // SMC Filters
        const fvg = detectBulishFVG(symbol, candles);
        const amd = runAMDAnalysis(symbol, candles, interval);
        const smc = detectSMC(symbol, candles, interval);

        const hasSweep = amd?.manipulation?.detected || false;
        const hasBos   = (smc?.structure === 'BOS' || amd?.distribution?.bos) || false;
        const hasFvg   = fvg !== null;

        // 4. Scoring Logic (Hedge Fund Style)
        let score = 0;
        let setupParts: string[] = [];

        if (momentum > 3) { score += 3; setupParts.push('MOMENTUM'); }
        if (isExplosion) { score += 2; setupParts.push('EXPLOSION'); }
        if (rotation === 'ALTSEASON') { score += 2; setupParts.push('ROTATION'); }
        if (hasSweep) { score += 3; setupParts.push('SWEEP'); }
        if (hasBos)   { score += 3; setupParts.push('BOS'); }
        if (hasFvg)   { score += 2; setupParts.push('FVG'); }

        if (score < 6) continue; // Noise filter

        // 5. Categorization
        const category = score >= 13 ? 'SNIPER' : score >= 9 ? 'Strong' : 'Medium';
        
        // 6. Entry Levels
        const levels = calculateEntrySLTP(symbol, smc, fvg, amd, candles[candles.length - 1].close);

        // 7. Save to DB
        await executeQuery(
          `INSERT INTO crypto_market_scan_signals 
          (symbol, score, category, setup, rotation, momentum, has_sweep, has_bos, has_fvg, is_explosion, entry, stop_loss, tp1, tp2, tp3, timeframe)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            symbol, score, category, setupParts.join(' + '), rotation, momentum, 
            hasSweep, hasBos, hasFvg, isExplosion, 
            levels.entry, levels.sl, levels.tp1, levels.tp2, levels.tp3, interval
          ]
        );
        detectedCount++;

        // 8. Notify Telegram ONLY for SNIPER setups
        if (category === 'SNIPER') {
          const msg = `💣 *SNIPER AI SETUP DETECTED*
Symbol: ${symbol}
*Score: ${score}/15*
Setup: ${setupParts.join(' + ')}
Rotation: ${rotation}

Entry: ${levels.entry.toFixed(4)}
SL: ${levels.sl.toFixed(4)}
TP: ${levels.tp1.toFixed(4)} (TP1)
          `;
          await sendTelegramNotification(msg);
        }

      } catch (err) {
        console.error(`Error scanning ${symbol}:`, err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Master Scan [${interval}] complete. Detected ${detectedCount} valid setups.`,
      rotation 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
