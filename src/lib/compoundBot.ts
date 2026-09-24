import { executeQuery } from './db';
import {
  executeCompoundBuyOrder,
  executeCompoundCloseOrder,
  getSymbolPrecision,
  getBinanceCredentials
} from './binanceOrder';

export interface CompoundBotConfig {
  id: number;
  symbol: string;
  is_active: boolean;
  notional_usd: number;
  current_notional: number;
  leverage: number;
  compound_percent: number;
  stop_loss_percent: number | null;
  current_cycle: number;
  total_profit: number;
  entry_price: number | null;
  target_price: number | null;
  sl_price: number | null;
  quantity: number | null;
  last_check_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface CompoundBotCycle {
  id: number;
  cycle_number: number;
  symbol: string;
  side: 'BUY';
  notional_in: number;
  notional_out: number | null;
  entry_price: number;
  target_price: number;
  exit_price: number | null;
  quantity: number;
  leverage: number;
  pnl_usd: number;
  pnl_percent: number;
  status: 'OPEN' | 'TARGET_HIT' | 'STOPPED' | 'SL_HIT' | 'ERROR';
  binance_buy_order_id: string | null;
  binance_sell_order_id: string | null;
  created_at: string;
  closed_at: string | null;
}

export interface CompoundBotLog {
  id: number;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  created_at: string;
}

// In-memory mutex flag to avoid concurrent tick execution
let isTicking = false;

/**
 * Ensure database tables exist and support multi-coin
 */
export async function ensureCompoundBotTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS compound_bot_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      is_active BOOLEAN DEFAULT false,
      notional_usd DECIMAL(12, 4) DEFAULT 100.0000,
      current_notional DECIMAL(12, 4) DEFAULT 100.0000,
      leverage INT DEFAULT 20,
      compound_percent DECIMAL(8, 4) DEFAULT 1.0000,
      stop_loss_percent DECIMAL(8, 4) DEFAULT NULL,
      current_cycle INT DEFAULT 0,
      total_profit DECIMAL(12, 4) DEFAULT 0.0000,
      entry_price DECIMAL(16, 8) DEFAULT NULL,
      target_price DECIMAL(16, 8) DEFAULT NULL,
      sl_price DECIMAL(16, 8) DEFAULT NULL,
      quantity DECIMAL(16, 8) DEFAULT NULL,
      last_check_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_symbol (symbol)
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS compound_bot_cycles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cycle_number INT NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) DEFAULT 'BUY',
      notional_in DECIMAL(12, 4) NOT NULL,
      notional_out DECIMAL(12, 4) DEFAULT NULL,
      entry_price DECIMAL(16, 8) NOT NULL,
      target_price DECIMAL(16, 8) NOT NULL,
      exit_price DECIMAL(16, 8) DEFAULT NULL,
      quantity DECIMAL(16, 8) NOT NULL,
      leverage INT NOT NULL,
      pnl_usd DECIMAL(12, 4) DEFAULT 0.0000,
      pnl_percent DECIMAL(8, 4) DEFAULT 0.0000,
      status VARCHAR(20) DEFAULT 'OPEN',
      binance_buy_order_id VARCHAR(100) DEFAULT NULL,
      binance_sell_order_id VARCHAR(100) DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME DEFAULT NULL
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS compound_bot_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      level VARCHAR(20) DEFAULT 'INFO',
      category VARCHAR(30) DEFAULT 'SYSTEM',
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auto-migration for existing tables (e.g. VPS database upgrade to multi-coin):
  try {
    await executeQuery(`ALTER TABLE compound_bot_config MODIFY id INT AUTO_INCREMENT`);
  } catch (alterErr: any) {
    // ignore if already auto_increment
  }

  try {
    await executeQuery(`ALTER TABLE compound_bot_config ADD UNIQUE KEY uq_symbol (symbol)`);
  } catch (keyErr: any) {
    // ignore if index already exists
  }

  // Ensure default BTCUSDT coin exists if table completely empty
  const existing: any = await executeQuery(`SELECT count(*) as count FROM compound_bot_config`);
  if (!existing || existing[0].count === 0) {
    await executeQuery(`
      INSERT INTO compound_bot_config 
        (symbol, is_active, notional_usd, current_notional, leverage, compound_percent, current_cycle, total_profit)
      VALUES 
        ('BTCUSDT', false, 100.0000, 100.0000, 20, 1.0000, 0, 0.0000)
    `);
  }
}

/**
 * Add a log entry
 */
export async function addBotLog(category: string, message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO') {
  try {
    await executeQuery(`
      INSERT INTO compound_bot_logs (level, category, message)
      VALUES (?, ?, ?)
    `, [level, category, message]);

    // Trim logs to keep table light (keep latest 300)
    await executeQuery(`
      DELETE FROM compound_bot_logs 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM compound_bot_logs ORDER BY id DESC LIMIT 300
        ) as t
      )
    `);
  } catch (err) {
    console.error("Failed to insert bot log:", err);
  }
}

/**
 * Validate pair against Binance Futures FAPI
 */
export async function validateFuturesPair(symbol: string) {
  const cleanSymbol = (symbol || '').toUpperCase().trim();
  if (!cleanSymbol) {
    return { isValid: false, error: 'Simbol pair wajib diisi (contoh: BTCUSDT).' };
  }

  try {
    const prec = await getSymbolPrecision(cleanSymbol);

    // Fetch 24hr ticker
    const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/24hr?symbol=${cleanSymbol}`, { cache: 'no-store' });
    if (!tickerRes.ok) {
      return { 
        isValid: false, 
        error: `Pair ${cleanSymbol} tidak ditemukan di Binance Futures USDT-M.` 
      };
    }

    const ticker = await tickerRes.json();
    if (!ticker || !ticker.lastPrice) {
      return { 
        isValid: false, 
        error: `Data pasar untuk ${cleanSymbol} tidak dapat dimuat.` 
      };
    }

    return {
      isValid: true,
      symbol: cleanSymbol,
      lastPrice: parseFloat(ticker.lastPrice),
      priceChangePercent: parseFloat(ticker.priceChangePercent) || 0,
      highPrice: parseFloat(ticker.highPrice) || 0,
      lowPrice: parseFloat(ticker.lowPrice) || 0,
      quoteVolume: parseFloat(ticker.quoteVolume) || 0,
      precision: prec
    };
  } catch (err: any) {
    return {
      isValid: false,
      error: err.message || 'Gagal memvalidasi pair ke server Binance.'
    };
  }
}

/**
 * Get current bot full state (Multi-Coin support)
 */
export async function getBotState() {
  await ensureCompoundBotTables();

  // 1. Fetch all configured coins
  const cfgRows: any = await executeQuery(`
    SELECT * FROM compound_bot_config 
    ORDER BY is_active DESC, updated_at DESC, id ASC
  `);

  const coins: CompoundBotConfig[] = cfgRows.map((r: any) => ({
    ...r,
    id: parseInt(r.id),
    notional_usd: parseFloat(r.notional_usd) || 100,
    current_notional: parseFloat(r.current_notional) || 100,
    leverage: parseInt(r.leverage) || 20,
    compound_percent: parseFloat(r.compound_percent) || 1.0,
    stop_loss_percent: r.stop_loss_percent ? parseFloat(r.stop_loss_percent) : null,
    total_profit: parseFloat(r.total_profit) || 0,
    entry_price: r.entry_price ? parseFloat(r.entry_price) : null,
    target_price: r.target_price ? parseFloat(r.target_price) : null,
    sl_price: r.sl_price ? parseFloat(r.sl_price) : null,
    quantity: r.quantity ? parseFloat(r.quantity) : null,
    is_active: Boolean(r.is_active)
  }));

  // 2. Fetch all active open cycles
  const activeCycleRows: any = await executeQuery(`
    SELECT * FROM compound_bot_cycles 
    WHERE status = 'OPEN' 
    ORDER BY id DESC
  `);

  const activeCycles: CompoundBotCycle[] = activeCycleRows.map((r: any) => ({
    ...r,
    notional_in: parseFloat(r.notional_in),
    notional_out: r.notional_out ? parseFloat(r.notional_out) : null,
    entry_price: parseFloat(r.entry_price),
    target_price: parseFloat(r.target_price),
    exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
    quantity: parseFloat(r.quantity),
    pnl_usd: parseFloat(r.pnl_usd),
    pnl_percent: parseFloat(r.pnl_percent),
    leverage: parseInt(r.leverage)
  }));

  // Map of active cycles by symbol
  const activeCyclesMap: Record<string, CompoundBotCycle> = {};
  for (const c of activeCycles) {
    activeCyclesMap[c.symbol] = c;
  }

  // 3. Cycles history (latest 100)
  const historyRows: any = await executeQuery(`
    SELECT * FROM compound_bot_cycles 
    ORDER BY id DESC LIMIT 100
  `);
  const history: CompoundBotCycle[] = historyRows.map((r: any) => ({
    ...r,
    notional_in: parseFloat(r.notional_in),
    notional_out: r.notional_out ? parseFloat(r.notional_out) : null,
    entry_price: parseFloat(r.entry_price),
    target_price: parseFloat(r.target_price),
    exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
    quantity: parseFloat(r.quantity),
    pnl_usd: parseFloat(r.pnl_usd),
    pnl_percent: parseFloat(r.pnl_percent),
    leverage: parseInt(r.leverage)
  }));

  // 4. Latest 80 logs
  const logsRows: any = await executeQuery(`
    SELECT * FROM compound_bot_logs 
    ORDER BY id DESC LIMIT 80
  `);
  const logs: CompoundBotLog[] = logsRows;

  // 5. Calculate Global Stats
  const activeCoins = coins.filter(c => c.is_active);
  const completedCycles = history.filter(h => h.status === 'TARGET_HIT');
  const finishedCycles = history.filter(h => h.status !== 'OPEN');
  const winRate = finishedCycles.length > 0 
    ? (completedCycles.length / finishedCycles.length) * 100 
    : 0;

  const totalProfitUsd = coins.reduce((acc, c) => acc + (c.total_profit || 0), 0);
  const totalActiveNotional = activeCoins.reduce((acc, c) => acc + (c.current_notional || 0), 0);

  // 6. Check Binance Credentials availability
  const creds = getBinanceCredentials();
  const hasApiKeys = Boolean(creds.apiKey && creds.apiSecret);

  // 7. Fetch Live Prices for all configured symbols
  const livePrices: Record<string, number> = {};
  try {
    const symbolsToFetch = coins.map(c => c.symbol);
    if (symbolsToFetch.length > 0) {
      const tickerAllRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price`, { cache: 'no-store' });
      const tickerAllData = await tickerAllRes.json();
      if (Array.isArray(tickerAllData)) {
        for (const item of tickerAllData) {
          if (symbolsToFetch.includes(item.symbol)) {
            livePrices[item.symbol] = parseFloat(item.price);
          }
        }
      }
    }
  } catch {
    // ignore
  }

  return {
    coins,
    activeCycles,
    activeCyclesMap,
    history,
    logs,
    stats: {
      totalCoins: coins.length,
      activeCoins: activeCoins.length,
      totalCycles: completedCycles.length,
      totalProfitUsd: parseFloat(totalProfitUsd.toFixed(2)),
      totalActiveNotional: parseFloat(totalActiveNotional.toFixed(2)),
      winRate: parseFloat(winRate.toFixed(1))
    },
    livePrices,
    hasApiKeys
  };
}

/**
 * Save / Update Coin Configuration without starting
 */
export async function saveCoinConfig(params: {
  symbol: string;
  notionalUsd: number;
  leverage: number;
  compoundPercent: number;
  stopLossPercent?: number | null;
}) {
  await ensureCompoundBotTables();

  const { symbol, notionalUsd, leverage, compoundPercent, stopLossPercent } = params;
  const cleanSymbol = symbol.toUpperCase().trim();

  // Validate
  const validCheck = await validateFuturesPair(cleanSymbol);
  if (!validCheck.isValid) {
    throw new Error(validCheck.error || 'Pair tidak valid di Binance Futures.');
  }

  await executeQuery(`
    INSERT INTO compound_bot_config 
      (symbol, is_active, notional_usd, current_notional, leverage, compound_percent, stop_loss_percent)
    VALUES 
      (?, false, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      notional_usd = VALUES(notional_usd),
      current_notional = IF(is_active = true, current_notional, VALUES(notional_usd)),
      leverage = VALUES(leverage),
      compound_percent = VALUES(compound_percent),
      stop_loss_percent = VALUES(stop_loss_percent)
  `, [
    cleanSymbol,
    notionalUsd,
    notionalUsd,
    leverage,
    compoundPercent,
    stopLossPercent || null
  ]);

  await addBotLog('SYSTEM', `⚙️ Konfigurasi koin ${cleanSymbol} disimpan (Notional: $${notionalUsd}, Leverage: ${leverage}x, Target: +${compoundPercent}%).`, 'INFO');

  return { success: true, symbol: cleanSymbol };
}

/**
 * Start Bot for a specific Coin (Places Initial Buy Order and initiates Cycle #1)
 */
export async function startCompoundBot(params: {
  symbol: string;
  notionalUsd: number;
  leverage: number;
  compoundPercent: number;
  stopLossPercent?: number | null;
}) {
  await ensureCompoundBotTables();

  const { symbol, notionalUsd, leverage, compoundPercent, stopLossPercent } = params;
  const cleanSymbol = symbol.toUpperCase().trim();

  // 1. Pair Validation
  const validCheck = await validateFuturesPair(cleanSymbol);
  if (!validCheck.isValid) {
    throw new Error(validCheck.error || 'Pair tidak valid di Binance Futures.');
  }

  if (!notionalUsd || notionalUsd <= 0) {
    throw new Error('Nominal Ukuran Posisi Notional harus lebih besar dari 0 USD.');
  }
  if (!leverage || leverage <= 0) {
    throw new Error('Leverage harus lebih besar dari 0.');
  }
  if (!compoundPercent || compoundPercent <= 0) {
    throw new Error('Persentase compound per kenaikan harga harus lebih besar dari 0% (contoh: 1.0%).');
  }

  // 2. Check if this coin already has an active cycle
  const openRows: any = await executeQuery(`
    SELECT count(*) as count FROM compound_bot_cycles 
    WHERE symbol = ? AND status = 'OPEN'
  `, [cleanSymbol]);

  if (openRows && openRows[0].count > 0) {
    throw new Error(`Koin ${cleanSymbol} sudah memiliki posisi compound aktif yang sedang berjalan! Hentikan terlebih dahulu.`);
  }

  // 3. Execute Initial BUY Order on Binance
  await addBotLog('START', `🚀 [${cleanSymbol}] Memulai Bot Compound Future (Notional: $${notionalUsd} USD, Leverage: ${leverage}x, Target: +${compoundPercent}%)...`, 'INFO');

  const buyResult = await executeCompoundBuyOrder({
    symbol: cleanSymbol,
    notionalUsd,
    leverage
  });

  const entryPrice = buyResult.fillPrice;
  const executedQty = buyResult.quantity;
  const targetPrice = entryPrice * (1 + compoundPercent / 100);
  const slPrice = stopLossPercent && stopLossPercent > 0 
    ? entryPrice * (1 - stopLossPercent / 100) 
    : null;

  // 4. Record Cycle #1 for this coin
  await executeQuery(`
    INSERT INTO compound_bot_cycles 
      (cycle_number, symbol, side, notional_in, entry_price, target_price, quantity, leverage, status, binance_buy_order_id, created_at)
    VALUES 
      (1, ?, 'BUY', ?, ?, ?, ?, ?, 'OPEN', ?, NOW())
  `, [
    cleanSymbol,
    notionalUsd,
    entryPrice,
    targetPrice,
    executedQty,
    leverage,
    buyResult.orderId
  ]);

  // 5. Update or Insert Bot Config for this coin
  await executeQuery(`
    INSERT INTO compound_bot_config 
      (symbol, is_active, notional_usd, current_notional, leverage, compound_percent, stop_loss_percent, current_cycle, entry_price, target_price, sl_price, quantity, last_check_at)
    VALUES 
      (?, true, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, NOW())
    ON DUPLICATE KEY UPDATE
      is_active = true,
      notional_usd = VALUES(notional_usd),
      current_notional = VALUES(notional_usd),
      leverage = VALUES(leverage),
      compound_percent = VALUES(compound_percent),
      stop_loss_percent = VALUES(stop_loss_percent),
      current_cycle = 1,
      entry_price = VALUES(entry_price),
      target_price = VALUES(target_price),
      sl_price = VALUES(sl_price),
      quantity = VALUES(quantity),
      last_check_at = NOW()
  `, [
    cleanSymbol,
    notionalUsd,
    notionalUsd,
    leverage,
    compoundPercent,
    slPrice ? stopLossPercent : null,
    entryPrice,
    targetPrice,
    slPrice,
    executedQty
  ]);

  const marginEst = (notionalUsd / leverage).toFixed(2);
  await addBotLog('BUY', `🟢 [${cleanSymbol} #1] Order BUY tereksekusi di Binance! ${executedQty} ${cleanSymbol} @ $${entryPrice.toFixed(4)} (Margin: $${marginEst} USDT). Target Exit (+${compoundPercent}%): $${targetPrice.toFixed(4)}.`, 'SUCCESS');

  return {
    success: true,
    cycleNumber: 1,
    symbol: cleanSymbol,
    entryPrice,
    targetPrice,
    quantity: executedQty,
    notionalUsd,
    buyOrderId: buyResult.orderId
  };
}

/**
 * Stop Bot for a specific Coin or ALL Coins
 */
export async function stopCompoundBot(params: {
  symbol?: string; // 'ALL' or specific symbol like 'BTCUSDT'
  closeMarketPosition?: boolean;
}) {
  await ensureCompoundBotTables();

  const { symbol = 'ALL', closeMarketPosition = true } = params;
  const isStopAll = !symbol || symbol.toUpperCase() === 'ALL';

  let symbolsToStop: string[] = [];

  if (isStopAll) {
    const activeCoins: any = await executeQuery(`SELECT symbol FROM compound_bot_config WHERE is_active = true`);
    symbolsToStop = activeCoins.map((c: any) => c.symbol);
  } else {
    symbolsToStop = [symbol.toUpperCase().trim()];
  }

  const results = [];

  for (const sym of symbolsToStop) {
    const activeRows: any = await executeQuery(`
      SELECT * FROM compound_bot_cycles 
      WHERE symbol = ? AND status = 'OPEN' 
      ORDER BY id DESC LIMIT 1
    `, [sym]);

    let closeResult = null;
    if (activeRows && activeRows.length > 0) {
      const cycle = activeRows[0];
      const qty = parseFloat(cycle.quantity);
      const entryPrice = parseFloat(cycle.entry_price);

      if (closeMarketPosition && qty > 0) {
        try {
          closeResult = await executeCompoundCloseOrder({
            symbol: sym,
            quantity: qty
          });

          const exitPrice = closeResult.exitPrice;
          const realizedPnl = (exitPrice - entryPrice) * qty;
          const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100;

          await executeQuery(`
            UPDATE compound_bot_cycles 
            SET status = 'STOPPED',
                exit_price = ?,
                notional_out = ?,
                pnl_usd = ?,
                pnl_percent = ?,
                binance_sell_order_id = ?,
                closed_at = NOW()
            WHERE id = ?
          `, [
            exitPrice,
            qty * exitPrice,
            realizedPnl,
            pnlPercent,
            closeResult.orderId,
            cycle.id
          ]);

          // Update total profit in config for this coin
          await executeQuery(`
            UPDATE compound_bot_config 
            SET total_profit = total_profit + ? 
            WHERE symbol = ?
          `, [realizedPnl, sym]);

          await addBotLog('STOP', `🛑 [${sym}] Bot dihentikan. Posisi Cycle #${cycle.cycle_number} ditutup di harga $${exitPrice.toFixed(4)} (PnL: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)} USDT / ${pnlPercent.toFixed(2)}%).`, 'WARN');
        } catch (err: any) {
          console.error(`Gagal menutup posisi ${sym} saat STOP:`, err);
          await addBotLog('ERROR', `❌ [${sym}] Gagal menutup posisi pasar saat STOP: ${err.message}.`, 'ERROR');
        }
      } else {
        await executeQuery(`
          UPDATE compound_bot_cycles 
          SET status = 'STOPPED', closed_at = NOW() 
          WHERE id = ?
        `, [cycle.id]);

        await addBotLog('STOP', `🛑 [${sym}] Bot dihentikan. Posisi Cycle #${cycle.cycle_number} dibiarkan aktif di Binance (Manual Exit).`, 'WARN');
      }
    }

    // Set config active = false for this coin
    await executeQuery(`
      UPDATE compound_bot_config 
      SET is_active = false,
          entry_price = NULL,
          target_price = NULL,
          sl_price = NULL,
          quantity = NULL
      WHERE symbol = ?
    `, [sym]);

    results.push({ symbol: sym, closedPosition: Boolean(closeResult) });
  }

  await addBotLog('STOP', `⏹️ Selesai menghentikan ${results.length} koin compound bot.`, 'INFO');

  return { success: true, count: results.length, results };
}

/**
 * Delete a Coin from Config (Only allowed if inactive)
 */
export async function deleteCoinConfig(symbol: string) {
  await ensureCompoundBotTables();
  const cleanSymbol = symbol.toUpperCase().trim();

  const cfgRows: any = await executeQuery(`SELECT * FROM compound_bot_config WHERE symbol = ?`, [cleanSymbol]);
  if (!cfgRows || cfgRows.length === 0) {
    return { success: false, error: 'Koin tidak ditemukan.' };
  }

  if (cfgRows[0].is_active) {
    throw new Error(`Koin ${cleanSymbol} sedang berjalan (RUNNING). Hentikan (STOP) terlebih dahulu sebelum menghapus.`);
  }

  await executeQuery(`DELETE FROM compound_bot_config WHERE symbol = ?`, [cleanSymbol]);
  await addBotLog('SYSTEM', `🗑️ Koin ${cleanSymbol} telah dihapus dari daftar bot.`, 'INFO');

  return { success: true, symbol: cleanSymbol };
}

/**
 * Bot Engine Tick: Evaluates current prices for ALL ACTIVE COINS and performs Compound Re-investing
 */
export async function tickCompoundBot() {
  if (isTicking) {
    return { status: 'BUSY', message: 'Tick sebelumnya masih dalam proses.' };
  }

  isTicking = true;
  try {
    await ensureCompoundBotTables();

    // 1. Get all active coins
    const activeCoins: any = await executeQuery(`SELECT * FROM compound_bot_config WHERE is_active = true`);

    if (!activeCoins || activeCoins.length === 0) {
      return { status: 'IDLE', activeCount: 0, message: 'Tidak ada bot koin yang aktif (STOPPED).' };
    }

    // 2. Fetch live prices for all active symbols in bulk
    const activeSymbols = activeCoins.map((c: any) => c.symbol);
    const tickerMap: Record<string, number> = {};

    try {
      const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price`, { cache: 'no-store' });
      const tickerData = await tickerRes.json();
      if (Array.isArray(tickerData)) {
        for (const t of tickerData) {
          if (activeSymbols.includes(t.symbol)) {
            tickerMap[t.symbol] = parseFloat(t.price);
          }
        }
      }
    } catch (err) {
      console.error("Bulk ticker error:", err);
    }

    const tickResults = [];

    // 3. Evaluate each active coin independently
    for (const coin of activeCoins) {
      const symbol = coin.symbol;
      const compoundPercent = parseFloat(coin.compound_percent) || 1.0;
      const stopLossPercent = coin.stop_loss_percent ? parseFloat(coin.stop_loss_percent) : null;
      const leverage = parseInt(coin.leverage) || 20;

      // Find open cycle for this coin
      const cycleRows: any = await executeQuery(`
        SELECT * FROM compound_bot_cycles 
        WHERE symbol = ? AND status = 'OPEN' 
        ORDER BY id DESC LIMIT 1
      `, [symbol]);

      if (!cycleRows || cycleRows.length === 0) {
        tickResults.push({ symbol, status: 'NO_OPEN_CYCLE' });
        continue;
      }

      const activeCycle = cycleRows[0];
      const cycleNum = parseInt(activeCycle.cycle_number);
      const entryPrice = parseFloat(activeCycle.entry_price);
      const targetPrice = parseFloat(activeCycle.target_price);
      const quantity = parseFloat(activeCycle.quantity);
      const currentNotional = parseFloat(activeCycle.notional_in);

      // Get price from map or single fallback
      let currentPrice = tickerMap[symbol] || 0;
      if (!currentPrice) {
        try {
          const singleRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
          const singleData = await singleRes.json();
          currentPrice = parseFloat(singleData.price) || 0;
        } catch {
          // ignore
        }
      }

      if (currentPrice <= 0) {
        tickResults.push({ symbol, status: 'PRICE_UNAVAILABLE' });
        continue;
      }

      // Update last_check_at for this coin
      await executeQuery(`UPDATE compound_bot_config SET last_check_at = NOW() WHERE symbol = ?`, [symbol]);

      const unrealizedPnl = (currentPrice - entryPrice) * quantity;
      const priceChangePct = ((currentPrice - entryPrice) / entryPrice) * 100;
      const progressToTarget = Math.min(100, Math.max(0, (priceChangePct / compoundPercent) * 100));

      // =========================================================================
      // CASE 1: TARGET HIT (COMPOUND TRIGGER!)
      // =========================================================================
      if (currentPrice >= targetPrice) {
        await addBotLog('TARGET_HIT', `🎯 [${symbol}] TARGET TERCAPAI! Harga ($${currentPrice.toFixed(4)}) telah menyentuh target exit ($${targetPrice.toFixed(4)}). Menutup posisi Cycle #${cycleNum}...`, 'SUCCESS');

        try {
          // 1. Close current position
          const closeRes = await executeCompoundCloseOrder({
            symbol,
            quantity
          });

          const exitPrice = closeRes.exitPrice;
          const realizedPnl = (exitPrice - entryPrice) * quantity;
          const realizedPnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;

          // 2. Mark Cycle as TARGET_HIT
          await executeQuery(`
            UPDATE compound_bot_cycles 
            SET status = 'TARGET_HIT',
                exit_price = ?,
                notional_out = ?,
                pnl_usd = ?,
                pnl_percent = ?,
                binance_sell_order_id = ?,
                closed_at = NOW()
            WHERE id = ?
          `, [
            exitPrice,
            quantity * exitPrice,
            realizedPnl,
            realizedPnlPct,
            closeRes.orderId,
            activeCycle.id
          ]);

          await addBotLog('CLOSE', `💰 [${symbol} #${cycleNum}] Sukses! Posisi ditutup @ $${exitPrice.toFixed(4)}. Profit: +$${realizedPnl.toFixed(2)} USDT (+${realizedPnlPct.toFixed(2)}%).`, 'SUCCESS');

          // 3. Compute NEXT COMPOUNDED NOTIONAL
          const nextNotionalRaw = currentNotional * (1 + compoundPercent / 100);
          const nextNotional = Math.round(nextNotionalRaw * 100) / 100;
          const nextCycleNum = cycleNum + 1;

          await addBotLog('COMPOUND', `🔄 [${symbol} Compounding] Modal posisi berikutnya bertambah dari $${currentNotional.toFixed(2)} USD ➔ $${nextNotional.toFixed(2)} USD (+${compoundPercent}%). Membuka Cycle #${nextCycleNum}...`, 'INFO');

          // 4. Place NEW MARKET BUY for Next Cycle
          const nextBuyRes = await executeCompoundBuyOrder({
            symbol,
            notionalUsd: nextNotional,
            leverage
          });

          const nextEntryPrice = nextBuyRes.fillPrice;
          const nextQty = nextBuyRes.quantity;
          const nextTargetPrice = nextEntryPrice * (1 + compoundPercent / 100);
          const nextSlPrice = stopLossPercent && stopLossPercent > 0 
            ? nextEntryPrice * (1 - stopLossPercent / 100) 
            : null;

          // Insert new cycle
          await executeQuery(`
            INSERT INTO compound_bot_cycles 
              (cycle_number, symbol, side, notional_in, entry_price, target_price, quantity, leverage, status, binance_buy_order_id, created_at)
            VALUES 
              (?, ?, 'BUY', ?, ?, ?, ?, ?, 'OPEN', ?, NOW())
          `, [
            nextCycleNum,
            symbol,
            nextNotional,
            nextEntryPrice,
            nextTargetPrice,
            nextQty,
            leverage,
            nextBuyRes.orderId
          ]);

          // Update coin config
          await executeQuery(`
            UPDATE compound_bot_config 
            SET current_cycle = ?,
                current_notional = ?,
                entry_price = ?,
                target_price = ?,
                sl_price = ?,
                quantity = ?,
                total_profit = total_profit + ?
            WHERE symbol = ?
          `, [
            nextCycleNum,
            nextNotional,
            nextEntryPrice,
            nextTargetPrice,
            nextSlPrice,
            nextQty,
            realizedPnl,
            symbol
          ]);

          await addBotLog('BUY', `🚀 [${symbol} #${nextCycleNum}] Posisi baru berhasil dibuka! BUY ${nextQty} ${symbol} senilai $${nextNotional.toFixed(2)} USD @ $${nextEntryPrice.toFixed(4)}. Target exit baru (+${compoundPercent}%): $${nextTargetPrice.toFixed(4)}.`, 'SUCCESS');

          tickResults.push({
            symbol,
            status: 'COMPOUND_EXECUTED',
            previousCycle: cycleNum,
            newCycle: nextCycleNum,
            realizedPnl,
            nextNotional
          });
          continue;
        } catch (compErr: any) {
          console.error(`Error compounding for ${symbol}:`, compErr);
          await addBotLog('ERROR', `❌ [${symbol}] Gagal re-open compound di Binance: ${compErr.message}.`, 'ERROR');
          await executeQuery(`UPDATE compound_bot_config SET is_active = false WHERE symbol = ?`, [symbol]);
          tickResults.push({ symbol, status: 'ERROR', error: compErr.message });
          continue;
        }
      }

      // =========================================================================
      // CASE 2: STOP LOSS HIT (IF CONFIGURED)
      // =========================================================================
      if (stopLossPercent && stopLossPercent > 0) {
        const slPrice = entryPrice * (1 - stopLossPercent / 100);
        if (currentPrice <= slPrice) {
          await addBotLog('WARN', `⚠️ [${symbol}] STOP LOSS TERPICU! Harga ($${currentPrice.toFixed(4)}) turun di bawah SL ($${slPrice.toFixed(4)}). Menutup posisi...`, 'WARN');

          try {
            const closeRes = await executeCompoundCloseOrder({
              symbol,
              quantity
            });

            const exitPrice = closeRes.exitPrice;
            const realizedPnl = (exitPrice - entryPrice) * quantity;
            const realizedPnlPct = ((exitPrice - entryPrice) / entryPrice) * 100;

            await executeQuery(`
              UPDATE compound_bot_cycles 
              SET status = 'SL_HIT',
                  exit_price = ?,
                  notional_out = ?,
                  pnl_usd = ?,
                  pnl_percent = ?,
                  binance_sell_order_id = ?,
                  closed_at = NOW()
              WHERE id = ?
            `, [
              exitPrice,
              quantity * exitPrice,
              realizedPnl,
              realizedPnlPct,
              closeRes.orderId,
              activeCycle.id
            ]);

            await executeQuery(`
              UPDATE compound_bot_config 
              SET is_active = false,
                  total_profit = total_profit + ? 
              WHERE symbol = ?
            `, [realizedPnl, symbol]);

            await addBotLog('STOP', `🛑 [${symbol}] Posisi ditutup karena Stop Loss @ $${exitPrice.toFixed(4)} (PnL: $${realizedPnl.toFixed(2)} USDT / ${realizedPnlPct.toFixed(2)}%). Bot koin ini dihentikan.`, 'WARN');

            tickResults.push({ symbol, status: 'STOP_LOSS_HIT', exitPrice, realizedPnl });
            continue;
          } catch (slErr: any) {
            console.error(`Gagal Stop Loss untuk ${symbol}:`, slErr);
          }
        }
      }

      // Normal Monitoring
      tickResults.push({
        symbol,
        status: 'MONITORING',
        cycleNumber: cycleNum,
        currentPrice,
        entryPrice,
        targetPrice,
        unrealizedPnl,
        priceChangePct,
        progressToTarget
      });
    }

    return {
      status: 'MONITORING',
      activeCount: activeCoins.length,
      coins: tickResults,
      timestamp: new Date().toISOString()
    };
  } catch (err: any) {
    console.error("Tick error:", err);
    return { status: 'ERROR', error: err.message };
  } finally {
    isTicking = false;
  }
}

/**
 * Clear Bot Logs
 */
export async function clearCompoundBotLogs() {
  await ensureCompoundBotTables();
  await executeQuery(`DELETE FROM compound_bot_logs`);
  await addBotLog('SYSTEM', 'Log riwayat aktivitas telah dibersihkan oleh pengguna.', 'INFO');
}
