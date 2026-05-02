import { NextResponse } from 'next/server';
import {
  fetchForexNews,
  processEvents,
  aggregateCurrencySentiment,
  analyzeAllPairs,
} from '@/lib/forex';
import { executeQuery } from '@/lib/db';
import { sendTelegramNotification } from '@/lib/binance';

export const maxDuration = 60;

async function ensureTable() {
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS forex_probability_signals (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      pair VARCHAR(10) NOT NULL UNIQUE,
      action VARCHAR(10),
      probability INT,
      confidence VARCHAR(10),
      bias TEXT,
      sentiment VARCHAR(80),
      top_event TEXT,
      killzone VARCHAR(20),
      reasoning TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await executeQuery(`
    CREATE TABLE IF NOT EXISTS forex_news_cache (
      nomor INT AUTO_INCREMENT PRIMARY KEY,
      title TEXT,
      currency VARCHAR(10),
      impact VARCHAR(10),
      actual_val VARCHAR(30),
      forecast_val VARCHAR(30),
      previous_val VARCHAR(30),
      sentiment VARCHAR(10),
      points INT,
      event_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function GET() {
  try {
    await ensureTable();

    // 1. Fetch news
    const rawNews = await fetchForexNews();
    if (rawNews.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak bisa mengambil data ForexFactory. Coba beberapa menit lagi.' }, { status: 503 });
    }

    // 2. Process events
    const processed = processEvents(rawNews);

    // 3. Save news to cache
    await executeQuery(`DELETE FROM forex_news_cache`);
    for (const e of processed) {
      try {
        await executeQuery(
          `INSERT INTO forex_news_cache (title, currency, impact, actual_val, forecast_val, previous_val, sentiment, points, event_date)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.title, e.currency, e.impact, e.actual, e.forecast, e.previous, e.sentiment, e.points, new Date(e.date)]
        );
      } catch (_) {}
    }

    // 4. Aggregate currency sentiment
    const sentiments = aggregateCurrencySentiment(processed);

    // 5. Generate pair probabilities
    const probs = analyzeAllPairs(sentiments);

    // 6. Save to DB
    await executeQuery(`DELETE FROM forex_probability_signals`);
    for (const p of probs) {
      try {
        await executeQuery(
          `INSERT INTO forex_probability_signals (pair, action, probability, confidence, bias, sentiment, top_event, killzone, reasoning)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [p.pair, p.action, p.probability, p.confidence, p.bias, p.sentiment, p.topEvent, p.killzone, p.reasoning.join(' | ')]
        );

        if (p.confidence === 'HIGH' && p.probability >= 75) {
          const icon = p.action === 'BUY' ? '🟢' : '🔴';
          await sendTelegramNotification(
            `${icon} *FOREX HIGH PROB SETUP*\nPair: ${p.pair}\nAction: ${p.action}\nProbability: ${p.probability}%\nBias: ${p.bias}\nKill Zone: ${p.killzone}`
          );
        }
      } catch (_) {}
    }

    return NextResponse.json({
      success: true,
      message: `Analisis selesai. ${probs.length} setup ditemukan dari ${rawNews.length} event berita.`,
      sentiments: sentiments.map(s => ({ currency: s.currency, score: s.score, bias: s.bias })),
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
