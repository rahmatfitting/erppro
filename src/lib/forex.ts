// ─────────────────────────────────────────────────────────────
// FOREX FACTORY DATA + PROBABILITY ENGINE
// ─────────────────────────────────────────────────────────────

// Community-maintained mirror of ForexFactory calendar
const FF_ENDPOINTS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  'https://nfs.faireconomy.media/ff_calendar_nextweek.json',
];

export interface ForexNewsItem {
  title: string;
  country: string;   // ISO currency code e.g. "USD"
  date: string;      // ISO date string
  impact: 'Low' | 'Medium' | 'High' | 'Holiday';
  forecast: string;
  previous: string;
  actual: string;
}

export interface CurrencySentiment {
  currency: string;
  score: number;       // Cumulative score this week (-10 to +10)
  bias: 'STRONG' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'WEAK';
  events: ProcessedEvent[];
}

export interface ProcessedEvent {
  title: string;
  currency: string;
  impact: ForexNewsItem['impact'];
  impactScore: number;
  sentiment: 'bullish' | 'bearish' | 'neutral' | 'pending';
  actual: string;
  forecast: string;
  previous: string;
  date: string;
  points: number;
}

export interface ForexProbability {
  pair: string;
  baseCurrency: string;
  quoteCurrency: string;
  action: 'BUY' | 'SELL' | 'WAIT';
  bias: string;
  probability: number;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  sentiment: string;
  topEvent: string;
  killzone: string;
  reasoning: string[];
}

// ─────────────────────────────────────────────────────────────
// FETCH FOREX FACTORY DATA
// ─────────────────────────────────────────────────────────────
export async function fetchForexNews(): Promise<ForexNewsItem[]> {
  const allEvents: ForexNewsItem[] = [];
  
  for (const url of FF_ENDPOINTS) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; ForexScreener/1.0)',
        },
        signal: controller.signal,
        cache: 'no-store',
      });
      clearTimeout(timer);
      if (!res.ok) continue;

      const data = await res.json();
      if (!Array.isArray(data)) continue;

      // Map to our interface
      const events: ForexNewsItem[] = data
        .filter((e: any) => e.country && e.title)
        .map((e: any) => ({
          title: e.title,
          country: e.country.toUpperCase(),
          date: e.date,
          impact: e.impact || 'Low',
          forecast: e.forecast || '',
          previous: e.previous || '',
          actual: e.actual || '',
        }));

      allEvents.push(...events);
    } catch (err) {
      console.warn(`FF fetch failed: ${url}`, err);
    }
  }

  // Sort by date desc
  return allEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

// ─────────────────────────────────────────────────────────────
// IMPACT SCORE
// ─────────────────────────────────────────────────────────────
function impactScore(impact: ForexNewsItem['impact']): number {
  return impact === 'High' ? 3 : impact === 'Medium' ? 2 : 1;
}

// ─────────────────────────────────────────────────────────────
// SENTIMENT ENGINE  
// actual vs forecast → direction for the currency
// ─────────────────────────────────────────────────────────────
function parseNum(val: string): number | null {
  if (!val || val.trim() === '') return null;
  // Remove %, M, K, B etc
  const cleaned = val.replace(/[%MKBms]/g, '').replace(/,/g, '').trim();
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function detectSentiment(actual: string, forecast: string, previous: string): 'bullish' | 'bearish' | 'neutral' | 'pending' {
  if (!actual || actual.trim() === '') return 'pending';
  
  const act = parseNum(actual);
  const fore = parseNum(forecast);
  const prev = parseNum(previous);

  // Use forecast if available, else previous
  const base = fore ?? prev;
  if (act === null || base === null) return 'neutral';

  if (act > base) return 'bullish';
  if (act < base) return 'bearish';
  return 'neutral';
}

// For some economic indicators, better-than-expected is actually BEARISH for currency
// e.g. Unemployment Claims: lower actual = better economy = bullish currency
const INVERTED_INDICATORS = [
  'unemployment', 'jobless', 'claims', 'deficit', 'inflation expectations'
];

function isInverted(title: string): boolean {
  const t = title.toLowerCase();
  return INVERTED_INDICATORS.some(k => t.includes(k));
}

// ─────────────────────────────────────────────────────────────
// PROCESS EVENTS INTO SENTIMENT SCORES
// ─────────────────────────────────────────────────────────────
export function processEvents(events: ForexNewsItem[]): ProcessedEvent[] {
  return events
    .filter(e => e.impact !== 'Holiday')
    .map(e => {
      const rawSentiment = detectSentiment(e.actual, e.forecast, e.previous);
      // Invert if needed (e.g. lower unemployment = bullish)
      let sentiment = rawSentiment;
      if (isInverted(e.title) && (rawSentiment === 'bullish' || rawSentiment === 'bearish')) {
        sentiment = rawSentiment === 'bullish' ? 'bearish' : 'bullish';
      }

      const iScore = impactScore(e.impact);
      const pts = sentiment === 'bullish' ? iScore : sentiment === 'bearish' ? -iScore : 0;

      return {
        title: e.title,
        currency: e.country,
        impact: e.impact,
        impactScore: iScore,
        sentiment,
        actual: e.actual,
        forecast: e.forecast,
        previous: e.previous,
        date: e.date,
        points: pts,
      };
    });
}

// ─────────────────────────────────────────────────────────────
// CURRENCY SENTIMENT AGGREGATION
// ─────────────────────────────────────────────────────────────
export function aggregateCurrencySentiment(events: ProcessedEvent[]): CurrencySentiment[] {
  const map: Record<string, CurrencySentiment> = {};

  for (const e of events) {
    if (!map[e.currency]) {
      map[e.currency] = { currency: e.currency, score: 0, bias: 'NEUTRAL', events: [] };
    }
    map[e.currency].score += e.points;
    map[e.currency].events.push(e);
  }

  // Classify bias
  for (const cs of Object.values(map)) {
    const s = cs.score;
    cs.bias = s >= 6 ? 'STRONG' : s >= 2 ? 'BULLISH' : s <= -6 ? 'WEAK' : s <= -2 ? 'BEARISH' : 'NEUTRAL';
  }

  return Object.values(map).sort((a, b) => b.score - a.score);
}

// ─────────────────────────────────────────────────────────────
// ICT KILL ZONE (reused from ict.ts inline to avoid circular)
// ─────────────────────────────────────────────────────────────
function currentKillzone(): string {
  const wibHour = (new Date().getUTCHours() + 7) % 24;
  if (wibHour >= 14 && wibHour < 17) return 'London';
  if (wibHour >= 19 && wibHour < 22) return 'New York';
  if (wibHour >= 7  && wibHour < 10) return 'Tokyo';
  return 'None';
}

// ─────────────────────────────────────────────────────────────
// MAJOR FOREX PAIRS + CURRENCY MAPPING
// ─────────────────────────────────────────────────────────────
const MAJOR_PAIRS: { pair: string; base: string; quote: string }[] = [
  { pair: 'EURUSD', base: 'EUR', quote: 'USD' },
  { pair: 'GBPUSD', base: 'GBP', quote: 'USD' },
  { pair: 'USDJPY', base: 'USD', quote: 'JPY' },
  { pair: 'USDCHF', base: 'USD', quote: 'CHF' },
  { pair: 'AUDUSD', base: 'AUD', quote: 'USD' },
  { pair: 'NZDUSD', base: 'NZD', quote: 'USD' },
  { pair: 'USDCAD', base: 'USD', quote: 'CAD' },
  { pair: 'EURGBP', base: 'EUR', quote: 'GBP' },
  { pair: 'EURJPY', base: 'EUR', quote: 'JPY' },
  { pair: 'GBPJPY', base: 'GBP', quote: 'JPY' },
  { pair: 'AUDJPY', base: 'AUD', quote: 'JPY' },
  { pair: 'CADJPY', base: 'CAD', quote: 'JPY' },
];

// ─────────────────────────────────────────────────────────────
// PROBABILITY ENGINE
// ─────────────────────────────────────────────────────────────
export function calcForexProbability(
  pair: { pair: string; base: string; quote: string },
  sentimentMap: Record<string, CurrencySentiment>
): ForexProbability | null {
  const baseSent = sentimentMap[pair.base];
  const quoteSent = sentimentMap[pair.quote];

  if (!baseSent && !quoteSent) return null;

  const baseScore  = baseSent?.score ?? 0;
  const quoteScore = quoteSent?.score ?? 0;
  const diff = baseScore - quoteScore; // Positive = base stronger → BUY pair

  if (Math.abs(diff) < 2) return null; // Not enough divergence for a trade

  const action: 'BUY' | 'SELL' = diff > 0 ? 'BUY' : 'SELL';

  // Score components
  let probScore = 0;
  const reasoning: string[] = [];

  // 1. Fundamental score (up to 50 pts)
  const fundScore = Math.min(Math.abs(diff) * 5, 50);
  probScore += fundScore;
  reasoning.push(`Fundamental divergence: ${pair.base} ${baseScore >= 0 ? '+' : ''}${baseScore} vs ${pair.quote} ${quoteScore >= 0 ? '+' : ''}${quoteScore}`);

  // 2. High impact event confirmation (up to 20 pts)
  const relevantCurr = action === 'BUY' ? baseSent : quoteSent;
  const highImpactEvents = (relevantCurr?.events ?? []).filter(e => e.impact === 'High' && e.sentiment !== 'pending' && e.sentiment !== 'neutral');
  if (highImpactEvents.length > 0) {
    probScore += 20;
    reasoning.push(`High impact event: ${highImpactEvents[0].title}`);
  }

  // 3. Kill Zone bonus (up to 10 pts)  
  const kz = currentKillzone();
  if (kz !== 'None') {
    probScore += 10;
    reasoning.push(`Kill Zone aktif: ${kz}`);
  }

  // 4. Consensus direction (multiple currencies aligning, up to 20 pts)
  const baseStrong  = baseScore >= 4;
  const quoteWeak   = quoteScore <= -4;
  if (baseStrong && quoteWeak) {
    probScore += 20;
    reasoning.push(`Triple confluence: ${pair.base} STRONG + ${pair.quote} WEAK`);
  } else if (baseStrong || quoteWeak) {
    probScore += 10;
  }

  const probability = Math.min(Math.round(probScore), 95); // Cap at 95%
  const confidence: ForexProbability['confidence'] =
    probability >= 75 ? 'HIGH' : probability >= 55 ? 'MEDIUM' : 'LOW';

  const topCurr = action === 'BUY' ? baseSent : quoteSent;
  const topEvent = topCurr?.events.find(e => e.impact === 'High')?.title || topCurr?.events[0]?.title || '';

  return {
    pair: pair.pair,
    baseCurrency: pair.base,
    quoteCurrency: pair.quote,
    action,
    bias: `${pair.base} ${baseScore >= 0 ? 'STRONG' : 'WEAK'} vs ${pair.quote} ${quoteScore >= 0 ? 'STRONG' : 'WEAK'}`,
    probability,
    confidence,
    sentiment: `${pair.base} ${baseScore >= 0 ? '+' : ''}${baseScore} / ${pair.quote} ${quoteScore >= 0 ? '+' : ''}${quoteScore}`,
    topEvent,
    killzone: kz,
    reasoning,
  };
}

export function analyzeAllPairs(sentiments: CurrencySentiment[]): ForexProbability[] {
  const sentMap: Record<string, CurrencySentiment> = {};
  sentiments.forEach(s => { sentMap[s.currency] = s; });

  return MAJOR_PAIRS
    .map(p => calcForexProbability(p, sentMap))
    .filter((s): s is ForexProbability => s !== null)
    .sort((a, b) => b.probability - a.probability);
}
