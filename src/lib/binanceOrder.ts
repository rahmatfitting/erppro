import crypto from 'crypto';

// We will use standard web fetch. (No need for node-fetch import if target is Edge/Nextjs 13+)

export async function placeRealFuturesOrder(
  symbol: string,
  side: 'BUY' | 'SELL', 
  marginUsd: number, // how much USD margin to allocate
  leverage: number,
  entry: number, 
  sl: number, 
  tp: number
) {
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;

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

    // 2. Set Stop Loss
    const slParams = {
      symbol,
      side: closeSide,
      type: 'STOP_MARKET',
      stopPrice: sl.toFixed(4),
      closePosition: 'true',
      timestamp: Date.now().toString()
    };
    await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', slParams);

    // 3. Set Take Profit
    const tpParams = {
      symbol,
      side: closeSide,
      type: 'TAKE_PROFIT_MARKET',
      stopPrice: tp.toFixed(4),
      closePosition: 'true',
      timestamp: Date.now().toString()
    };
    await callBinanceFutures(apiKey, apiSecret, 'POST', '/fapi/v1/order', tpParams);

    return { success: true, orderId: mainOrderRes.orderId.toString(), executedQty: mainOrderRes.executedQty };
  }

  return { success: false, error: 'Failed to open market order' };
}

async function callBinanceFutures(apiKey: string, secret: string, method: string, endpoint: string, params: Record<string, string>) {
  const baseUrl = 'https://fapi.binance.com';
  
  const queryString = new URLSearchParams(params).toString();
  const signature = crypto.createHmac('sha256', secret).update(queryString).digest('hex');
  const url = `${baseUrl}${endpoint}?${queryString}&signature=${signature}`;

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'X-MBX-APIKEY': apiKey,
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
  const apiKey = process.env.BINANCE_API_KEY;
  const apiSecret = process.env.BINANCE_API_SECRET;
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
