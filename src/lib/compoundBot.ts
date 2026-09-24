import { executeQuery } from './db';
import {
  executeCompoundBuyOrder,
  executeCompoundCloseOrder,
  getSymbolPrecision,
  getBinanceCredentials,
  fetchRealPosition
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
 * Ensure database tables exist
 */
export async function ensureCompoundBotTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS compound_bot_config (
      id INT PRIMARY KEY,
      symbol VARCHAR(20) DEFAULT 'BTCUSDT',
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
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Ensure default config exists
  const existing: any = await executeQuery(`SELECT count(*) as count FROM compound_bot_config WHERE id = 1`);
  if (!existing || existing[0].count === 0) {
    await executeQuery(`
      INSERT INTO compound_bot_config 
        (id, symbol, is_active, notional_usd, current_notional, leverage, compound_percent, current_cycle, total_profit)
      VALUES 
        (1, 'BTCUSDT', false, 100.0000, 100.0000, 20, 1.0000, 0, 0.0000)
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
 * Get current bot full state
 */
export async function getBotState() {
  await ensureCompoundBotTables();

  const cfgRows: any = await executeQuery(`SELECT * FROM compound_bot_config WHERE id = 1`);
  const config: CompoundBotConfig = cfgRows[0] || {
    id: 1,
    symbol: 'BTCUSDT',
    is_active: false,
    notional_usd: 100,
    current_notional: 100,
    leverage: 20,
    compound_percent: 1.0,
    stop_loss_percent: null,
    current_cycle: 0,
    total_profit: 0,
    entry_price: null,
    target_price: null,
    sl_price: null,
    quantity: null,
    last_check_at: null,
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  // Convert numbers from MySQL strings
  config.notional_usd = parseFloat(config.notional_usd as any) || 100;
  config.current_notional = parseFloat(config.current_notional as any) || 100;
  config.leverage = parseInt(config.leverage as any) || 20;
  config.compound_percent = parseFloat(config.compound_percent as any) || 1.0;
  config.stop_loss_percent = config.stop_loss_percent ? parseFloat(config.stop_loss_percent as any) : null;
  config.total_profit = parseFloat(config.total_profit as any) || 0;
  config.entry_price = config.entry_price ? parseFloat(config.entry_price as any) : null;
  config.target_price = config.target_price ? parseFloat(config.target_price as any) : null;
  config.sl_price = config.sl_price ? parseFloat(config.sl_price as any) : null;
  config.quantity = config.quantity ? parseFloat(config.quantity as any) : null;
  config.is_active = Boolean(config.is_active);

  // Active open cycle
  const activeCycleRows: any = await executeQuery(`
    SELECT * FROM compound_bot_cycles 
    WHERE status = 'OPEN' 
    ORDER BY id DESC LIMIT 1
  `);
  let activeCycle: CompoundBotCycle | null = null;
  if (activeCycleRows && activeCycleRows.length > 0) {
    const r = activeCycleRows[0];
    activeCycle = {
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
    };
  }

  // Cycles history (latest 50)
  const historyRows: any = await executeQuery(`
    SELECT * FROM compound_bot_cycles 
    ORDER BY id DESC LIMIT 50
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

  // Latest 60 logs
  const logsRows: any = await executeQuery(`
    SELECT * FROM compound_bot_logs 
    ORDER BY id DESC LIMIT 60
  `);
  const logs: CompoundBotLog[] = logsRows;

  // Stats calculation
  const completedCycles = history.filter(h => h.status === 'TARGET_HIT');
  const winRate = history.length > 0 
    ? (completedCycles.length / history.filter(h => h.status !== 'OPEN').length) * 100 || 0 
    : 0;

  // Check Binance Credentials availability
  const creds = getBinanceCredentials();
  const hasApiKeys = Boolean(creds.apiKey && creds.apiSecret);

  // Live price
  let livePrice: number | null = null;
  try {
    const sym = activeCycle ? activeCycle.symbol : config.symbol;
    const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${sym}`, { cache: 'no-store' });
    const tickerData = await tickerRes.json();
    livePrice = parseFloat(tickerData.price) || null;
  } catch {
    // ignore
  }

  return {
    config,
    activeCycle,
    history,
    logs,
    stats: {
      totalCycles: completedCycles.length,
      totalProfitUsd: config.total_profit,
      winRate: parseFloat(winRate.toFixed(1)),
      currentNotional: config.current_notional
    },
    livePrice,
    hasApiKeys
  };
}

/**
 * Start Bot: Places Initial Buy Order and initiates Cycle #1
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

  // 2. Check if already active
  const openRows: any = await executeQuery(`SELECT count(*) as count FROM compound_bot_cycles WHERE status = 'OPEN'`);
  if (openRows && openRows[0].count > 0) {
    throw new Error('Masih ada posisi compound yang sedang berjalan! Hentikan (STOP) terlebih dahulu sebelum memulai sesi baru.');
  }

  // 3. Execute Initial BUY Order on Binance
  await addBotLog('START', `🚀 Memulai Bot Compound Future untuk ${cleanSymbol} (Notional: $${notionalUsd} USD, Leverage: ${leverage}x, Target: +${compoundPercent}%)...`, 'INFO');

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

  // 4. Record Cycle #1
  const insertCycle: any = await executeQuery(`
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

  // 5. Update Bot Config
  await executeQuery(`
    UPDATE compound_bot_config 
    SET symbol = ?,
        is_active = true,
        notional_usd = ?,
        current_notional = ?,
        leverage = ?,
        compound_percent = ?,
        stop_loss_percent = ?,
        current_cycle = 1,
        entry_price = ?,
        target_price = ?,
        sl_price = ?,
        quantity = ?,
        last_check_at = NOW()
    WHERE id = 1
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
  await addBotLog('BUY', `🟢 [Cycle #1] Order BUY tereksekusi di Binance! ${executedQty} ${cleanSymbol} @ $${entryPrice.toFixed(4)} (Margin: $${marginEst} USDT). Target Exit (+${compoundPercent}%): $${targetPrice.toFixed(4)}.`, 'SUCCESS');

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
 * Stop Bot: Stops monitoring and optionally closes open market position
 */
export async function stopCompoundBot(closeMarketPosition: boolean = true) {
  await ensureCompoundBotTables();

  const cfgRows: any = await executeQuery(`SELECT * FROM compound_bot_config WHERE id = 1`);
  const config = cfgRows[0];

  const activeRows: any = await executeQuery(`
    SELECT * FROM compound_bot_cycles 
    WHERE status = 'OPEN' 
    ORDER BY id DESC LIMIT 1
  `);

  let closeResult = null;
  if (activeRows && activeRows.length > 0) {
    const cycle = activeRows[0];
    const qty = parseFloat(cycle.quantity);
    const entryPrice = parseFloat(cycle.entry_price);

    if (closeMarketPosition && qty > 0) {
      try {
        closeResult = await executeCompoundCloseOrder({
          symbol: cycle.symbol,
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

        // Update total profit in config
        await executeQuery(`
          UPDATE compound_bot_config 
          SET total_profit = total_profit + ? 
          WHERE id = 1
        `, [realizedPnl]);

        await addBotLog('STOP', `🛑 Bot dihentikan. Posisi Cycle #${cycle.cycle_number} ditutup di harga $${exitPrice.toFixed(4)} (PnL: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)} USDT / ${pnlPercent.toFixed(2)}%).`, 'WARN');
      } catch (err: any) {
        console.error("Gagal menutup posisi saat STOP:", err);
        await addBotLog('ERROR', `❌ Gagal menutup posisi pasar saat STOP: ${err.message}. Posisi mungkin masih terbuka di akun Binance Anda.`, 'ERROR');
      }
    } else {
      // Just mark cycle as stopped without closing on Binance
      await executeQuery(`
        UPDATE compound_bot_cycles 
        SET status = 'STOPPED', closed_at = NOW() 
        WHERE id = ?
      `, [cycle.id]);

      await addBotLog('STOP', `🛑 Bot dihentikan. Posisi Cycle #${cycle.cycle_number} (${cycle.symbol}) tetap dibiarkan aktif di Binance (Manual Exit).`, 'WARN');
    }
  }

  // Set config active = false
  await executeQuery(`
    UPDATE compound_bot_config 
    SET is_active = false,
        entry_price = NULL,
        target_price = NULL,
        sl_price = NULL,
        quantity = NULL
    WHERE id = 1
  `);

  await addBotLog('STOP', `⏹️ Status Bot Compound Future sekarang STOPPED.`, 'INFO');

  return { success: true, closedPosition: Boolean(closeResult) };
}

/**
 * Bot Engine Tick: Evaluates current prices and performs Compound Re-investing
 */
export async function tickCompoundBot() {
  if (isTicking) {
    return { status: 'BUSY', message: 'Tick sebelumnya masih dalam proses.' };
  }

  isTicking = true;
  try {
    await ensureCompoundBotTables();

    const cfgRows: any = await executeQuery(`SELECT * FROM compound_bot_config WHERE id = 1`);
    if (!cfgRows || cfgRows.length === 0 || !cfgRows[0].is_active) {
      return { status: 'IDLE', message: 'Bot sedang tidak aktif (STOPPED).' };
    }

    const config = cfgRows[0];
    const symbol = config.symbol;
    const compoundPercent = parseFloat(config.compound_percent) || 1.0;
    const stopLossPercent = config.stop_loss_percent ? parseFloat(config.stop_loss_percent) : null;
    const leverage = parseInt(config.leverage) || 20;

    // Check active open cycle
    const activeRows: any = await executeQuery(`
      SELECT * FROM compound_bot_cycles 
      WHERE status = 'OPEN' 
      ORDER BY id DESC LIMIT 1
    `);

    if (!activeRows || activeRows.length === 0) {
      return { status: 'NO_OPEN_CYCLE', message: 'Tidak ada posisi aktif yang sedang dimonitor.' };
    }

    const activeCycle = activeRows[0];
    const cycleNum = parseInt(activeCycle.cycle_number);
    const entryPrice = parseFloat(activeCycle.entry_price);
    const targetPrice = parseFloat(activeCycle.target_price);
    const quantity = parseFloat(activeCycle.quantity);
    const currentNotional = parseFloat(activeCycle.notional_in);

    // Fetch live market ticker
    const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
    const tickerData = await tickerRes.json();
    const currentPrice = parseFloat(tickerData.price) || 0;

    if (currentPrice <= 0) {
      return { status: 'ERROR', message: 'Gagal memuat harga pasar real-time.' };
    }

    // Update last_check_at
    await executeQuery(`UPDATE compound_bot_config SET last_check_at = NOW() WHERE id = 1`);

    // Live Metrics
    const unrealizedPnl = (currentPrice - entryPrice) * quantity;
    const priceChangePct = ((currentPrice - entryPrice) / entryPrice) * 100;
    const progressToTarget = Math.min(100, Math.max(0, (priceChangePct / compoundPercent) * 100));

    // =========================================================================
    // CASE 1: TARGET HIT (COMPOUND TRIGGER!)
    // =========================================================================
    if (currentPrice >= targetPrice) {
      await addBotLog('TARGET_HIT', `🎯 TARGET TERCAPAI! Harga ${symbol} ($${currentPrice.toFixed(4)}) telah menyentuh target exit ($${targetPrice.toFixed(4)}). Menutup posisi Cycle #${cycleNum}...`, 'SUCCESS');

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

      await addBotLog('CLOSE', `💰 Cycle #${cycleNum} Sukses! Posisi ditutup @ $${exitPrice.toFixed(4)}. Realized Profit: +$${realizedPnl.toFixed(2)} USDT (+${realizedPnlPct.toFixed(2)}%).`, 'SUCCESS');

      // 3. Compute NEXT COMPOUNDED NOTIONAL
      // Example: $100 * (1 + 1/100) = $101.00
      const nextNotionalRaw = currentNotional * (1 + compoundPercent / 100);
      const nextNotional = Math.round(nextNotionalRaw * 100) / 100;
      const nextCycleNum = cycleNum + 1;

      await addBotLog('COMPOUND', `🔄 [Compounding Re-invest] Modal posisi berikutnya bertambah dari $${currentNotional.toFixed(2)} USD ➔ $${nextNotional.toFixed(2)} USD (+${compoundPercent}%). Membuka Cycle #${nextCycleNum}...`, 'INFO');

      // 4. Place NEW MARKET BUY for Next Cycle
      try {
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

        // Update config
        await executeQuery(`
          UPDATE compound_bot_config 
          SET current_cycle = ?,
              current_notional = ?,
              entry_price = ?,
              target_price = ?,
              sl_price = ?,
              quantity = ?,
              total_profit = total_profit + ?
          WHERE id = 1
        `, [
          nextCycleNum,
          nextNotional,
          nextEntryPrice,
          nextTargetPrice,
          nextSlPrice,
          nextQty,
          realizedPnl
        ]);

        await addBotLog('BUY', `🚀 [Cycle #${nextCycleNum}] Posisi baru berhasil dibuka! BUY ${nextQty} ${symbol} senilai $${nextNotional.toFixed(2)} USD @ $${nextEntryPrice.toFixed(4)}. Target exit baru (+${compoundPercent}%): $${nextTargetPrice.toFixed(4)}.`, 'SUCCESS');

        return {
          status: 'COMPOUND_EXECUTED',
          previousCycle: cycleNum,
          newCycle: nextCycleNum,
          realizedPnl,
          nextNotional,
          nextEntryPrice,
          nextTargetPrice
        };
      } catch (openErr: any) {
        console.error("Gagal membuka cycle baru setelah compound:", openErr);
        await addBotLog('ERROR', `❌ Gagal membuka Cycle #${nextCycleNum} di Binance: ${openErr.message}. Bot dihentikan.`, 'ERROR');
        await executeQuery(`UPDATE compound_bot_config SET is_active = false WHERE id = 1`);
        return { status: 'ERROR', error: openErr.message };
      }
    }

    // =========================================================================
    // CASE 2: STOP LOSS HIT (IF CONFIGURED)
    // =========================================================================
    if (stopLossPercent && stopLossPercent > 0) {
      const slPrice = entryPrice * (1 - stopLossPercent / 100);
      if (currentPrice <= slPrice) {
        await addBotLog('WARN', `⚠️ STOP LOSS TERPICU! Harga ${symbol} ($${currentPrice.toFixed(4)}) turun di bawah level SL ($${slPrice.toFixed(4)}). Menutup posisi...`, 'WARN');

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
            WHERE id = 1
          `, [realizedPnl]);

          await addBotLog('STOP', `🛑 Posisi ditutup karena Stop Loss @ $${exitPrice.toFixed(4)} (PnL: $${realizedPnl.toFixed(2)} USDT / ${realizedPnlPct.toFixed(2)}%). Bot dihentikan demi proteksi modal.`, 'WARN');

          return {
            status: 'STOP_LOSS_HIT',
            cycleNumber: cycleNum,
            exitPrice,
            realizedPnl
          };
        } catch (slErr: any) {
          console.error("Gagal menutup posisi Stop Loss:", slErr);
          await addBotLog('ERROR', `❌ Gagal eksekusi Stop Loss di Binance: ${slErr.message}`, 'ERROR');
        }
      }
    }

    return {
      status: 'MONITORING',
      cycleNumber: cycleNum,
      symbol,
      currentPrice,
      entryPrice,
      targetPrice,
      unrealizedPnl,
      priceChangePct,
      progressToTarget
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
