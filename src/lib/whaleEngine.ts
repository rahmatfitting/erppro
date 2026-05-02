import { executeQuery } from './db';

export interface WhaleTransaction {
  id: string;
  symbol: string;
  from: string;
  to: string;
  amount: number;
  amountUSD: number;
  timestamp: number;
}

export interface WhaleSignal {
  symbol: string;
  type: 'INFLOW' | 'OUTFLOW' | 'MIXED' | 'NEUTRAL';
  amountUSD: number;
  signalType: 'BUY_ZONE' | 'SELL_PRESSURE' | 'NEUTRAL';
  score: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  metadata: any;
}

// Helper function to fetch real data from Blockchain Explorers
async function fetchRealExplorerData(symbol: string): Promise<WhaleTransaction[] | null> {
  try {
    let url = '';
    let exchangeAddress = '';
    let currentPrice = 0; // Rough estimate to convert to USD
    
    if (symbol.includes('ETH')) {
      // Binance 14 Wallet on Ethereum
      exchangeAddress = '0x28C6c06298d514Db089934071355E5743bf21d60';
      url = `https://api.etherscan.io/api?module=account&action=txlist&address=${exchangeAddress}&startblock=0&endblock=99999999&page=1&offset=50&sort=desc&apikey=YourApiKeyToken`;
      currentPrice = 3000;
    } else if (symbol.includes('BNB')) {
      // Binance Hot Wallet on BSC
      exchangeAddress = '0x8894E0a0c962CB723c1976a4421c95949bE2D4E3';
      url = `https://api.bscscan.com/api?module=account&action=txlist&address=${exchangeAddress}&page=1&offset=50&sort=desc&apikey=YourApiKeyToken`;
      currentPrice = 600;
    } else {
      return null; // Not supported by these simple explorers
    }

    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== '1' || !data.result || !Array.isArray(data.result)) {
      return null; // Failed or rate limited
    }

    const txs: WhaleTransaction[] = [];
    for (const tx of data.result) {
      // amount is in wei (10^18)
      const amount = Number(tx.value) / 1e18;
      const amountUSD = amount * currentPrice;
      
      // Only care about somewhat large transactions to save processing
      if (amountUSD > 50000) {
        txs.push({
          id: tx.hash,
          symbol,
          from: tx.from.toLowerCase() === exchangeAddress.toLowerCase() ? 'Binance' : tx.from,
          to: tx.to.toLowerCase() === exchangeAddress.toLowerCase() ? 'Binance' : tx.to,
          amount,
          amountUSD,
          timestamp: Number(tx.timeStamp) * 1000
        });
      }
    }
    
    return txs.length > 0 ? txs : null;
  } catch (error) {
    console.error(`Error fetching real explorer data for ${symbol}:`, error);
    return null;
  }
}

// Data fetcher combining Real Explorers and Simulation
export async function fetchWhaleTransactions(symbol: string): Promise<WhaleTransaction[]> {
  // 1. Coba fetch pakai Blockchain Explorer asli (Etherscan / BscScan)
  const realData = await fetchRealExplorerData(symbol);
  if (realData && realData.length > 0) {
    console.log(`[Whale Engine] Using REAL Blockchain Explorer Data for ${symbol} (${realData.length} txs)`);
    return realData;
  }

  // 2. Jika gagal/limit/tidak didukung, fallback ke simulasi deterministik (agar data tidak lompat-lompat setiap detik)
  console.log(`[Whale Engine] Using Deterministic Simulated Data for ${symbol}`);
  const txs: WhaleTransaction[] = [];
  
  // Seed based on current hour and symbol so it only changes once an hour
  const currentHour = new Date().setMinutes(0, 0, 0);
  let seed = currentHour + symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
  
  const seededRandom = () => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };

  const numTxs = Math.floor(seededRandom() * 10) + 1; // 1 to 10 txs
  
  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit'];
  const unknownWallets = ['0xAbC...123', '0xDeF...456', '0xGHI...789', 'bc1q...xyz', 'bc1q...abc'];
  
  for (let i = 0; i < numTxs; i++) {
    const isOutflow = seededRandom() > 0.5;
    const exchange = exchanges[Math.floor(seededRandom() * exchanges.length)];
    const wallet = unknownWallets[Math.floor(seededRandom() * unknownWallets.length)];
    
    let amountUSD = 0;
    if (symbol.includes('BTC') || symbol.includes('ETH')) {
      amountUSD = seededRandom() * 50_000_000 + 500_000;
    } else {
      amountUSD = seededRandom() * 5_000_000 + 50_000;
    }
    
    txs.push({
      id: `tx_${Date.now()}_${Math.floor(seededRandom() * 1000)}`,
      symbol,
      from: isOutflow ? exchange : wallet,
      to: isOutflow ? wallet : exchange,
      amount: amountUSD / (symbol.includes('BTC') ? 60000 : symbol.includes('ETH') ? 3000 : 1),
      amountUSD,
      timestamp: Date.now() - Math.floor(seededRandom() * 86400000)
    });
  }
  
  return txs;
}

export function isWhaleTransaction(amountUSD: number, symbol: string): boolean {
  if (symbol.includes('BTC') || symbol.includes('ETH')) {
    return amountUSD > 1_000_000; // $1M threshold
  }
  return amountUSD > 100_000; // $100K threshold for altcoins
}

export function classifyWallet(tx: WhaleTransaction) {
  const exchanges = ['Binance', 'Coinbase', 'Kraken', 'OKX', 'Bybit'];
  
  const fromExchange = exchanges.includes(tx.from);
  const toExchange = exchanges.includes(tx.to);
  
  if (fromExchange && !toExchange) {
    return 'OUTFLOW'; // Exchange -> Wallet = Accumulation
  } else if (!fromExchange && toExchange) {
    return 'INFLOW'; // Wallet -> Exchange = Distribution / Sell Pressure
  }
  return 'INTERNAL'; // Exchange -> Exchange or Wallet -> Wallet
}

export function generateWhaleSignal(txs: WhaleTransaction[], symbol: string): WhaleSignal | null {
  const whaleTxs = txs.filter(tx => isWhaleTransaction(tx.amountUSD, symbol));
  
  if (whaleTxs.length === 0) return null;
  
  let totalInflowUSD = 0;
  let totalOutflowUSD = 0;
  let inflowCount = 0;
  let outflowCount = 0;
  
  for (const tx of whaleTxs) {
    const classification = classifyWallet(tx);
    if (classification === 'INFLOW') {
      totalInflowUSD += tx.amountUSD;
      inflowCount++;
    } else if (classification === 'OUTFLOW') {
      totalOutflowUSD += tx.amountUSD;
      outflowCount++;
    }
  }
  
  if (totalInflowUSD === 0 && totalOutflowUSD === 0) return null;
  
  let score = 0;
  
  // Scoring System
  if (totalOutflowUSD > totalInflowUSD) {
    score += 4; // Outflow besar
  } else if (totalInflowUSD > totalOutflowUSD) {
    score -= 4; // Inflow besar
  }
  
  // Banyak transaksi berulang (e.g., > 2)
  if (inflowCount > 2 || outflowCount > 2) {
    score += 3;
  }
  
  // Volume spike (simplification: if max single tx > 2x threshold)
  const maxTxAmount = Math.max(...whaleTxs.map(t => t.amountUSD));
  const threshold = (symbol.includes('BTC') || symbol.includes('ETH')) ? 1_000_000 : 100_000;
  if (maxTxAmount > threshold * 2) {
    score += 2;
  }
  
  let type: 'INFLOW' | 'OUTFLOW' | 'MIXED' = 'MIXED';
  if (totalInflowUSD > totalOutflowUSD * 2) type = 'INFLOW';
  else if (totalOutflowUSD > totalInflowUSD * 2) type = 'OUTFLOW';
  
  let signalType: 'BUY_ZONE' | 'SELL_PRESSURE' | 'NEUTRAL' = 'NEUTRAL';
  if (type === 'OUTFLOW' || score >= 4) {
    signalType = 'BUY_ZONE';
  } else if (type === 'INFLOW' || score <= -4) {
    signalType = 'SELL_PRESSURE';
  }
  
  let confidence: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (Math.abs(score) >= 7) confidence = 'HIGH';
  else if (Math.abs(score) >= 4) confidence = 'MEDIUM';
  
  const dominantUSD = Math.max(totalInflowUSD, totalOutflowUSD);
  
  return {
    symbol,
    type,
    amountUSD: dominantUSD,
    signalType,
    score,
    confidence,
    metadata: {
      totalInflowUSD,
      totalOutflowUSD,
      inflowCount,
      outflowCount,
      whaleTxCount: whaleTxs.length,
      maxTxAmount
    }
  };
}

export async function saveWhaleSignal(signal: WhaleSignal) {
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  await executeQuery(`
    INSERT INTO whale_screener_signals 
      (symbol, type, amount_usd, signal_type, score, confidence, metadata, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    signal.symbol,
    signal.type,
    signal.amountUSD,
    signal.signalType,
    signal.score,
    signal.confidence,
    JSON.stringify(signal.metadata),
    timestamp
  ]);
}

export async function runWhaleScreenerCore(symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'XRPUSDT', 'ADAUSDT']) {
  const results: WhaleSignal[] = [];
  
  for (const symbol of symbols) {
    const txs = await fetchWhaleTransactions(symbol);
    const signal = generateWhaleSignal(txs, symbol);
    
    if (signal) {
      await saveWhaleSignal(signal);
      results.push(signal);
    }
  }
  
  return results;
}

export async function getWhaleSignalsFromDB() {
  const data = await executeQuery<any[]>(`
    SELECT * FROM whale_screener_signals
    ORDER BY timestamp DESC
    LIMIT 200
  `);
  
  // Filter to only keep the latest result per symbol
  const latestMap = new Map();
  for (const row of data) {
    if (!latestMap.has(row.symbol)) {
      latestMap.set(row.symbol, row);
    }
  }
  
  const latestData = Array.from(latestMap.values());
  
  // Parse JSON metadata
  return latestData.map(row => ({
    ...row,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata
  }));
}
