import { executeQuery } from './db';
import { fetchFapiWithFallback } from './futures';
import {
  executeFundingOpenOrder,
  executeFundingCloseOrder,
  executeFundingOrderWithRR,
  fetchFuturesAccountBalance,
  fetchFundingIncome,
  fetchRealPosition,
  fetchSymbolRecentClosedTrades,
  cancelSymbolOpenOrders,
  BinanceRealPosition,
  BinanceFuturesBalanceInfo,
} from './binanceOrder';

export interface FundingBotConfig {
  id: number;
  is_active: boolean;
  notional_usd: number;
  leverage: number;
  open_seconds_before: number;
  close_seconds_after: number;
  min_funding_rate: number;
  is_reverse: boolean;
  rr_ratio: 'NONE' | '1:1' | '1:2' | '1:3';
  base_sl_percent: number;
  is_compound?: boolean;
  current_symbol: string | null;
  current_side: 'SHORT' | 'LONG' | null;
  current_state: 'IDLE' | 'SCANNING' | 'WAITING_ENTRY' | 'HOLDING_FOR_FUNDING' | 'CLOSING';
  target_funding_rate: number | null;
  target_next_funding_time: number | null;
  entry_price: number | null;
  tp_price?: number | null;
  sl_price?: number | null;
  quantity: number | null;
  binance_order_id: string | null;
  round_number: number;
  total_profit: number;
  total_funding_fee: number;
  total_trade_pnl: number;
  last_check_at: string | null;
  updated_at: string;
  created_at: string;
  real_position?: BinanceRealPosition | null;
  account_balance?: BinanceFuturesBalanceInfo | null;
}

export interface FundingBotHistory {
  id: number;
  round_number: number;
  symbol: string;
  side: 'SHORT' | 'LONG';
  notional_usd: number;
  leverage: number;
  funding_rate: number;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  funding_fee_usd: number;
  trade_pnl_usd: number;
  commission_usd: number;
  net_pnl_usd: number;
  net_pnl_percent: number;
  status: 'CLOSED' | 'MANUAL_CLOSED' | 'ERROR';
  binance_open_order_id: string | null;
  binance_close_order_id: string | null;
  opened_at: string;
  closed_at: string | null;
}

export interface FundingBotLog {
  id: number;
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  category: string;
  message: string;
  created_at: string;
}

export interface FundingCandidate {
  symbol: string;
  fundingRate: number;
  absRate: number;
  nextFundingTime: number;
  secondsUntilFunding: number;
  markPrice: number;
  recommendation: 'SHORT' | 'LONG';
  isExtreme: boolean;
  estimatedFeeUsd: number;
}

// In-memory mutex flag to avoid concurrent tick execution
let isTickingFundingBot = false;

/**
 * Ensure database tables exist for funding farming bot
 */
export async function ensureFundingBotTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS funding_bot_config (
      id INT AUTO_INCREMENT PRIMARY KEY,
      is_active BOOLEAN DEFAULT false,
      notional_usd DECIMAL(12, 4) DEFAULT 100.0000,
      leverage INT DEFAULT 5,
      open_seconds_before INT DEFAULT 30,
      close_seconds_after INT DEFAULT 10,
      min_funding_rate DECIMAL(8, 6) DEFAULT 0.000100,
      current_symbol VARCHAR(20) DEFAULT NULL,
      current_side VARCHAR(10) DEFAULT NULL,
      current_state VARCHAR(30) DEFAULT 'IDLE',
      target_funding_rate DECIMAL(8, 6) DEFAULT NULL,
      target_next_funding_time BIGINT DEFAULT NULL,
      entry_price DECIMAL(16, 8) DEFAULT NULL,
      quantity DECIMAL(16, 8) DEFAULT NULL,
      binance_order_id VARCHAR(100) DEFAULT NULL,
      round_number INT DEFAULT 0,
      total_profit DECIMAL(12, 4) DEFAULT 0.0000,
      total_funding_fee DECIMAL(12, 4) DEFAULT 0.0000,
      total_trade_pnl DECIMAL(12, 4) DEFAULT 0.0000,
      is_reverse BOOLEAN DEFAULT false,
      rr_ratio VARCHAR(10) DEFAULT 'NONE',
      base_sl_percent DECIMAL(8, 4) DEFAULT 1.5000,
      tp_price DECIMAL(18, 8) DEFAULT NULL,
      sl_price DECIMAL(18, 8) DEFAULT NULL,
      is_compound BOOLEAN DEFAULT false,
      last_check_at DATETIME DEFAULT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS funding_bot_history (
      id INT AUTO_INCREMENT PRIMARY KEY,
      round_number INT NOT NULL,
      symbol VARCHAR(20) NOT NULL,
      side VARCHAR(10) NOT NULL,
      notional_usd DECIMAL(12, 4) NOT NULL,
      leverage INT NOT NULL,
      funding_rate DECIMAL(8, 6) NOT NULL,
      entry_price DECIMAL(16, 8) NOT NULL,
      exit_price DECIMAL(16, 8) DEFAULT NULL,
      quantity DECIMAL(16, 8) NOT NULL,
      funding_fee_usd DECIMAL(12, 4) DEFAULT 0.0000,
      trade_pnl_usd DECIMAL(12, 4) DEFAULT 0.0000,
      commission_usd DECIMAL(12, 4) DEFAULT 0.0000,
      net_pnl_usd DECIMAL(12, 4) DEFAULT 0.0000,
      net_pnl_percent DECIMAL(8, 4) DEFAULT 0.0000,
      status VARCHAR(20) DEFAULT 'CLOSED',
      binance_open_order_id VARCHAR(100) DEFAULT NULL,
      binance_close_order_id VARCHAR(100) DEFAULT NULL,
      opened_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      closed_at DATETIME DEFAULT NULL
    )
  `);

  await executeQuery(`
    CREATE TABLE IF NOT EXISTS funding_bot_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      level VARCHAR(20) DEFAULT 'INFO',
      category VARCHAR(30) DEFAULT 'SYSTEM',
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Auto-migration for Reverse & RR features in funding_bot_config
  try {
    await executeQuery(`ALTER TABLE funding_bot_config ADD COLUMN is_reverse BOOLEAN DEFAULT false`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE funding_bot_config ADD COLUMN rr_ratio VARCHAR(10) DEFAULT 'NONE'`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE funding_bot_config ADD COLUMN base_sl_percent DECIMAL(8, 4) DEFAULT 1.5000`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE funding_bot_config ADD COLUMN tp_price DECIMAL(18, 8) DEFAULT NULL`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE funding_bot_config ADD COLUMN sl_price DECIMAL(18, 8) DEFAULT NULL`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE funding_bot_config ADD COLUMN is_compound BOOLEAN DEFAULT false`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE funding_bot_history ADD COLUMN exit_reason VARCHAR(30) DEFAULT 'TIME_EXIT'`);
  } catch {}

  // Ensure initial config row exists
  const existing: any = await executeQuery(`SELECT count(*) as count FROM funding_bot_config`);
  if (!existing || existing[0].count === 0) {
    await executeQuery(`
      INSERT INTO funding_bot_config 
        (is_active, notional_usd, leverage, open_seconds_before, close_seconds_after, min_funding_rate, current_state)
      VALUES 
        (false, 100.0000, 5, 30, 10, 0.000100, 'IDLE')
    `);
  }
}

/**
 * Add a log entry for funding farming bot
 */
export async function addFundingBotLog(category: string, message: string, level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO') {
  try {
    await executeQuery(`
      INSERT INTO funding_bot_logs (level, category, message)
      VALUES (?, ?, ?)
    `, [level, category, message]);

    // Keep latest 300 logs
    await executeQuery(`
      DELETE FROM funding_bot_logs 
      WHERE id NOT IN (
        SELECT id FROM (
          SELECT id FROM funding_bot_logs ORDER BY id DESC LIMIT 300
        ) as t
      )
    `);
  } catch (err) {
    console.error("Failed to insert funding bot log:", err);
  }
}

/**
 * Fetch candidate coins approaching funding settlement, prioritized by highest absolute funding rate
 */
export async function fetchFundingCandidates(notionalUsd: number = 100): Promise<{
  targetCandidate: FundingCandidate | null;
  candidates: FundingCandidate[];
  earliestSettlementTime: number | null;
}> {
  try {
    const rawData = await fetchFapiWithFallback('/fapi/v1/premiumIndex');
    if (!Array.isArray(rawData)) {
      return { targetCandidate: null, candidates: [], earliestSettlementTime: null };
    }

    const now = Date.now();

    // 1. Filter USDT futures pairs whose next funding time is in the future
    const futureSettlements = rawData
      .filter((item: any) => {
        const symbol = item.symbol || '';
        const nextTime = parseInt(item.nextFundingTime) || 0;
        return symbol.endsWith('USDT') && nextTime > now;
      })
      .map((item: any) => {
        const fundingRate = parseFloat(item.lastFundingRate) || 0;
        const absRate = Math.abs(fundingRate);
        const nextTime = parseInt(item.nextFundingTime);
        const diffMs = nextTime - now;
        return {
          symbol: item.symbol,
          fundingRate,
          absRate,
          nextFundingTime: nextTime,
          secondsUntilFunding: Math.max(0, Math.floor(diffMs / 1000)),
          markPrice: parseFloat(item.markPrice) || 0,
          recommendation: (fundingRate > 0 ? 'SHORT' : 'LONG') as 'SHORT' | 'LONG',
          isExtreme: absRate >= 0.005, // 0.5% threshold
          estimatedFeeUsd: notionalUsd * absRate
        };
      });

    if (futureSettlements.length === 0) {
      return { targetCandidate: null, candidates: [], earliestSettlementTime: null };
    }

    // 2. Find earliest settlement time (the upcoming settlement slot)
    const earliestTime = Math.min(...futureSettlements.map(item => item.nextFundingTime));

    // 3. Find all coins settling in this immediate upcoming window (within 5 minutes of earliest)
    const upcomingBatch = futureSettlements.filter(
      item => Math.abs(item.nextFundingTime - earliestTime) <= 5 * 60 * 1000
    );

    // 4. Sort by highest absolute funding rate descending
    upcomingBatch.sort((a, b) => b.absRate - a.absRate);

    // Also sort all remaining coins by absRate for secondary suggestions
    futureSettlements.sort((a, b) => b.absRate - a.absRate);

    const targetCandidate = upcomingBatch[0] || futureSettlements[0] || null;

    // Return the top 15 most attractive coins (focusing on upcoming slot first)
    const combinedCandidates = [...upcomingBatch];
    for (const item of futureSettlements) {
      if (!combinedCandidates.some(c => c.symbol === item.symbol)) {
        combinedCandidates.push(item);
      }
      if (combinedCandidates.length >= 20) break;
    }

    return {
      targetCandidate,
      candidates: combinedCandidates,
      earliestSettlementTime: earliestTime
    };
  } catch (err) {
    console.error("fetchFundingCandidates error:", err);
    return { targetCandidate: null, candidates: [], earliestSettlementTime: null };
  }
}

/**
 * Get complete state of Funding Farming Bot
 */
export async function getFundingBotState() {
  await ensureFundingBotTables();

  const configs: any = await executeQuery(`SELECT * FROM funding_bot_config WHERE id = 1 LIMIT 1`);
  const configRow = configs && configs[0] ? configs[0] : null;

  if (!configRow) {
    throw new Error('Funding bot configuration not found.');
  }

  const config: FundingBotConfig = {
    id: configRow.id,
    is_active: Boolean(configRow.is_active),
    notional_usd: parseFloat(configRow.notional_usd) || 100,
    leverage: parseInt(configRow.leverage) || 5,
    open_seconds_before: parseInt(configRow.open_seconds_before) || 30,
    close_seconds_after: parseInt(configRow.close_seconds_after) || 10,
    min_funding_rate: parseFloat(configRow.min_funding_rate) || 0.0001,
    is_reverse: Boolean(configRow.is_reverse),
    rr_ratio: (configRow.rr_ratio || 'NONE') as 'NONE' | '1:1' | '1:2' | '1:3',
    base_sl_percent: parseFloat(configRow.base_sl_percent) || 1.5,
    is_compound: configRow.is_compound === 1 || configRow.is_compound === true || configRow.is_compound === '1' || String(configRow.is_compound) === 'true',
    tp_price: configRow.tp_price ? parseFloat(configRow.tp_price) : null,
    sl_price: configRow.sl_price ? parseFloat(configRow.sl_price) : null,
    current_symbol: configRow.current_symbol || null,
    current_side: configRow.current_side || null,
    current_state: configRow.current_state || 'IDLE',
    target_funding_rate: configRow.target_funding_rate ? parseFloat(configRow.target_funding_rate) : null,
    target_next_funding_time: configRow.target_next_funding_time ? parseInt(configRow.target_next_funding_time) : null,
    entry_price: configRow.entry_price ? parseFloat(configRow.entry_price) : null,
    quantity: configRow.quantity ? parseFloat(configRow.quantity) : null,
    binance_order_id: configRow.binance_order_id || null,
    round_number: parseInt(configRow.round_number) || 0,
    total_profit: parseFloat(configRow.total_profit) || 0,
    total_funding_fee: parseFloat(configRow.total_funding_fee) || 0,
    total_trade_pnl: parseFloat(configRow.total_trade_pnl) || 0,
    last_check_at: configRow.last_check_at || null,
    updated_at: configRow.updated_at,
    created_at: configRow.created_at,
  };

  // 1. Fetch Real Binance Account Balance
  let accountBalance: BinanceFuturesBalanceInfo | null = null;
  try {
    accountBalance = await fetchFuturesAccountBalance();
  } catch (balErr) {
    console.warn("fetchFuturesAccountBalance error in getFundingBotState:", balErr);
  }
  config.account_balance = accountBalance;

  // 2. Fetch Real Open Position if bot is currently in position
  let realPosition: BinanceRealPosition | null = null;
  if (config.current_symbol && config.current_state === 'HOLDING_FOR_FUNDING') {
    try {
      realPosition = await fetchRealPosition(config.current_symbol);
    } catch (posErr) {
      console.warn("fetchRealPosition error in getFundingBotState:", posErr);
    }
  }
  config.real_position = realPosition;

  // 3. Fetch candidate coins
  const { targetCandidate, candidates, earliestSettlementTime } = await fetchFundingCandidates(config.notional_usd);

  // 4. Fetch history rounds
  const historyRows: any = await executeQuery(`
    SELECT * FROM funding_bot_history 
    ORDER BY id DESC 
    LIMIT 50
  `);
  const history: FundingBotHistory[] = (historyRows || []).map((r: any) => ({
    id: r.id,
    round_number: r.round_number,
    symbol: r.symbol,
    side: r.side,
    notional_usd: parseFloat(r.notional_usd) || 0,
    leverage: parseInt(r.leverage) || 5,
    funding_rate: parseFloat(r.funding_rate) || 0,
    entry_price: parseFloat(r.entry_price) || 0,
    exit_price: r.exit_price ? parseFloat(r.exit_price) : null,
    quantity: parseFloat(r.quantity) || 0,
    funding_fee_usd: parseFloat(r.funding_fee_usd) || 0,
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
    SELECT * FROM funding_bot_logs 
    ORDER BY id DESC 
    LIMIT 100
  `);
  const logs: FundingBotLog[] = (logRows || []).map((l: any) => ({
    id: l.id,
    level: l.level,
    category: l.category,
    message: l.message,
    created_at: l.created_at,
  }));

  // 6. Aggregate stats
  const totalRounds = history.length;
  const winCount = history.filter(h => h.net_pnl_usd > 0).length;
  const lossCount = history.filter(h => h.net_pnl_usd < 0).length;
  const winRate = totalRounds > 0 ? (winCount / totalRounds) * 100 : 0;
  const totalNetProfit = history.reduce((sum, h) => sum + h.net_pnl_usd, 0);
  const totalFundingFeeEarned = history.reduce((sum, h) => sum + h.funding_fee_usd, 0);
  const totalTradePnlRealized = history.reduce((sum, h) => sum + h.trade_pnl_usd, 0);

  return {
    config,
    targetCandidate,
    candidates,
    earliestSettlementTime,
    history,
    logs,
    stats: {
      totalRounds,
      winCount,
      lossCount,
      winRate,
      totalNetProfit,
      totalFundingFeeEarned,
      totalTradePnlRealized
    }
  };
}

/**
 * Start the autonomous Funding Farming Bot
 */
export async function startFundingBot(params?: {
  notionalUsd?: number;
  leverage?: number;
  openSecondsBefore?: number;
  closeSecondsAfter?: number;
  minFundingRate?: number;
  isReverse?: boolean;
  rrRatio?: 'NONE' | '1:1' | '1:2' | '1:3';
  baseSlPercent?: number;
  isCompound?: boolean;
}) {
  await ensureFundingBotTables();

  const current: any = await executeQuery(`SELECT * FROM funding_bot_config WHERE id = 1 LIMIT 1`);
  if (!current || !current[0]) {
    throw new Error('Config not found');
  }

  const notional = params?.notionalUsd ?? parseFloat(current[0].notional_usd) ?? 100;
  const leverage = params?.leverage ?? parseInt(current[0].leverage) ?? 5;
  const openSeconds = params?.openSecondsBefore ?? parseInt(current[0].open_seconds_before) ?? 30;
  const closeSeconds = params?.closeSecondsAfter ?? parseInt(current[0].close_seconds_after) ?? 10;
  const minRate = params?.minFundingRate ?? parseFloat(current[0].min_funding_rate) ?? 0.0001;
  const isReverse = params?.isReverse !== undefined ? Boolean(params.isReverse) : Boolean(current[0].is_reverse);
  const rrRatio = params?.rrRatio ?? current[0].rr_ratio ?? 'NONE';
  const baseSlPercent = params?.baseSlPercent ?? parseFloat(current[0].base_sl_percent) ?? 1.5;
  const isCompound = params?.isCompound !== undefined 
    ? Boolean(params.isCompound) 
    : (current[0].is_compound === 1 || current[0].is_compound === true || current[0].is_compound === '1' || String(current[0].is_compound) === 'true');

  // Determine state: if already in position, maintain HOLDING; otherwise SCANNING
  const nextState = current[0].current_state === 'HOLDING_FOR_FUNDING' ? 'HOLDING_FOR_FUNDING' : 'SCANNING';

  await executeQuery(`
    UPDATE funding_bot_config
    SET is_active = true,
        notional_usd = ?,
        leverage = ?,
        open_seconds_before = ?,
        close_seconds_after = ?,
        min_funding_rate = ?,
        is_reverse = ?,
        rr_ratio = ?,
        base_sl_percent = ?,
        is_compound = ?,
        current_state = ?,
        last_check_at = NOW()
    WHERE id = 1
  `, [notional, leverage, openSeconds, closeSeconds, minRate, isReverse, rrRatio, baseSlPercent, isCompound, nextState]);

  const reverseText = isReverse ? ' | Mode: REVERSE' : ' | Mode: Normal';
  const rrText = rrRatio !== 'NONE' ? ` | RR: ${rrRatio}` : '';
  const compoundText = isCompound ? ' | Compound: IYA' : ' | Compound: TIDAK';

  await addFundingBotLog(
    'START',
    `🟢 Bot Funding Farming DIAKTIFKAN! Notional: $${notional} USD | Leverage: ${leverage}x | Auto-Open: < ${openSeconds}s | Auto-Close: +${closeSeconds}s${reverseText}${rrText}${compoundText}`,
    'SUCCESS'
  );

  return await getFundingBotState();
}

/**
 * Stop the Funding Farming Bot
 */
export async function stopFundingBot(closePosition: boolean = false) {
  await ensureFundingBotTables();

  const current: any = await executeQuery(`SELECT * FROM funding_bot_config WHERE id = 1 LIMIT 1`);
  if (!current || !current[0]) {
    throw new Error('Config not found');
  }

  const c = current[0];

  // If there's an active position and user requested to close it
  if (closePosition && c.current_symbol && c.quantity && parseFloat(c.quantity) > 0) {
    try {
      const closeSide = c.current_side === 'SHORT' ? 'BUY' : 'SELL';
      const closeRes = await executeFundingCloseOrder({
        symbol: c.current_symbol,
        side: closeSide,
        quantity: parseFloat(c.quantity),
        entryPrice: parseFloat(c.entry_price) || 0
      });

      // Record to history as MANUAL_CLOSED
      const fundingRate = parseFloat(c.target_funding_rate) || 0;
      const notional = parseFloat(c.notional_usd) || 100;
      const estFundingFee = notional * Math.abs(fundingRate);
      const netPnl = closeRes.realizedPnl - closeRes.commission;

      await executeQuery(`
        INSERT INTO funding_bot_history 
          (round_number, symbol, side, notional_usd, leverage, funding_rate, entry_price, exit_price, quantity, funding_fee_usd, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
        VALUES 
          (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'MANUAL_CLOSED', ?, ?, NOW(), NOW())
      `, [
        c.round_number || 1,
        c.current_symbol,
        c.current_side || 'SHORT',
        notional,
        c.leverage || 5,
        fundingRate,
        c.entry_price || closeRes.exitPrice,
        closeRes.exitPrice,
        closeRes.quantity,
        0, // closed manually before funding settlement
        closeRes.realizedPnl,
        closeRes.commission,
        netPnl,
        notional > 0 ? (netPnl / notional) * 100 : 0,
        c.binance_order_id || null,
        closeRes.orderId
      ]);

      await addFundingBotLog(
        'STOP',
        `🛑 Bot dihentikan & posisi ${c.current_symbol} ditutup manual @ $${closeRes.exitPrice}. Realized PnL: $${netPnl.toFixed(4)} USDT`,
        'WARN'
      );
    } catch (closeErr: any) {
      console.error("Error closing position on stop:", closeErr);
      await addFundingBotLog(
        'ERROR',
        `Gagal menutup posisi ${c.current_symbol} saat STOP: ${closeErr.message}`,
        'ERROR'
      );
    }
  } else {
    await addFundingBotLog(
      'STOP',
      '⏸️ Bot Funding Farming DIHENTIKAN oleh trader.',
      'WARN'
    );
  }

  await executeQuery(`
    UPDATE funding_bot_config
    SET is_active = false,
        current_state = 'IDLE',
        current_symbol = NULL,
        current_side = NULL,
        entry_price = NULL,
        quantity = NULL,
        binance_order_id = NULL,
        last_check_at = NOW()
    WHERE id = 1
  `);

  return await getFundingBotState();
}

/**
 * Save configuration parameters without starting/stopping
 */
export async function saveFundingBotConfig(params: {
  notionalUsd: number;
  leverage: number;
  openSecondsBefore: number;
  closeSecondsAfter: number;
  minFundingRate: number;
  isReverse?: boolean;
  rrRatio?: 'NONE' | '1:1' | '1:2' | '1:3';
  baseSlPercent?: number;
  isCompound?: boolean;
}) {
  await ensureFundingBotTables();

  await executeQuery(`
    UPDATE funding_bot_config
    SET notional_usd = ?,
        leverage = ?,
        open_seconds_before = ?,
        close_seconds_after = ?,
        min_funding_rate = ?,
        is_reverse = ?,
        rr_ratio = ?,
        base_sl_percent = ?,
        is_compound = ?,
        last_check_at = NOW()
    WHERE id = 1
  `, [
    params.notionalUsd,
    params.leverage,
    params.openSecondsBefore,
    params.closeSecondsAfter,
    params.minFundingRate,
    Boolean(params.isReverse),
    params.rrRatio || 'NONE',
    params.baseSlPercent || 1.5,
    Boolean(params.isCompound)
  ]);

  const reverseText = params.isReverse ? ' | Mode: REVERSE' : ' | Mode: Normal';
  const rrText = params.rrRatio && params.rrRatio !== 'NONE' ? ` | RR: ${params.rrRatio}` : '';
  const compoundText = params.isCompound ? ' | Compound: IYA' : ' | Compound: TIDAK';

  await addFundingBotLog(
    'CONFIG',
    `⚙️ Pengaturan bot diperbarui: Notional $${params.notionalUsd} USD | Leverage ${params.leverage}x | Entry < ${params.openSecondsBefore}s | Exit +${params.closeSecondsAfter}s${reverseText}${rrText}${compoundText}`,
    'INFO'
  );

  return await getFundingBotState();
}

/**
 * Core Tick Engine: evaluates candidates, opens positions < 30s before settlement,
 * holds through settlement, and closes immediately after fee distribution.
 */
export async function tickFundingBot() {
  if (isTickingFundingBot) {
    return { status: 'LOCKED', message: 'Tick execution already in progress' };
  }

  isTickingFundingBot = true;

  try {
    await ensureFundingBotTables();

    const configs: any = await executeQuery(`SELECT * FROM funding_bot_config WHERE id = 1 LIMIT 1`);
    if (!configs || !configs[0]) {
      return { status: 'NO_CONFIG' };
    }

    const config = configs[0];

    // If bot is stopped, do nothing
    if (!config.is_active) {
      return { status: 'IDLE', message: 'Funding bot is currently stopped' };
    }

    const now = Date.now();
    const openSecondsBefore = parseInt(config.open_seconds_before) || 30;
    const closeSecondsAfter = parseInt(config.close_seconds_after) || 10;
    const notionalUsd = parseFloat(config.notional_usd) || 100;
    const leverage = parseInt(config.leverage) || 5;

    // ─────────────────────────────────────────────────────────────
    // CASE A: Bot is currently HOLDING a position for funding fee
    // ─────────────────────────────────────────────────────────────
    if (config.current_state === 'HOLDING_FOR_FUNDING' && config.current_symbol) {
      const targetFundingTime = parseInt(config.target_next_funding_time) || 0;
      const closeThresholdTime = targetFundingTime + (closeSecondsAfter * 1000);
      const symbol = config.current_symbol;
      const side = config.current_side as 'SHORT' | 'LONG';
      const quantity = parseFloat(config.quantity) || 0;
      const entryPrice = parseFloat(config.entry_price) || 0;
      const rrRatio = (config.rr_ratio || 'NONE') as 'NONE' | '1:1' | '1:2' | '1:3';
      const isRrMode = rrRatio !== 'NONE';

      // ─────────────────────────────────────────────────────────────
      // PILIHAN 2 - BRANCH A: RR TARGET MODE (1:1, 1:2, 1:3)
      // Bot TIDAK force close di 10 detik! Posisi di-hold sampai TP / SL kena di Binance.
      // ─────────────────────────────────────────────────────────────
      if (isRrMode) {
        let livePos: BinanceRealPosition | null = null;
        try {
          livePos = await fetchRealPosition(symbol);
        } catch (posErr) {
          console.warn(`fetchRealPosition warning for ${symbol}:`, posErr);
        }

        if (livePos && Math.abs(livePos.positionAmt) > 0) {
          // Posisi masih aktif dan berjalan menuju target TP/SL
          const hasPayoutPassed = now >= targetFundingTime;
          return {
            status: 'HOLDING',
            symbol,
            side,
            entryPrice,
            markPrice: livePos.markPrice,
            unrealizedPnl: livePos.unRealizedProfit,
            roePercent: livePos.roePercent,
            secondsLeftToClose: 0,
            isRrMode: true,
            rrRatio,
            tpPrice: config.tp_price ? parseFloat(config.tp_price) : null,
            slPrice: config.sl_price ? parseFloat(config.sl_price) : null,
            hasPayoutPassed
          };
        } else {
          // POSISI TELAH TERTUTUP DI BINANCE (Order Algo TP atau SL tereksekusi!)
          await executeQuery(`
            UPDATE funding_bot_config
            SET current_state = 'CLOSING', last_check_at = NOW()
            WHERE id = 1
          `);

          await addFundingBotLog(
            'CLOSE',
            `🎯 Posisi ${symbol} ${side} telah tertutup di Binance (Target TP / SL tercapai)! Membersihkan order bracket...`,
            'SUCCESS'
          );

          try {
            // Bersihkan sisa order bracket (misal jika TP hit, batalkan SL yang masih pending)
            await cancelSymbolOpenOrders(symbol);

            // Ambil riwayat trade penutupan
            const tradeInfo = await fetchSymbolRecentClosedTrades(symbol, targetFundingTime - 120000);
            const exitPrice = tradeInfo?.exitPrice || entryPrice;
            const tradeRealizedPnl = tradeInfo?.realizedPnl || 0;
            const commission = tradeInfo?.commission || 0;

            // Ambil funding fee yang berhasil masuk
            let actualFundingFee = 0;
            try {
              const incomeRes = await fetchFundingIncome(symbol, targetFundingTime - 120000);
              if (incomeRes && incomeRes.totalFundingFee !== 0) {
                actualFundingFee = incomeRes.totalFundingFee;
              }
            } catch {}

            if (actualFundingFee === 0 && now >= targetFundingTime) {
              const rate = parseFloat(config.target_funding_rate) || 0;
              actualFundingFee = notionalUsd * Math.abs(rate);
            }

            const netPnl = tradeRealizedPnl - commission + actualFundingFee;
            const netPnlPercent = notionalUsd > 0 ? (netPnl / notionalUsd) * 100 : 0;
            const roundNum = parseInt(config.round_number) || 1;
            const exitReason = tradeRealizedPnl >= 0 ? 'TP_HIT' : 'SL_HIT';

            // Catat ke riwayat
            await executeQuery(`
              INSERT INTO funding_bot_history 
                (round_number, symbol, side, notional_usd, leverage, funding_rate, entry_price, exit_price, quantity, funding_fee_usd, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, exit_reason, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
              VALUES 
                (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?, ?, ?, NOW())
            `, [
              roundNum,
              symbol,
              side,
              notionalUsd,
              leverage,
              parseFloat(config.target_funding_rate) || 0,
              entryPrice,
              exitPrice,
              tradeInfo?.totalQty || quantity,
              actualFundingFee,
              tradeRealizedPnl,
              commission,
              netPnl,
              netPnlPercent,
              exitReason,
              config.binance_order_id || null,
              tradeInfo?.lastOrderId || null,
              config.last_check_at || new Date()
            ]);

            const isCompound = config.is_compound === 1 || config.is_compound === true || config.is_compound === '1' || String(config.is_compound) === 'true';
            let nextNotionalUsd = notionalUsd;

            if (isCompound && netPnl > 0) {
              nextNotionalUsd = Math.round((notionalUsd + netPnl) * 100) / 100;
              await addFundingBotLog(
                'COMPOUND',
                `📈 Auto-Compound Aktif: Profit +$${netPnl.toFixed(4)} USD ditambahkan ke Notional! Notional berikutnya naik: $${notionalUsd.toFixed(2)} ➔ $${nextNotionalUsd.toFixed(2)} USD.`,
                'SUCCESS'
              );
            }

            // Update akumulasi total dan kembalikan state ke SCANNING
            const newTotalProfit = (parseFloat(config.total_profit) || 0) + netPnl;
            const newTotalFee = (parseFloat(config.total_funding_fee) || 0) + actualFundingFee;
            const newTotalTrade = (parseFloat(config.total_trade_pnl) || 0) + tradeRealizedPnl;

            await executeQuery(`
              UPDATE funding_bot_config
              SET current_state = 'SCANNING',
                  current_symbol = NULL,
                  current_side = NULL,
                  target_funding_rate = NULL,
                  target_next_funding_time = NULL,
                  entry_price = NULL,
                  tp_price = NULL,
                  sl_price = NULL,
                  quantity = NULL,
                  binance_order_id = NULL,
                  notional_usd = ?,
                  total_profit = ?,
                  total_funding_fee = ?,
                  total_trade_pnl = ?,
                  last_check_at = NOW()
              WHERE id = 1
            `, [nextNotionalUsd, newTotalProfit, newTotalFee, newTotalTrade]);

            const pnlSign = netPnl >= 0 ? '+' : '';
            const hitLabel = tradeRealizedPnl >= 0 ? '🎯 TP HIT' : '🛑 SL HIT';
            await addFundingBotLog(
              'CYCLE_COMPLETE',
              `🎉 Round #${roundNum} Selesai via Target RR ${rrRatio}! ${symbol} Exit @ $${exitPrice} (${hitLabel}) | Funding Fee: +$${actualFundingFee.toFixed(4)} | Trade PnL: $${tradeRealizedPnl.toFixed(4)} | Net: ${pnlSign}$${netPnl.toFixed(4)} (${pnlSign}${netPnlPercent.toFixed(2)}%)`,
              netPnl >= 0 ? 'SUCCESS' : 'WARN'
            );

            return {
              status: 'ROUND_COMPLETED',
              roundNumber: roundNum,
              symbol,
              exitPrice,
              fundingFee: actualFundingFee,
              tradePnl: tradeRealizedPnl,
              netPnl,
              exitReason
            };
          } catch (closeError: any) {
            console.error("Error finalizing RR trade:", closeError);
            await addFundingBotLog(
              'ERROR',
              `Gagal mencatat penyelesaian trade RR ${symbol}: ${closeError.message}.`,
              'ERROR'
            );
            return { status: 'CLOSE_FAILED', error: closeError.message };
          }
        }
      }

      // ─────────────────────────────────────────────────────────────
      // PILIHAN 2 - BRANCH B: FEE LOCK MODE (Close di +10s setelah payout)
      // ─────────────────────────────────────────────────────────────
      if (now >= closeThresholdTime) {
        // TIME TO CLOSE POSITION!
        await executeQuery(`
          UPDATE funding_bot_config
          SET current_state = 'CLOSING', last_check_at = NOW()
          WHERE id = 1
        `);

        await addFundingBotLog(
          'CLOSE',
          `⏳ Periode settlement funding telah selesai! Menutup posisi ${symbol} ${side} via Market Order...`,
          'INFO'
        );

        try {
          // If we opened SHORT (sold), we close with BUY.
          // If we opened LONG (bought), we close with SELL.
          const closeSide = side === 'SHORT' ? 'BUY' : 'SELL';

          const closeRes = await executeFundingCloseOrder({
            symbol,
            side: closeSide,
            quantity,
            entryPrice
          });

          // Fetch real funding income from Binance ledger
          let actualFundingFee = 0;
          try {
            await new Promise(r => setTimeout(r, 600)); // brief pause for ledger sync
            const incomeRes = await fetchFundingIncome(symbol, targetFundingTime);
            if (incomeRes && incomeRes.totalFundingFee !== 0) {
              actualFundingFee = incomeRes.totalFundingFee;
            }
          } catch (incErr) {
            console.warn("fetchFundingIncome error:", incErr);
          }

          // If Binance hasn't posted ledger yet, calculate expected theoretical funding fee
          if (actualFundingFee === 0) {
            const rate = parseFloat(config.target_funding_rate) || 0;
            actualFundingFee = notionalUsd * Math.abs(rate);
          }

          const tradeRealizedPnl = closeRes.realizedPnl;
          const commission = closeRes.commission;
          const netPnl = tradeRealizedPnl - commission + actualFundingFee;
          const netPnlPercent = notionalUsd > 0 ? (netPnl / notionalUsd) * 100 : 0;
          const roundNum = parseInt(config.round_number) || 1;

          // Record to History
          await executeQuery(`
            INSERT INTO funding_bot_history 
              (round_number, symbol, side, notional_usd, leverage, funding_rate, entry_price, exit_price, quantity, funding_fee_usd, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, exit_reason, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', 'TIME_EXIT', ?, ?, ?, NOW())
          `, [
            roundNum,
            symbol,
            side,
            notionalUsd,
            leverage,
            parseFloat(config.target_funding_rate) || 0,
            entryPrice,
            closeRes.exitPrice,
            closeRes.quantity,
            actualFundingFee,
            tradeRealizedPnl,
            commission,
            netPnl,
            netPnlPercent,
            config.binance_order_id || null,
            closeRes.orderId,
            config.last_check_at || new Date()
          ]);

          const isCompound = config.is_compound === 1 || config.is_compound === true || config.is_compound === '1' || String(config.is_compound) === 'true';
          let nextNotionalUsd = notionalUsd;

          if (isCompound && netPnl > 0) {
            nextNotionalUsd = Math.round((notionalUsd + netPnl) * 100) / 100;
            await addFundingBotLog(
              'COMPOUND',
              `📈 Auto-Compound Aktif: Profit +$${netPnl.toFixed(4)} USD ditambahkan ke Notional! Notional berikutnya naik: $${notionalUsd.toFixed(2)} ➔ $${nextNotionalUsd.toFixed(2)} USD.`,
              'SUCCESS'
            );
          }

          // Update cumulative totals and reset state to SCANNING for the next coin!
          const newTotalProfit = (parseFloat(config.total_profit) || 0) + netPnl;
          const newTotalFee = (parseFloat(config.total_funding_fee) || 0) + actualFundingFee;
          const newTotalTrade = (parseFloat(config.total_trade_pnl) || 0) + tradeRealizedPnl;

          await executeQuery(`
            UPDATE funding_bot_config
            SET current_state = 'SCANNING',
                current_symbol = NULL,
                current_side = NULL,
                target_funding_rate = NULL,
                target_next_funding_time = NULL,
                entry_price = NULL,
                tp_price = NULL,
                sl_price = NULL,
                quantity = NULL,
                binance_order_id = NULL,
                notional_usd = ?,
                total_profit = ?,
                total_funding_fee = ?,
                total_trade_pnl = ?,
                last_check_at = NOW()
            WHERE id = 1
          `, [nextNotionalUsd, newTotalProfit, newTotalFee, newTotalTrade]);

          const pnlSign = netPnl >= 0 ? '+' : '';
          await addFundingBotLog(
            'CYCLE_COMPLETE',
            `🎉 Round #${roundNum} Selesai! ${symbol} Exit @ $${closeRes.exitPrice} | Funding Fee: +$${actualFundingFee.toFixed(4)} | Price PnL: $${tradeRealizedPnl.toFixed(4)} | Net: ${pnlSign}$${netPnl.toFixed(4)} (${pnlSign}${netPnlPercent.toFixed(2)}%)`,
            netPnl >= 0 ? 'SUCCESS' : 'WARN'
          );

          return {
            status: 'ROUND_COMPLETED',
            roundNumber: roundNum,
            symbol,
            exitPrice: closeRes.exitPrice,
            fundingFee: actualFundingFee,
            tradePnl: tradeRealizedPnl,
            netPnl,
            exitReason: 'TIME_EXIT'
          };
        } catch (closeError: any) {
          console.error("Error closing position during funding settlement:", closeError);
          await addFundingBotLog(
            'ERROR',
            `Gagal menutup posisi ${symbol}: ${closeError.message}. Akan mencoba lagi pada tick berikutnya.`,
            'ERROR'
          );
          return { status: 'CLOSE_FAILED', error: closeError.message };
        }
      } else {
        // Still holding position until settlement passes
        const secondsLeftToClose = Math.max(0, Math.floor((closeThresholdTime - now) / 1000));
        let livePos: BinanceRealPosition | null = null;
        try {
          livePos = await fetchRealPosition(symbol);
        } catch {}

        return {
          status: 'HOLDING',
          symbol,
          side,
          entryPrice,
          markPrice: livePos ? livePos.markPrice : entryPrice,
          unrealizedPnl: livePos ? livePos.unRealizedProfit : 0,
          roePercent: livePos ? livePos.roePercent : 0,
          secondsLeftToClose
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: Bot is SCANNING or WAITING for entry (< 30s countdown)
    // ─────────────────────────────────────────────────────────────
    const { targetCandidate, candidates } = await fetchFundingCandidates(notionalUsd);

    if (!targetCandidate) {
      await executeQuery(`
        UPDATE funding_bot_config 
        SET current_state = 'SCANNING', last_check_at = NOW() 
        WHERE id = 1
      `);
      return { status: 'SCANNING', message: 'No upcoming funding settlements found' };
    }

    const timeUntilFundingMs = targetCandidate.nextFundingTime - now;
    const secondsUntilFunding = Math.floor(timeUntilFundingMs / 1000);
    const minFundingRate = parseFloat(config.min_funding_rate) || 0.0001;

    // Check if target coin meets minimum funding rate
    if (targetCandidate.absRate < minFundingRate) {
      return {
        status: 'BELOW_THRESHOLD',
        candidate: targetCandidate,
        message: `Koin tertinggi (${targetCandidate.symbol}: ${(targetCandidate.fundingRate * 100).toFixed(4)}%) masih di bawah minimum ${(minFundingRate * 100).toFixed(4)}%`
      };
    }

    // Trigger Entry if time until funding is less than openSecondsBefore (default < 30s)
    // Add safety floor (e.g. must be > 3 seconds before nextFundingTime so order fills before settlement snapshot)
    if (secondsUntilFunding <= openSecondsBefore && secondsUntilFunding >= 2) {
      // TIME TO OPEN POSITION!
      await addFundingBotLog(
        'OPEN_TRIGGER',
        `⚡ Sisa waktu funding ${targetCandidate.symbol} tersisa ${secondsUntilFunding} detik (< ${openSecondsBefore}s)! Membuka posisi ${targetCandidate.recommendation}...`,
        'INFO'
      );

      try {
        const isReverse = Boolean(config.is_reverse);
        const rrRatio = (config.rr_ratio || 'NONE') as 'NONE' | '1:1' | '1:2' | '1:3';
        const baseSlPercent = parseFloat(config.base_sl_percent) || 1.5;

        // Normal Arbitrage: if fundingRate > 0 -> SELL (SHORT), if fundingRate < 0 -> BUY (LONG)
        const standardOrderSide = targetCandidate.fundingRate > 0 ? 'SELL' : 'BUY';

        let orderSide: 'BUY' | 'SELL' = standardOrderSide;
        let positionSide: 'SHORT' | 'LONG' = targetCandidate.recommendation;

        if (isReverse) {
          orderSide = standardOrderSide === 'SELL' ? 'BUY' : 'SELL';
          positionSide = orderSide === 'SELL' ? 'SHORT' : 'LONG';
        }

        const openRes = await executeFundingOrderWithRR({
          symbol: targetCandidate.symbol,
          side: orderSide,
          notionalUsd,
          leverage,
          rrRatio,
          baseSlPercent,
          isReverse
        });

        const nextRoundNumber = (parseInt(config.round_number) || 0) + 1;

        const tpVal = openRes.takeProfitPrice ? parseFloat(openRes.takeProfitPrice) : null;
        const slVal = openRes.stopLossPrice ? parseFloat(openRes.stopLossPrice) : null;

        await executeQuery(`
          UPDATE funding_bot_config
          SET current_state = 'HOLDING_FOR_FUNDING',
              current_symbol = ?,
              current_side = ?,
              target_funding_rate = ?,
              target_next_funding_time = ?,
              entry_price = ?,
              tp_price = ?,
              sl_price = ?,
              quantity = ?,
              binance_order_id = ?,
              round_number = ?,
              last_check_at = NOW()
          WHERE id = 1
        `, [
          targetCandidate.symbol,
          positionSide,
          targetCandidate.fundingRate,
          targetCandidate.nextFundingTime,
          openRes.fillPrice,
          tpVal,
          slVal,
          openRes.quantity,
          openRes.orderId,
          nextRoundNumber
        ]);

        const reverseTag = isReverse ? ' [MODE REVERSE]' : '';
        const rrTag = rrRatio !== 'NONE' ? ` | Target: ${rrRatio} (SL: ${openRes.stopLossPrice} / TP: ${openRes.takeProfitPrice})` : '';

        await addFundingBotLog(
          'OPENED',
          `🚀 Posisi Round #${nextRoundNumber} Berhasil Dibuka!${reverseTag} ${targetCandidate.symbol} ${positionSide} @ $${openRes.fillPrice} | Notional: $${notionalUsd} USD (${leverage}x)${rrTag}`,
          'SUCCESS'
        );

        return {
          status: 'ORDER_OPENED',
          symbol: targetCandidate.symbol,
          side: positionSide,
          entryPrice: openRes.fillPrice,
          quantity: openRes.quantity,
          orderId: openRes.orderId
        };
      } catch (openError: any) {
        console.error("Error executing funding open order:", openError);
        await addFundingBotLog(
          'ERROR',
          `Gagal membuka posisi ${targetCandidate.symbol}: ${openError.message}`,
          'ERROR'
        );
        return { status: 'OPEN_FAILED', error: openError.message };
      }
    } else {
      // Waiting for countdown to reach < openSecondsBefore (e.g. < 30s)
      await executeQuery(`
        UPDATE funding_bot_config
        SET current_state = 'WAITING_ENTRY',
            current_symbol = ?,
            target_funding_rate = ?,
            target_next_funding_time = ?,
            last_check_at = NOW()
        WHERE id = 1
      `, [targetCandidate.symbol, targetCandidate.fundingRate, targetCandidate.nextFundingTime]);

      return {
        status: 'WAITING_ENTRY',
        targetCandidate,
        secondsUntilFunding,
        openSecondsBefore
      };
    }
  } catch (err: any) {
    console.error("tickFundingBot unhandled error:", err);
    return { status: 'ERROR', error: err.message };
  } finally {
    isTickingFundingBot = false;
  }
}

/**
 * Clear terminal logs
 */
export async function clearFundingBotLogs() {
  await ensureFundingBotTables();
  await executeQuery(`DELETE FROM funding_bot_logs`);
  return { success: true };
}
