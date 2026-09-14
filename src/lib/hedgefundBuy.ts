import { executeQuery } from './db';
import { fetchFapiWithFallback, fetchTopFuturesPairs } from './futures';

export interface HedgeFundSignal {
  symbol: string;
  score: number; // 0 - 100
  setup: 'WHALE_ACCUMULATION' | 'SHORT_SQUEEZE' | 'SMART_BREAKOUT' | 'STEALTH_DIP_BUY' | 'WATCHLIST';
  setupTitle: string;
  setupDescription: string;
  price: number;
  priceChange24h: number;
  topTraderPositionRatio: number; // Whale Position Ratio
  topTraderPositionLongPercent: number; // Whale Long %
  topTraderAccountRatio: number; // Whale Account Ratio
  globalRetailRatio: number; // Retail Global Ratio
  contrarianDivergence: number; // Whale Pos Ratio - Retail Ratio
  takerBuySellRatio: number;
  takerBuyVol: number;
  takerSellVol: number;
  openInterest: number;
  openInterestValue: number;
  oiChangePercent: number;
  fundingRate: number; // Decimal, e.g. 0.0001
  fundingRatePercent: number; // Percentage, e.g. 0.01%
  basis: number; // Difference futures - index
  basisRatePercent: number; // %
  oiMcapRatio: number; // %
  entryMin: number;
  entryMax: number;
  stopLoss: number;
  tp1: number;
  tp2: number;
  reasons: string[];
}

// In-memory fallback if database table cannot be written
let inMemorySignals: HedgeFundSignal[] = [];

export async function ensureHedgeFundTable() {
  try {
    await executeQuery(`
      CREATE TABLE IF NOT EXISTS crypto_hedgefund_buy_signals (
        nomor INT AUTO_INCREMENT PRIMARY KEY,
        symbol VARCHAR(20) NOT NULL UNIQUE,
        score INT NOT NULL,
        setup VARCHAR(40) NOT NULL,
        setup_title VARCHAR(100) NOT NULL,
        price DECIMAL(20, 8),
        price_change_24h DECIMAL(10, 2),
        whale_pos_ratio DECIMAL(10, 4),
        whale_long_pct DECIMAL(10, 2),
        retail_ratio DECIMAL(10, 4),
        divergence DECIMAL(10, 4),
        taker_ratio DECIMAL(10, 4),
        open_interest DECIMAL(24, 4),
        oi_value DECIMAL(24, 2),
        oi_change_pct DECIMAL(10, 2),
        funding_rate DECIMAL(12, 6),
        basis DECIMAL(16, 4),
        basis_pct DECIMAL(10, 4),
        oi_mcap_ratio DECIMAL(10, 4),
        entry_min DECIMAL(20, 8),
        entry_max DECIMAL(20, 8),
        stop_loss DECIMAL(20, 8),
        tp1 DECIMAL(20, 8),
        tp2 DECIMAL(20, 8),
        reasons TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
  } catch (err) {
    console.warn("Database ensureHedgeFundTable skipped or using in-memory mode:", err);
  }
}

/**
 * Fetch candidate metrics and calculate quantitative Hedge Fund Buy Score
 */
export async function evaluateSymbolForBuy(pair: { symbol: string; lastPrice: number; priceChangePercent: number; quoteVolume: number }): Promise<HedgeFundSignal | null> {
  const symbol = pair.symbol;

  try {
    const [
      topTraderPosData,
      topTraderAccData,
      globalRetailData,
      takerData,
      oiHistData,
      fundingData,
      basisData
    ] = await Promise.all([
      fetchFapiWithFallback(`/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=5m&limit=5`),
      fetchFapiWithFallback(`/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=5m&limit=5`),
      fetchFapiWithFallback(`/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=5m&limit=5`),
      fetchFapiWithFallback(`/futures/data/takerlongshortRatio?symbol=${symbol}&period=5m&limit=5`),
      fetchFapiWithFallback(`/futures/data/openInterestHist?symbol=${symbol}&period=5m&limit=6`),
      fetchFapiWithFallback(`/fapi/v1/fundingRate?symbol=${symbol}&limit=2`),
      fetchFapiWithFallback(`/futures/data/basis?pair=${symbol}&contractType=PERPETUAL&period=5m&limit=5`)
    ]);

    // 1. Whale Top Trader Position Ratio
    let whalePosRatio = 1.0;
    let whaleLongPct = 50.0;
    if (Array.isArray(topTraderPosData) && topTraderPosData.length > 0) {
      const last = topTraderPosData[topTraderPosData.length - 1];
      whalePosRatio = parseFloat(last.longShortRatio) || 1.0;
      whaleLongPct = (parseFloat(last.longAccount) || 0.5) * 100;
    }

    // 2. Whale Top Trader Account Ratio
    let whaleAccRatio = 1.0;
    if (Array.isArray(topTraderAccData) && topTraderAccData.length > 0) {
      const last = topTraderAccData[topTraderAccData.length - 1];
      whaleAccRatio = parseFloat(last.longShortRatio) || 1.0;
    }

    // 3. Global Retail Ratio
    let retailRatio = 1.0;
    if (Array.isArray(globalRetailData) && globalRetailData.length > 0) {
      const last = globalRetailData[globalRetailData.length - 1];
      retailRatio = parseFloat(last.longShortRatio) || 1.0;
    }

    // 4. Taker Buy/Sell Volume
    let takerRatio = 1.0;
    let takerBuyVol = 0;
    let takerSellVol = 0;
    if (Array.isArray(takerData) && takerData.length > 0) {
      const last = takerData[takerData.length - 1];
      takerRatio = parseFloat(last.buySellRatio) || 1.0;
      takerBuyVol = parseFloat(last.buyVol) || 0;
      takerSellVol = parseFloat(last.sellVol) || 0;
    }

    // 5. Open Interest & OI change
    let openInterest = 0;
    let oiValue = 0;
    let oiChangePct = 0;
    let oiMcapRatio = 0;
    if (Array.isArray(oiHistData) && oiHistData.length > 0) {
      const last = oiHistData[oiHistData.length - 1];
      openInterest = parseFloat(last.sumOpenInterest) || 0;
      oiValue = parseFloat(last.sumOpenInterestValue) || 0;

      if (oiHistData.length >= 2) {
        const first = oiHistData[0];
        const prevOI = parseFloat(first.sumOpenInterest) || 1;
        oiChangePct = ((openInterest - prevOI) / prevOI) * 100;
      }

      const cmcSupply = parseFloat(last.CMCCirculatingSupply) || 0;
      if (cmcSupply > 0 && pair.lastPrice > 0) {
        const mcap = cmcSupply * pair.lastPrice;
        oiMcapRatio = mcap > 0 ? (oiValue / mcap) * 100 : 0;
      }
    }

    // 6. Funding Rate
    let fundingRate = 0.0001;
    if (Array.isArray(fundingData) && fundingData.length > 0) {
      const last = fundingData[fundingData.length - 1];
      fundingRate = parseFloat(last.fundingRate) || 0.0001;
    }
    const fundingRatePercent = fundingRate * 100;

    // 7. Basis
    let basis = 0;
    let basisRatePercent = 0;
    if (Array.isArray(basisData) && basisData.length > 0) {
      const last = basisData[basisData.length - 1];
      basis = parseFloat(last.basis) || 0;
      basisRatePercent = (parseFloat(last.basisRate) || 0) * 100;
    }

    // Contrarian Divergence: Whale vs Retail
    const contrarianDivergence = whalePosRatio - retailRatio;

    // ----------------------------------------------------
    // QUANTITATIVE HEDGE FUND BUY SCORING (0 - 100)
    // ----------------------------------------------------
    let score = 0;
    const reasons: string[] = [];

    // Factor 1: Smart Money Divergence (Whales Long vs Retail Short) (Max 30 pts)
    if (whalePosRatio >= 1.6 && retailRatio <= 1.05) {
      score += 30;
      reasons.push(`Extreme Smart Money Divergence: Whales ${(whaleLongPct).toFixed(0)}% Long vs Retail Net Short`);
    } else if (whalePosRatio >= 1.3 && retailRatio <= 1.2) {
      score += 24;
      reasons.push(`Whale Position Accumulation: Top Trader Pos L/S ${whalePosRatio.toFixed(2)}x`);
    } else if (whalePosRatio > 1.1) {
      score += 15;
      reasons.push(`Moderate Whale Long Bias (${whalePosRatio.toFixed(2)}x)`);
    } else {
      score += 5;
    }

    // Factor 2: Taker Aggressor Flow (Max 20 pts)
    if (takerRatio >= 1.25) {
      score += 20;
      reasons.push(`Aggressive Taker Buy Inflow (${takerRatio.toFixed(2)}x Ask lifting)`);
    } else if (takerRatio >= 1.05) {
      score += 15;
      reasons.push(`Net Taker Buying Pressure (${takerRatio.toFixed(2)}x)`);
    } else if (takerRatio >= 0.95) {
      score += 8;
    } else {
      score += 2;
    }

    // Factor 3: Open Interest Momentum (Max 20 pts)
    if (oiChangePct >= 2.5) {
      score += 20;
      reasons.push(`OI Surging (+${oiChangePct.toFixed(1)}%) with Fresh Capital Inflow`);
    } else if (oiChangePct >= 0.5) {
      score += 14;
      reasons.push(`OI Expanding steadily (+${oiChangePct.toFixed(1)}%)`);
    } else if (oiChangePct >= -0.5) {
      score += 8;
    } else {
      score += 2;
    }

    // Factor 4: Funding Rate & Squeeze Setup (Max 15 pts)
    if (fundingRate < 0) {
      score += 15;
      reasons.push(`Negative Funding Rate (${fundingRatePercent.toFixed(4)}%): Shorts paying Longs, Prime Squeeze Trap`);
    } else if (fundingRate <= 0.0001) {
      score += 12;
      reasons.push(`Low / Neutral Funding Rate (${fundingRatePercent.toFixed(4)}%): Healthy non-overcrowded Longs`);
    } else if (fundingRate <= 0.0003) {
      score += 6;
    } else {
      // Overheated funding penalty
      score -= 5;
      reasons.push(`Overcrowded High Funding (${fundingRatePercent.toFixed(4)}%): Increased leverage shakeout risk`);
    }

    // Factor 5: Basis & Contango Structure (Max 15 pts)
    if (basis >= 0 || basisRatePercent >= -0.01) {
      score += 15;
      reasons.push(`Positive Basis / Healthy Contango (${basis >= 0 ? '+' : ''}${basis.toFixed(2)})`);
    } else if (basisRatePercent >= -0.05) {
      score += 8;
    } else {
      score += 3;
    }

    // Normalize score to 0 - 100
    score = Math.max(10, Math.min(100, Math.round(score)));

    // Setup Classification
    let setup: HedgeFundSignal['setup'] = 'WATCHLIST';
    let setupTitle = 'Monitoring Phase';
    let setupDescription = 'Data derivatif menunjukkan sinyal konsolidasi awal.';

    if (whalePosRatio >= 1.4 && takerRatio >= 1.05 && oiChangePct >= 0) {
      setup = 'WHALE_ACCUMULATION';
      setupTitle = 'Institutional Whale Accumulation';
      setupDescription = 'Whales menumpuk posisi Long dengan dominasi posisi di atas 58% didukung taker buy agresif.';
    } else if (retailRatio < 0.95 && fundingRate <= 0.00005 && oiChangePct >= 1.0) {
      setup = 'SHORT_SQUEEZE';
      setupTitle = 'Short Squeeze Fuel Trap';
      setupDescription = 'Retail terjebak posisi Short dengan funding rate negatif/flat dan OI melonjak.';
    } else if (basis >= 0 && whalePosRatio >= 1.3 && pair.priceChangePercent >= 1.5) {
      setup = 'SMART_BREAKOUT';
      setupTitle = 'Smart Money Breakout';
      setupDescription = 'Basis positif dan premi futures mengonfirmasi breakout harga yang didorong institusi.';
    } else if (pair.priceChangePercent < 0 && whalePosRatio >= 1.35 && takerRatio >= 1.0) {
      setup = 'STEALTH_DIP_BUY';
      setupTitle = 'Stealth Dip Buying';
      setupDescription = 'Koreksi harga dimanfaatkan whale untuk menyerap supply dan menambah posisi Long.';
    }

    // Calculate Entry, Stop Loss, and Take Profit levels
    const price = pair.lastPrice;
    const entryMin = price * 0.995;
    const entryMax = price * 1.005;
    const stopLoss = price * 0.978; // ~2.2% SL
    const tp1 = price * 1.045; // ~4.5% TP1 (1:2 R:R)
    const tp2 = price * 1.08;  // ~8.0% TP2 (1:3.5 R:R)

    return {
      symbol,
      score,
      setup,
      setupTitle,
      setupDescription,
      price,
      priceChange24h: pair.priceChangePercent,
      topTraderPositionRatio: whalePosRatio,
      topTraderPositionLongPercent: whaleLongPct,
      topTraderAccountRatio: whaleAccRatio,
      globalRetailRatio: retailRatio,
      contrarianDivergence,
      takerBuySellRatio: takerRatio,
      takerBuyVol,
      takerSellVol,
      openInterest,
      openInterestValue: oiValue,
      oiChangePercent: oiChangePct,
      fundingRate,
      fundingRatePercent,
      basis,
      basisRatePercent,
      oiMcapRatio,
      entryMin,
      entryMax,
      stopLoss,
      tp1,
      tp2,
      reasons
    };
  } catch (err) {
    console.error(`Error evaluating ${symbol}:`, err);
    return null;
  }
}

/**
 * Run Deep Scan across top futures pairs
 */
export async function runHedgeFundBuyScan(limit: number = 25): Promise<HedgeFundSignal[]> {
  await ensureHedgeFundTable();

  const pairs = await fetchTopFuturesPairs(Math.max(limit, 30));
  if (!pairs || pairs.length === 0) {
    return inMemorySignals;
  }

  const results: HedgeFundSignal[] = [];
  const BATCH_SIZE = 6;

  for (let i = 0; i < pairs.length; i += BATCH_SIZE) {
    const batch = pairs.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(pair => evaluateSymbolForBuy(pair))
    );

    for (const res of batchResults) {
      if (res) results.push(res);
    }
  }

  // Sort descending by HF score (highest conviction buy first)
  results.sort((a, b) => b.score - a.score);

  // Update in-memory signals
  inMemorySignals = results;

  // Persist to MySQL table if available
  try {
    await executeQuery(`DELETE FROM crypto_hedgefund_buy_signals`);
    for (const sig of results) {
      try {
        await executeQuery(
          `INSERT INTO crypto_hedgefund_buy_signals 
           (symbol, score, setup, setup_title, price, price_change_24h, whale_pos_ratio, whale_long_pct, retail_ratio, divergence, taker_ratio, open_interest, oi_value, oi_change_pct, funding_rate, basis, basis_pct, oi_mcap_ratio, entry_min, entry_max, stop_loss, tp1, tp2, reasons)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            sig.symbol,
            sig.score,
            sig.setup,
            sig.setupTitle,
            sig.price,
            sig.priceChange24h,
            sig.topTraderPositionRatio,
            sig.topTraderPositionLongPercent,
            sig.globalRetailRatio,
            sig.contrarianDivergence,
            sig.takerBuySellRatio,
            sig.openInterest,
            sig.openInterestValue,
            sig.oiChangePercent,
            sig.fundingRate,
            sig.basis,
            sig.basisRatePercent,
            sig.oiMcapRatio,
            sig.entryMin,
            sig.entryMax,
            sig.stopLoss,
            sig.tp1,
            sig.tp2,
            sig.reasons.join(' | ')
          ]
        );
      } catch (insertErr) {
        // Continue if single insert fails
      }
    }
  } catch (dbErr) {
    console.warn("Could not save to DB, using in-memory store:", dbErr);
  }

  return results;
}

/**
 * Get cached signals from DB or memory
 */
export async function getCachedHedgeFundSignals(): Promise<HedgeFundSignal[]> {
  try {
    await ensureHedgeFundTable();
    const rows: any = await executeQuery(`
      SELECT * FROM crypto_hedgefund_buy_signals 
      ORDER BY score DESC 
      LIMIT 100
    `);

    if (Array.isArray(rows) && rows.length > 0) {
      return rows.map((r: any) => ({
        symbol: r.symbol,
        score: parseInt(r.score) || 0,
        setup: r.setup,
        setupTitle: r.setup_title,
        setupDescription: '',
        price: parseFloat(r.price) || 0,
        priceChange24h: parseFloat(r.price_change_24h) || 0,
        topTraderPositionRatio: parseFloat(r.whale_pos_ratio) || 1,
        topTraderPositionLongPercent: parseFloat(r.whale_long_pct) || 50,
        topTraderAccountRatio: 1.0,
        globalRetailRatio: parseFloat(r.retail_ratio) || 1,
        contrarianDivergence: parseFloat(r.divergence) || 0,
        takerBuySellRatio: parseFloat(r.taker_ratio) || 1,
        takerBuyVol: 0,
        takerSellVol: 0,
        openInterest: parseFloat(r.open_interest) || 0,
        openInterestValue: parseFloat(r.oi_value) || 0,
        oiChangePercent: parseFloat(r.oi_change_pct) || 0,
        fundingRate: parseFloat(r.funding_rate) || 0,
        fundingRatePercent: (parseFloat(r.funding_rate) || 0) * 100,
        basis: parseFloat(r.basis) || 0,
        basisRatePercent: parseFloat(r.basis_pct) || 0,
        oiMcapRatio: parseFloat(r.oi_mcap_ratio) || 0,
        entryMin: parseFloat(r.entry_min) || 0,
        entryMax: parseFloat(r.entry_max) || 0,
        stopLoss: parseFloat(r.stop_loss) || 0,
        tp1: parseFloat(r.tp1) || 0,
        tp2: parseFloat(r.tp2) || 0,
        reasons: r.reasons ? r.reasons.split(' | ') : []
      }));
    }
  } catch (err) {
    console.warn("DB fetch failed, falling back to in-memory signals:", err);
  }

  // Fallback if DB empty: return inMemorySignals if available, or run initial scan
  if (inMemorySignals.length > 0) {
    return inMemorySignals;
  }
  return await runHedgeFundBuyScan(20);
}

/**
 * Fetch the exact 8 historical charts for a single symbol
 */
export async function fetchHedgeFund8Charts(symbol: string, period: string = '5m') {
  try {
    const [
      oiHistRaw,
      topAccRaw,
      topPosRaw,
      globalRaw,
      takerRaw,
      basisRaw,
      fundingRaw
    ] = await Promise.all([
      fetchFapiWithFallback(`/futures/data/openInterestHist?symbol=${symbol}&period=${period}&limit=30`),
      fetchFapiWithFallback(`/futures/data/topLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=30`),
      fetchFapiWithFallback(`/futures/data/topLongShortPositionRatio?symbol=${symbol}&period=${period}&limit=30`),
      fetchFapiWithFallback(`/futures/data/globalLongShortAccountRatio?symbol=${symbol}&period=${period}&limit=30`),
      fetchFapiWithFallback(`/futures/data/takerlongshortRatio?symbol=${symbol}&period=${period}&limit=30`),
      fetchFapiWithFallback(`/futures/data/basis?pair=${symbol}&contractType=PERPETUAL&period=${period}&limit=30`),
      fetchFapiWithFallback(`/fapi/v1/fundingRate?symbol=${symbol}&limit=40`)
    ]);

    // 1. Minat Terbuka (Open Interest & Notional Value)
    const openInterestSeries = (Array.isArray(oiHistRaw) ? oiHistRaw : []).map((d: any) => {
      const oi = parseFloat(d.sumOpenInterest) || 0;
      const oiVal = parseFloat(d.sumOpenInterestValue) || 0;
      const supply = parseFloat(d.CMCCirculatingSupply) || 0;
      const time = new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      return {
        timestamp: d.timestamp,
        time,
        openInterest: oi,
        notionalValue: oiVal,
        circulatingSupply: supply
      };
    });

    // 2. Rasio Long / Short Top Trader (Akun)
    const topAccountSeries = (Array.isArray(topAccRaw) ? topAccRaw : []).map((d: any) => ({
      timestamp: d.timestamp,
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      longShortRatio: parseFloat(d.longShortRatio) || 1.0,
      longAccount: (parseFloat(d.longAccount) || 0.5) * 100,
      shortAccount: (parseFloat(d.shortAccount) || 0.5) * 100,
    }));

    // 3. Rasio Long / Short Top Trader (Posisi)
    const topPositionSeries = (Array.isArray(topPosRaw) ? topPosRaw : []).map((d: any) => ({
      timestamp: d.timestamp,
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      longShortRatio: parseFloat(d.longShortRatio) || 1.0,
      longPosition: (parseFloat(d.longAccount) || 0.5) * 100,
      shortPosition: (parseFloat(d.shortAccount) || 0.5) * 100,
    }));

    // 4. Rasio Long/Short (Global Retail)
    const globalRetailSeries = (Array.isArray(globalRaw) ? globalRaw : []).map((d: any) => ({
      timestamp: d.timestamp,
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      longShortRatio: parseFloat(d.longShortRatio) || 1.0,
      longAccount: (parseFloat(d.longAccount) || 0.5) * 100,
      shortAccount: (parseFloat(d.shortAccount) || 0.5) * 100,
    }));

    // 5. Volume Beli/Jual Taker
    const takerVolumeSeries = (Array.isArray(takerRaw) ? takerRaw : []).map((d: any) => ({
      timestamp: d.timestamp,
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      buyVol: parseFloat(d.buyVol) || 0,
      sellVol: parseFloat(d.sellVol) || 0,
      buySellRatio: parseFloat(d.buySellRatio) || 1.0,
    }));

    // 6. Dasar (Basis: Futures Price vs Indeks Harga vs Dasar)
    const basisSeries = (Array.isArray(basisRaw) ? basisRaw : []).map((d: any) => ({
      timestamp: d.timestamp,
      time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      futuresPrice: parseFloat(d.futuresPrice) || 0,
      indexPrice: parseFloat(d.indexPrice) || 0,
      basis: parseFloat(d.basis) || 0,
      basisRate: (parseFloat(d.basisRate) || 0) * 100,
    }));

    // 7. Tarif Pendanaan (Funding Rate - 40 Periods)
    const fundingRateSeries = (Array.isArray(fundingRaw) ? fundingRaw : []).map((d: any) => ({
      timestamp: d.fundingTime,
      time: new Date(d.fundingTime).toLocaleDateString([], { month: 'numeric', day: 'numeric' }) + ' ' +
            new Date(d.fundingTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fundingRatePercent: (parseFloat(d.fundingRate) || 0) * 100,
      markPrice: parseFloat(d.markPrice) || 0,
    }));

    // 8. Rasio Minat Terbuka terhadap Kapitalisasi Pasar (OI / Market Cap Ratio vs Harga)
    const oiMcapSeries = openInterestSeries.map((oiItem, idx) => {
      const basisMatch = basisSeries[idx] || basisSeries[basisSeries.length - 1];
      const price = basisMatch ? basisMatch.futuresPrice : (oiItem.notionalValue / (oiItem.openInterest || 1));
      const mcap = (oiItem.circulatingSupply > 0 && price > 0) ? oiItem.circulatingSupply * price : 0;
      const ratio = mcap > 0 ? (oiItem.notionalValue / mcap) * 100 : 0;

      return {
        timestamp: oiItem.timestamp,
        time: oiItem.time,
        price,
        oiMcapRatio: ratio,
        openInterest: oiItem.openInterest,
      };
    });

    return {
      symbol,
      period,
      openInterestSeries,
      topAccountSeries,
      topPositionSeries,
      globalRetailSeries,
      takerVolumeSeries,
      basisSeries,
      fundingRateSeries,
      oiMcapSeries
    };
  } catch (err: any) {
    console.error(`Error fetching 8 charts for ${symbol}:`, err);
    throw new Error(err.message || 'Gagal mengambil data 8 grafik');
  }
}
