import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Helper to reliably load and sanitize Binance API credentials (trims Windows \r, quotes, spaces)
export function getBinanceCredentials() {
  let apiKey = process.env.BINANCE_API_KEY || '';
  let apiSecret = process.env.BINANCE_API_SECRET || '';

  // Fallback to directly parse .env.local or .env if Next.js runtime hasn't loaded them
  if (!apiKey || !apiSecret) {
    try {
      const candidates = [
        path.join(process.cwd(), '.env.local'),
        path.join(process.cwd(), '.env'),
      ];
      for (const p of candidates) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, 'utf8');
          const kMatch = content.match(/^BINANCE_API_KEY=(.+)$/m);
          const sMatch = content.match(/^BINANCE_API_SECRET=(.+)$/m);
          if (kMatch && !apiKey) apiKey = kMatch[1];
          if (sMatch && !apiSecret) apiSecret = sMatch[1];
        }
      }
    } catch {
      // ignore
    }
  }

  apiKey = (apiKey || '').trim().replace(/^["']|["']$/g, '').trim();
  apiSecret = (apiSecret || '').trim().replace(/^["']|["']$/g, '').trim();

  return { apiKey, apiSecret };
}

export async function placeRealFuturesOrder(
  symbol: string,
  side: 'BUY' | 'SELL', 
  marginUsd: number, // how much USD margin to allocate
  leverage: number,
  entry: number, 
  sl: number, 
  tp: number
) {
  const { apiKey, apiSecret } = getBinanceCredentials();

  if (!apiKey || !apiSecret) {
    throw new Error('BINANCE_API_KEY or BINANCE_API_SECRET is missing from .env');
  }

  // Calculate quantity based on margin
  // Margin * Leverage = Position Size in USD.
  // Position Size / Entry Price = Quantity.
  const positionSizeUsd = marginUsd * leverage;
  let quantity = positionSizeUsd / entry;
  
  // Truncate to 3 decimal places naive (in real life you parse symbol filters for tickSize/stepSize)
  quantity = Math.floor(quantity * 1000) / 1000;

  const timestamp = Date.now();
  
  // Set leverage first (optional, but good fail-safe)
  await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/leverage', { symbol, leverage: leverage.toString(), timestamp: timestamp.toString() });

  // 1. Send Main Market Order
  const orderSide = side;
  const mainOrderParams = {
    symbol,
    side: orderSide,
    type: 'MARKET',
    quantity: quantity.toString(),
    timestamp: Date.now().toString()
  };

  const mainOrderRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', mainOrderParams);
  
  if (mainOrderRes && mainOrderRes.orderId) {
    // Determine opposing side for SL/TP
    const closeSide = side === 'BUY' ? 'SELL' : 'BUY';
    const executedQty = mainOrderRes.executedQty || quantity.toString();

    // 2. Set Stop Loss via Algo Order
    const slParams = {
      symbol,
      side: closeSide,
      algoType: 'CONDITIONAL',
      type: 'STOP_MARKET',
      quantity: executedQty,
      triggerPrice: sl.toFixed(4),
      reduceOnly: 'true',
      timestamp: Date.now().toString()
    };
    await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/algoOrder', slParams);

    // 3. Set Take Profit via Algo Order
    const tpParams = {
      symbol,
      side: closeSide,
      algoType: 'CONDITIONAL',
      type: 'TAKE_PROFIT_MARKET',
      quantity: executedQty,
      triggerPrice: tp.toFixed(4),
      reduceOnly: 'true',
      timestamp: Date.now().toString()
    };
    await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/algoOrder', tpParams);

    return { success: true, orderId: mainOrderRes.orderId.toString(), executedQty };
  }

  return { success: false, error: 'Failed to open market order' };
}

export async function callBinanceFutures(apiKey: string, secret: string, method: string, endpoint: string, params: Record<string, string>) {
  const baseUrl = 'https://fapi.binance.com';
  
  const cleanKey = (apiKey || '').trim().replace(/^["']|["']$/g, '').trim();
  const cleanSecret = (secret || '').trim().replace(/^["']|["']$/g, '').trim();

  const queryString = new URLSearchParams(params).toString();
  const signature = crypto.createHmac('sha256', cleanSecret).update(queryString).digest('hex');
  const url = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': cleanKey,
        'Content-Type': 'application/json'
      }
    });
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('callBinanceFutures error:', err);
    return null;
  }
}

export async function fetchRealPosition(symbol: string) {
  const { apiKey, apiSecret } = getBinanceCredentials();
  if (!apiKey || !apiSecret) return null;

  const timestamp = Date.now().toString();
  const data = await callBinanceFutures(apiKey, apiSecret, 'GET', '/fapi/v2/positionRisk', { symbol, timestamp });
  if (Array.isArray(data) && data.length > 0) {
    // data is an array of positions for the symbol
    const amt = parseFloat(data[0].positionAmt);
    if (amt !== 0) {
      return {
        symbol,
        amt,
        entryPrice: parseFloat(data[0].entryPrice),
        unRealizedProfit: parseFloat(data[0].unRealizedProfit)
      };
    }
  }
  return null;
}

export interface SymbolPrecision {
  quantityPrecision: number;
  pricePrecision: number;
  stepSize: number;
  tickSize: number;
  minQty: number;
  minNotional: number;
}

const precisionCache: Record<string, SymbolPrecision> = {};

export async function getSymbolPrecision(symbol: string): Promise<SymbolPrecision> {
  if (precisionCache[symbol]) {
    return precisionCache[symbol];
  }

  try {
    const res = await fetch('https://fapi.binance.com/fapi/v1/exchangeInfo', { cache: 'no-store' });
    const data = await res.json();
    if (data && Array.isArray(data.symbols)) {
      for (const s of data.symbols) {
        let step = 0.001;
        let tick = 0.01;
        let minQ = 0.001;
        let minNotional = 5.0;

        if (Array.isArray(s.filters)) {
          for (const f of s.filters) {
            if (f.filterType === 'LOT_SIZE') {
              step = parseFloat(f.stepSize) || step;
              minQ = parseFloat(f.minQty) || minQ;
            }
            if (f.filterType === 'PRICE_FILTER') {
              tick = parseFloat(f.tickSize) || tick;
            }
            if (f.filterType === 'MIN_NOTIONAL') {
              minNotional = parseFloat(f.notional) || minNotional;
            }
          }
        }

        precisionCache[s.symbol] = {
          quantityPrecision: s.quantityPrecision ?? 3,
          pricePrecision: s.pricePrecision ?? 2,
          stepSize: step,
          tickSize: tick,
          minQty: minQ,
          minNotional
        };
      }
    }
  } catch (err) {
    console.warn("Failed to fetch exchangeInfo precision, using default fallback:", err);
  }

  return precisionCache[symbol] || {
    quantityPrecision: 3,
    pricePrecision: 4,
    stepSize: 0.001,
    tickSize: 0.01,
    minQty: 0.001,
    minNotional: 5.0
  };
}

export async function executeHedgeFundBuyOrder(params: {
  symbol: string;
  orderType: 'MARKET' | 'LIMIT';
  notionalUsd?: number;
  marginUsd?: number;
  leverage: number;
  entryPrice?: number;
  stopLoss?: number | null;
  takeProfit?: number | null;
}) {
  const { symbol, orderType, notionalUsd, marginUsd, leverage, entryPrice, stopLoss, takeProfit } = params;
  const { apiKey, apiSecret } = getBinanceCredentials();

  if (!apiKey || !apiSecret) {
    throw new Error('BINANCE_API_KEY atau BINANCE_API_SECRET belum dikonfigurasi di file .env / .env.local');
  }

  const prec = await getSymbolPrecision(symbol);

  // 1. Get reference market price
  let refPrice = entryPrice;
  if (!refPrice || refPrice <= 0) {
    const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
    const tickerData = await tickerRes.json();
    refPrice = parseFloat(tickerData.price) || 0;
  }

  if (refPrice <= 0) {
    throw new Error('Gagal mendapatkan harga acuan pasar untuk ' + symbol);
  }

  // 2. Position sizing (Notional USD)
  // If notionalUsd is provided directly, use it (e.g. $20 Notional with 20x leverage = $1 margin).
  // Otherwise fallback to marginUsd * leverage.
  const positionSizeUsd = notionalUsd && notionalUsd > 0
    ? notionalUsd
    : (marginUsd ? marginUsd * leverage : 20);

  const marginRequired = positionSizeUsd / leverage;

  if (positionSizeUsd < prec.minNotional) {
    throw new Error(`Ukuran posisi notional minimum di Binance adalah $${prec.minNotional} USD. Ukuran posisi Anda ($${positionSizeUsd.toFixed(2)}) terlalu kecil.`);
  }

  const rawQty = positionSizeUsd / refPrice;
  const stepDecimals = Math.max(0, prec.quantityPrecision);
  const factor = Math.pow(10, stepDecimals);
  let quantity = Math.floor(rawQty * factor) / factor;

  if (quantity < prec.minQty) {
    quantity = prec.minQty;
  }

  const formattedQty = quantity.toFixed(stepDecimals);

  const timestamp = Date.now();

  // 3. Set Leverage on Binance
  try {
    await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/leverage', {
      symbol,
      leverage: leverage.toString(),
      timestamp: timestamp.toString()
    });
  } catch (levErr) {
    console.warn("Set leverage warning:", levErr);
  }

  // 4. Send Main Order (BUY / LONG)
  const mainOrderParams: Record<string, string> = {
    symbol,
    side: 'BUY',
    type: orderType,
    quantity: formattedQty,
    timestamp: Date.now().toString()
  };

  if (orderType === 'LIMIT') {
    mainOrderParams.price = (entryPrice || refPrice).toFixed(prec.pricePrecision);
    mainOrderParams.timeInForce = 'GTC';
  }

  const mainRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', mainOrderParams);

  if (!mainRes || mainRes.code) {
    const errCode = mainRes?.code || 'ERROR';
    const errMsg = mainRes?.msg || 'Gagal mengeksekusi order utama di Binance';
    throw new Error(`Binance Error [${errCode}]: ${errMsg}`);
  }

  const actualQty = mainRes.executedQty && parseFloat(mainRes.executedQty) > 0 
    ? mainRes.executedQty 
    : formattedQty;

  const fillPrice = parseFloat(mainRes.avgPrice) || refPrice;
  const baseEntry = (entryPrice && entryPrice > 0) ? entryPrice : refPrice;

  // 5. Place Auto Conditional Stop Loss (if requested)
  let slRes = null;
  let formattedSL: string | null = null;
  if (stopLoss && stopLoss > 0) {
    const slRiskRatio = Math.abs(baseEntry - stopLoss) / (baseEntry || 1);
    let effectiveSL = stopLoss;
    if (effectiveSL >= fillPrice) {
      const slRatio = slRiskRatio > 0.005 && slRiskRatio < 0.2 ? slRiskRatio : 0.022; // default 2.2%
      effectiveSL = fillPrice * (1 - slRatio);
    }
    formattedSL = effectiveSL.toFixed(prec.pricePrecision);

    try {
      slRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/algoOrder', {
        symbol,
        side: 'SELL',
        algoType: 'CONDITIONAL',
        type: 'STOP_MARKET',
        quantity: actualQty,
        triggerPrice: formattedSL,
        reduceOnly: 'true',
        timestamp: Date.now().toString()
      });

      // Auto-recovery if price slipped further and caused -2021 (Order would immediately trigger)
      if (slRes && slRes.code === -2021) {
        const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
        const tickerData = await tickerRes.json();
        const currentMarketPrice = parseFloat(tickerData.price) || fillPrice;
        const retrySL = (currentMarketPrice * 0.978).toFixed(prec.pricePrecision);

        slRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/algoOrder', {
          symbol,
          side: 'SELL',
          algoType: 'CONDITIONAL',
          type: 'STOP_MARKET',
          quantity: actualQty,
          triggerPrice: retrySL,
          reduceOnly: 'true',
          timestamp: Date.now().toString()
        });

        if (!slRes?.code) {
          formattedSL = retrySL;
        }
      }
    } catch (slErr) {
      console.warn("Auto Stop Loss algoOrder error:", slErr);
    }
  }

  // 6. Place Auto Conditional Take Profit (if requested)
  let tpRes = null;
  let formattedTP: string | null = null;
  if (takeProfit && takeProfit > 0) {
    const tpProfitRatio = Math.abs(takeProfit - baseEntry) / (baseEntry || 1);
    let effectiveTP = takeProfit;
    if (effectiveTP <= fillPrice) {
      const tpRatio = tpProfitRatio > 0.01 && tpProfitRatio < 0.5 ? tpProfitRatio : 0.045; // default 4.5%
      effectiveTP = fillPrice * (1 + tpRatio);
    }
    formattedTP = effectiveTP.toFixed(prec.pricePrecision);

    try {
      tpRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/algoOrder', {
        symbol,
        side: 'SELL',
        algoType: 'CONDITIONAL',
        type: 'TAKE_PROFIT_MARKET',
        quantity: actualQty,
        triggerPrice: formattedTP,
        reduceOnly: 'true',
        timestamp: Date.now().toString()
      });

      if (tpRes && tpRes.code === -2021) {
        const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
        const tickerData = await tickerRes.json();
        const currentMarketPrice = parseFloat(tickerData.price) || fillPrice;
        const retryTP = (currentMarketPrice * 1.045).toFixed(prec.pricePrecision);

        tpRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/algoOrder', {
          symbol,
          side: 'SELL',
          algoType: 'CONDITIONAL',
          type: 'TAKE_PROFIT_MARKET',
          quantity: actualQty,
          triggerPrice: retryTP,
          reduceOnly: 'true',
          timestamp: Date.now().toString()
        });

        if (!tpRes?.code) {
          formattedTP = retryTP;
        }
      }
    } catch (tpErr) {
      console.warn("Auto Take Profit algoOrder error:", tpErr);
    }
  }

  return {
    success: true,
    orderId: mainRes.orderId?.toString() || '',
    clientOrderId: mainRes.clientOrderId || '',
    symbol,
    side: 'BUY',
    orderType,
    executedQty: actualQty,
    avgPrice: fillPrice,
    status: mainRes.status || 'NEW',
    slOrderId: slRes?.algoId?.toString() || slRes?.orderId?.toString() || null,
    tpOrderId: tpRes?.algoId?.toString() || tpRes?.orderId?.toString() || null,
    stopLoss: formattedSL || 'Tanpa SL',
    takeProfit: formattedTP || 'Tanpa TP',
    marginUsd: marginRequired,
    leverage,
    positionSizeUsd
  };
}

export async function executeCompoundBuyOrder(params: {
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

  // 1. Get live price
  const tickerRes = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`, { cache: 'no-store' });
  const tickerData = await tickerRes.json();
  const refPrice = parseFloat(tickerData.price) || 0;

  if (refPrice <= 0) {
    throw new Error('Gagal mendapatkan harga pasar untuk ' + symbol);
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

  // 3. Calculate quantity
  const rawQty = notionalUsd / refPrice;
  const stepDecimals = Math.max(0, prec.quantityPrecision);
  const factor = Math.pow(10, stepDecimals);
  let quantity = Math.floor(rawQty * factor) / factor;

  if (quantity < prec.minQty) {
    quantity = prec.minQty;
  }

  const formattedQty = quantity.toFixed(stepDecimals);

  // 4. Place MARKET BUY
  const orderRes = await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', {
    symbol,
    side: 'BUY',
    type: 'MARKET',
    quantity: formattedQty,
    timestamp: Date.now().toString()
  });

  if (!orderRes || orderRes.code) {
    const errCode = orderRes?.code || 'ERROR';
    const errMsg = orderRes?.msg || 'Gagal mengeksekusi order BUY di Binance';
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

  return {
    success: true,
    orderId: orderRes.orderId?.toString() || '',
    clientOrderId: orderRes.clientOrderId || '',
    symbol,
    side: 'BUY' as const,
    quantity: executedQty,
    formattedQty: formattedQty,
    fillPrice,
    notionalUsd: executedQty * fillPrice,
    marginUsd: (executedQty * fillPrice) / leverage,
    leverage
  };
}

export async function executeCompoundCloseOrder(params: {
  symbol: string;
  quantity: number;
}) {
  const { symbol, quantity } = params;
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

  // Execute MARKET SELL with reduceOnly: 'true'
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
    const errMsg = closeRes?.msg || 'Gagal mengeksekusi order penutupan di Binance';
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

  return {
    success: true,
    orderId: closeRes.orderId?.toString() || '',
    clientOrderId: closeRes.clientOrderId || '',
    symbol,
    side: 'SELL' as const,
    quantity: executedQty,
    exitPrice,
    notionalUsd: executedQty * exitPrice
  };
}

