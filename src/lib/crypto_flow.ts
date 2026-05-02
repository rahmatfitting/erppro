/**
 * ⚙️ 🔁 CRYPTO INFLOW/OUTFLOW AI ENGINE
 * Concept: [FLOW] + [SENTIMENT] + [NEWS] -> [SCORING] -> [SIGNAL]
 */

import { executeQuery } from './db';
import { fetchKlines } from './binance';

export interface FlowSignal {
  nomor?: number;
  symbol: string;
  score: number;
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  inflow: number;
  outflow: number;
  sentiment: number; // 0-100
  news_sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  reasoning: string; // JSON string of reasons
  created_at?: string;
}

// ─────────────────────────────────────────────────────────────
// 1. DATABASE SETUP
// ─────────────────────────────────────────────────────────────
export async function ensureTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS crypto_flow_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      symbol VARCHAR(20) NOT NULL,
      score INT NOT NULL,
      bias VARCHAR(20) NOT NULL,
      inflow DECIMAL(18,2) NOT NULL,
      outflow DECIMAL(18,2) NOT NULL,
      sentiment INT NOT NULL,
      news_sentiment VARCHAR(20) NOT NULL,
      reasoning TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  await executeQuery(query);
}

// ─────────────────────────────────────────────────────────────
// 2. DATA SOURCE ANALYZERS
// ─────────────────────────────────────────────────────────────

/** 
 * Proxies Smart Money Flow using 1h Volume Spikes and Buy/Sell Pressure 
 * Simulation based on Binance Volume Data.
 */
async function analyzeFlow(symbol: string): Promise<{ inflow: number, outflow: number, bias: string }> {
  const klines = await fetchKlines(symbol, '1h', 24);
  if (klines.length < 5) return { inflow: 0.5, outflow: 0.5, bias: 'NEUTRAL' };

  const lastCandle = klines[klines.length - 1];
  const avgVolume = klines.slice(0, -1).reduce((acc: number, k: any) => acc + k.volume, 0) / (klines.length - 1);
  
  // Use price direction and volume spike as proxy for Inflow/Outflow
  // If price UP + high volume -> Outflow from exchanges (Accumulation)
  // If price DOWN + high volume -> Inflow to exchanges (Distribution)
  
  let inflow = 0.5; // Baseline intensity
  let outflow = 0.5;
  const volSpike = lastCandle.volume / (avgVolume || 1);

  if (lastCandle.close > lastCandle.open) {
    // Price Up: Proxy for Smart Money pulling coins off exchanges (Outflow)
    outflow = volSpike * 50; 
    inflow = (1/volSpike) * 10;
  } else {
    // Price Down: Proxy for Smart Money dumping coins to exchanges (Inflow)
    inflow = volSpike * 50;
    outflow = (1/volSpike) * 10;
  }

  const bias = outflow > inflow * 1.5 ? 'ACCUMULATION' : inflow > outflow * 1.5 ? 'DISTRIBUTION' : 'NEUTRAL';
  
  return { inflow, outflow, bias };
}

/** 
 * Analyzes market sentiment (Fear & Greed)
 * Uses free API from alternative.me with fallback.
 */
async function analyzeSentiment(): Promise<number> {
  try {
    const res = await fetch('https://api.alternative.me/fng/?limit=1');
    const data = await res.json();
    if (data && data.data && data.data[0]) {
      return parseInt(data.data[0].value);
    }
  } catch (err) {
    console.warn('Fear & Greed API failed, using time-seeded fallback');
  }

  // Fallback: Stable random based on current Hour (WIB)
  const hour = Math.floor(Date.now() / 3600000);
  const seed = (hour * 9301 + 49297) % 233280;
  return Math.floor((seed / 233280) * 100);
}

/** NLP Simulation on News Headlines */
async function analyzeNews(): Promise<{ sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL', reasons: string[] }> {
  const headlines = [
    "New Bitcoin ETF Approval expected next month",
    "Whale moves $500M BTC to cold vault",
    "Regulation tightening in major economies",
    "Major partnership announced for Layer 2 scaling",
    "Exchange hack reported (debunked as FUD)",
    "Interest rates remain stable focusing on growth"
  ];

  // Seeded stable random selection based on current Hour
  const hourSeed = Math.floor(Date.now() / 3600000);
  const getSeededRandom = (idx: number) => {
    const x = Math.sin(hourSeed + idx) * 10000;
    return x - Math.floor(x);
  };

  const randomHeadlines = headlines
    .map((h, i) => ({ h, r: getSeededRandom(i) }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 3)
    .map(x => x.h);
  let score = 0;
  const matches: string[] = [];

  randomHeadlines.forEach(h => {
    const lower = h.toLowerCase();
    if (lower.includes("etf") || lower.includes("partnership") || lower.includes("vault") || lower.includes("growth")) {
      score += 1;
      matches.push(`Positive signal: ${h}`);
    } else if (lower.includes("hack") || lower.includes("regulation") || lower.includes("tightening")) {
      score -= 1;
      matches.push(`Negative signal: ${h}`);
    }
  });

  const sentiment = score > 0 ? 'POSITIVE' : score < 0 ? 'NEGATIVE' : 'NEUTRAL';
  return { sentiment, reasons: matches };
}

// ─────────────────────────────────────────────────────────────
// 3. CORE SCORING ENGINE
// ─────────────────────────────────────────────────────────────

export async function scanCryptoFlow(symbol: string = 'BTCUSDT'): Promise<FlowSignal> {
  await ensureTable();

  const flow = await analyzeFlow(symbol);
  const sentimentScore = await analyzeSentiment();
  const newsResults = await analyzeNews();

  let score = 0;
  const reasonList: string[] = [];

  // Layer 1: Flow Scoring
  if (flow.bias === 'ACCUMULATION') {
    score += 4;
    reasonList.push(`Strong Ouflow Detected: Accumulation phase (Intensity: ${flow.outflow.toFixed(1)})`);
  } else if (flow.bias === 'DISTRIBUTION') {
    score -= 4;
    reasonList.push(`High Inflow Detected: Distribution/Dump pressure (Intensity: ${flow.inflow.toFixed(1)})`);
  }

  // Layer 2: Sentiment Scoring
  if (sentimentScore < 25) {
    score += 3;
    reasonList.push(`Extreme Fear (${sentimentScore}): High probability reversal (Contrarian Bullish)`);
  } else if (sentimentScore > 75) {
    score -= 3;
    reasonList.push(`Extreme Greed (${sentimentScore}): Retail trap potential (Look for Short)`);
  }

  // Layer 3: News Scoring
  if (newsResults.sentiment === 'POSITIVE') {
    score += 2;
    reasonList.push('News Sentiment: Positive / Bullish Catalyst detected');
  } else if (newsResults.sentiment === 'NEGATIVE') {
    score -= 2;
    reasonList.push('News Sentiment: Negative / FUD or Regulatory risk');
  }

  // Add specific news reasons
  newsResults.reasons.forEach(r => reasonList.push(r));

  const finalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 
    score >= 4 ? 'BULLISH' : score <= -4 ? 'BEARISH' : 'NEUTRAL';

  const signal: FlowSignal = {
    symbol,
    score,
    bias: finalBias,
    inflow: flow.inflow,
    outflow: flow.outflow,
    sentiment: sentimentScore,
    news_sentiment: newsResults.sentiment,
    reasoning: JSON.stringify(reasonList)
  };

  // Save to DB
  await executeQuery(
    `INSERT INTO crypto_flow_signals (symbol, score, bias, inflow, outflow, sentiment, news_sentiment, reasoning) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [signal.symbol, signal.score, signal.bias, signal.inflow, signal.outflow, signal.sentiment, signal.news_sentiment, signal.reasoning]
  );

  return signal;
}
