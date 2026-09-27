import { executeQuery } from '@/lib/db';
import {
  getBinanceCredentials,
  callBinanceFutures,
  getSymbolPrecision,
  fetchRealPosition,
  fetchOrderRealizedPnl,
  cancelSymbolOpenOrders,
  fetchFuturesAccountBalance,
  BinanceRealPosition,
  BinanceFuturesBalanceInfo
} from '@/lib/binanceOrder';

export interface TopGainerCoin {
  symbol: string;
  priceChangePercent: number;
  lastPrice: number;
  highPrice: number;
  lowPrice: number;
  quoteVolume: number;
  rank: number;
}

export interface TopGainerBotConfig {
  id: number;
  is_active: boolean;
  notional_usd: number;
  leverage: number;
  hold_seconds: number;
  min_gain_percent: number;
  is_compound: boolean;
  emergency_sl_percent: number | null;
  current_state: 'IDLE' | 'SCANNING' | 'HOLDING' | 'CLOSING';
  current_symbol: string | null;
  current_side: 'BUY' | null;
  entry_price: number | null;
  quantity: number | null;
  binance_order_id: string | null;
  entry_time: number | null;
  last_leader_symbol: string | null;
  last_bought_symbol: string | null;
  round_number: number;
  total_profit: number;
  win_count: number;
  loss_count: number;
  last_check_at: string | null;
  updated_at: string;
  created_at: string;
  account_balance?: BinanceFuturesBalanceInfo | null;
  real_position?: BinanceRealPosition | null;
}

export interface TopGainerBotHistory {
  id: number;
  round_number: number;
  symbol: string;
  gain_percent: number;
  notional_usd: number;
  leverage: number;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  hold_seconds: number;
  trade_pnl_usd: number;
  commission_usd: number;
  net_pnl_usd: number;
  net_pnl_percent: number;
  status: string;
  binance_open_order_id: string | null;
  binance_close_order_id: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface TopGainerBotLog {
  id: number;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  created_at: string;
}

let isTickingTopGainer = false;

/**
 * Ensure database tables exist for Top Gainer Scalper Bot
 */
export async function ensureTopGainerBotTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS top_gainer_bot_config (
      id INT PRIMARY KEY,
      is_active BOOLEAN DEFAULT false,
      notional_usd DECIMAL(10, 2) DEFAULT 50.00,
      leverage INT DEFAULT 10,
      hold_seconds INT DEFAULT 20,
      min_gain_percent DECIMAL(8, 2) DEFAULT 3.00,
      is_compound BOOLEAN DEFAULT false,
      emergency_sl_percent DECIMAL(8, 2) DEFAULT 3.00,
      current_state VARCHAR(30) DEFAULT 'IDLE',
      current_symbol VARCHAR(30) DEFAULT NULL,
      current_side VARCHAR(10) DEFAULT 'BUY',
      entry_price DECIMAL(18, 8) DEFAULT NULL,
      quantity DECIMAL(18, 8) DEFAULT NULL,
      binance_order_id VARCHAR(100) DEFAULT NULL,
      entry_time BIGINT DEFAULT NULL,
      last_leader_symbol VARCHAR(30) DEFAULT NULL,
      last_bought_symbol VARCHAR(30) DEFAULT NULL,
      round_number INT DEFAULT 0,
      total_profit DECIMAL(18, 4) DEFAULT 0.0000,
      win_count INT DEFAULT 0,
      loss_count INT DEFAULT 0,
      last_check_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS top_gainer_bot_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      round_number INT NOT NULL,
      symbol VARCHAR(30) NOT NULL,
      gain_percent DECIMAL(8, 2) DEFAULT 0.00,
      notional_usd DECIMAL(10, 2) NOT NULL,
      leverage INT NOT NULL,
      entry_price DECIMAL(18, 8) NOT NULL,
      exit_price DECIMAL(18, 8) DEFAULT NULL,
      quantity DECIMAL(18, 8) NOT NULL,
      hold_seconds INT DEFAULT 20,
      trade_pnl_usd DECIMAL(18, 4) DEFAULT 0.0000,
      commission_usd DECIMAL(18, 4) DEFAULT 0.0000,
      net_pnl_usd DECIMAL(18, 4) DEFAULT 0.0000,
      net_pnl_percent DECIMAL(8, 2) DEFAULT 0.00,
      status VARCHAR(30) DEFAULT 'OPEN',
      binance_open_order_id VARCHAR(100) DEFAULT NULL,
      binance_close_order_id VARCHAR(100) DEFAULT NULL,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME DEFAULT NULL
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS top_gainer_bot_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      level VARCHAR(20) DEFAULT 'INFO',
      category VARCHAR(30) DEFAULT 'SYSTEM',
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Ensure initial config row exists
  const existing: any = await executeQuery(`SELECT count(*) as count FROM top_gainer_bot_config`);
  if (!existing || existing[0].count === 0) {
    await executeQuery(`
      INSERT INTO top_gainer_bot_config 
        (id, is_active, notional_usd, leverage, hold_seconds, min_gain_percent, is_compound, emergency_sl_percent, current_state)
      VALUES 
        (1, false, 50.00, 10, 20, 3.00, false, 3.00, 'IDLE')
    `);
  }
}

/**
 * Add a log entry for Top Gainer Bot
 */
export async function addTopGainerBotLog(
  category: string,
  message: string,
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO'
) {
  try {
    await executeQuery(`
      INSERT INTO top_gainer_bot_logs (level, category, message)
      VALUES (?, ?, ?)
    `, [level, category, message]);

    // Keep latest 300 logs
    await executeQuery(`
      DELETE FROM top_gainer_bot_logs 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM top_gainer_bot_logs ORDER BY id DESC LIMIT 300
        ) as t
      )
    `);
  } catch (err) {
    console.error("Failed to insert top gainer bot log:", err);
  }
}

/**
 * Fetch 24hr Top Gainers from Binance Futures FAPI
 */
export async function fetchTopGainersFromBinance(): Promise<TopGainerCoin[]> {
  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/ticker/24hr', {
      cache: 'no-store'
    });
    if (!res.ok) {
      throw new Error(`Binance 24hr Ticker API returned ${res.status}`);
    }
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    // Filter USDT contracts with valid trading volume
    const usdtCoins = data
      .filter((item: any) => {
        const symbol = item.symbol || '';
        const volume = parseFloat(item.quoteVolume) || 0;
        return symbol.endsWith('USDT') && volume > 100000; // minimal $100k volume
      })
      .map((item: any) => ({
        symbol: item.symbol,
        priceChangePercent: parseFloat(item.priceChangePercent) || 0,
        lastPrice: parseFloat(item.lastPrice) || 0,
        highPrice: parseFloat(item.highPrice) || 0,
        lowPrice: parseFloat(item.lowPrice) || 0,
        quoteVolume: parseFloat(item.quoteVolume) || 0,
        rank: 0
      }));

    // Sort descending by 24h percentage gain
    usdtCoins.sort((a, b) => b.priceChangePercent - a.priceChangePercent);

    return usdtCoins.map((coin, index) => ({
      ...coin,
      rank: index + 1
    }));
  } catch (err: any) {
    console.error("fetchTopGainersFromBinance error:", err);
    return [];
  }
}

/**
 * Get current bot state, configuration, top gainers, active position, history, and stats
 */
export async function getTopGainerBotState() {
  await ensureTopGainerBotTables();

  const configs: any = await executeQuery(`SELECT * FROM top_gainer_bot_config WHERE id = 1 LIMIT 1`);
  const configRow = configs && configs[0] ? configs[0] : null;

  if (!configRow) {
    throw new Error('Top Gainer bot configuration not found.');
  }

  const config: TopGainerBotConfig = {
    id: configRow.id,
    is_active: Boolean(configRow.is_active),
    notional_usd: parseFloat(configRow.notional_usd) || 50,
    leverage: parseInt(configRow.leverage) || 10,
    hold_seconds: parseInt(configRow.hold_seconds) || 20,
    min_gain_percent: parseFloat(configRow.min_gain_percent) || 3.0,
    is_compound: configRow.is_compound === 1 || configRow.is_compound === true || configRow.is_compound === '1' || String(configRow.is_compound) === 'true',
    emergency_sl_percent: configRow.emergency_sl_percent ? parseFloat(configRow.emergency_sl_percent) : null,
    current_state: configRow.current_state || 'IDLE',
    current_symbol: configRow.current_symbol || null,
    current_side: 'BUY',
    entry_price: configRow.entry_price ? parseFloat(configRow.entry_price) : null,
    quantity: configRow.quantity ? parseFloat(configRow.quantity) : null,
    binance_order_id: configRow.binance_order_id || null,
    entry_time: configRow.entry_time ? parseInt(configRow.entry_time) : null,
    last_leader_symbol: configRow.last_leader_symbol || null,
    last_bought_symbol: configRow.last_bought_symbol || null,
    round_number: parseInt(configRow.round_number) || 0,
    total_profit: parseFloat(configRow.total_profit) || 0,
    win_count: parseInt(configRow.win_count) || 0,
    loss_count: parseInt(configRow.loss_count) || 0,
    last_check_at: configRow.last_check_at || null,
    updated_at: configRow.updated_at,
    created_at: configRow.created_at,
  };

  // 1. Fetch Real Binance Account Balance
  let accountBalance: BinanceFuturesBalanceInfo | null = null;
  try {
    accountBalance = await fetchFuturesAccountBalance();
  } catch (balErr) {
    console.warn("fetchFuturesAccountBalance error in getTopGainerBotState:", balErr);
  }
  config.account_balance = accountBalance;

  // 2. Fetch Real Open Position if bot is currently in position
  let realPosition: BinanceRealPosition | null = null;
  if (config.current_symbol && config.current_state === 'HOLDING') {
    try {
      realPosition = await fetchRealPosition(config.current_symbol);
    } catch (posErr) {
      console.warn("fetchRealPosition error in getTopGainerBotState:", posErr);
    }
  }
  config.real_position = realPosition;

  // 3. Fetch Top Gainers from Binance
  const topGainers = await fetchTopGainersFromBinance();
  const leaderCoin = topGainers[0] || null;

  // 4. Fetch history rounds
  const historyRows: any = await executeQuery(`
    SELECT * FROM top_gainer_bot_history 
    ORDER BY id DESC 
    LIMIT 50
  `);
  const history: TopGainerBotHistory[] = (historyRows || []).map((r: any) => ({
    id: r.id,
    round_number: r.round_number,
    symbol: r.symbol,
    gain_percent: parseFloat(r.gain_percent) || 0,
    notional_usd: parseFloat(r.notional_usd) || 0,
    leverage: parseInt(r.leverage) || 10,
    entry_price: parseFloat(r.entry_price) || 0,
    exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
    quantity: parseFloat(r.quantity) || 0,
    hold_seconds: parseInt(r.hold_seconds) || 20,
    trade_pnl_usd: parseFloat(r.trade_pnl_usd) || 0,
    commission_usd: parseFloat(r.commission_usd) || 0,
    net_pnl_usd: parseFloat(r.net_pnl_usd) || 0,
    net_pnl_percent: parseFloat(r.net_pnl_percent) || 0,
    status: r.status,
    binance_open_order_id: r.binance_open_order_id,
    binance_close_order_id: r.binance_close_order_id,
    opened_at: r.opened_at,
    closed_at: r.closed_at,
  }));

  // 5. Fetch logs
  const logRows: any = await executeQuery(`
    SELECT * FROM top_gainer_bot_logs 
    ORDER BY id DESC 
    LIMIT 100
  `);
  const logs: TopGainerBotLog[] = (logRows || []).map((l: any) => ({
    id: l.id,
    level: l.level,
    category: l.category,
    message: l.message,
    created_at: l.created_at,
  }));

  // 6. Statistics
  const totalTrades = history.length;
  const winCount = history.filter(h => h.net_pnl_usd > 0).length;
  const lossCount = history.filter(h => h.net_pnl_usd < 0).length;
  const winRate = totalTrades > 0 ? (winCount / totalTrades) * 100 : 0;
  const totalNetProfit = history.reduce((sum, h) => sum + h.net_pnl_usd, 0);

  return {
    config,
    leaderCoin,
    topGainers: topGainers.slice(0, 15),
    history,
    logs,
    stats: {
      totalTrades,
      winCount,
      lossCount,
      winRate,
      totalNetProfit
    }
  };
}

/**
 * Start the Top Gainer Scalper Bot
 */
export async function startTopGainerBot(params?: {
  notionalUsd?: number;
  leverage?: number;
  holdSeconds?: number;
  minGainPercent?: number;
  isCompound?: boolean;
  emergencySlPercent?: number;
}) {
  await ensureTopGainerBotTables();

  const current: any = await executeQuery(`SELECT * FROM top_gainer_bot_config WHERE id = 1 LIMIT 1`);
  if (!current || !current[0]) {
    throw new Error('Config not found');
  }

  const notional = params?.notionalUsd ?? parseFloat(current[0].notional_usd) ?? 50;
  const leverage = params?.leverage ?? parseInt(current[0].leverage) ?? 10;
  const holdSeconds = params?.holdSeconds ?? parseInt(current[0].hold_seconds) ?? 20;
  const minGain = params?.minGainPercent ?? parseFloat(current[0].min_gain_percent) ?? 3.0;
  const isCompound = params?.isCompound !== undefined 
    ? Boolean(params.isCompound) 
    : (current[0].is_compound === 1 || current[0].is_compound === true || current[0].is_compound === '1');
  const emergencySl = params?.emergencySlPercent ?? parseFloat(current[0].emergency_sl_percent) ?? 3.0;

  // Determine state: if already in position, maintain HOLDING; otherwise SCANNING
  const nextState = current[0].current_state === 'HOLDING' ? 'HOLDING' : 'SCANNING';

  await executeQuery(`
    UPDATE top_gainer_bot_config
    SET is_active = true,
        notional_usd = ?,
        leverage = ?,
        hold_seconds = ?,
        min_gain_percent = ?,
        is_compound = ?,
        emergency_sl_percent = ?,
        current_state = ?,
        last_check_at = NOW()
    WHERE id = 1
  `, [notional, leverage, holdSeconds, minGain, isCompound, emergencySl, nextState]);

  const compoundText = isCompound ? ' | Compound: IYA' : ' | Compound: TIDAK';

  await addTopGainerBotLog(
    'START',
    `🟢 Bot Top Gainer Scalper DIAKTIFKAN! Notional: $${notional} USD | Leverage: ${leverage}x | Hold: ${holdSeconds}s | Min Gain: +${minGain}%${compoundText}`,
    'SUCCESS'
  );

  return await getTopGainerBotState();
}

/**
 * Stop the Top Gainer Scalper Bot
 */
export async function stopTopGainerBot(closePosition: boolean = false) {
  await ensureTopGainerBotTables();

  const current: any = await executeQuery(`SELECT * FROM top_gainer_bot_config WHERE id = 1 LIMIT 1`);
  if (!current || !current[0]) {
    throw new Error('Config not found');
  }

  const c = current[0];

  // If there's an active position and user requested to close it
  if (closePosition && c.current_symbol && c.quantity && parseFloat(c.quantity) > 0) {
    try {
      const closeRes = await executeTopGainerMarketClose({
        symbol: c.current_symbol,
        quantity: parseFloat(c.quantity),
        entryPrice: parseFloat(c.entry_price) || 0
      });

      const notional = parseFloat(c.notional_usd) || 50;
      const netPnl = closeRes.realizedPnl - closeRes.commission;
      const netPercent = notional > 0 ? (netPnl / notional) * 100 : 0;

      await executeQuery(`
        INSERT INTO top_gainer_bot_history 
          (round_number, symbol, gain_percent, notional_usd, leverage, entry_price, exit_price, quantity, hold_seconds, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
        VALUES 
          (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_CLOSED', ?, ?, NOW(), NOW())
      `, [
        c.round_number || 1,
        c.current_symbol,
        notional,
        c.leverage || 10,
        c.entry_price || closeRes.exitPrice,
        closeRes.exitPrice,
        closeRes.quantity,
        c.hold_seconds || 20,
        closeRes.realizedPnl,
        closeRes.commission,
        netPnl,
        netPercent,
        c.binance_order_id || null,
        closeRes.orderId
      ]);

      await addTopGainerBotLog(
        'STOP',
        `🛑 Bot dihentikan & posisi ${c.current_symbol} ditutup manual @ $${closeRes.exitPrice}. Net PnL: $${netPnl.toFixed(4)} USDT`,
        'WARN'
      );
    } catch (closeErr: any) {
      console.error("Error closing position on stop:", closeErr);
      await addTopGainerBotLog(
        'ERROR',
        `Gagal menutup posisi ${c.current_symbol} saat STOP: ${closeErr.message}`,
        'ERROR'
      );
    }
  } else {
    await addTopGainerBotLog(
      'STOP',
      '⏸️ Bot Top Gainer Scalper DIHENTIKAN oleh trader.',
      'WARN'
    );
  }

  await executeQuery(`
    UPDATE top_gainer_bot_config
    SET is_active = false,
        current_state = 'IDLE',
        current_symbol = NULL,
        entry_price = NULL,
        quantity = NULL,
        binance_order_id = NULL,
        entry_time = NULL,
        last_check_at = NOW()
    WHERE id = 1
  `);

  return await getTopGainerBotState();
}

/**
 * Update Top Gainer Bot Configuration without stopping
 */
export async function updateTopGainerBotConfig(params: {
  notionalUsd?: number;
  leverage?: number;
  holdSeconds?: number;
  minGainPercent?: number;
  isCompound?: boolean;
  emergencySlPercent?: number;
}) {
  await ensureTopGainerBotTables();

  const current: any = await executeQuery(`SELECT * FROM top_gainer_bot_config WHERE id = 1 LIMIT 1`);
  if (!current || !current[0]) throw new Error('Config not found');

  const c = current[0];
  const notional = params.notionalUsd !== undefined ? params.notionalUsd : parseFloat(c.notional_usd);
  const leverage = params.leverage !== undefined ? params.leverage : parseInt(c.leverage);
  const holdSeconds = params.holdSeconds !== undefined ? params.holdSeconds : parseInt(c.hold_seconds);
  const minGain = params.minGainPercent !== undefined ? params.minGainPercent : parseFloat(c.min_gain_percent);
  const isCompound = params.isCompound !== undefined ? params.isCompound : Boolean(c.is_compound);
  const emergencySl = params.emergencySlPercent !== undefined ? params.emergencySlPercent : parseFloat(c.emergency_sl_percent);

  await executeQuery(`
    UPDATE top_gainer_bot_config
    SET notional_usd = ?,
        leverage = ?,
        hold_seconds = ?,
        min_gain_percent = ?,
        is_compound = ?,
        emergency_sl_percent = ?,
        last_check_at = NOW()
    WHERE id = 1
  `, [notional, leverage, holdSeconds, minGain, isCompound, emergencySl]);

  await addTopGainerBotLog(
    'CONFIG',
    `⚙️ Pengaturan diperbarui: Notional $${notional} | ${leverage}x | Hold: ${holdSeconds}s | Min Gain: +${minGain}% | Compound: ${isCompound ? 'IYA' : 'TIDAK'}`,
    'INFO'
  );

  return await getTopGainerBotState();
}

/**
 * Execute MARKET BUY order on Binance Futures
 */
export async function executeTopGainerMarketBuy(params: {
  symbol: string;
  notionalUsd: number;
  leverage: number;
}) {
  const { symbol, notionalUsd, leverage } = params;
  const { apiKey, apiSecret } = getBinanceCredentials();

  if (!apiKey || !apiSecret) {
    throw new Error('BINANCE_API_KEY atau BINANCE_API_SECRET belum dikonfigurasi di file .env / .env.local');
  }

  const prec = await getSymbolPrecision(symbol);

  // 1. Get Live Market Price
  const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
  const tickerData = await tickerRes.json();
  const refPrice = parseFloat(tickerData.price) || 0;

  if (refPrice <= 0) {
    throw new Error(`Gagal mendapatkan harga pasar untuk ${symbol}`);
  }

  if (notionalUsd < prec.minNotional) {
    throw new Error(`Ukuran notional minimum di Binance adalah $${prec.minNotional} USD. Ukuran posisi Anda ($${notionalUsd.toFixed(2)}) terlalu kecil.`);
  }

  // 2. Set Leverage
  const timestamp = Date.now();
  try {
    await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/leverage', {
      symbol,
      leverage: leverage.toString(),
      timestamp: timestamp.toString()
    });
  } catch (err) {
    console.warn("Set leverage warning:", err);
  }

  // 3. Calculate Quantity with symbol precision
  const rawQty = notionalUsd / refPrice;
  const stepDecimals = Math.max(0, prec.quantityPrecision);
  const factor = Math.pow(10, stepDecimals);
  let quantity = Math.floor(rawQty * factor) / factor;

  if (quantity < prec.minQty) {
    quantity = prec.minQty;
  }

  const formattedQty = quantity.toFixed(stepDecimals);

  // 4. Place MARKET BUY order
  const orderRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', {
    symbol,
    side: 'BUY',
    type: 'MARKET',
    quantity: formattedQty,
    timestamp: Date.now().toString()
  });

  if (!orderRes || orderRes.code) {
    const errCode = orderRes?.code || 'ERROR';
    const errMsg = orderRes?.msg || 'Gagal mengeksekusi order pembukaan BUY di Binance';
    throw new Error(`Binance Error [${errCode}]: ${errMsg}`);
  }

  const executedQty = orderRes.executedQty && parseFloat(orderRes.executedQty) > 0 
    ? parseFloat(orderRes.executedQty) 
    : quantity;
  
  let fillPrice = parseFloat(orderRes.avgPrice) || 0;
  if (!fillPrice && orderRes.cumQuote && executedQty > 0) {
    fillPrice = parseFloat(orderRes.cumQuote) / executedQty;
  }
  if (!fillPrice) fillPrice = refPrice;

  // 5. Query Real Position directly from Binance
  let realPos: BinanceRealPosition | null = null;
  try {
    await new Promise(r => setTimeout(r, 350));
    realPos = await fetchRealPosition(symbol);
    if (realPos && realPos.entryPrice > 0) {
      fillPrice = realPos.entryPrice;
    }
  } catch (err) {
    console.warn("fetchRealPosition fallback:", err);
  }

  return {
    success: true,
    orderId: orderRes.orderId?.toString() || '',
    symbol,
    side: 'BUY' as const,
    quantity: realPos ? Math.abs(realPos.positionAmt) : executedQty,
    fillPrice,
    notionalUsd: realPos ? realPos.notional : executedQty * fillPrice,
    marginUsd: realPos ? realPos.marginUsd : (executedQty * fillPrice) / leverage,
    leverage
  };
}

/**
 * Execute MARKET SELL order with reduceOnly to close the position
 */
export async function executeTopGainerMarketClose(params: {
  symbol: string;
  quantity: number;
  entryPrice?: number;
}) {
  const { symbol, quantity, entryPrice } = params;
  const { apiKey, apiSecret } = getBinanceCredentials();

  if (!apiKey || !apiSecret) {
    throw new Error('BINANCE_API_KEY atau BINANCE_API_SECRET belum dikonfigurasi di file .env / .env.local');
  }

  const prec = await getSymbolPrecision(symbol);
  const stepDecimals = Math.max(0, prec.quantityPrecision);
  const factor = Math.pow(10, stepDecimals);
  let qtyToClose = Math.floor(quantity * factor) / factor;
  if (qtyToClose < prec.minQty) qtyToClose = prec.minQty;
  const formattedQty = qtyToClose.toFixed(stepDecimals);

  // Get current market price
  const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
  const tickerData = await tickerRes.json();
  const refPrice = parseFloat(tickerData.price) || 0;

  // Execute MARKET SELL order with reduceOnly: 'true'
  const closeRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', {
    symbol,
    side: 'SELL',
    type: 'MARKET',
    quantity: formattedQty,
    reduceOnly: 'true',
    timestamp: Date.now().toString()
  });

  if (!closeRes || closeRes.code) {
    const errCode = closeRes?.code || 'ERROR';
    const errMsg = closeRes?.msg || 'Gagal mengeksekusi order penutupan SELL di Binance';
    throw new Error(`Binance Close Error [${errCode}]: ${errMsg}`);
  }

  const executedQty = closeRes.executedQty && parseFloat(closeRes.executedQty) > 0
    ? parseFloat(closeRes.executedQty)
    : qtyToClose;

  let exitPrice = parseFloat(closeRes.avgPrice) || 0;
  if (!exitPrice && closeRes.cumQuote && executedQty > 0) {
    exitPrice = parseFloat(closeRes.cumQuote) / executedQty;
  }
  if (!exitPrice) exitPrice = refPrice;

  // Estimated PnL (for LONG: (exitPrice - entryPrice) * qty)
  const baseEntry = entryPrice || refPrice;
  let estimatedPnl = (exitPrice - baseEntry) * executedQty;

  let realRealizedPnl = estimatedPnl;
  let netPnl = realRealizedPnl;
  let commission = (exitPrice * executedQty * 0.0005); // ~0.05% taker fee estimate

  try {
    await new Promise(r => setTimeout(r, 400));
    const tradeInfo = await fetchOrderRealizedPnl(symbol, closeRes.orderId.toString());
    if (tradeInfo && tradeInfo.totalQty > 0) {
      if (tradeInfo.avgPrice > 0) exitPrice = tradeInfo.avgPrice;
      realRealizedPnl = tradeInfo.realizedPnl;
      netPnl = tradeInfo.netPnl;
      commission = tradeInfo.commission;
    }
  } catch (tradeErr) {
    console.warn("fetchOrderRealizedPnl warning:", tradeErr);
  }

  try {
    await cancelSymbolOpenOrders(symbol);
  } catch {}

  return {
    success: true,
    orderId: closeRes.orderId?.toString() || '',
    symbol,
    quantity: executedQty,
    exitPrice,
    realizedPnl: realRealizedPnl,
    commission,
    netPnl
  };
}

/**
 * Main Tick Engine: Evaluates Top Gainer #1 coin, fires Market Buy, counts down 20 seconds, and executes Market Sell.
 */
export async function tickTopGainerBot() {
  if (isTickingTopGainer) {
    return { status: 'LOCKED', message: 'Tick execution already in progress' };
  }

  isTickingTopGainer = true;

  try {
    await ensureTopGainerBotTables();

    const configs: any = await executeQuery(`SELECT * FROM top_gainer_bot_config WHERE id = 1 LIMIT 1`);
    if (!configs || !configs[0]) {
      return { status: 'NO_CONFIG' };
    }

    const config = configs[0];

    // If bot is stopped, do nothing
    if (!config.is_active) {
      return { status: 'IDLE', message: 'Top Gainer bot is currently stopped' };
    }

    const now = Date.now();
    const notionalUsd = parseFloat(config.notional_usd) || 50;
    const leverage = parseInt(config.leverage) || 10;
    const holdSeconds = parseInt(config.hold_seconds) || 20;
    const minGainPercent = parseFloat(config.min_gain_percent) || 3.0;

    // ─────────────────────────────────────────────────────────────
    // CASE A: Bot is currently HOLDING a position (20s Scalp in Progress)
    // ─────────────────────────────────────────────────────────────
    if (config.current_state === 'HOLDING' && config.current_symbol) {
      const entryTime = parseInt(config.entry_time) || now;
      const elapsedSeconds = Math.floor((now - entryTime) / 1000);
      const symbol = config.current_symbol;
      const quantity = parseFloat(config.quantity) || 0;
      const entryPrice = parseFloat(config.entry_price) || 0;
      const secondsLeft = Math.max(0, holdSeconds - elapsedSeconds);

      // Check Real Position from Binance
      let livePos: BinanceRealPosition | null = null;
      try {
        livePos = await fetchRealPosition(symbol);
      } catch (posErr) {
        console.warn(`fetchRealPosition warning for ${symbol}:`, posErr);
      }

      // Check Emergency Stop Loss if configured
      const emergencySl = config.emergency_sl_percent ? parseFloat(config.emergency_sl_percent) : null;
      const isEmergencyHit = emergencySl && livePos && livePos.roePercent <= -emergencySl;

      // TIME TO CLOSE! Either 20 seconds passed OR emergency SL triggered
      if (elapsedSeconds >= holdSeconds || isEmergencyHit) {
        await executeQuery(`
          UPDATE top_gainer_bot_config
          SET current_state = 'CLOSING', last_check_at = NOW()
          WHERE id = 1
        `);

        const closeReason = isEmergencyHit ? `🛑 STOP LOSS DARURAT (-${emergencySl}% ROE)` : `⏱️ Waktu Scalp ${holdSeconds}s Selesai`;
        await addTopGainerBotLog(
          'CLOSE_TRIGGER',
          `${closeReason}! Menutup posisi ${symbol} via Market Sell...`,
          isEmergencyHit ? 'WARN' : 'INFO'
        );

        try {
          const closeRes = await executeTopGainerMarketClose({
            symbol,
            quantity,
            entryPrice
          });

          const tradeRealizedPnl = closeRes.realizedPnl;
          const commission = closeRes.commission;
          const netPnl = closeRes.netPnl;
          const netPnlPercent = notionalUsd > 0 ? (netPnl / notionalUsd) * 100 : 0;
          const roundNum = (parseInt(config.round_number) || 0) + 1;

          // Record Trade History
          await executeQuery(`
            INSERT INTO top_gainer_bot_history 
              (round_number, symbol, gain_percent, notional_usd, leverage, entry_price, exit_price, quantity, hold_seconds, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?, FROM_UNIXTIME(?), NOW())
          `, [
            roundNum,
            symbol,
            0, // gain percent at open
            notionalUsd,
            leverage,
            entryPrice,
            closeRes.exitPrice,
            closeRes.quantity,
            elapsedSeconds,
            tradeRealizedPnl,
            commission,
            netPnl,
            netPnlPercent,
            config.binance_order_id || null,
            closeRes.orderId,
            Math.floor(entryTime / 1000)
          ]);

          // Handle Auto-Compound
          let nextNotionalUsd = notionalUsd;
          if (Boolean(config.is_compound) && netPnl > 0) {
            nextNotionalUsd = Math.round((notionalUsd + netPnl) * 100) / 100;
          }

          const newTotalProfit = (parseFloat(config.total_profit) || 0) + netPnl;
          const isWin = netPnl > 0;
          const newWinCount = (parseInt(config.win_count) || 0) + (isWin ? 1 : 0);
          const newLossCount = (parseInt(config.loss_count) || 0) + (isWin ? 0 : 1);

          // Reset state to SCANNING and remember last_bought_symbol
          await executeQuery(`
            UPDATE top_gainer_bot_config
            SET current_state = 'SCANNING',
                current_symbol = NULL,
                entry_price = NULL,
                quantity = NULL,
                binance_order_id = NULL,
                entry_time = NULL,
                last_bought_symbol = ?,
                round_number = ?,
                notional_usd = ?,
                total_profit = ?,
                win_count = ?,
                loss_count = ?,
                last_check_at = NOW()
            WHERE id = 1
          `, [symbol, roundNum, nextNotionalUsd, newTotalProfit, newWinCount, newLossCount]);

          const pnlSign = netPnl >= 0 ? '+' : '';
          await addTopGainerBotLog(
            'CYCLE_COMPLETE',
            `🎉 Scalp Round #${roundNum} Selesai (${elapsedSeconds}s)! ${symbol} Exit @ $${closeRes.exitPrice} | Price PnL: $${tradeRealizedPnl.toFixed(4)} | Net: ${pnlSign}$${netPnl.toFixed(4)} (${pnlSign}${netPnlPercent.toFixed(2)}%)`,
            netPnl >= 0 ? 'SUCCESS' : 'WARN'
          );

          return {
            status: 'ROUND_COMPLETED',
            roundNumber: roundNum,
            symbol,
            entryPrice,
            exitPrice: closeRes.exitPrice,
            elapsedSeconds,
            tradePnl: tradeRealizedPnl,
            commission,
            netPnl,
            netPnlPercent
          };
        } catch (closeError: any) {
          console.error("Error closing top gainer position:", closeError);
          await addTopGainerBotLog(
            'ERROR',
            `Gagal menutup posisi ${symbol}: ${closeError.message}. Akan mencoba lagi pada tick berikutnya.`,
            'ERROR'
          );
          return { status: 'CLOSE_FAILED', error: closeError.message };
        }
      } else {
        // Still holding, waiting for 20s countdown
        return {
          status: 'HOLDING',
          symbol,
          entryPrice,
          markPrice: livePos ? livePos.markPrice : entryPrice,
          unrealizedPnl: livePos ? livePos.unRealizedProfit : 0,
          roePercent: livePos ? livePos.roePercent : 0,
          elapsedSeconds,
          secondsLeft,
          holdSeconds
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: Bot is SCANNING for Top Gainer #1 Coin
    // ─────────────────────────────────────────────────────────────
    const topGainers = await fetchTopGainersFromBinance();
    if (topGainers.length === 0) {
      await executeQuery(`
        UPDATE top_gainer_bot_config 
        SET current_state = 'SCANNING', last_check_at = NOW() 
        WHERE id = 1
      `);
      return { status: 'SCANNING', message: 'No tickers found' };
    }

    const rank1Coin = topGainers[0];
    const prevLeader = config.last_leader_symbol;
    const lastBought = config.last_bought_symbol;

    // Check if #1 coin meets minimum gain requirement
    if (rank1Coin.priceChangePercent < minGainPercent) {
      await executeQuery(`
        UPDATE top_gainer_bot_config 
        SET last_leader_symbol = ?, last_check_at = NOW() 
        WHERE id = 1
      `, [rank1Coin.symbol]);

      return {
        status: 'BELOW_GAIN_THRESHOLD',
        leader: rank1Coin,
        message: `Juara #1 (${rank1Coin.symbol}: +${rank1Coin.priceChangePercent.toFixed(2)}%) masih di bawah minimum +${minGainPercent}%`
      };
    }

    // Check if a NEW coin has entered Rank #1:
    // It must be DIFFERENT from the coin we last bought, and different from previous leader
    const isNewLeader = rank1Coin.symbol !== lastBought;

    // Update last_leader_symbol in database
    if (rank1Coin.symbol !== prevLeader) {
      await executeQuery(`
        UPDATE top_gainer_bot_config 
        SET last_leader_symbol = ?, last_check_at = NOW() 
        WHERE id = 1
      `, [rank1Coin.symbol]);

      await addTopGainerBotLog(
        'LEADER_SHIFT',
        `👑 Peringkat #1 Top Gainer Berganti! Koin Baru: ${rank1Coin.symbol} (+${rank1Coin.priceChangePercent.toFixed(2)}% | Vol: $${Math.round(rank1Coin.quoteVolume / 1e6)}M)`,
        'INFO'
      );
    }

    if (isNewLeader) {
      // 🚀 TRIGGER NEW SCALP BUY!
      await addTopGainerBotLog(
        'BUY_TRIGGER',
        `🚀 KOIN BARU MASUK URUTAN PERTAMA! Membuka BUY ${rank1Coin.symbol} (+${rank1Coin.priceChangePercent.toFixed(2)}%) untuk scalp ${holdSeconds} detik...`,
        'SUCCESS'
      );

      try {
        const buyRes = await executeTopGainerMarketBuy({
          symbol: rank1Coin.symbol,
          notionalUsd,
          leverage
        });

        const entryTimestamp = Date.now();

        await executeQuery(`
          UPDATE top_gainer_bot_config
          SET current_state = 'HOLDING',
              current_symbol = ?,
              entry_price = ?,
              quantity = ?,
              binance_order_id = ?,
              entry_time = ?,
              last_leader_symbol = ?,
              last_bought_symbol = ?,
              last_check_at = NOW()
          WHERE id = 1
        `, [
          rank1Coin.symbol,
          buyRes.fillPrice,
          buyRes.quantity,
          buyRes.orderId,
          entryTimestamp,
          rank1Coin.symbol,
          rank1Coin.symbol
        ]);

        await addTopGainerBotLog(
          'BUY_OPENED',
          `✅ Posisi BUY Berhasil Dibuka! ${rank1Coin.symbol} @ $${buyRes.fillPrice} | Notional: $${notionalUsd} USD (${leverage}x) | Target Exit: ${holdSeconds}s`,
          'SUCCESS'
        );

        return {
          status: 'ORDER_OPENED',
          symbol: rank1Coin.symbol,
          side: 'BUY',
          entryPrice: buyRes.fillPrice,
          quantity: buyRes.quantity,
          orderId: buyRes.orderId,
          holdSeconds
        };
      } catch (buyError: any) {
        console.error("Error executing top gainer buy order:", buyError);
        await addTopGainerBotLog(
          'ERROR',
          `Gagal membuka BUY ${rank1Coin.symbol}: ${buyError.message}`,
          'ERROR'
        );
        return { status: 'BUY_FAILED', error: buyError.message };
      }
    } else {
      // #1 Coin is still the same coin we already traded
      await executeQuery(`
        UPDATE top_gainer_bot_config
        SET current_state = 'SCANNING', last_check_at = NOW()
        WHERE id = 1
      `);

      return {
        status: 'MONITORING',
        currentLeader: rank1Coin,
        lastBought,
        message: `Menunggu koin baru menyalip ke urutan #1 (Saat ini: ${rank1Coin.symbol} +${rank1Coin.priceChangePercent.toFixed(2)}%)`
      };
    }
  } catch (err: any) {
    console.error("tickTopGainerBot unhandled error:", err);
    return { status: 'ERROR', error: err.message };
  } finally {
    isTickingTopGainer = false;
  }
}

/**
 * Clear terminal logs
 */
export async function clearTopGainerBotLogs() {
  await ensureTopGainerBotTables();
  await executeQuery(`DELETE FROM top_gainer_bot_logs`);
  return { success: true };
}
