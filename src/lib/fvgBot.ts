import { executeQuery } from './db';
import { fetchKlines } from './binance';
import { placeRealFuturesOrder, fetchRealPosition } from './binanceOrder';

export interface FVGConfig {
  id: number;
  is_active: boolean;
  mode: 'BUY' | 'SELL';
  max_daily_loss: number;
  leverage: number;
  coins: string[]; // parsed from JSON
  initial_margin: number;
  is_compounding: boolean;
  account_type: 'PAPER' | 'REAL';
}

export interface FVGPosition {
  id?: number;
  bot_id: number;
  symbol: string;
  side: 'BUY' | 'SELL';
  status: 'OPEN' | 'CLOSED';
  entry_price: number;
  tp_price: number;
  sl_price: number;
  margin_used: number;
  close_price?: number;
  pnl?: number;
  tx_id?: string; // real order id if any
  created_at: string;
  closed_at?: string;
}

export async function ensureBotTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS fvg_bot_config (
      id INT PRIMARY KEY,
      is_active BOOLEAN DEFAULT false,
      mode VARCHAR(10) DEFAULT 'BUY',
      max_daily_loss DECIMAL(10,2) DEFAULT 50.00,
      leverage INT DEFAULT 10,
      coins TEXT,
      initial_margin DECIMAL(10,2) DEFAULT 10.00,
      is_compounding BOOLEAN DEFAULT false,
      account_type VARCHAR(10) DEFAULT 'PAPER'
    )
  `);

  const dbName = process.env.DB_NAME || 'erp_db';
  const checkConfigCols: any = await executeQuery(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'fvg_bot_config'`, [dbName]);
  const configCols = checkConfigCols.map((c: any) => c.COLUMN_NAME);

  if (!configCols.includes('initial_margin')) await executeQuery('ALTER TABLE fvg_bot_config ADD COLUMN initial_margin DECIMAL(10,2) DEFAULT 10.00');
  if (!configCols.includes('is_compounding')) await executeQuery('ALTER TABLE fvg_bot_config ADD COLUMN is_compounding BOOLEAN DEFAULT false');
  if (!configCols.includes('account_type')) await executeQuery('ALTER TABLE fvg_bot_config ADD COLUMN account_type VARCHAR(10) DEFAULT "PAPER"');

  const rows: any = await executeQuery(`SELECT count(*) as count FROM fvg_bot_config`);
  if (!rows || rows[0].count === 0) {
    await executeQuery(`
      INSERT INTO fvg_bot_config (id, is_active, mode, max_daily_loss, leverage, coins, initial_margin, is_compounding, account_type)
      VALUES (1, false, 'BUY', 50.00, 10, '["BTCUSDT","ETHUSDT"]', 10.00, false, 'PAPER')
    `);
    await executeQuery(`
      INSERT INTO fvg_bot_config (id, is_active, mode, max_daily_loss, leverage, coins, initial_margin, is_compounding, account_type)
      VALUES (2, false, 'BUY', 50.00, 10, '["BTCUSDT","ETHUSDT"]', 10.00, false, 'REAL')
    `);
  } else if (rows[0].count === 1) {
    await executeQuery(`
      INSERT INTO fvg_bot_config (id, is_active, mode, max_daily_loss, leverage, coins, initial_margin, is_compounding, account_type)
      VALUES (2, false, 'BUY', 50.00, 10, '["BTCUSDT","ETHUSDT"]', 10.00, false, 'REAL')
    `);
  }

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS fvg_bot_positions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      bot_id INT DEFAULT 1,
      symbol VARCHAR(20),
      side VARCHAR(10),
      status VARCHAR(10) DEFAULT 'OPEN',
      entry_price DECIMAL(18,6),
      tp_price DECIMAL(18,6),
      sl_price DECIMAL(18,6),
      margin_used DECIMAL(10,2) DEFAULT 10.00,
      close_price DECIMAL(18,6),
      pnl DECIMAL(10,2),
      tx_id VARCHAR(100),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME NULL
    )
  `);

  const checkPosCols: any = await executeQuery(`SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'fvg_bot_positions'`, [dbName]);
  const posCols = checkPosCols.map((c: any) => c.COLUMN_NAME);

  if (!posCols.includes('bot_id')) await executeQuery('ALTER TABLE fvg_bot_positions ADD COLUMN bot_id INT DEFAULT 1');
  if (!posCols.includes('margin_used')) await executeQuery('ALTER TABLE fvg_bot_positions ADD COLUMN margin_used DECIMAL(10,2) DEFAULT 10.00');
  if (!posCols.includes('tx_id')) await executeQuery('ALTER TABLE fvg_bot_positions ADD COLUMN tx_id VARCHAR(100)');
}

export async function getConfig(botId: number = 1): Promise<FVGConfig> {
  await ensureBotTables();
  const rows: any = await executeQuery(`SELECT * FROM fvg_bot_config WHERE id = ?`, [botId]);
  const row = rows[0];
  let parsedCoins = ['BTCUSDT'];
  try {
    if (row.coins) parsedCoins = JSON.parse(row.coins);
  } catch (e) {}

  return {
    id: row.id,
    is_active: Boolean(row.is_active),
    mode: row.mode,
    max_daily_loss: parseFloat(row.max_daily_loss),
    leverage: row.leverage,
    coins: parsedCoins,
    initial_margin: parseFloat(row.initial_margin || 10),
    is_compounding: Boolean(row.is_compounding),
    account_type: row.account_type || (botId === 1 ? 'PAPER' : 'REAL'),
  };
}

export async function calculateDynamicMargin(botId: number, initialMargin: number, isCompounding: boolean): Promise<number> {
  if (!isCompounding) return initialMargin;

  // Get total PnL for closed trades on this bot
  const rows: any = await executeQuery(`
    SELECT SUM(pnl) as total_pnl 
    FROM fvg_bot_positions 
    WHERE status = 'CLOSED' AND bot_id = ?
  `, [botId]);

  const totalPnL = rows && rows[0] && rows[0].total_pnl ? parseFloat(rows[0].total_pnl) : 0;
  
  // New margin = initial_margin + total_pnl
  const compoundedMargin = initialMargin + totalPnL;
  
  // Binance minimum margin limit (safety)
  return Math.max(5, compoundedMargin);
}

export async function checkDailyLoss(botId: number, maxDailyLoss: number): Promise<boolean> {
  // Returns true if daily loss limit is hit
  const today = new Date().toISOString().split('T')[0];
  const rows: any = await executeQuery(`
    SELECT SUM(pnl) as total_pnl 
    FROM fvg_bot_positions 
    WHERE status = 'CLOSED' AND bot_id = ? AND DATE(closed_at) = ?
  `, [botId, today]);
  
  const totalPnL = rows && rows[0] && rows[0].total_pnl ? parseFloat(rows[0].total_pnl) : 0;
  // total pnl is negative when loss
  return totalPnL <= -maxDailyLoss;
}

export function calcATR(klines: any[], period = 14): number {
  if (klines.length <= period) return 0;
  const trs: number[] = [];
  for (let i = 1; i < klines.length; i++) {
    const h = klines[i].high;
    const l = klines[i].low;
    const pc = klines[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return atr;
}

export function detectFVG(klines: any[], mode: 'BUY' | 'SELL', atr: number) {
  // Strategy: 
  // 1. Scan backwards up to 15 candles to find the most recent FVG.
  // 2. Ensure it hasn't been invalided (price breaking the FVG origin).
  // 3. Entry Timing Optimal 🎯: ONLY trigger if current live price is retracing INSIDE the FVG zone.
  const len = klines.length;
  if (len < 5) return null;

  const currentPrice = klines[len - 1].close;
  const currentLow = klines[len - 1].low;
  const currentHigh = klines[len - 1].high;
  const minGap = atr * 0.25; // Loophole fixed: Gap minimal 25% ATR agar valid structure 

  // Look backwards from the most recent closed candle. 
  // i is the index of C3 in the 3-candle pattern (C1, C2, C3)
  for (let i = len - 2; i >= Math.max(3, len - 15); i--) {
    const c1 = klines[i - 2];
    const c2 = klines[i - 1];
    const c3 = klines[i];

    if (mode === 'BUY') {
      // Bullish FVG: C1 High < C3 Low, C2 must be Bullish
      if (c2.close > c2.open && c1.high < c3.low && (c3.low - c1.high) >= minGap) {
        const fvgBottom = c1.high;
        const fvgTop = c3.low;

        // Cek apakah ada candle setelah fvg ini terbentuk yang sudah menghancurkan batas FVG
        let invalidated = false;
        for (let j = i + 1; j <= len - 2; j++) {
          if (klines[j].low < fvgBottom) {
            invalidated = true; 
            break;
          }
        }

        if (!invalidated) {
          // MITIGATION ENTRY: Current price sedang berada di dalam zona FVG (Diskon/Premium)
          // Memastikan kita buy di harga murah, BUKAN buy pucuk.
          if (currentLow <= fvgTop && currentPrice >= fvgBottom) {
            return { type: 'BULLISH', fvgBottom, fvgTop, c1Ext: c1.low, price: currentPrice };
          }
        }
        // Kita hanya peduli pada FVG paling relevan (paling dekat), jika ketemu tapi belum masuk zona, 
        // kita skip dan wait (jangan paksakan trade)
        break; 
      }
    } else if (mode === 'SELL') {
      // Bearish FVG: C1 Low > C3 High, C2 must be Bearish
      if (c2.close < c2.open && c1.low > c3.high && (c1.low - c3.high) >= minGap) {
         const fvgTop = c1.low;
         const fvgBottom = c3.high;

         let invalidated = false;
         for (let j = i + 1; j <= len - 2; j++) {
           if (klines[j].high > fvgTop) {
             invalidated = true;
             break;
           }
         }

         if (!invalidated) {
           // MITIGATION ENTRY: Current price sedang retrace naik ke zona FVG sebelum dump.
           // Memastikan kita sell di harga diskon, BUKAN sell harga palung.
           if (currentHigh >= fvgBottom && currentPrice <= fvgTop) {
             return { type: 'BEARISH', fvgBottom, fvgTop, c1Ext: c1.high, price: currentPrice };
           }
         }
         break;
      }
    }
  }

  return null;
}

export async function runBotScan(): Promise<{ message: string; results: any[] }> {
  await ensureBotTables();
  const activeConfigs: any[] = await executeQuery(`SELECT * FROM fvg_bot_config WHERE is_active = true`);
  
  if (!activeConfigs || activeConfigs.length === 0) {
    return { message: 'Bots are OFF', results: [] };
  }

  const results = [];

  for (const row of activeConfigs) {
    const config = {
      id: row.id,
      is_active: Boolean(row.is_active),
      mode: row.mode as 'BUY' | 'SELL',
      max_daily_loss: parseFloat(row.max_daily_loss),
      leverage: row.leverage,
      coins: row.coins ? JSON.parse(row.coins) : ['BTCUSDT'],
      initial_margin: parseFloat(row.initial_margin || 10),
      is_compounding: Boolean(row.is_compounding),
      account_type: row.account_type as 'PAPER' | 'REAL',
    };

    // Check Daily Loss Limitation
    const hitMaxLoss = await checkDailyLoss(config.id, config.max_daily_loss);
    if (hitMaxLoss) {
      await executeQuery(`UPDATE fvg_bot_config SET is_active = false WHERE id = ?`, [config.id]);
      results.push({ bot: config.account_type, action: 'STOPPED', message: '🚨 MAX DAILY LOSS REACHED!' });
      continue;
    }

    // 1. Manage OPEN positions
    const activePositions: any[] = await executeQuery(`SELECT * FROM fvg_bot_positions WHERE status = 'OPEN' AND bot_id = ?`, [config.id]);
    const activeSymbols = activePositions.map(p => p.symbol);
    
    for (const pos of activePositions) {
      try {
        let currentPrice = 0;
        let closed = false;
        let pnlPct = 0;

        if (config.account_type === 'REAL') {
           // For REAL, check Binance API if it's still open
           const remotePos = await fetchRealPosition(pos.symbol);
           if (!remotePos || remotePos.amt === 0) {
             // Position closed by Binance (hit TP or SL)
             closed = true;
             // Naive approach: we fetch standard Klines to determine if it hit TP or SL, or just mark it closed.
             const liveData = await fetchKlines(pos.symbol, '1m', 1);
             if (liveData && liveData.length > 0) currentPrice = liveData[0].close;
             
             if (pos.side === 'BUY') {
               pnlPct = currentPrice >= parseFloat(pos.tp_price) 
                 ? (parseFloat(pos.tp_price) - parseFloat(pos.entry_price)) / parseFloat(pos.entry_price)
                 : (parseFloat(pos.sl_price) - parseFloat(pos.entry_price)) / parseFloat(pos.entry_price);
             } else {
               pnlPct = currentPrice <= parseFloat(pos.tp_price)
                 ? (parseFloat(pos.entry_price) - parseFloat(pos.tp_price)) / parseFloat(pos.entry_price)
                 : (parseFloat(pos.entry_price) - parseFloat(pos.sl_price)) / parseFloat(pos.entry_price);
             }
           } else {
             // Still open
             currentPrice = remotePos.entryPrice; // not closing
           }
        } else {
          // PAPER check
          const liveData = await fetchKlines(pos.symbol, '5m', 2);
          if (!liveData || liveData.length === 0) continue;
          currentPrice = liveData[liveData.length - 1].close;

          if (pos.side === 'BUY') {
            if (currentPrice >= parseFloat(pos.tp_price)) { closed = true; pnlPct = (parseFloat(pos.tp_price) - parseFloat(pos.entry_price)) / parseFloat(pos.entry_price); }
            else if (currentPrice <= parseFloat(pos.sl_price)) { closed = true; pnlPct = (parseFloat(pos.sl_price) - parseFloat(pos.entry_price)) / parseFloat(pos.entry_price); }
          } else { 
            if (currentPrice <= parseFloat(pos.tp_price)) { closed = true; pnlPct = (parseFloat(pos.entry_price) - parseFloat(pos.tp_price)) / parseFloat(pos.entry_price); }
            else if (currentPrice >= parseFloat(pos.sl_price)) { closed = true; pnlPct = (parseFloat(pos.entry_price) - parseFloat(pos.sl_price)) / parseFloat(pos.entry_price); }
          }
        }

        if (closed) {
          // Use the margin that was used when the position opened for accurate PnL calculation
          const marginUsed = parseFloat(pos.margin_used || config.initial_margin);
          const usdPnl = marginUsed * config.leverage * pnlPct;
          
          await executeQuery(`
            UPDATE fvg_bot_positions 
            SET status = 'CLOSED', close_price = ?, pnl = ?, closed_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [currentPrice || parseFloat(pos.entry_price), usdPnl, pos.id]);

          results.push({ symbol: pos.symbol, bot: config.account_type, action: 'CLOSE', pnl: usdPnl });

          const symIdx = activeSymbols.indexOf(pos.symbol);
          if (symIdx > -1) activeSymbols.splice(symIdx, 1);
        }
      } catch (e) {
        console.error(`FVGBot error checking pos ${pos.symbol}:`, e);
      }
    }

    // 2. Scan for NEW Entry Opportunities
    for (const symbol of config.coins) {
      if (activeSymbols.includes(symbol)) continue; 

      try {
        const klines = await fetchKlines(symbol, '5m', 50);
        if (!klines || klines.length < 50) continue;

        const atr = calcATR(klines, 14);
        const fvg = detectFVG(klines, config.mode, atr);
        if (fvg) {
          let sl = 0; let tp = 0;
          const entry = fvg.price;

          if (config.mode === 'BUY') {
            sl = fvg.c1Ext - atr;
            const risk = entry - sl;
            tp = entry + (1.5 * risk);
          } else {
            sl = fvg.c1Ext + atr;
            const risk = sl - entry;
            tp = entry - (1.5 * risk);
          }

          if (entry > 0 && sl > 0 && tp > 0) {
            let txId = null;
            let success = true;

            // Calculate current margin based on compounding
            const currentMargin = await calculateDynamicMargin(config.id, config.initial_margin, config.is_compounding);

            // Execute REAL if requested
            if (config.account_type === 'REAL') {
              const res = await placeRealFuturesOrder(symbol, config.mode, currentMargin, config.leverage, entry, sl, tp);
              if (res.success) {
                txId = res.orderId;
              } else {
                success = false;
                console.error(`Failed to place real order for ${symbol}:`, res.error);
                results.push({ bot: 'REAL', error: `Order failed for ${symbol}` });
              }
            }

            if (success) {
              await executeQuery(`
                INSERT INTO fvg_bot_positions (bot_id, symbol, side, status, entry_price, tp_price, sl_price, margin_used, tx_id)
                VALUES (?, ?, ?, 'OPEN', ?, ?, ?, ?, ?)
              `, [config.id, symbol, config.mode, entry, tp, sl, currentMargin, txId]);
              
              results.push({ symbol, bot: config.account_type, action: 'OPEN', side: config.mode, entry, sl, tp, margin: currentMargin });
              activeSymbols.push(symbol);
            }
          }
        }
      } catch (e) {
        console.error(`FVGBot error scanning ${symbol}:`, e);
      }
    }
  }

  return { message: 'Scan complete', results };
}
