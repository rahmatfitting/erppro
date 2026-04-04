import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { fetchBinancePairs, fetchKlines, sendTelegramNotification } from '@/lib/binance';
import { analyzeDivergence, scoreDivergence, TFResult } from '@/lib/divergence';

export const maxDuration = 300;

const TIMEFRAMES = ['15m', '1h', '4h', '1d'];

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS crypto_divergence_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL UNIQUE,
      dominant_type VARCHAR(10),
      score DECIMAL(5,1),
      confidence VARCHAR(10),
      active_tfs VARCHAR(50),
      tf_15m VARCHAR(10),
      tf_1h VARCHAR(10),
      tf_4h VARCHAR(10),
      tf_1d VARCHAR(10),
      macd_confirms TINYINT(1),
      volume_spike TINYINT(1),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();
    await executeQuery(`DELETE FROM crypto_divergence_signals`);

    const symbols = await fetchBinancePairs();
    if (symbols.length === 0) {
      return NextResponse.json({ success: false, error: 'Binance API tidak merespons. Coba lagi nanti.' }, { status: 503 });
    }
    const topSymbols = symbols.slice(0, 50); // Top 50 by listing order


    let saved = 0;

    for (const symbol of topSymbols) {
      const tfResults: TFResult[] = [];

      // Fetch per TF
      for (const tf of TIMEFRAMES) {
        const candles = await fetchKlines(symbol, tf, 200);
        const result = analyzeDivergence(candles, tf);
        tfResults.push(result);
      }

      // Determine dominant direction
      const bullCount = tfResults.filter(r => r.type === 'BULLISH').length;
      const bearCount = tfResults.filter(r => r.type === 'BEARISH').length;
      if (bullCount === 0 && bearCount === 0) continue;

      const dom = bullCount >= bearCount ? 'BULLISH' : 'BEARISH';
      const { score, confidence, activeTFs } = scoreDivergence(tfResults, dom);

      if (confidence === 'NOISE') continue;

      const tfMap: Record<string, string> = {};
      tfResults.forEach(r => { tfMap[r.tf] = r.type; });

      const macdConfirms = tfResults.some(r => r.macdConfirm && r.type === dom);
      const volumeSpike  = tfResults.some(r => r.volumeSpike);

      try {
        await executeQuery(
          `INSERT INTO crypto_divergence_signals
            (symbol, dominant_type, score, confidence, active_tfs,
             tf_15m, tf_1h, tf_4h, tf_1d, macd_confirms, volume_spike)
           VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
          [
            symbol, dom, score, confidence, activeTFs.join(','),
            tfMap['15m'] || 'NEUTRAL',
            tfMap['1h']  || 'NEUTRAL',
            tfMap['4h']  || 'NEUTRAL',
            tfMap['1d']  || 'NEUTRAL',
            macdConfirms ? 1 : 0,
            volumeSpike  ? 1 : 0,
          ]
        );
        saved++;

        if (score >= 9) {
          const icon = dom === 'BULLISH' ? '🟢' : '🔴';
          await sendTelegramNotification(
            `${icon} *DIVERGENCE ALERT (Score ${score})*\nSymbol: ${symbol}\nType: ${dom}\nTFs: ${activeTFs.join(', ')}\nConfidence: ${confidence}`
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({ success: true, message: `Divergence Scan selesai. ${saved} sinyal ditampung.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
