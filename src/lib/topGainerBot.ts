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

export type TopGainerSessionPreset =
  | 'NEW_YORK'
  | 'NEW_YORK_PRIME'
  | 'LONDON'
  | 'LONDON_OPEN'
  | 'ASIA'
  | 'ASIA_MORNING'
  | 'ASIA_LONDON'
  | 'OVERLAP'
  | 'ALL_3_SESSIONS'
  | 'CUSTOM';

export interface TopGainerBotConfig {
  id: number;
  is_active: boolean;
  strategy_mode: 'FLASH_SCALP' | 'SESSION_HOURS';
  session_preset: TopGainerSessionPreset;
  session_start_time: string;
  session_end_time: string;
  session_last_open_slot: string | null;
  trailing_stop_enabled: boolean;
  trailing_callback_percent: number;
  trailing_activation_percent: number;
  peak_price: number | null;
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
  peak_price: number | null;
  quantity: number;
  hold_seconds: number;
  trade_pnl_usd: number;
  commission_usd: number;
  net_pnl_usd: number;
  net_pnl_percent: number;
  status: string;
  exit_reason: string;
  strategy_mode: string;
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
 * Helper to get current WIB (UTC+7) Date and Time information
 */
export function getWibTimeInfo(date: Date = new Date()) {
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const wib = new Date(utc + 7 * 3600000);
  const hours = wib.getHours();
  const minutes = wib.getMinutes();
  const seconds = wib.getSeconds();
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  const dateString = `${wib.getFullYear()}-${String(wib.getMonth() + 1).padStart(2, '0')}-${String(wib.getDate()).padStart(2, '0')}`;
  const totalMinutes = hours * 60 + minutes;
  return { wib, hours, minutes, seconds, timeString, dateString, totalMinutes };
}

/**
 * Check if the given HH:mm time is within the session start and end window
 */
export function isWithinSessionTime(currentTime: string, startTime: string, endTime: string): boolean {
  if (!startTime || !endTime) return true;
  if (startTime === endTime) return true;

  const [cHour, cMin] = (currentTime || '00:00').split(':').map(Number);
  const [sHour, sMin] = (startTime || '20:00').split(':').map(Number);
  const [eHour, eMin] = (endTime || '04:00').split(':').map(Number);

  const cTotal = cHour * 60 + cMin;
  const sTotal = sHour * 60 + sMin;
  const eTotal = eHour * 60 + eMin;

  if (sTotal < eTotal) {
    // Normal single-day session, e.g. 14:00 to 22:00
    return cTotal >= sTotal && cTotal < eTotal;
  } else {
    // Overnight session crossing midnight, e.g. 20:00 to 04:00
    return cTotal >= sTotal || cTotal < eTotal;
  }
}

/**
 * Get a unique slot identifier for the active or current trading session date
 * E.g. "2026-09-27_20:00"
 */
export function getSessionSlotKey(startTime: string, endTime: string, date: Date = new Date()): string {
  const { hours, minutes, dateString, totalMinutes, wib } = getWibTimeInfo(date);
  const [sHour, sMin] = (startTime || '20:00').split(':').map(Number);
  const [eHour, eMin] = (endTime || '04:00').split(':').map(Number);
  const sTotal = sHour * 60 + sMin;
  const eTotal = eHour * 60 + eMin;

  if (sTotal > eTotal && totalMinutes < eTotal) {
    // After midnight of overnight session: slot began yesterday
    const prevDay = new Date(wib.getTime() - 24 * 3600000);
    const prevDateStr = `${prevDay.getFullYear()}-${String(prevDay.getMonth() + 1).padStart(2, '0')}-${String(prevDay.getDate()).padStart(2, '0')}`;
    return `${prevDateStr}_${startTime}`;
  }
  return `${dateString}_${startTime}`;
}

export interface ActiveSessionInfo {
  name: string;
  preset: TopGainerSessionPreset;
  startTime: string;
  endTime: string;
  slotKey: string;
  isInSession: boolean;
  wibTime: string;
}

/**
 * Determine the currently active trading session window based on current WIB time
 */
export function getCurrentActiveSession(config: {
  session_preset: string;
  session_start_time: string;
  session_end_time: string;
}, date: Date = new Date()): ActiveSessionInfo {
  const wibInfo = getWibTimeInfo(date);
  const currentWibTime = wibInfo.timeString;

  if (config.session_preset === 'ALL_3_SESSIONS') {
    // 3 Sessions schedule:
    // Sesi 1: Asia (07:00 - 14:00)
    // Sesi 2: London (14:00 - 20:00)
    // Sesi 3: New York (20:00 - 04:00)
    const sessions: Array<{ name: string; preset: TopGainerSessionPreset; start: string; end: string }> = [
      { name: 'Sesi Asia', preset: 'ASIA', start: '07:00', end: '14:00' },
      { name: 'Sesi London', preset: 'LONDON', start: '14:00', end: '20:00' },
      { name: 'Sesi New York', preset: 'NEW_YORK', start: '20:00', end: '04:00' },
    ];

    for (const s of sessions) {
      if (isWithinSessionTime(currentWibTime, s.start, s.end)) {
        return {
          name: s.name,
          preset: s.preset,
          startTime: s.start,
          endTime: s.end,
          slotKey: getSessionSlotKey(s.start, s.end, date),
          isInSession: true,
          wibTime: currentWibTime
        };
      }
    }

    // Between 04:00 and 07:00 WIB (waiting for Asia session)
    return {
      name: 'Menunggu Sesi Asia (07:00 WIB)',
      preset: 'ASIA',
      startTime: '07:00',
      endTime: '14:00',
      slotKey: getSessionSlotKey('07:00', '14:00', date),
      isInSession: false,
      wibTime: currentWibTime
    };
  }

  // Single session mode
  const sStart = config.session_start_time || '20:00';
  const sEnd = config.session_end_time || '04:00';
  const inSession = isWithinSessionTime(currentWibTime, sStart, sEnd);

  let name = 'Sesi Kustom';
  switch (config.session_preset) {
    case 'NEW_YORK': name = 'Sesi New York (Full)'; break;
    case 'NEW_YORK_PRIME': name = 'Sesi New York (Prime)'; break;
    case 'LONDON': name = 'Sesi London (Full)'; break;
    case 'LONDON_OPEN': name = 'Sesi London (Open Killzone)'; break;
    case 'ASIA': name = 'Sesi Asia (Full)'; break;
    case 'ASIA_MORNING': name = 'Sesi Asia (Pagi Tokyo)'; break;
    case 'ASIA_LONDON': name = 'Sesi Asia-London Crossover'; break;
    case 'OVERLAP': name = 'Sesi London-NY Overlap'; break;
  }

  return {
    name,
    preset: (config.session_preset as TopGainerSessionPreset) || 'CUSTOM',
    startTime: sStart,
    endTime: sEnd,
    slotKey: getSessionSlotKey(sStart, sEnd, date),
    isInSession: inSession,
    wibTime: currentWibTime
  };
}

/**
 * Ensure database tables exist for Top Gainer Scalper Bot
 */
export async function ensureTopGainerBotTables() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS top_gainer_bot_config (
      id INT PRIMARY KEY,
      is_active BOOLEAN DEFAULT false,
      strategy_mode VARCHAR(30) DEFAULT 'FLASH_SCALP',
      session_preset VARCHAR(30) DEFAULT 'NEW_YORK',
      session_start_time VARCHAR(10) DEFAULT '20:00',
      session_end_time VARCHAR(10) DEFAULT '04:00',
      session_last_open_slot VARCHAR(50) DEFAULT NULL,
      trailing_stop_enabled BOOLEAN DEFAULT false,
      trailing_callback_percent DECIMAL(8, 2) DEFAULT 1.00,
      trailing_activation_percent DECIMAL(8, 2) DEFAULT 1.00,
      peak_price DECIMAL(18, 8) DEFAULT NULL,
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
      peak_price DECIMAL(18, 8) DEFAULT NULL,
      quantity DECIMAL(18, 8) NOT NULL,
      hold_seconds INT DEFAULT 20,
      trade_pnl_usd DECIMAL(18, 4) DEFAULT 0.0000,
      commission_usd DECIMAL(18, 4) DEFAULT 0.0000,
      net_pnl_usd DECIMAL(18, 4) DEFAULT 0.0000,
      net_pnl_percent DECIMAL(8, 2) DEFAULT 0.00,
      status VARCHAR(30) DEFAULT 'OPEN',
      exit_reason VARCHAR(50) DEFAULT 'TIME_EXIT',
      strategy_mode VARCHAR(30) DEFAULT 'FLASH_SCALP',
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

  // Auto-migration columns for existing databases
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN strategy_mode VARCHAR(30) DEFAULT 'FLASH_SCALP'`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN session_preset VARCHAR(30) DEFAULT 'NEW_YORK'`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN session_start_time VARCHAR(10) DEFAULT '20:00'`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN session_end_time VARCHAR(10) DEFAULT '04:00'`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN session_last_open_slot VARCHAR(50) DEFAULT NULL`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN trailing_stop_enabled BOOLEAN DEFAULT false`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN trailing_callback_percent DECIMAL(8, 2) DEFAULT 1.00`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN trailing_activation_percent DECIMAL(8, 2) DEFAULT 1.00`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_config ADD COLUMN peak_price DECIMAL(18, 8) DEFAULT NULL`);
  } catch {}

  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_history ADD COLUMN exit_reason VARCHAR(50) DEFAULT 'TIME_EXIT'`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_history ADD COLUMN peak_price DECIMAL(18, 8) DEFAULT NULL`);
  } catch {}
  try {
    await executeQuery(`ALTER TABLE top_gainer_bot_history ADD COLUMN strategy_mode VARCHAR(30) DEFAULT 'FLASH_SCALP'`);
  } catch {}

  // Ensure initial config row exists
  const existing: any = await executeQuery(`SELECT count(*) as count FROM top_gainer_bot_config`);
  if (!existing || existing[0].count === 0) {
    await executeQuery(`
      INSERT INTO top_gainer_bot_config 
        (id, is_active, strategy_mode, session_preset, session_start_time, session_end_time, trailing_stop_enabled, trailing_callback_percent, trailing_activation_percent, notional_usd, leverage, hold_seconds, min_gain_percent, is_compound, emergency_sl_percent, current_state)
      VALUES 
        (1, false, 'FLASH_SCALP', 'NEW_YORK', '20:00', '04:00', false, 1.00, 1.00, 50.00, 10, 20, 3.00, false, 3.00, 'IDLE')
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
    strategy_mode: configRow.strategy_mode || 'FLASH_SCALP',
    session_preset: configRow.session_preset || 'NEW_YORK',
    session_start_time: configRow.session_start_time || '20:00',
    session_end_time: configRow.session_end_time || '04:00',
    session_last_open_slot: configRow.session_last_open_slot || null,
    trailing_stop_enabled: Boolean(configRow.trailing_stop_enabled),
    trailing_callback_percent: parseFloat(configRow.trailing_callback_percent) || 1.0,
    trailing_activation_percent: parseFloat(configRow.trailing_activation_percent) || 1.0,
    peak_price: configRow.peak_price ? parseFloat(configRow.peak_price) : null,
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
    peak_price: r.peak_price ? parseFloat(r.peak_price) : null,
    quantity: parseFloat(r.quantity) || 0,
    hold_seconds: parseInt(r.hold_seconds) || 20,
    trade_pnl_usd: parseFloat(r.trade_pnl_usd) || 0,
    commission_usd: parseFloat(r.commission_usd) || 0,
    net_pnl_usd: parseFloat(r.net_pnl_usd) || 0,
    net_pnl_percent: parseFloat(r.net_pnl_percent) || 0,
    status: r.status,
    exit_reason: r.exit_reason || 'TIME_EXIT',
    strategy_mode: r.strategy_mode || 'FLASH_SCALP',
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
  strategyMode?: 'FLASH_SCALP' | 'SESSION_HOURS';
  sessionPreset?: TopGainerSessionPreset;
  sessionStartTime?: string;
  sessionEndTime?: string;
  trailingStopEnabled?: boolean;
  trailingCallbackPercent?: number;
  trailingActivationPercent?: number;
}) {
  await ensureTopGainerBotTables();

  const current: any = await executeQuery(`SELECT * FROM top_gainer_bot_config WHERE id = 1 LIMIT 1`);
  if (!current || !current[0]) {
    throw new Error('Config not found');
  }

  const c = current[0];
  const notional = params?.notionalUsd ?? parseFloat(c.notional_usd) ?? 50;
  const leverage = params?.leverage ?? parseInt(c.leverage) ?? 10;
  const holdSeconds = params?.holdSeconds ?? parseInt(c.hold_seconds) ?? 20;
  const minGain = params?.minGainPercent ?? parseFloat(c.min_gain_percent) ?? 3.0;
  const isCompound = params?.isCompound !== undefined 
    ? Boolean(params.isCompound) 
    : (c.is_compound === 1 || c.is_compound === true || c.is_compound === '1');
  const emergencySl = params?.emergencySlPercent ?? (c.emergency_sl_percent ? parseFloat(c.emergency_sl_percent) : 3.0);
  const strategyMode = params?.strategyMode ?? c.strategy_mode ?? 'FLASH_SCALP';
  const sessionPreset = params?.sessionPreset ?? c.session_preset ?? 'NEW_YORK';
  const sessionStartTime = params?.sessionStartTime ?? c.session_start_time ?? '20:00';
  const sessionEndTime = params?.sessionEndTime ?? c.session_end_time ?? '04:00';
  const trailingEnabled = params?.trailingStopEnabled !== undefined ? Boolean(params.trailingStopEnabled) : Boolean(c.trailing_stop_enabled);
  const trailingCallback = params?.trailingCallbackPercent ?? parseFloat(c.trailing_callback_percent) ?? 1.0;
  const trailingActivation = params?.trailingActivationPercent ?? parseFloat(c.trailing_activation_percent) ?? 1.0;

  // Determine state: if already in position, maintain HOLDING; otherwise SCANNING
  const nextState = c.current_state === 'HOLDING' ? 'HOLDING' : 'SCANNING';

  await executeQuery(`
    UPDATE top_gainer_bot_config
    SET is_active = true,
        strategy_mode = ?,
        session_preset = ?,
        session_start_time = ?,
        session_end_time = ?,
        session_last_open_slot = NULL,
        trailing_stop_enabled = ?,
        trailing_callback_percent = ?,
        trailing_activation_percent = ?,
        notional_usd = ?,
        leverage = ?,
        hold_seconds = ?,
        min_gain_percent = ?,
        is_compound = ?,
        emergency_sl_percent = ?,
        current_state = ?,
        last_check_at = NOW()
    WHERE id = 1
  `, [
    strategyMode,
    sessionPreset,
    sessionStartTime,
    sessionEndTime,
    trailingEnabled,
    trailingCallback,
    trailingActivation,
    notional,
    leverage,
    holdSeconds,
    minGain,
    isCompound,
    emergencySl,
    nextState
  ]);

  const modeText = strategyMode === 'SESSION_HOURS'
    ? `🏛️ SESI ${sessionPreset} (${sessionStartTime} - ${sessionEndTime} WIB)`
    : `⚡ FLASH SCALP (${holdSeconds}s)`;
  const trailingText = trailingEnabled ? ` | Trailing Stop: ON (Callback: ${trailingCallback}%, Trigger: +${trailingActivation}%)` : '';
  const compoundText = isCompound ? ' | Compound: IYA' : ' | Compound: TIDAK';

  await addTopGainerBotLog(
    'START',
    `🟢 Bot Top Gainer [${modeText}] DIAKTIFKAN! Notional: $${notional} USD | Leverage: ${leverage}x | Min Gain: +${minGain}%${trailingText}${compoundText}`,
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
          (round_number, symbol, gain_percent, notional_usd, leverage, entry_price, exit_price, peak_price, quantity, hold_seconds, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, exit_reason, strategy_mode, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
        VALUES 
          (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', 'MANUAL_CLOSED', ?, ?, ?, NOW(), NOW())
      `, [
        c.round_number || 1,
        c.current_symbol,
        notional,
        c.leverage || 10,
        c.entry_price || closeRes.exitPrice,
        closeRes.exitPrice,
        c.peak_price || closeRes.exitPrice,
        closeRes.quantity,
        c.hold_seconds || 20,
        closeRes.realizedPnl,
        closeRes.commission,
        netPnl,
        netPercent,
        c.strategy_mode || 'FLASH_SCALP',
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
        peak_price = NULL,
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
  strategyMode?: 'FLASH_SCALP' | 'SESSION_HOURS';
  sessionPreset?: TopGainerSessionPreset;
  sessionStartTime?: string;
  sessionEndTime?: string;
  trailingStopEnabled?: boolean;
  trailingCallbackPercent?: number;
  trailingActivationPercent?: number;
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
  const strategyMode = params.strategyMode !== undefined ? params.strategyMode : (c.strategy_mode || 'FLASH_SCALP');
  const sessionPreset = params.sessionPreset !== undefined ? params.sessionPreset : (c.session_preset || 'NEW_YORK');
  const sessionStartTime = params.sessionStartTime !== undefined ? params.sessionStartTime : (c.session_start_time || '20:00');
  const sessionEndTime = params.sessionEndTime !== undefined ? params.sessionEndTime : (c.session_end_time || '04:00');
  const trailingEnabled = params.trailingStopEnabled !== undefined ? Boolean(params.trailingStopEnabled) : Boolean(c.trailing_stop_enabled);
  const trailingCallback = params.trailingCallbackPercent !== undefined ? params.trailingCallbackPercent : parseFloat(c.trailing_callback_percent || 1.0);
  const trailingActivation = params.trailingActivationPercent !== undefined ? params.trailingActivationPercent : parseFloat(c.trailing_activation_percent || 1.0);

  await executeQuery(`
    UPDATE top_gainer_bot_config
    SET notional_usd = ?,
        leverage = ?,
        hold_seconds = ?,
        min_gain_percent = ?,
        is_compound = ?,
        emergency_sl_percent = ?,
        strategy_mode = ?,
        session_preset = ?,
        session_start_time = ?,
        session_end_time = ?,
        trailing_stop_enabled = ?,
        trailing_callback_percent = ?,
        trailing_activation_percent = ?,
        last_check_at = NOW()
    WHERE id = 1
  `, [
    notional,
    leverage,
    holdSeconds,
    minGain,
    isCompound,
    emergencySl,
    strategyMode,
    sessionPreset,
    sessionStartTime,
    sessionEndTime,
    trailingEnabled,
    trailingCallback,
    trailingActivation
  ]);

  const modeDesc = strategyMode === 'SESSION_HOURS'
    ? `Sesi ${sessionPreset} (${sessionStartTime}-${sessionEndTime} WIB)`
    : `Flash Scalp ${holdSeconds}s`;
  const trailingDesc = trailingEnabled ? ` | Trailing Stop: ON (${trailingCallback}%)` : '';

  await addTopGainerBotLog(
    'CONFIG',
    `⚙️ Pengaturan diperbarui: Mode: ${modeDesc} | Notional: $${notional} USD (${leverage}x)${trailingDesc}`,
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
 * Main Tick Engine: Evaluates Top Gainer #1 coin, fires Market Buy, counts down 20 seconds or session hours, and executes Market Sell or Trailing Stop.
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
    const strategyMode: 'FLASH_SCALP' | 'SESSION_HOURS' = config.strategy_mode || 'FLASH_SCALP';
    const trailingStopEnabled = Boolean(config.trailing_stop_enabled);
    const trailingCallbackPercent = parseFloat(config.trailing_callback_percent) || 1.0;
    const trailingActivationPercent = parseFloat(config.trailing_activation_percent) || 1.0;

    // Active session information dynamically determined based on preset / schedule
    const activeSession = getCurrentActiveSession(config, new Date());
    const sessionStartTime = activeSession.startTime;
    const sessionEndTime = activeSession.endTime;
    const currentSlotKey = activeSession.slotKey;
    const isInSession = activeSession.isInSession;
    const currentWibTime = activeSession.wibTime;
    const sessionDisplayName = activeSession.name;

    // ─────────────────────────────────────────────────────────────
    // CASE A: Bot is currently HOLDING a position
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

      const markPrice = livePos?.markPrice || entryPrice;

      // Track Peak Price (Highest mark price recorded during position)
      const storedPeak = config.peak_price ? parseFloat(config.peak_price) : entryPrice;
      const peakPrice = Math.max(storedPeak, markPrice);
      if (markPrice > storedPeak) {
        await executeQuery(`
          UPDATE top_gainer_bot_config 
          SET peak_price = ? 
          WHERE id = 1
        `, [peakPrice]);
      }

      // Calculate Trailing Stop status
      const peakProfitPercent = entryPrice > 0 ? ((peakPrice - entryPrice) / entryPrice) * 100 : 0;
      const dropFromPeakPercent = peakPrice > 0 ? ((peakPrice - markPrice) / peakPrice) * 100 : 0;
      const isTrailingActivated = peakProfitPercent >= trailingActivationPercent;
      const isTrailingStopTriggered = trailingStopEnabled && isTrailingActivated && (dropFromPeakPercent >= trailingCallbackPercent);

      // Check Emergency Stop Loss if configured
      const emergencySl = config.emergency_sl_percent ? parseFloat(config.emergency_sl_percent) : null;
      const isEmergencyHit = emergencySl && livePos && livePos.roePercent <= -emergencySl;

      // Check Session End Exit
      const isSessionEnded = strategyMode === 'SESSION_HOURS' && (!isInSession || (config.session_last_open_slot && config.session_last_open_slot !== currentSlotKey));

      // Check Flash Scalp Time Exit
      const isTimeExit = strategyMode === 'FLASH_SCALP' && elapsedSeconds >= holdSeconds;

      // Determine if exit condition is met
      let shouldClose = false;
      let exitReason = 'TIME_EXIT';
      let closeLogMessage = '';
      let logType: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR' = 'INFO';

      if (isEmergencyHit) {
        shouldClose = true;
        exitReason = 'STOP_LOSS';
        closeLogMessage = `🛑 STOP LOSS DARURAT (-${emergencySl}% ROE)`;
        logType = 'WARN';
      } else if (isTrailingStopTriggered) {
        shouldClose = true;
        exitReason = 'TRAILING_STOP';
        closeLogMessage = `🎯 TRAILING STOP HIT! Puncak $${peakPrice.toFixed(4)} (+${peakProfitPercent.toFixed(2)}%) pullback ${dropFromPeakPercent.toFixed(2)}% (Target Callback: ${trailingCallbackPercent}%)`;
        logType = 'SUCCESS';
      } else if (isSessionEnded) {
        shouldClose = true;
        exitReason = 'SESSION_END';
        closeLogMessage = `🏁 JAM TUTUP SESI TERCAPAI (${sessionEndTime} WIB)`;
        logType = 'INFO';
      } else if (isTimeExit) {
        shouldClose = true;
        exitReason = 'TIME_EXIT';
        closeLogMessage = `⏱️ Waktu Scalp ${holdSeconds}s Selesai`;
        logType = 'INFO';
      }

      // TIME TO CLOSE!
      if (shouldClose) {
        await executeQuery(`
          UPDATE top_gainer_bot_config
          SET current_state = 'CLOSING', last_check_at = NOW()
          WHERE id = 1
        `);

        await addTopGainerBotLog(
          'CLOSE_TRIGGER',
          `${closeLogMessage}! Menutup posisi ${symbol} via Market Sell...`,
          logType
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
              (round_number, symbol, gain_percent, notional_usd, leverage, entry_price, exit_price, peak_price, quantity, hold_seconds, trade_pnl_usd, commission_usd, net_pnl_usd, net_pnl_percent, status, exit_reason, strategy_mode, binance_open_order_id, binance_close_order_id, opened_at, closed_at)
            VALUES 
              (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CLOSED', ?, ?, ?, ?, FROM_UNIXTIME(?), NOW())
          `, [
            roundNum,
            symbol,
            0,
            notionalUsd,
            leverage,
            entryPrice,
            closeRes.exitPrice,
            peakPrice,
            closeRes.quantity,
            elapsedSeconds,
            tradeRealizedPnl,
            commission,
            netPnl,
            netPnlPercent,
            exitReason,
            strategyMode,
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

          // Reset state to SCANNING
          await executeQuery(`
            UPDATE top_gainer_bot_config
            SET current_state = 'SCANNING',
                current_symbol = NULL,
                entry_price = NULL,
                quantity = NULL,
                binance_order_id = NULL,
                entry_time = NULL,
                peak_price = NULL,
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
          const exitLabel = exitReason === 'TRAILING_STOP' ? '🎯 Trailing Stop' : exitReason === 'SESSION_END' ? '🏁 Tutup Sesi' : exitReason === 'STOP_LOSS' ? '🛑 Stop Loss' : '⏱️ Scalp 20s';

          await addTopGainerBotLog(
            'CYCLE_COMPLETE',
            `🎉 [${exitLabel}] Round #${roundNum} Selesai (${elapsedSeconds}s)! ${symbol} Entry: $${entryPrice} ➔ Exit: $${closeRes.exitPrice} (Puncak: $${peakPrice.toFixed(4)}) | Net: ${pnlSign}$${netPnl.toFixed(4)} (${pnlSign}${netPnlPercent.toFixed(2)}%)`,
            netPnl >= 0 ? 'SUCCESS' : 'WARN'
          );

          return {
            status: 'ROUND_COMPLETED',
            roundNumber: roundNum,
            symbol,
            entryPrice,
            exitPrice: closeRes.exitPrice,
            peakPrice,
            exitReason,
            strategyMode,
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
        // Still holding position
        return {
          status: 'HOLDING',
          symbol,
          entryPrice,
          markPrice,
          peakPrice,
          unrealizedPnl: livePos ? livePos.unRealizedProfit : 0,
          roePercent: livePos ? livePos.roePercent : 0,
          elapsedSeconds,
          secondsLeft,
          holdSeconds,
          strategyMode,
          sessionInfo: {
            preset: activeSession.preset,
            name: sessionDisplayName,
            startTime: sessionStartTime,
            endTime: sessionEndTime,
            currentWibTime,
            isInSession
          },
          trailingInfo: {
            enabled: trailingStopEnabled,
            activationPercent: trailingActivationPercent,
            callbackPercent: trailingCallbackPercent,
            peakProfitPercent,
            dropFromPeakPercent,
            isActivated: isTrailingActivated
          }
        };
      }
    }

    // ─────────────────────────────────────────────────────────────
    // CASE B: Bot is SCANNING for Top Gainer #1 Coin
    // ─────────────────────────────────────────────────────────────

    // If Strategy Mode is SESSION_HOURS:
    if (strategyMode === 'SESSION_HOURS') {
      if (!isInSession) {
        await executeQuery(`
          UPDATE top_gainer_bot_config 
          SET current_state = 'SCANNING', last_check_at = NOW() 
          WHERE id = 1
        `);
        return {
          status: 'WAITING_SESSION',
          message: `Menunggu Jadwal ${sessionDisplayName} (${sessionStartTime} - ${sessionEndTime} WIB). Jam saat ini: ${currentWibTime} WIB.`
        };
      }

      // Check if session slot was already opened
      if (config.session_last_open_slot === currentSlotKey) {
        await executeQuery(`
          UPDATE top_gainer_bot_config 
          SET current_state = 'SCANNING', last_check_at = NOW() 
          WHERE id = 1
        `);
        return {
          status: 'SESSION_COMPLETED',
          message: `${sessionDisplayName} (${sessionStartTime} - ${sessionEndTime} WIB) untuk slot hari ini telah selesai diperdagangkan. Menunggu sesi berikutnya.`
        };
      }
    }

    // Fetch Top Gainers from Binance Futures
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

    // Leader shift log
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

    // Determine if we should open BUY order:
    // For FLASH_SCALP: triggers if rank1Coin is different from lastBought coin
    // For SESSION_HOURS: triggers because we are in session and haven't opened yet for this slot
    const shouldOpenBuy = strategyMode === 'SESSION_HOURS'
      ? (config.session_last_open_slot !== currentSlotKey)
      : (rank1Coin.symbol !== lastBought);

    if (shouldOpenBuy) {
      const triggerContext = strategyMode === 'SESSION_HOURS'
        ? `🏛️ [${sessionDisplayName.toUpperCase()} AKTIF] Koin Juara #1: ${rank1Coin.symbol} (+${rank1Coin.priceChangePercent.toFixed(2)}%)`
        : `🚀 KOIN BARU MASUK URUTAN PERTAMA: ${rank1Coin.symbol} (+${rank1Coin.priceChangePercent.toFixed(2)}%)`;

      const targetDesc = strategyMode === 'SESSION_HOURS'
        ? `sesi hingga pukul ${sessionEndTime} WIB`
        : `scalp ${holdSeconds} detik`;

      await addTopGainerBotLog(
        'BUY_TRIGGER',
        `${triggerContext}! Membuka BUY untuk ${targetDesc}...`,
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
              peak_price = ?,
              quantity = ?,
              binance_order_id = ?,
              entry_time = ?,
              session_last_open_slot = ?,
              last_leader_symbol = ?,
              last_bought_symbol = ?,
              last_check_at = NOW()
          WHERE id = 1
        `, [
          rank1Coin.symbol,
          buyRes.fillPrice,
          buyRes.fillPrice, // initial peak is fill price
          buyRes.quantity,
          buyRes.orderId,
          entryTimestamp,
          strategyMode === 'SESSION_HOURS' ? currentSlotKey : config.session_last_open_slot,
          rank1Coin.symbol,
          rank1Coin.symbol
        ]);

        const trailingInfoLog = trailingStopEnabled
          ? ` | Trailing Stop: ON (${trailingCallbackPercent}% callback)`
          : '';

        await addTopGainerBotLog(
          'BUY_OPENED',
          `✅ Posisi BUY Berhasil Dibuka! ${rank1Coin.symbol} @ $${buyRes.fillPrice} | Notional: $${notionalUsd} USD (${leverage}x) | Target Exit: ${targetDesc}${trailingInfoLog}`,
          'SUCCESS'
        );

        return {
          status: 'ORDER_OPENED',
          symbol: rank1Coin.symbol,
          side: 'BUY',
          entryPrice: buyRes.fillPrice,
          quantity: buyRes.quantity,
          orderId: buyRes.orderId,
          strategyMode,
          holdSeconds: strategyMode === 'SESSION_HOURS' ? undefined : holdSeconds,
          sessionEndTime: strategyMode === 'SESSION_HOURS' ? sessionEndTime : undefined
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
      // In FLASH_SCALP: #1 Coin is still the same coin we already traded
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
