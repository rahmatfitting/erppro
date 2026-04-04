import { calculateRSI } from './indicators';

// ─────────────────────────────────────────────────────────────
// MACD CALCULATION
// ─────────────────────────────────────────────────────────────
function calcMACD(candles: any[]): { macd: number[]; signal: number[]; hist: number[] } {
  const closes = candles.map((c: any) => c.close);
  const calcEMA = (data: number[], period: number): number[] => {
    const result: number[] = [];
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    const k = 2 / (period + 1);
    data.forEach((v, i) => {
      if (i < period) { result.push(0); return; }
      ema = v * k + ema * (1 - k);
      result.push(ema);
    });
    return result;
  };
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = ema12.map((v, i) => (ema12[i] && ema26[i] ? ema12[i] - ema26[i] : 0));
  
  // Signal = EMA9 of MACD
  const validMacd = macdLine.filter(v => v !== 0);
  const signalEMA = calcEMA(validMacd, 9);
  const signal = macdLine.map((v, i) => {
    const vIdx = macdLine.slice(0, i + 1).filter(v => v !== 0).length - 1;
    return signalEMA[vIdx] || 0;
  });
  const hist = macdLine.map((v, i) => v - signal[i]);
  return { macd: macdLine, signal, hist };
}

// ─────────────────────────────────────────────────────────────
// SWING POINT DETECTION
// ─────────────────────────────────────────────────────────────
interface SwingPoint { index: number; price: number; rsi: number; macdHist: number; }

function detectSwings(candles: any[], rsiValues: number[], macdHist: number[], window = 3): {
  lows: SwingPoint[];
  highs: SwingPoint[];
} {
  const lows: SwingPoint[] = [];
  const highs: SwingPoint[] = [];

  for (let i = window; i < candles.length - window; i++) {
    const c = candles[i];
    let isLow = true;
    let isHigh = true;
    for (let j = i - window; j <= i + window; j++) {
      if (j === i) continue;
      if (candles[j].low  <= c.low)  isLow  = false;
      if (candles[j].high >= c.high) isHigh = false;
    }
    if (isLow)  lows.push({ index: i, price: c.low,  rsi: rsiValues[i], macdHist: macdHist[i] });
    if (isHigh) highs.push({ index: i, price: c.high, rsi: rsiValues[i], macdHist: macdHist[i] });
  }
  return { lows, highs };
}

// ─────────────────────────────────────────────────────────────
// DIVERGENCE DETECTION CORE
// ─────────────────────────────────────────────────────────────
type DivType = 'BULLISH' | 'BEARISH' | 'NEUTRAL';

function detectDivergence(swings: { lows: SwingPoint[]; highs: SwingPoint[] }): {
  type: DivType;
  rsiConfirm: boolean;
  macdConfirm: boolean;
} {
  let type: DivType = 'NEUTRAL';
  let rsiConfirm = false;
  let macdConfirm = false;

  // ── BULLISH: Price Lower Low, RSI Higher Low ─────────────
  if (swings.lows.length >= 2) {
    const [prev, curr] = swings.lows.slice(-2);
    // Price LL
    if (curr.price < prev.price) {
      // RSI HL (divergence!)
      if (curr.rsi > prev.rsi) {
        type = 'BULLISH';
        rsiConfirm = true;
        if (curr.macdHist > prev.macdHist) macdConfirm = true; // MACD histogram also diverging up
      }
    }
  }

  // ── BEARISH: Price Higher High, RSI Lower High ──────────
  if (swings.highs.length >= 2 && type === 'NEUTRAL') {
    const [prev, curr] = swings.highs.slice(-2);
    // Price HH
    if (curr.price > prev.price) {
      // RSI LH (divergence!)
      if (curr.rsi < prev.rsi) {
        type = 'BEARISH';
        rsiConfirm = true;
        if (curr.macdHist < prev.macdHist) macdConfirm = true; // MACD aligning
      }
    }
  }

  return { type, rsiConfirm, macdConfirm };
}

// ─────────────────────────────────────────────────────────────
// VOLUME SPIKE CHECK
// ─────────────────────────────────────────────────────────────
function hasVolumeSpike(candles: any[]): boolean {
  const avgVol = candles.slice(-20, -1).reduce((a: number, c: any) => a + c.volume, 0) / 19;
  return candles[candles.length - 1].volume > avgVol * 1.5;
}

// ─────────────────────────────────────────────────────────────
// PER-SYMBOL MULTI-TIMEFRAME ANALYSIS
// ─────────────────────────────────────────────────────────────
export interface TFResult {
  tf: string;
  type: DivType;
  rsiConfirm: boolean;
  macdConfirm: boolean;
  volumeSpike: boolean;
}

export interface DivergenceSignal {
  symbol: string;
  dominantType: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  confidence: 'HIGH' | 'STRONG' | 'WEAK' | 'NOISE';
  tfResults: TFResult[];
  activeTFs: string[];
  createdAt: string;
}

const TF_WEIGHTS: Record<string, number> = {
  '15m': 1,
  '1h':  2,
  '4h':  3,
  '1d':  4,
};

export function scoreDivergence(tfResults: TFResult[], dom: 'BULLISH' | 'BEARISH'): {
  score: number;
  confidence: DivergenceSignal['confidence'];
  activeTFs: string[];
} {
  let score = 0;
  const activeTFs: string[] = [];

  for (const r of tfResults) {
    if (r.type === dom) {
      let pts = TF_WEIGHTS[r.tf] || 1;
      if (r.macdConfirm) pts += 0.5; // MACD bonus
      if (r.volumeSpike) pts += 0.5; // Volume bonus
      score += pts;
      activeTFs.push(r.tf);
    }
  }

  const confidence: DivergenceSignal['confidence'] =
    score >= 9 ? 'HIGH' :
    score >= 6 ? 'STRONG' :
    score >= 3 ? 'WEAK' : 'NOISE';

  return { score: Math.round(score * 10) / 10, confidence, activeTFs };
}

// ─────────────────────────────────────────────────────────────
// MAIN ANALYZE FUNCTION (called per symbol per TF)
// ─────────────────────────────────────────────────────────────
export function analyzeDivergence(candles: any[], tf: string): TFResult {
  // Need enough data
  if (candles.length < 60) {
    return { tf, type: 'NEUTRAL', rsiConfirm: false, macdConfirm: false, volumeSpike: false };
  }

  // Build RSI array for each candle index
  const rsiValues: number[] = candles.map((_, i) => {
    if (i < 14) return 50;
    return calculateRSI(candles.slice(0, i + 1), 14);
  });

  const { macd, hist } = calcMACD(candles);

  const swings = detectSwings(candles, rsiValues, hist);
  const div = detectDivergence(swings);
  const volSpike = hasVolumeSpike(candles);

  return {
    tf,
    type: div.type,
    rsiConfirm: div.rsiConfirm,
    macdConfirm: div.macdConfirm,
    volumeSpike: volSpike,
  };
}
